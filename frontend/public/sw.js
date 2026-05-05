/**
 * Wealthly service worker — minimal install/cache strategy.
 *
 * Goals:
 *  - Make the app installable as a PWA (Chrome/Safari).
 *  - Network-first for the HTML shell so users always get the latest deploy.
 *  - Cache-first for hashed JS/CSS/img assets emitted by Vite (immutable).
 *  - Always pass through API calls to the backend (no caching, no offline).
 *
 * Cache key is bumped on every build via the SW_VERSION constant — bump it
 * when you change cache strategy or want to flush old assets.
 */

const SW_VERSION = 'wealthly-v1';
const RUNTIME = `wealthly-runtime-${SW_VERSION}`;
const SHELL = `wealthly-shell-${SW_VERSION}`;
const SHELL_ASSETS = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg', '/icon-maskable.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL).then((cache) => cache.addAll(SHELL_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.endsWith(SW_VERSION))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Skip cross-origin (e.g. backend on Railway, fonts on googleapis) — let the
  // browser handle them normally so CORS/auth still work as expected.
  if (url.origin !== self.location.origin) return;

  // HTML navigations: network first, fall back to cached shell.
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/index.html')))
    );
    return;
  }

  // Static assets: cache-first, refresh in background.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(RUNTIME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
