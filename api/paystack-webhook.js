/**
 * Vercel Serverless Function: /api/paystack-webhook
 *
 * Validates Paystack webhook HMAC-SHA512 signature and processes
 * successful charge events. All validation uses the server-side
 * PAYSTACK_SECRET_KEY from Vercel environment variables.
 *
 * Configure in Paystack Dashboard → Settings → API & Webhooks:
 *   Webhook URL: https://your-vercel-domain.vercel.app/api/paystack-webhook
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const MAX_BODY_SIZE = 100 * 1024; // 100 KB

/** Initialize Supabase admin client */
function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Read raw body as Buffer (required for HMAC signature verification) */
async function readRawBody(req, maxSize = MAX_BODY_SIZE) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxSize) {
        req.destroy();
        reject(new Error('Request body too large.'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export const config = {
  api: {
    bodyParser: false, // Disable body parsing so we can read raw bytes for HMAC
  },
};

export default async function handler(req, res) {
  // ── Security Headers ─────────────────────────────────────────────────────
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return res.status(500).json({ error: 'PAYSTACK_SECRET_KEY not configured.' });
  }

  // ── 1. Read raw body for HMAC signature verification ────────────────────
  let rawBody;
  try {
    rawBody = await readRawBody(req);
  } catch {
    return res.status(400).json({ error: 'Could not read request body.' });
  }

  // ── 2. Validate HMAC-SHA512 Signature ───────────────────────────────────
  const signature = req.headers['x-paystack-signature'] || '';
  const hash = crypto.createHmac('sha512', secretKey.trim()).update(rawBody).digest('hex');
  if (hash !== signature) {
    return res.status(401).json({ error: 'Invalid webhook signature.' });
  }

  // ── 3. Parse event ───────────────────────────────────────────────────────
  let event;
  try {
    event = JSON.parse(rawBody.toString('utf-8'));
  } catch {
    return res.status(400).json({ error: 'Invalid JSON payload.' });
  }

  // ── 4. Handle charge.success event ──────────────────────────────────────
  if (event.event === 'charge.success') {
    const data = event.data;
    const reference = data.reference;
    const vendorId = data.metadata?.custom_fields?.find((f) => f.variable_name === 'vendor_id')?.value;
    const planId = data.metadata?.custom_fields?.find((f) => f.variable_name === 'plan_id')?.value || 'starter';

    if (vendorId) {
      const adminClient = getSupabaseAdmin();
      if (adminClient) {
        const now = new Date();
        const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
        const expiresAt = new Date(now.getTime() + THIRTY_DAYS_MS).toISOString();

        try {
          await adminClient.from('payment_transactions').upsert(
            {
              reference,
              vendor_id: vendorId,
              plan_id: planId,
              amount: data.amount / 100,
              currency: 'NGN',
              status: 'success',
              channel: data.channel || 'card',
              paid_at: now.toISOString(),
              customer_email: data.customer?.email || null,
              paystack_data: data,
            },
            { onConflict: 'reference' }
          );

          await adminClient
            .from('profiles')
            .update({
              subscription_plan: planId,
              subscription_started_at: now.toISOString(),
              subscription_expires_at: expiresAt,
              subscription_status: 'active',
              subscription_payment_ref: reference,
              updated_at: now.toISOString(),
            })
            .eq('id', vendorId);
        } catch (err) {
          console.error('[webhook] Supabase error:', err.message);
        }
      }
    }
  }

  // Always return 200 to Paystack to acknowledge receipt
  return res.status(200).json({ status: 'success' });
}
