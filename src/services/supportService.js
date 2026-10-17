/**
 * Benue Farm Bridge — Support Desk & Admin Ticket Forwarding Service
 *
 * Centralizes support ticket creation, cross-tab synchronization,
 * and forwarding to the Administrator Control Center.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase.js';

export const GLOBAL_TICKETS_KEY = 'benue_market_all_support_tickets_v1';
export const LOCAL_USER_TICKETS_KEY = 'benue_market_support_tickets';
export const TICKET_RATE_LIMIT_STORAGE_KEY = 'benue_market_support_cooldown_v1';

export const TICKET_COOLDOWN_FIRST_MINUTES = 30; // 30 minutes after 1st ticket
export const TICKET_COOLDOWN_SECOND_HOURS = 24;  // 24 hours after 2nd ticket
export const TICKET_COOLDOWN_FIRST_MS = TICKET_COOLDOWN_FIRST_MINUTES * 60 * 1000;
export const TICKET_COOLDOWN_SECOND_MS = TICKET_COOLDOWN_SECOND_HOURS * 60 * 60 * 1000;

/**
 * Format total seconds into MM:SS (e.g. 29:59) or HH:MM:SS (e.g. 23:59:59)
 */
export function formatTicketCooldownCountdown(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function normalizeKeyPart(str) {
  if (!str || typeof str !== 'string') return '';
  return str.trim().toLowerCase().replace(/[\s\-_]/g, '');
}

export function getCandidateTicketKeys(identifiers = {}) {
  const keys = new Set();
  const { email, phone, userId } = identifiers;
  if (userId) keys.add(`uid:${normalizeKeyPart(userId)}`);
  if (email) keys.add(`eml:${normalizeKeyPart(email)}`);
  if (phone) keys.add(`phn:${normalizeKeyPart(phone)}`);
  // Always track client device identity for anonymous users
  keys.add('client_device');
  return Array.from(keys);
}

function getCooldownStore() {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = localStorage.getItem(TICKET_RATE_LIMIT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCooldownStore(store) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(TICKET_RATE_LIMIT_STORAGE_KEY, JSON.stringify(store));
  } catch {}
}

/**
 * Check if the user is currently on ticket submission cooldown.
 * - After 1st ticket -> 30 minutes cooldown
 * - After 2nd ticket -> 24 hours cooldown
 */
export function getTicketSubmissionCooldown(identifiers = {}) {
  const keys = getCandidateTicketKeys(identifiers);
  const store = getCooldownStore();
  const now = Date.now();

  let strictest = {
    isCooldownActive: false,
    canSubmit: true,
    remainingSeconds: 0,
    formattedCountdown: '00:00',
    cooldownType: null, // 'FIRST_TICKET' | 'SECOND_TICKET'
    cooldownDurationLabel: '',
    cooldownUntil: null,
    ticketsSubmittedInCycle: 0,
    cycleResetAt: null,
    reason: ''
  };

  let hasMutated = false;

  for (const k of keys) {
    const entry = store[k];
    if (!entry) continue;

    const lastSubmission = entry.lastSubmittedAt || 0;
    const cooldownUntil = entry.cooldownUntil || 0;

    // Cycle expired
    if (entry.cycleResetAt && now >= entry.cycleResetAt) {
      delete store[k];
      hasMutated = true;
      continue;
    }
    if (now - lastSubmission > TICKET_COOLDOWN_SECOND_MS && now >= cooldownUntil) {
      delete store[k];
      hasMutated = true;
      continue;
    }

    if (cooldownUntil && now < cooldownUntil) {
      const remainingSeconds = Math.ceil((cooldownUntil - now) / 1000);
      if (remainingSeconds > strictest.remainingSeconds) {
        strictest = {
          isCooldownActive: true,
          canSubmit: false,
          remainingSeconds,
          formattedCountdown: formatTicketCooldownCountdown(remainingSeconds),
          cooldownType: entry.cooldownType,
          cooldownDurationLabel: entry.cooldownType === 'FIRST_TICKET' ? '30 minutes' : '24 hours',
          cooldownUntil,
          ticketsSubmittedInCycle: entry.ticketsSubmittedInCycle || 1,
          cycleResetAt: entry.cycleResetAt,
          reason: entry.cooldownType === 'FIRST_TICKET'
            ? 'Ticket cooldown active: You can submit your next support ticket after 30 minutes.'
            : 'Ticket quota reached: You have submitted 2 support tickets. You can submit another ticket after 24 hours.'
        };
      }
    } else {
      if (entry.ticketsSubmittedInCycle > strictest.ticketsSubmittedInCycle) {
        strictest.ticketsSubmittedInCycle = entry.ticketsSubmittedInCycle;
      }
    }
  }

  if (hasMutated) {
    saveCooldownStore(store);
  }

  return strictest;
}

/**
 * Record a ticket submission and calculate the next cooldown.
 * 1st Ticket -> 30 min cooldown
 * 2nd Ticket -> 24 hr cooldown
 */
export function recordTicketCooldownSubmission(identifiers = {}) {
  const keys = getCandidateTicketKeys(identifiers);
  const store = getCooldownStore();
  const now = Date.now();

  let currentCount = 0;
  for (const k of keys) {
    if (store[k] && typeof store[k].ticketsSubmittedInCycle === 'number') {
      if (store[k].cycleResetAt && now >= store[k].cycleResetAt) {
        // cycle ended
      } else {
        currentCount = Math.max(currentCount, store[k].ticketsSubmittedInCycle);
      }
    }
  }

  const newCount = currentCount + 1;
  let cooldownDurationMs = 0;
  let cooldownType = null;
  let cooldownUntil = null;
  let cycleResetAt = null;

  if (newCount === 1) {
    // 30 minutes after 1st ticket
    cooldownDurationMs = TICKET_COOLDOWN_FIRST_MS;
    cooldownType = 'FIRST_TICKET';
    cooldownUntil = now + cooldownDurationMs;
    cycleResetAt = now + TICKET_COOLDOWN_SECOND_MS;
  } else {
    // 24 hours after 2nd ticket
    cooldownDurationMs = TICKET_COOLDOWN_SECOND_MS;
    cooldownType = 'SECOND_TICKET';
    cooldownUntil = now + cooldownDurationMs;
    cycleResetAt = cooldownUntil;
  }

  const newEntry = {
    lastSubmittedAt: now,
    ticketsSubmittedInCycle: newCount,
    cooldownUntil,
    cooldownType,
    cycleResetAt
  };

  for (const k of keys) {
    store[k] = newEntry;
  }

  saveCooldownStore(store);
  return getTicketSubmissionCooldown(identifiers);
}

/**
 * Reset cooldown for testing or administrative override
 */
export function clearTicketCooldown(identifiers = null) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  if (!identifiers) {
    localStorage.removeItem(TICKET_RATE_LIMIT_STORAGE_KEY);
    return;
  }
  const keys = getCandidateTicketKeys(identifiers);
  const store = getCooldownStore();
  for (const k of keys) {
    delete store[k];
  }
  saveCooldownStore(store);
}

// Seed tickets for initial administrator visibility
const SEED_SUPPORT_TICKETS = [
  {
    id: 'BFB-SUP-SEC-8419',
    ticketId: 'BFB-SUP-SEC-8419',
    createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    name: 'Aondona Iorwuese',
    email: 'aondona.ior@gmail.com',
    phone: '08034567890',
    userRole: 'buyer',
    topic: 'account_security',
    priority: 'urgent',
    referenceId: 'ACC-LCK-3X',
    message: 'Hello Admin, my account was temporarily locked after 3 login attempts. Please assist in verifying my account details and restoring access.',
    status: 'open',
    adminNotes: '',
    resolvedAt: null,
    resolvedBy: null
  },
  {
    id: 'BFB-SUP-LOG-3912',
    ticketId: 'BFB-SUP-LOG-3912',
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    name: 'Teryima Farm Ventures',
    email: 'teryimafarms@benuemarket.ng',
    phone: '08027985404',
    userRole: 'farmer',
    topic: 'logistics_waybill',
    priority: 'high',
    referenceId: 'WB-ZAK-80B',
    message: 'Need verification assistance for 80 bags of Zaki Biam yams loaded at Gboko Central Park for delivery to Mile 12 Lagos.',
    status: 'in_progress',
    adminNotes: 'Contacted Gboko motor park coordinator to verify driver manifest.',
    resolvedAt: null,
    resolvedBy: 'Ternongo Atser Awua'
  },
  {
    id: 'BFB-SUP-FST-1204',
    ticketId: 'BFB-SUP-FST-1204',
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
    name: 'Dooshima Akor',
    email: 'dooshima.akor@yahoo.com',
    phone: '08149876543',
    userRole: 'farmer',
    topic: 'farmer_listing',
    priority: 'normal',
    referenceId: 'LST-SOY-GBK',
    message: 'Assistance requested with uploading high-resolution harvest photos for Gboko soybeans.',
    status: 'resolved',
    adminNotes: 'Assisted farmer with image compression and listing verified on storefront.',
    resolvedAt: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
    resolvedBy: 'Operations Desk'
  }
];

/**
 * Cross-tab and in-memory event dispatch helper
 */
function broadcastTicketEvent(type, payload) {
  if (typeof window === 'undefined') return;

  // Window custom event
  try {
    window.dispatchEvent(
      new CustomEvent('benue_market_support_ticket_event', {
        detail: { type, payload }
      })
    );
  } catch {}

  // BroadcastChannel for cross-tab realtime sync
  if ('BroadcastChannel' in window) {
    try {
      const channel = new BroadcastChannel('benue_market_sync');
      channel.postMessage({ type: 'SUPPORT_TICKETS_UPDATED', payload });
      setTimeout(() => channel.close(), 200);
    } catch {}
  }
}

/**
 * Subscribe to support ticket updates (cross-tab, custom events, and Supabase realtime)
 * @param {Function} callback - Triggered with { type, payload } on any ticket changes
 * @returns {Function} unsubscribe cleanup function
 */
export function subscribeToSupportTickets(callback) {
  if (typeof window === 'undefined') return () => {};

  // 1. Listen to window custom events (same-window dispatch)
  const handleCustomEvent = (e) => {
    if (callback && e.detail) {
      callback(e.detail);
    }
  };
  window.addEventListener('benue_market_support_ticket_event', handleCustomEvent);

  // 2. Listen to localStorage storage event (cross-tab sync)
  const handleStorageEvent = (e) => {
    if (e.key === GLOBAL_TICKETS_KEY) {
      if (callback) {
        callback({ type: 'STORAGE_SYNC', payload: getAllSupportTickets() });
      }
    }
  };
  window.addEventListener('storage', handleStorageEvent);

  // 3. BroadcastChannel listener (modern cross-tab sync)
  let channel = null;
  if ('BroadcastChannel' in window) {
    try {
      channel = new BroadcastChannel('benue_market_sync');
      channel.onmessage = (e) => {
        if (e.data?.type === 'SUPPORT_TICKETS_UPDATED' && callback) {
          callback({ type: 'BROADCAST_SYNC', payload: e.data.payload });
        }
      };
    } catch {}
  }

  // 4. Supabase Realtime channel (if configured)
  let supabaseSub = null;
  if (isSupabaseConfigured() && supabase) {
    try {
      supabaseSub = supabase
        .channel('support_tickets_realtime_feed')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'support_tickets' },
          (payload) => {
            if (callback) {
              callback({ type: 'SUPABASE_REALTIME', payload });
            }
          }
        )
        .subscribe();
    } catch (sbErr) {
      console.info('Supabase realtime listener notice:', sbErr?.message);
    }
  }

  // Return unsubscribe cleanup
  return () => {
    window.removeEventListener('benue_market_support_ticket_event', handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
    if (channel) {
      try {
        channel.close();
      } catch {}
    }
    if (supabaseSub && supabase) {
      try {
        supabase.removeChannel(supabaseSub);
      } catch {}
    }
  };
}

/**
 * Safely retrieve all support tickets from storage (Admin view)
 */
export function getAllSupportTickets() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return SEED_SUPPORT_TICKETS;
  }

  try {
    const raw = localStorage.getItem(GLOBAL_TICKETS_KEY);
    if (!raw) {
      // Initialize with seed tickets
      localStorage.setItem(GLOBAL_TICKETS_KEY, JSON.stringify(SEED_SUPPORT_TICKETS));
      return SEED_SUPPORT_TICKETS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }
  } catch (err) {
    console.warn('Error reading support tickets:', err);
  }

  return SEED_SUPPORT_TICKETS;
}

/**
 * Async fetch and sync tickets from Supabase into local storage cache
 */
export async function fetchRemoteSupportTickets() {
  const localTickets = getAllSupportTickets();

  if (!isSupabaseConfigured() || !supabase) {
    return localTickets;
  }

  try {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !Array.isArray(data)) {
      return localTickets;
    }

    // Convert snake_case from DB into standard camelCase ticket objects
    const remoteTickets = data.map((row) => ({
      id: row.ticket_id || row.id,
      ticketId: row.ticket_id || row.id,
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
      name: row.name || 'Anonymous User',
      email: row.email || '',
      phone: row.phone || '',
      userRole: row.user_role || 'buyer',
      topic: row.topic || 'general',
      priority: row.priority || 'normal',
      referenceId: row.reference_id || '',
      message: row.message || '',
      status: row.status || 'open',
      adminNotes: row.admin_notes || '',
      resolvedAt: row.resolved_at || null,
      resolvedBy: row.resolved_by || null
    }));

    // Merge: Remote takes precedence, preserve any local-only tickets that haven't synced yet
    const remoteIds = new Set(remoteTickets.map((t) => t.ticketId));
    const merged = [...remoteTickets, ...localTickets.filter((t) => !remoteIds.has(t.ticketId))];
    merged.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    localStorage.setItem(GLOBAL_TICKETS_KEY, JSON.stringify(merged));
    return merged;
  } catch (err) {
    console.info('Remote tickets sync notice:', err?.message);
    return localTickets;
  }
}

/**
 * Submit a new Support Request from Contact / Help Desk page.
 * Automatically saves globally for Admin Dashboard and locally for the user.
 */
export async function submitSupportTicket(ticketData) {
  // 0. Verify rate limiting cooldown
  const cooldown = getTicketSubmissionCooldown({
    email: ticketData.email,
    phone: ticketData.phone,
    userId: ticketData.userId || ticketData.name
  });

  if (cooldown.isCooldownActive) {
    const error = new Error(cooldown.reason);
    error.cooldown = cooldown;
    error.isCooldownActive = true;
    throw error;
  }

  const now = new Date().toISOString();
  const rawId = `BFB-SUP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const newTicket = {
    id: rawId,
    ticketId: rawId,
    createdAt: now,
    updatedAt: now,
    name: (ticketData.name || '').trim(),
    email: (ticketData.email || '').trim(),
    phone: (ticketData.phone || '').trim(),
    userRole: ticketData.userRole || 'buyer',
    topic: ticketData.topic || 'general',
    priority: ticketData.priority || 'normal',
    referenceId: (ticketData.referenceId || '').trim(),
    message: (ticketData.message || '').trim(),
    status: 'open',
    adminNotes: '',
    resolvedAt: null,
    resolvedBy: null
  };

  // 1. Save to global Admin tickets storage
  try {
    const existingGlobal = getAllSupportTickets();
    const updatedGlobal = [newTicket, ...existingGlobal];
    localStorage.setItem(GLOBAL_TICKETS_KEY, JSON.stringify(updatedGlobal));
  } catch (err) {
    console.warn('Failed to save to global tickets store:', err);
  }

  // 2. Save to user's local ticket history
  try {
    const rawLocal = localStorage.getItem(LOCAL_USER_TICKETS_KEY);
    const existingLocal = rawLocal ? JSON.parse(rawLocal) : [];
    const updatedLocal = [newTicket, ...(Array.isArray(existingLocal) ? existingLocal : [])].slice(0, 15);
    localStorage.setItem(LOCAL_USER_TICKETS_KEY, JSON.stringify(updatedLocal));
  } catch {}

  // 3. Forward to Supabase (if configured)
  if (isSupabaseConfigured() && supabase) {
    try {
      const { error: sbError } = await supabase.from('support_tickets').insert({
        ticket_id: newTicket.ticketId,
        name: newTicket.name,
        email: newTicket.email,
        phone: newTicket.phone,
        user_role: newTicket.userRole,
        topic: newTicket.topic,
        priority: newTicket.priority,
        reference_id: newTicket.referenceId,
        message: newTicket.message,
        status: newTicket.status,
        created_at: newTicket.createdAt
      });
      if (sbError && (sbError.message.includes('cooldown') || sbError.message.includes('quota'))) {
        throw new Error(sbError.message);
      }
    } catch (dbErr) {
      if (dbErr.message && (dbErr.message.includes('cooldown') || dbErr.message.includes('quota'))) {
        throw dbErr;
      }
      // Non-blocking: table might not exist yet in demo/offline mode
      console.info('Supabase support ticket forwarding notice:', dbErr?.message);
    }
  }

  // 4. Record submission in ticket cooldown rate limiter
  recordTicketCooldownSubmission({
    email: newTicket.email,
    phone: newTicket.phone,
    userId: ticketData.userId || newTicket.name
  });

  // 5. Broadcast live notification to Admin Dashboard
  broadcastTicketEvent('TICKET_CREATED', newTicket);

  return newTicket;
}

/**
 * Admin: Update ticket status and internal resolution notes
 */
export async function updateSupportTicketStatus(ticketId, newStatus, adminNotes = '', adminName = 'System Admin') {
  const tickets = getAllSupportTickets();
  const now = new Date().toISOString();

  let targetTicket = null;
  const updatedTickets = tickets.map((t) => {
    if (t.id === ticketId || t.ticketId === ticketId) {
      targetTicket = {
        ...t,
        status: newStatus,
        adminNotes: adminNotes !== undefined ? adminNotes : t.adminNotes,
        updatedAt: now,
        resolvedAt: newStatus === 'resolved' ? (t.resolvedAt || now) : null,
        resolvedBy: newStatus === 'resolved' ? (t.resolvedBy || adminName) : null
      };
      return targetTicket;
    }
    return t;
  });

  try {
    localStorage.setItem(GLOBAL_TICKETS_KEY, JSON.stringify(updatedTickets));
  } catch (err) {
    console.warn('Failed to persist ticket status update:', err);
  }

  // Optional Supabase sync
  if (isSupabaseConfigured() && supabase && targetTicket) {
    try {
      await supabase
        .from('support_tickets')
        .update({
          status: newStatus,
          admin_notes: targetTicket.adminNotes,
          resolved_at: targetTicket.resolvedAt,
          resolved_by: targetTicket.resolvedBy,
          updated_at: now
        })
        .eq('ticket_id', ticketId);
    } catch {}
  }

  broadcastTicketEvent('TICKET_UPDATED', targetTicket);
  return targetTicket;
}

/**
 * Admin: Delete / remove a support ticket
 */
export async function deleteSupportTicket(ticketId) {
  const tickets = getAllSupportTickets();
  const updatedTickets = tickets.filter((t) => t.id !== ticketId && t.ticketId !== ticketId);

  try {
    localStorage.setItem(GLOBAL_TICKETS_KEY, JSON.stringify(updatedTickets));
  } catch (err) {
    console.warn('Failed to persist ticket deletion:', err);
  }

  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.from('support_tickets').delete().eq('ticket_id', ticketId);
    } catch {}
  }

  broadcastTicketEvent('TICKET_DELETED', { ticketId });
  return true;
}

/**
 * Get ticket metrics summary for KPI cards
 */
export function getSupportTicketStats(tickets = null) {
  const list = tickets || getAllSupportTickets();
  const total = list.length;
  const open = list.filter((t) => t.status === 'open' || t.status === 'Open · In Review').length;
  const inProgress = list.filter((t) => t.status === 'in_progress' || t.status === 'In Progress').length;
  const resolved = list.filter((t) => t.status === 'resolved' || t.status === 'Resolved').length;
  const urgent = list.filter((t) => t.priority === 'urgent' && t.status !== 'resolved').length;

  return { total, open, inProgress, resolved, urgent };
}
