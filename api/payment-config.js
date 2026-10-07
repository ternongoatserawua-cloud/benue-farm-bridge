/**
 * Vercel Serverless Function: /api/payment-config
 *
 * Safely exposes whether Paystack is configured for the frontend
 * WITHOUT leaking the secret key. Only the public key is returned.
 */

export default function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const publicKey = process.env.VITE_PAYSTACK_PUBLIC_KEY || '';
  const hasSecretKey = Boolean(
    process.env.PAYSTACK_SECRET_KEY &&
      !process.env.PAYSTACK_SECRET_KEY.includes('placeholder') &&
      !process.env.PAYSTACK_SECRET_KEY.includes('your_paystack_secret_key')
  );
  const isConfigured = Boolean(
    publicKey &&
      !publicKey.includes('placeholder') &&
      !publicKey.includes('your_paystack_public_key') &&
      (publicKey.startsWith('pk_live_') || publicKey.startsWith('pk_test_'))
  );

  return res.status(200).json({
    publicKey,
    isConfigured: isConfigured && hasSecretKey,
    hasSecretKey,
  });
}
