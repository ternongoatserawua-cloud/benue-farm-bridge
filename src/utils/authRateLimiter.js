/**
 * Benue Market Exponential-Backoff Authentication Rate Limiter
 *
 * Blocks login immediately on the FIRST incorrect attempt and doubles
 * the lockout duration for every subsequent consecutive failure:
 *
 *   Attempt 1  →  30 seconds
 *   Attempt 2  →  60 seconds  (1 minute)
 *   Attempt 3  →  120 seconds (2 minutes)
 *   Attempt 4  →  240 seconds (4 minutes)
 *   Attempt 5  →  480 seconds (8 minutes)
 *   …                         (doubles each time, capped at 24 hours)
 *
 * Formula: lockoutSeconds = BASE_LOCKOUT_SECONDS × EXPONENTIAL_MULTIPLIER^(attempts − 1)
 *
 * Provides:
 * - Immediate lockout on attempt 1 (no free-pass threshold)
 * - Exponential 2× multiplier per consecutive failure
 * - Persistent storage across tabs and sessions (localStorage)
 * - Live countdown helper & formatting (MM:SS and HH:MM:SS)
 * - Human-readable duration label ("30 seconds", "1 minute", "4 minutes", …)
 * - Safe reset on successful authentication or password reset
 * - 24-hour inactivity window: stale data auto-clears after a day
 */

export const BASE_LOCKOUT_SECONDS    = 30;
export const EXPONENTIAL_MULTIPLIER  = 2;
export const MAX_LOCKOUT_SECONDS     = 24 * 60 * 60;         // 24-hour ceiling
export const INACTIVITY_RESET_MS     = 24 * 60 * 60 * 1000; // 24 hours in ms

// ── Backwards-compatible aliases (keep existing consumers from breaking) ──────
export const MAX_LOGIN_ATTEMPTS       = 1;           // lockout starts on attempt 1
export const LOCKOUT_DURATION_MINUTES = 0.5;         // alias: 30 s ≈ 0.5 min
export const LOCKOUT_SEQUENCE_MINUTES = [0.5, 1, 2, 4, 8]; // legacy alias

const STORAGE_KEY          = 'benue_market_login_attempts_v3';
const LEGACY_STORAGE_KEY_V2 = 'benue_market_login_attempts_v2';
const LEGACY_STORAGE_KEY_V1 = 'benue_market_login_attempts_v1';

// ── Core formula ──────────────────────────────────────────────────────────────

/**
 * Calculate lockout duration in seconds for a given attempt number (1-based).
 * @param {number} attempts  Number of failed attempts so far (≥ 1)
 * @returns {number}         Lockout seconds (capped at MAX_LOCKOUT_SECONDS)
 */
export function calculateLockoutDurationSeconds(attempts) {
  const n   = Math.max(1, Math.floor(attempts || 1));
  const raw = BASE_LOCKOUT_SECONDS * Math.pow(EXPONENTIAL_MULTIPLIER, n - 1);
  return Math.min(raw, MAX_LOCKOUT_SECONDS);
}

// ── Formatters ────────────────────────────────────────────────────────────────

/**
 * Format a total-seconds value as MM:SS or HH:MM:SS countdown string.
 * @param {number} totalSeconds
 * @returns {string}  e.g. "00:30", "01:00", "01:00:00"
 */
export function formatLockoutCountdown(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds || 0));
  const h    = Math.floor(safe / 3600);
  const m    = Math.floor((safe % 3600) / 60);
  const s    = safe % 60;

  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Human-readable label for a lockout duration given in SECONDS.
 * Examples: "30 seconds", "1 minute", "2 minutes", "1 hour", "2 hours 4 minutes"
 * @param {number} seconds
 * @returns {string}
 */
export function formatLockoutDurationText(seconds) {
  const safe = Math.max(0, Math.round(seconds || 0));

  if (safe < 60) {
    return `${safe} second${safe === 1 ? '' : 's'}`;
  }

  const totalMinutes = Math.round(safe / 60);
  if (totalMinutes < 60) {
    return `${totalMinutes} minute${totalMinutes === 1 ? '' : 's'}`;
  }

  const hours     = Math.floor(totalMinutes / 60);
  const remMin    = totalMinutes % 60;
  const hourLabel = `${hours} hour${hours === 1 ? '' : 's'}`;
  if (remMin === 0) return hourLabel;
  return `${hourLabel} ${remMin} minute${remMin === 1 ? '' : 's'}`;
}

// ── Identifier normaliser ─────────────────────────────────────────────────────

/**
 * Normalise an email or phone number for consistent lookup.
 * @param {string} raw
 * @returns {string}
 */
export function normalizeAuthIdentifier(raw) {
  if (!raw || typeof raw !== 'string') return '_anonymous_';
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, '');
}

// ── Storage helpers ───────────────────────────────────────────────────────────

function getStore() {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    // Silently purge legacy keys once
    [LEGACY_STORAGE_KEY_V1, LEGACY_STORAGE_KEY_V2].forEach(k => {
      if (localStorage.getItem(k)) {
        try { localStorage.removeItem(k); } catch (_) {}
      }
    });
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.warn('[authRateLimiter] Failed to read store:', err);
    return {};
  }
}

function saveStore(store) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    console.warn('[authRateLimiter] Failed to persist store:', err);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Get the current lockout status for an identifier (email or phone).
 *
 * @param {string} identifier
 * @returns {{
 *   isLocked: boolean,
 *   remainingSeconds: number,
 *   remainingMinutes: number,
 *   attemptsMade: number,
 *   attemptsLeft: number,
 *   lockedUntil: number|null,
 *   formattedCountdown: string,
 *   currentLockoutSeconds: number,
 *   nextLockoutSeconds: number,
 *   durationText: string,
 *   nextDurationText: string,
 *   maxAttempts: number,
 * }}
 */
export function getLoginLockoutStatus(identifier) {
  const key   = normalizeAuthIdentifier(identifier);
  const store = getStore();
  const entry = store[key];
  const now   = Date.now();

  const defaultStatus = {
    isLocked: false,
    remainingSeconds: 0,
    remainingMinutes: 0,
    attemptsMade: 0,
    attemptsLeft: Infinity,
    lockedUntil: null,
    formattedCountdown: '00:00',
    currentLockoutSeconds: BASE_LOCKOUT_SECONDS,
    nextLockoutSeconds: BASE_LOCKOUT_SECONDS,
    durationText: formatLockoutDurationText(BASE_LOCKOUT_SECONDS),
    nextDurationText: formatLockoutDurationText(BASE_LOCKOUT_SECONDS),
    // ── backwards-compat fields ──
    maxAttempts: MAX_LOGIN_ATTEMPTS,
    lockoutDurationMinutes: LOCKOUT_DURATION_MINUTES,
    nextLockoutMinutes: LOCKOUT_DURATION_MINUTES,
    lockoutTier: -1,
    tierSequence: LOCKOUT_SEQUENCE_MINUTES,
  };

  if (!entry) return defaultStatus;

  // Auto-expire after 24 hours of inactivity
  const lastActive = Math.max(entry.lastAttemptAt || 0, entry.lockedUntil || 0);
  if (now - lastActive > INACTIVITY_RESET_MS) {
    delete store[key];
    saveStore(store);
    return defaultStatus;
  }

  const attemptsMade          = Math.max(0, entry.attempts || 0);
  const currentLockoutSeconds = calculateLockoutDurationSeconds(attemptsMade);
  const nextLockoutSeconds    = calculateLockoutDurationSeconds(attemptsMade + 1);

  // Active lockout?
  if (entry.lockedUntil && now < entry.lockedUntil) {
    const remainingSeconds = Math.ceil((entry.lockedUntil - now) / 1000);
    return {
      isLocked: true,
      remainingSeconds,
      remainingMinutes: Math.ceil(remainingSeconds / 60),
      attemptsMade,
      attemptsLeft: 0,
      lockedUntil: entry.lockedUntil,
      formattedCountdown: formatLockoutCountdown(remainingSeconds),
      currentLockoutSeconds,
      nextLockoutSeconds,
      durationText: formatLockoutDurationText(currentLockoutSeconds),
      nextDurationText: formatLockoutDurationText(nextLockoutSeconds),
      // ── backwards-compat ──
      maxAttempts: MAX_LOGIN_ATTEMPTS,
      lockoutDurationMinutes: currentLockoutSeconds / 60,
      nextLockoutMinutes: nextLockoutSeconds / 60,
      lockoutTier: attemptsMade - 1,
      tierSequence: LOCKOUT_SEQUENCE_MINUTES,
    };
  }

  // Cooldown has expired — not locked, but attempts are remembered
  return {
    isLocked: false,
    remainingSeconds: 0,
    remainingMinutes: 0,
    attemptsMade,
    attemptsLeft: Infinity,
    lockedUntil: null,
    formattedCountdown: '00:00',
    currentLockoutSeconds,
    nextLockoutSeconds,
    durationText: formatLockoutDurationText(currentLockoutSeconds),
    nextDurationText: formatLockoutDurationText(nextLockoutSeconds),
    // ── backwards-compat ──
    maxAttempts: MAX_LOGIN_ATTEMPTS,
    lockoutDurationMinutes: currentLockoutSeconds / 60,
    nextLockoutMinutes: nextLockoutSeconds / 60,
    lockoutTier: attemptsMade - 1,
    tierSequence: LOCKOUT_SEQUENCE_MINUTES,
  };
}

/**
 * Record a failed login attempt and immediately apply an exponential lockout.
 *
 * Exponential backoff:
 *   Attempt 1 → locked for 30 s
 *   Attempt 2 → locked for 60 s
 *   Attempt 3 → locked for 120 s  …  (doubles each time, max 24 h)
 *
 * @param {string} identifier  Email or phone number
 * @returns {ReturnType<typeof getLoginLockoutStatus>}
 */
export function recordFailedLoginAttempt(identifier) {
  const key   = normalizeAuthIdentifier(identifier);
  const store = getStore();
  const now   = Date.now();

  const current = store[key] || {
    attempts: 0,
    firstAttemptAt: now,
    lastAttemptAt: now,
    lockedUntil: null,
  };

  const newAttempts    = (current.attempts || 0) + 1;
  const lockoutSeconds = calculateLockoutDurationSeconds(newAttempts);
  const lockedUntil    = now + (lockoutSeconds * 1000);

  store[key] = {
    attempts: newAttempts,
    firstAttemptAt: current.firstAttemptAt || now,
    lastAttemptAt: now,
    lockedUntil,
    currentLockoutSeconds: lockoutSeconds,
  };

  saveStore(store);
  return getLoginLockoutStatus(identifier);
}

/**
 * Clear login attempt history on successful authentication.
 * @param {string} identifier
 */
export function recordSuccessfulLogin(identifier) {
  const key   = normalizeAuthIdentifier(identifier);
  const store = getStore();
  if (store[key]) {
    delete store[key];
    saveStore(store);
  }
}

/**
 * Explicitly clear lockout (e.g. after password reset or CS verification).
 * Pass null / undefined to clear ALL identifiers.
 * @param {string|null} [identifier]
 */
export function clearLoginLockout(identifier = null) {
  if (!identifier) {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(LEGACY_STORAGE_KEY_V2);
        localStorage.removeItem(LEGACY_STORAGE_KEY_V1);
      } catch (_) {}
    }
    return;
  }
  const key   = normalizeAuthIdentifier(identifier);
  const store = getStore();
  if (store[key]) {
    delete store[key];
    saveStore(store);
  }
}
