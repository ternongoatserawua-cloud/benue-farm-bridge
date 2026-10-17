/**
 * Vercel Serverless Function: /api/toggle-stock
 *
 * Reliably toggles produce stock status (available: true/false) in Supabase
 * using the server-side service role key to avoid RLS session drops.
 */

import { createClient } from '@supabase/supabase-js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ success: false, error: 'Method Not Allowed' }));
  }

  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });

  req.on('end', async () => {
    try {
      const parsed = JSON.parse(body || '{}');
      const { productId, available, sellerId } = parsed;

      if (!productId) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ success: false, error: 'Missing productId parameter.' }));
      }

      const supabaseAdmin = getSupabaseAdmin();
      if (!supabaseAdmin) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ success: false, error: 'Supabase admin client not configured on server.' }));
      }

      // Convert mock or string IDs to valid UUID if needed
      let targetId = productId;
      if (typeof targetId === 'string' && targetId.startsWith('prod-')) {
        targetId = targetId.replace('prod-', 'e0000000-0000-4000-8000-');
      }

      const isAvailable = Boolean(available);
      const nowIso = new Date().toISOString();

      let query = supabaseAdmin
        .from('products')
        .update({ available: isAvailable, updated_at: nowIso })
        .eq('id', targetId);

      // If sellerId provided, ensure seller matches
      if (sellerId && UUID_REGEX.test(sellerId)) {
        query = query.eq('seller_id', sellerId);
      }

      const { data, error } = await query.select('id, name, available, updated_at, seller_id');

      if (error) {
        console.error('Error in /api/toggle-stock:', error.message);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ success: false, error: error.message }));
      }

      // If no rows matched with targetId, try with raw productId
      if ((!data || data.length === 0) && targetId !== productId) {
        const retry = await supabaseAdmin
          .from('products')
          .update({ available: isAvailable, updated_at: nowIso })
          .eq('id', productId)
          .select('id, name, available, updated_at, seller_id');

        if (retry.data && retry.data.length > 0) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ success: true, data: retry.data }));
        }
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ success: true, data: data || [] }));
    } catch (err) {
      console.error('Exception in /api/toggle-stock:', err.message);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  });
}
