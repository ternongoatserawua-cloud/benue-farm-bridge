/**
 * Benue Market — Input Sanitization & Validation Utilities
 * Prevents injection attacks, XSS, and mass assignment vulnerabilities.
 */

/**
 * Strip dangerous characters from text input.
 * Removes HTML tags, script injections, and SQL special chars.
 * @param {string} input - Raw user input
 * @param {number} maxLength - Maximum allowed length (default 500)
 * @returns {string} Sanitized string
 */
export function sanitizeText(input, maxLength = 500) {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>/g, '')           // Strip HTML tags
    .replace(/[<>"'`\\]/g, '')         // Remove dangerous chars
    .replace(/javascript:/gi, '')      // Remove JS protocol
    .replace(/on\w+\s*=/gi, '')        // Remove event handlers
    .replace(/\0/g, '')               // Remove null bytes
    .trim()
    .slice(0, maxLength);
}

/**
 * Sanitize an email address: lowercase, trim, basic format check.
 * @param {string} email
 * @returns {string} Cleaned email or empty string
 */
export function sanitizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  const clean = email.toLowerCase().trim().slice(0, 254);
  // Basic email format validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return '';
  return clean;
}

/**
 * Normalize Nigerian phone numbers to standard 11-digit local format (e.g., '08027985404').
 * Handles variations: '+2348027985404', '2348027985404', '080 2798 5404', '8027985404'.
 * @param {string} phone
 * @returns {string} Normalized 11-digit phone string or cleaned digits
 */
export function normalizeNigerianPhone(phone) {
  if (!phone || typeof phone !== 'string') return '';
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  
  // +234 / 234 followed by 10 digits (13 total digits) -> e.g. 2348027985404 -> 08027985404
  if (digits.startsWith('234') && digits.length === 13) {
    return '0' + digits.slice(3);
  }
  // 0234 followed by 10 digits (14 total digits) -> 08027985404
  if (digits.startsWith('0234') && digits.length === 14) {
    return '0' + digits.slice(4);
  }
  // 10 digits starting with 7, 8, or 9 (missing leading 0) -> 08027985404
  if (digits.length === 10 && ['7', '8', '9'].includes(digits[0])) {
    return '0' + digits;
  }
  return digits;
}

/**
 * Resolves an email or phone login input into a prioritized list of candidate email addresses for Supabase auth.
 * @param {string} identifier - Raw email or phone input
 * @returns {string[]} Ordered list of candidate email strings to attempt authentication against
 */
export function resolveAuthEmailCandidates(identifier) {
  if (!identifier || typeof identifier !== 'string') return [];
  const clean = identifier.trim().replace(/[\u200B-\u200D\uFEFF]/g, '');
  if (!clean) return [];

  if (clean.includes('@')) {
    const lower = clean.toLowerCase();
    const candidates = [lower];
    // If it's a benuemarket.ng phone email, also generate normalized variation
    if (lower.endsWith('@benuemarket.ng')) {
      const prefix = lower.split('@')[0];
      const normalizedPrefix = normalizeNigerianPhone(prefix);
      if (normalizedPrefix && `${normalizedPrefix}@benuemarket.ng` !== lower) {
        candidates.push(`${normalizedPrefix}@benuemarket.ng`);
      }
    }
    return candidates;
  }

  // Pure phone number input
  const normalized = normalizeNigerianPhone(clean);
  const rawDigits = clean.replace(/\D/g, '');
  const candidates = [];

  if (normalized) {
    candidates.push(`${normalized}@benuemarket.ng`);
  }
  if (rawDigits && rawDigits !== normalized) {
    candidates.push(`${rawDigits}@benuemarket.ng`);
  }
  if (clean && !candidates.includes(clean)) {
    candidates.push(clean.toLowerCase());
  }

  return candidates;
}

/**
 * Sanitize a phone number: digits only, enforce Nigerian format constraints.
 * @param {string} phone
 * @returns {string} Digits-only phone string
 */
export function sanitizePhone(phone) {
  if (!phone || typeof phone !== 'string') return '';
  const normalized = normalizeNigerianPhone(phone);
  return normalized || phone.replace(/[^0-9+]/g, '').slice(0, 15);
}

/**
 * Validate UUID format (version 4 compatible).
 * @param {string} id
 * @returns {boolean}
 */
export function isValidUUID(id) {
  return typeof id === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Validate password strength.
 * Requirements: min 8 chars, at least one uppercase, one lowercase, one digit.
 * @param {string} password
 * @returns {{ valid: boolean, message: string }}
 */
export function validatePasswordStrength(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required.' };
  }
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter.' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter.' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number.' };
  }
  return { valid: true, message: '' };
}

/**
 * Fields that are ALLOWED to be updated via the general profile update function.
 * Prevents mass assignment of sensitive fields like role, status, verified.
 */
export const ALLOWED_PROFILE_UPDATE_FIELDS = new Set([
  'name',
  'phone',
  'location',
  'lga',
  'community',
  'about',
  'avatar',
  'coverImage'
]);

/**
 * Sensitive fields that must NEVER be set via general profile update.
 * These require dedicated admin endpoints with proper authorization.
 */
export const PROTECTED_PROFILE_FIELDS = new Set([
  'role',
  'status',
  'verified',
  'email',
  'id',
  'subscription_plan',
  'subscription_status',
  'subscription_expires_at'
]);

/**
 * Filter an updates object to only include allowed profile fields.
 * @param {object} updates - Raw update payload
 * @returns {object} Filtered update payload with only safe fields
 */
export function filterProfileUpdates(updates) {
  if (!updates || typeof updates !== 'object') return {};
  const filtered = {};
  for (const [key, value] of Object.entries(updates)) {
    if (ALLOWED_PROFILE_UPDATE_FIELDS.has(key) && !PROTECTED_PROFILE_FIELDS.has(key)) {
      filtered[key] = typeof value === 'string' ? sanitizeText(value, 1000) : value;
    }
  }
  return filtered;
}

/**
 * Sanitize product data before database write.
 * @param {object} data - Raw product form data
 * @returns {object} Sanitized product data
 */
export function sanitizeProductData(data) {
  if (!data || typeof data !== 'object') return {};
  return {
    ...data,
    name: sanitizeText(data.name, 200),
    description: sanitizeText(data.description, 2000),
    location: sanitizeText(data.location, 200),
    lga: sanitizeText(data.lga, 100),
    phone: sanitizePhone(data.phone),
    whatsapp: sanitizePhone(data.whatsapp || data.phone),
    price: Math.max(0, Number(data.price) || 0),
    quantity: Math.max(0, Number(data.quantity) || 1),
    minimumOrder: Math.max(1, Number(data.minimumOrder) || 1)
  };
}
