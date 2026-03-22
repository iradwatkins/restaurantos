/**
 * RestaurantOS Service Worker
 *
 * Responsibilities:
 * - Cache static assets and pages for offline access
 * - Serve cached content when offline
 * - Queue Convex mutations for replay on reconnect (via message passing)
 *
 * Strategy:
 * - Network-first for all GET requests (fall back to cache)
 * - Static assets cached on install
 * - Menu data cached via message from the main thread
 */

const STATIC_CACHE = 'restaurantos-static-v2';
const MENU_CACHE = 'restaurantos-menu-v1';

const PRECACHE_URLS = [
  '/',
  '/serve',
  '/orders',
  '/dashboard',
];

// ────────────────────────────────────────────
// Install: precache static routes
// ────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ────────────────────────────────────────────
// Activate: clean old caches
// ────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  const VALID_CACHES = [STATIC_CACHE, MENU_CACHE];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !VALID_CACHES.includes(k))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ────────────────────────────────────────────
// Fetch: network-first with cache fallback
// ────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip non-same-origin requests (e.g., analytics, external APIs)
  if (url.origin !== self.location.origin) return;

  // Skip Convex WebSocket and API requests — let IndexedDB handle those
  if (url.pathname.includes('/api/') && !url.pathname.startsWith('/api/auth')) return;

  // Network-first strategy
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses for static assets
        if (response.ok && isStaticAsset(url.pathname)) {
          const responseClone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Offline: serve from cache
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;

          // For navigation requests, serve the cached root page
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }

          // No cache available
          return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' },
          });
        });
      })
  );
});

// ────────────────────────────────────────────
// Message: cache menu data from main thread
// ────────────────────────────────────────────

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_MENU_DATA') {
    // Store menu data as a JSON response in the menu cache
    const menuData = event.data.payload;
    const response = new Response(JSON.stringify(menuData), {
      headers: { 'Content-Type': 'application/json' },
    });
    caches.open(MENU_CACHE).then((cache) => {
      cache.put('/offline/menu-data', response);
    });
  }

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

function isStaticAsset(pathname) {
  return (
    pathname.startsWith('/_next/static/') ||
    pathname.startsWith('/icons/') ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.woff2') ||
    pathname.endsWith('.woff')
  );
}
