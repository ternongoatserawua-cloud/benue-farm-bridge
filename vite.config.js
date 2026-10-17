import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { handleVerifyPayment, handlePaystackWebhook, getDynamicEnv } from './server/paymentHandler.js';

function paystackApiPlugin() {
  const MAX_BODY = 100 * 1024; // 100KB

  return {
    name: 'paystack-api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0];

        // ── Security headers on all API responses ──
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

        // Dynamic Payment Configuration endpoint
        if (url === '/api/payment-config' && req.method === 'GET') {
          const currentEnv = getDynamicEnv();
          const publicKey = currentEnv.VITE_PAYSTACK_PUBLIC_KEY || '';
          const hasSecretKey = Boolean(
            currentEnv.PAYSTACK_SECRET_KEY &&
            !currentEnv.PAYSTACK_SECRET_KEY.includes('placeholder') &&
            !currentEnv.PAYSTACK_SECRET_KEY.includes('your_paystack_secret_key')
          );
          const isLiveOrTest = Boolean(
            publicKey &&
            !publicKey.includes('placeholder') &&
            !publicKey.includes('your_paystack_public_key') &&
            (publicKey.startsWith('pk_live_') || publicKey.startsWith('pk_test_'))
          );

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            publicKey,
            isConfigured: isLiveOrTest && hasSecretKey,
            hasSecretKey
          }));
          return;
        }

        if (url === '/api/verify-payment' && req.method === 'POST') {
          let body = '';
          let bodySize = 0;
          req.on('data', chunk => {
            bodySize += chunk.length;
            if (bodySize > MAX_BODY) { req.destroy(); return; }
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const currentEnv = getDynamicEnv();
              const parsed = JSON.parse(body || '{}');

              // Validate vendorId is UUID format or mock user identifier
              const isUUIDOrMock = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parsed.vendorId) || /^[a-z0-9_-]{1,64}$/i.test(parsed.vendorId);
              if (parsed.vendorId && !isUUIDOrMock) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: 'Invalid vendor ID format.' }));
                return;
              }

              const result = await handleVerifyPayment(parsed, currentEnv);
              res.statusCode = result.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result.body));
            } catch (err) {
              console.error('[vite-verify-payment-error]', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: err.message || 'Internal server error.' }));
            }
          });
          return;
        }

        if (url === '/api/paystack-webhook' && req.method === 'POST') {
          const chunks = [];
          let bodySize = 0;
          req.on('data', chunk => {
            bodySize += chunk.length;
            if (bodySize > MAX_BODY) { req.destroy(); return; }
            chunks.push(chunk);
          });
          req.on('end', async () => {
            try {
              const currentEnv = getDynamicEnv();
              const rawBody = Buffer.concat(chunks);
              const signature = req.headers['x-paystack-signature'] || '';
              const result = await handlePaystackWebhook(rawBody, signature, currentEnv);
              res.statusCode = result.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result.body));
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Internal server error.' }));
            }
          });
          return;
        }

        next();
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), paystackApiPlugin()],
  server: {
    host: true,
    port: 3000,
    open: false
  },
  build: {
    // Disable source maps in production to avoid leaking source code
    sourcemap: false,
    // Target modern browsers for smaller bundles
    target: ['es2020', 'chrome87', 'firefox78', 'safari14', 'edge88'],
    // Warn if chunk exceeds 1MB
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Deterministic chunk naming for CDN cache efficiency
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
        // Manual chunk splitting for optimal caching
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-icons': ['lucide-react'],
        }
      }
    },
    // Use esbuild for fast, secure minification
    minify: 'esbuild',
  },
  // Ensure env variables starting with VITE_ are exposed to client
  envPrefix: 'VITE_',
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', '@supabase/supabase-js', 'lucide-react']
  }
}));

