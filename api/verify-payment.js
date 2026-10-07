/**
 * Vercel Serverless Function: /api/verify-payment
 *
 * Securely verifies Paystack transactions on the server side.
 * The PAYSTACK_SECRET_KEY is read from Vercel environment variables —
 * it is NEVER exposed to the browser.
 *
 * Deploy: Set PAYSTACK_SECRET_KEY and SUPABASE_SERVICE_ROLE_KEY
 * in Vercel Dashboard → Project → Settings → Environment Variables
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const MAX_BODY_SIZE = 100 * 1024; // 100 KB

const PLAN_PRICES = {
  starter: 2000,
  growth: 5000,
};

/** Validate UUID format */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Initialize Supabase admin client using server-side service role key */
function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Read request body with size guard */
async function readBody(req, maxSize = MAX_BODY_SIZE) {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxSize) {
        req.destroy();
        reject(new Error('Request body too large.'));
        return;
      }
      body += chunk;
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  // ── Security Headers ────────────────────────────────────────────────────
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  let parsed;
  try {
    const rawBody = await readBody(req);
    parsed = JSON.parse(rawBody || '{}');
  } catch {
    return res.status(400).json({ success: false, error: 'Invalid JSON body.' });
  }

  const { reference, planId, vendorId, isRenewal = false } = parsed;

  // ── Input Validation ────────────────────────────────────────────────────
  if (!reference || !planId || !vendorId) {
    return res.status(400).json({ success: false, error: 'Missing required parameters: reference, planId, vendorId.' });
  }
  if (!UUID_REGEX.test(vendorId)) {
    return res.status(400).json({ success: false, error: 'Invalid vendor ID format.' });
  }
  if (!PLAN_PRICES[planId]) {
    return res.status(400).json({ success: false, error: `Unknown plan: ${planId}.` });
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey || secretKey.includes('placeholder') || secretKey.includes('your_paystack_secret_key')) {
    return res.status(500).json({ success: false, error: 'Payment gateway not configured on server.' });
  }

  // ── 1. Verify with Paystack API ─────────────────────────────────────────
  let payData;
  try {
    const paystackRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${secretKey.trim()}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      }
    );
    const body = await paystackRes.json();
    if (!paystackRes.ok || !body.status) {
      return res.status(400).json({ success: false, error: body.message || 'Payment verification failed.' });
    }
    payData = body.data;
  } catch (err) {
    return res.status(502).json({ success: false, error: 'Could not reach payment gateway.' });
  }

  // ── 2. Validate Transaction Status ──────────────────────────────────────
  if (payData.status !== 'success') {
    return res.status(400).json({ success: false, error: `Transaction status is '${payData.status}', expected 'success'.` });
  }

  // ── 3. Validate Amount ──────────────────────────────────────────────────
  const expectedKobo = PLAN_PRICES[planId] * 100;
  if (payData.amount < expectedKobo) {
    return res.status(400).json({
      success: false,
      error: `Insufficient payment: received ₦${payData.amount / 100}, expected ₦${PLAN_PRICES[planId]}.`,
    });
  }

  // ── 4. Record in Supabase ────────────────────────────────────────────────
  const adminClient = getSupabaseAdmin();
  const now = new Date();
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  let startedAt = now.toISOString();
  let expiresAt = new Date(now.getTime() + THIRTY_DAYS_MS).toISOString();

  if (adminClient) {
    try {
      if (isRenewal) {
        const { data: profile } = await adminClient
          .from('profiles')
          .select('subscription_expires_at, subscription_started_at')
          .eq('id', vendorId)
          .maybeSingle();

        if (profile?.subscription_expires_at) {
          const base = Math.max(new Date(profile.subscription_expires_at).getTime(), Date.now());
          expiresAt = new Date(base + THIRTY_DAYS_MS).toISOString();
          startedAt = profile.subscription_started_at || startedAt;
        }
      }

      await adminClient.from('payment_transactions').upsert(
        {
          reference,
          vendor_id: vendorId,
          plan_id: planId,
          amount: payData.amount / 100,
          currency: 'NGN',
          status: 'success',
          channel: payData.channel || 'card',
          paid_at: now.toISOString(),
          customer_email: payData.customer?.email || null,
          paystack_data: payData,
        },
        { onConflict: 'reference' }
      );

      await adminClient
        .from('profiles')
        .update({
          subscription_plan: planId,
          subscription_started_at: startedAt,
          subscription_expires_at: expiresAt,
          subscription_status: 'active',
          subscription_payment_ref: reference,
          updated_at: now.toISOString(),
        })
        .eq('id', vendorId);
    } catch (err) {
      console.error('[verify-payment] Supabase error:', err.message);
    }
  }

  return res.status(200).json({
    success: true,
    message: 'Payment verified and subscription activated.',
    subscription: { vendorId, planId, startedAt, expiresAt, status: 'active', paymentRef: reference },
    mode: 'live',
  });
}
