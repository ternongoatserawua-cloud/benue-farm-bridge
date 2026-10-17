/**
 * Benue Farm Bridge — Service Worker
 * Version: 1.0.0
 * Provides robust offline functionality, asset caching, and PWA capabilities.
 */

const CACHE_VERSION = 'v1.0.0';
const STATIC_CACHE = `bfb-static-${CACHE_VERSION}`;
const IMAGES_CACHE = `bfb-images-${CACHE_VERSION}`;
const RUNTIME_CACHE = `bfb-runtime-${CACHE_VERSION}`;

// Core static assets to precache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/manifest.json',
  '/offline.html',
  '/logo.png',
  '/logo.svg',
  '/pwa-icon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/apple-touch-icon.png',
  '/favicon-32x32.png'
];

// Max items for dynamic caches to prevent device storage bloat
const MAX_IMAGE_ITEMS = 60;
const MAX_RUNTIME_ITEMS = 80;

/**
 * Trim cache size helper
 */
async function trimCache(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      const itemsToDelete = keys.length - maxItems;
      for (let i = 0; i < itemsToDelete; i++) {
        await cache.delete(keys[i]);
      }
    }
  } catch (err) {
    // Ignore cache trim errors silently
  }
}

/**
 * Install Event: Precache core app shell
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async (cache) => {
      // Use individual puts so a single non-critical asset failure doesn't block install
      await Promise.allSettled(
        PRECACHE_ASSETS.map(async (url) => {
          try {
            const response = await fetch(url, { cache: 'no-cache' });
            if (response.ok) {
              await cache.put(url, response);
            }
          } catch (e) {
            console.warn('[SW] Failed to precache:', url, e);
          }
        })
      );
    })
  );
  // Force active immediately if requested
  self.skipWaiting();
});

/**
 * Activate Event: Clean up old cache versions
 */
self.addEventListener('activate', (event) => {
  const currentCaches = [STATIC_CACHE, IMAGES_CACHE, RUNTIME_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (!currentCaches.includes(name)) {
            console.log('[SW] Deleting obsolete cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

/**
 * Fetch Event: Smart routing & caching strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests; pass mutations (POST, PUT, DELETE) directly
  if (request.method !== 'GET') {
    return;
  }

  // Bypass chrome extensions or non-http protocols
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Bypass Paystack checkout / transaction APIs
  if (url.hostname.includes('paystack.co') && !url.pathname.includes('/v1/inline.js')) {
    return;
  }

  // 1. Navigation requests (HTML pages) -> Network First with Cache Fallback and Offline Page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(async (networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(RUNTIME_CACHE);
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(async () => {
          // If network failed, check cache for the page or root index
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          const indexCached = await caches.match('/index.html');
          if (indexCached) {
            return indexCached;
          }
          // Fallback to offline page
          const offlinePage = await caches.match('/offline.html');
          return offlinePage || new Response('Offline - Benue Farm Bridge', {
            headers: { 'Content-Type': 'text/plain' }
          });
        })
    );
    return;
  }

  // 2. Images (Supabase storage, Unsplash, static assets) -> Cache First with Network Revalidation
  const isImage = 
    request.destination === 'image' || 
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|gif|ico)(\?.*)?$/i) ||
    url.hostname.includes('images.unsplash.com') ||
    url.hostname.includes('supabase.co');

  if (isImage) {
    event.respondWith(
      caches.open(IMAGES_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) {
          // Asynchronously revalidate in background if online
          fetch(request).then((freshResponse) => {
            if (freshResponse && freshResponse.ok) {
              cache.put(request, freshResponse);
              trimCache(IMAGES_CACHE, MAX_IMAGE_ITEMS);
            }
          }).catch(() => {});
          return cached;
        }

        // Not in cache: fetch from network and cache
        return fetch(request).then((networkResponse) => {
          if (networkResponse && (networkResponse.ok || networkResponse.type === 'opaque')) {
            cache.put(request, networkResponse.clone());
            trimCache(IMAGES_CACHE, MAX_IMAGE_ITEMS);
          }
          return networkResponse;
        }).catch(async () => {
          // Return placeholder icon if image fails offline
          return caches.match('/pwa-icon.svg');
        });
      })
    );
    return;
  }

  // 3. Fonts and Google Fonts -> Cache First
  const isFont = 
    request.destination === 'font' || 
    url.hostname.includes('fonts.gstatic.com') ||
    url.pathname.match(/\.(woff2?|ttf|otf|eot)$/i);

  if (isFont) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const fresh = await fetch(request);
        if (fresh && (fresh.ok || fresh.type === 'opaque')) {
          cache.put(request, fresh.clone());
        }
        return fresh;
      })
    );
    return;
  }

  // 4. Vite Assets (JS/CSS) & Static Files -> Stale-While-Revalidate
  const isStaticAsset =
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.hostname === self.location.hostname;

  if (isStaticAsset) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
            trimCache(RUNTIME_CACHE, MAX_RUNTIME_ITEMS);
          }
          return networkResponse;
        }).catch(() => null);

        // Return cached version if found, otherwise wait for network
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Default: Network with Cache fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

/**
 * Handle incoming messages from the client app
 */
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'PING') {
    event.ports[0]?.postMessage({ status: 'PONG', version: CACHE_VERSION });
  }
});
