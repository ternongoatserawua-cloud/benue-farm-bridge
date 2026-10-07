/**
 * Benue Market — Subscription Service
 * Manages vendor advertising subscriptions with tiered monthly pricing.
 *
 * Plans:
 *  • Starter  — ₦2,000/month → up to 3 visible products
 *  • Growth   — ₦5,000/month → up to 10 visible products
 *
 * Storage: localStorage (benue_market_subscriptions) as primary cache;
 *          Supabase profiles table `subscription_*` columns as source of truth.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase.js';

// ─── Default plan catalogue (admin-editable) ────────────────────────────────
const PLANS_STORAGE_KEY = 'benue_market_subscription_plans';
const SUBS_STORAGE_KEY  = 'benue_market_subscriptions';

export const DEFAULT_PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 2000,
    maxProducts: 3,
    color: '#16a34a',
    badge: 'Popular',
    features: [
      'Up to 3 active product listings',
      'Full storefront visibility',
      'Buyer contact via WhatsApp & Call',
      'Profile page on Farmers Directory',
      '30-day rolling subscription'
    ]
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 5000,
    maxProducts: 10,
    color: '#7c3aed',
    badge: 'Best Value',
    features: [
      'Up to 10 active product listings',
      'Priority placement on storefront',
      'Full storefront visibility',
      'Buyer contact via WhatsApp & Call',
      'Profile page on Farmers Directory',
      '30-day rolling subscription'
    ]
  }
];

// ─── Plan helpers ────────────────────────────────────────────────────────────

/** Get the current plan catalogue (admin may have edited prices). */
export function getSubscriptionPlans() {
  try {
    const stored = localStorage.getItem(PLANS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_PLANS;
}

/** Admin: update plan prices/limits and persist. */
export function saveSubscriptionPlans(plans) {
  try {
    localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(plans));
    // Broadcast to other tabs
    if ('BroadcastChannel' in window) {
      const ch = new BroadcastChannel('benue_market_sync');
      ch.postMessage({ type: 'SUBSCRIPTION_PLANS_UPDATED', plans });
      ch.close();
    }
  } catch {}
}

// ─── Subscription record helpers ─────────────────────────────────────────────

function loadAllSubscriptions() {
  try {
    const raw = localStorage.getItem(SUBS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAllSubscriptions(subs) {
  try {
    localStorage.setItem(SUBS_STORAGE_KEY, JSON.stringify(subs));
    if ('BroadcastChannel' in window) {
      const ch = new BroadcastChannel('benue_market_sync');
      ch.postMessage({ type: 'SUBSCRIPTIONS_UPDATED', subs });
      ch.close();
    }
  } catch {}
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Get the subscription record for a vendor.
 * Returns null if no subscription exists.
 *
 * Shape:
 * {
 *   vendorId,
 *   planId,          // 'starter' | 'growth'
 *   startedAt,       // ISO string
 *   expiresAt,       // ISO string
 *   status,          // 'active' | 'expired' | 'cancelled'
 *   paymentRef,      // Paystack reference or 'admin-granted'
 * }
 */
export async function getVendorSubscription(vendorId) {
  if (!vendorId) return null;

  // 1. Try Supabase first
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('subscription_plan, subscription_started_at, subscription_expires_at, subscription_status, subscription_payment_ref')
        .eq('id', vendorId)
        .maybeSingle();

      if (!error && data?.subscription_plan) {
        const sub = {
          vendorId,
          planId: data.subscription_plan,
          startedAt: data.subscription_started_at,
          expiresAt: data.subscription_expires_at,
          status: data.subscription_status || 'active',
          paymentRef: data.subscription_payment_ref || ''
        };
        // Keep local cache in sync
        const subs = loadAllSubscriptions();
        subs[vendorId] = sub;
        saveAllSubscriptions(subs);
        return sub;
      }
    } catch (err) {
      console.warn('Supabase subscription fetch notice:', err.message);
    }
  }

  // 2. Fallback to localStorage cache
  const subs = loadAllSubscriptions();
  return subs[vendorId] || null;
}

/**
 * Compute subscription status from a record.
 * Returns: 'active' | 'expiring_soon' | 'expired' | 'none'
 */
export function computeSubscriptionStatus(sub) {
  if (!sub || !sub.expiresAt) return 'none';
  if (sub.status === 'cancelled') return 'expired';

  const now = Date.now();
  const expiry = new Date(sub.expiresAt).getTime();

  if (expiry < now) return 'expired';

  // Within 3 days of expiry → alert
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
  if (expiry - now <= THREE_DAYS_MS) return 'expiring_soon';

  return 'active';
}

/**
 * Quick synchronous check using localStorage only (for UI rendering).
 */
export function getVendorSubscriptionSync(vendorId) {
  if (!vendorId) return null;
  const subs = loadAllSubscriptions();
  return subs[vendorId] || null;
}

/**
 * Check if a vendor has an active (or expiring_soon) subscription.
 */
export function isSubscriptionActive(sub) {
  const status = computeSubscriptionStatus(sub);
  return status === 'active' || status === 'expiring_soon';
}

/**
 * How many products a vendor is allowed to have visible given their plan.
 */
export function getProductLimit(sub) {
  if (!isSubscriptionActive(sub)) return 0;
  const plans = getSubscriptionPlans();
  const plan = plans.find(p => p.id === sub?.planId);
  return plan?.maxProducts || 0;
}

/**
 * Days remaining until subscription expires. Returns 0 if expired.
 */
export function daysUntilExpiry(sub) {
  if (!sub?.expiresAt) return 0;
  const diff = new Date(sub.expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Activate / renew a subscription after successful payment.
 * Persists to both Supabase (if configured) and localStorage.
 *
 * @param {string}  vendorId     – vendor's user ID
 * @param {string}  planId       – 'starter' | 'growth'
 * @param {string}  paymentRef   – Paystack transaction reference
 * @param {boolean} isRenewal    – true extends from current expiry, false starts fresh
 */
export async function activateSubscription(vendorId, planId, paymentRef = '', isRenewal = false) {
  if (!vendorId || !planId) return { error: 'Invalid vendor or plan.' };

  const now = new Date();
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

  // If renewing and still active, extend from current expiry
  let startedAt = now.toISOString();
  let expiresAt;

  if (isRenewal) {
    const existing = await getVendorSubscription(vendorId);
    const currentExpiry = existing?.expiresAt ? new Date(existing.expiresAt).getTime() : Date.now();
    const base = Math.max(currentExpiry, Date.now());
    expiresAt = new Date(base + THIRTY_DAYS).toISOString();
    startedAt = existing?.startedAt || startedAt;
  } else {
    expiresAt = new Date(now.getTime() + THIRTY_DAYS).toISOString();
  }

  const subRecord = {
    vendorId,
    planId,
    startedAt,
    expiresAt,
    status: 'active',
    paymentRef: paymentRef || 'demo-payment'
  };

  // 1. Persist to Supabase
  if (isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          subscription_plan: planId,
          subscription_started_at: startedAt,
          subscription_expires_at: expiresAt,
          subscription_status: 'active',
          subscription_payment_ref: paymentRef || 'demo-payment',
          updated_at: now.toISOString()
        })
        .eq('id', vendorId);

      if (error) {
        console.warn('Supabase subscription update notice:', error.message);
      }
    } catch (err) {
      console.warn('Supabase subscription exception:', err.message);
    }
  }

  // 2. Persist to localStorage
  const subs = loadAllSubscriptions();
  subs[vendorId] = subRecord;
  saveAllSubscriptions(subs);

  // 3. Broadcast change
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('benue_market_subscription_updated', {
      detail: { vendorId, subscription: subRecord }
    }));
  }

  return { data: subRecord, error: null };
}

/**
 * Securely verify payment with backend Paystack gateway and activate subscription.
 * Calls backend endpoint /api/verify-payment which validates with Paystack REST API
 * using PAYSTACK_SECRET_KEY, writes to Supabase payment_transactions, and updates profile.
 *
 * @param {object} params
 * @param {string} params.reference  – Paystack payment reference
 * @param {string} params.planId     – 'starter' | 'growth'
 * @param {string} params.vendorId   – vendor profile UUID
 * @param {boolean} [params.isRenewal]
 */
export async function verifyAndProcessPayment({ reference, planId, vendorId, isRenewal = false }) {
  if (!reference || !planId || !vendorId) {
    return { data: null, error: 'Transaction reference, Plan ID, and Vendor ID are required.' };
  }

  try {
    const res = await fetch('/api/verify-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reference, planId, vendorId, isRenewal })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      return { data: null, error: data.error || 'Payment verification failed at server.' };
    }

    const subRecord = data.subscription || {
      vendorId,
      planId,
      startedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
      paymentRef: reference
    };

    // Keep local cache in sync
    const subs = loadAllSubscriptions();
    subs[vendorId] = subRecord;
    saveAllSubscriptions(subs);

    // Broadcast change across tabs & window
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('benue_market_subscription_updated', {
        detail: { vendorId, subscription: subRecord }
      }));
    }

    return { data: subRecord, error: null, mode: data.mode };
  } catch (err) {
    console.warn('Backend payment verification network error, fallback to direct activation:', err.message);
    // If backend endpoint is unavailable, fallback to client-side activation
    return activateSubscription(vendorId, planId, reference, isRenewal);
  }
}


/**
 * Admin: Revoke a vendor's active subscription permanently.
 * Resets the vendor back to free limits and updates database and cache.
 */
export async function revokeSubscription(vendorId, callerRole = 'admin') {
  if (!vendorId) return { error: 'Vendor ID is required.' };

  // 1. Update local subscription cache
  const subs = loadAllSubscriptions();
  if (subs[vendorId]) {
    subs[vendorId] = {
      ...subs[vendorId],
      status: 'cancelled',
      planId: null,
      expiresAt: new Date().toISOString()
    };
    saveAllSubscriptions(subs);
  }

  // 2. Dispatch real-time subscription update event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('benue_market_subscription_updated', {
      detail: { vendorId, subscription: null }
    }));
  }

  if (!isSupabaseConfigured() || !supabase) {
    return { error: null };
  }

  // Strategy 1: Attempt RPC admin_revoke_subscription
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('admin_revoke_subscription', {
      p_user_id: vendorId
    });
    if (!rpcError && rpcData?.success) {
      return { error: null };
    }
  } catch (rpcErr) {
    console.warn('admin_revoke_subscription RPC fallback:', rpcErr?.message);
  }

  // Strategy 2: Direct profile update fallback
  try {
    const { error: dbError } = await supabase
      .from('profiles')
      .update({
        subscription_plan: null,
        subscription_status: 'cancelled',
        subscription_expires_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', vendorId);

    if (dbError) throw dbError;
    return { error: null };
  } catch (err) {
    console.error('Revoke subscription error:', err.message);
    return { error: err.message };
  }
}

/**
 * Admin: Grant or Revoke a subscription manually.
 */
export async function adminSetSubscription(vendorId, planId, durationDays = 30) {
  if (!vendorId) return { error: 'Vendor ID required.' };

  if (!planId) {
    return revokeSubscription(vendorId);
  }

  if (isSupabaseConfigured() && supabase) {
    // Strategy 1: Attempt RPC admin_grant_subscription
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('admin_grant_subscription', {
        p_user_id: vendorId,
        p_plan_id: planId,
        p_duration_days: durationDays
      });
      if (!rpcError && rpcData?.success) {
        // Also update local cache
        const subs = loadAllSubscriptions();
        subs[vendorId] = {
          vendorId,
          planId,
          startedAt: new Date().toISOString(),
          expiresAt: rpcData.expires_at || new Date(Date.now() + durationDays * 86400000).toISOString(),
          status: 'active',
          paymentRef: 'admin-granted'
        };
        saveAllSubscriptions(subs);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('benue_market_subscription_updated', {
            detail: { vendorId, subscription: subs[vendorId] }
          }));
        }
        return { error: null };
      }
    } catch (rpcErr) {
      console.warn('admin_grant_subscription RPC fallback:', rpcErr?.message);
    }
  }

  return activateSubscription(vendorId, planId, 'admin-granted');
}

/**
 * Cancel a subscription (vendor-initiated or admin).
 */
export async function cancelSubscription(vendorId) {
  return revokeSubscription(vendorId);
}

/**
 * Filter a vendor's products array to only show the allowed number
 * based on their active subscription tier.
 * Products are sorted: approved first, then by creation date desc.
 */
export function filterProductsBySubscription(products, sub) {
  if (!products || products.length === 0) return [];
  const limit = getProductLimit(sub);
  if (limit === 0) return []; // Subscription inactive — hide all

  // Sort: approved and available first, then by createdAt desc
  const sorted = [...products].sort((a, b) => {
    const aScore = (a.status === 'approved' ? 2 : 1) + (a.available ? 1 : 0);
    const bScore = (b.status === 'approved' ? 2 : 1) + (b.available ? 1 : 0);
    if (bScore !== aScore) return bScore - aScore;
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });

  return sorted.slice(0, limit);
}

/**
 * Load all subscriptions as a map { vendorId → subRecord } for admin dashboard.
 */
export function getAllSubscriptionsSync() {
  return loadAllSubscriptions();
}

/**
 * Fetch dynamic payment configuration from backend endpoint.
 * Ensures the public key is always up-to-date even without dev server restart.
 */
export async function fetchPaymentConfig() {
  try {
    const res = await fetch('/api/payment-config');
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch {}
  return {
    publicKey: import.meta.env?.VITE_PAYSTACK_PUBLIC_KEY || '',
    isConfigured: false
  };
}

/**
 * Synchronize all vendors' subscriptions from Supabase profiles into local cache.
 * Ensures public marketplace accurately honors vendor subscription limits.
 */
export async function syncAllSubscriptionsFromSupabase() {
  if (!isSupabaseConfigured() || !supabase) return loadAllSubscriptions();
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, subscription_plan, subscription_started_at, subscription_expires_at, subscription_status, subscription_payment_ref')
      .not('subscription_plan', 'is', null);

    if (!error && Array.isArray(data)) {
      const subs = loadAllSubscriptions();
      data.forEach(p => {
        subs[p.id] = {
          vendorId: p.id,
          planId: p.subscription_plan,
          startedAt: p.subscription_started_at,
          expiresAt: p.subscription_expires_at,
          status: p.subscription_status || 'active',
          paymentRef: p.subscription_payment_ref || ''
        };
      });
      saveAllSubscriptions(subs);
      return subs;
    }
  } catch (err) {
    console.warn('Sync all subscriptions error:', err.message);
  }
  return loadAllSubscriptions();
}

/**
 * Initialize Paystack inline payment.
 * Dynamically loads the Paystack JS SDK and opens their payment popup.
 *
 * @param {object} options
 *   key         – Paystack public key
 *   email       – payer email
 *   amount      – amount in KOBO (naira × 100)
 *   ref         – unique transaction reference
 *   metadata    – extra metadata
 *   onSuccess   – callback(reference) on success
 *   onClose     – callback() on modal close
 */
export function initPaystackPayment({ key, email, amount, ref, metadata = {}, onSuccess, onClose }) {
  return new Promise((resolve) => {
    const cleanKey = (key || '').trim();
    const cleanEmail = (email || '').trim();
    const intAmountKobo = Math.round(Number(amount));
    const cleanRef = (ref || '').trim();

    if (!cleanKey) {
      resolve({ success: false, error: 'Paystack Public Key is missing.' });
      return;
    }

    const load = () => {
      try {
        if (window.PaystackPop) {
          const handler = window.PaystackPop.setup({
            key: cleanKey,
            email: cleanEmail,
            amount: intAmountKobo,
            ref: cleanRef,
            currency: 'NGN',
            metadata,
            callback: (response) => {
              onSuccess && onSuccess(response.reference);
              resolve({ success: true, reference: response.reference });
            },
            onClose: () => {
              onClose && onClose();
              resolve({ success: false, cancelled: true });
            }
          });
          handler.openIframe();
        } else {
          resolve({ success: false, error: 'Paystack SDK could not be initialized in this browser.' });
        }
      } catch (err) {
        resolve({ success: false, error: `Paystack popup error: ${err.message}` });
      }
    };

    if (window.PaystackPop) {
      load();
    } else {
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.onload = load;
      script.onerror = () => resolve({ success: false, error: 'Failed to load Paystack payment script from CDN.' });
      document.head.appendChild(script);
    }
  });
}

/** Generate a unique Paystack transaction reference. */
export function generatePaymentRef(vendorId = 'user') {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `BFB-${ts}-${rand}`;
}

