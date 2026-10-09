/* Mizanora service worker: offline fallback + fast repeat visits. Never touches /api or /admin. */
const VERSION = 'mz-v1';
const PRECACHE = ['/offline', '/icons/icon-192.png', '/icons/icon-512.png'];
const MAX_ENTRIES = 120;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

async function trim(cache) {
  const keys = await cache.keys();
  if (keys.length > MAX_ENTRIES) await Promise.all(keys.slice(0, keys.length - MAX_ENTRIES).map((k) => cache.delete(k)));
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/admin')) return;

  // Pages: always try the network first so prices and stock are fresh; show the offline page if there is no connection.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('/offline')));
    return;
  }

  // Static files and images: serve from cache instantly, refresh in the background (good on slow 3G/4G).
  if (url.pathname.startsWith('/_next/static') || url.pathname.startsWith('/_next/image') || /\.(png|jpe?g|webp|avif|svg|ico|woff2?)$/.test(url.pathname)) {
    e.respondWith(
      caches.open(VERSION).then(async (cache) => {
        const hit = await cache.match(req);
        const net = fetch(req).then((res) => { if (res.ok) { cache.put(req, res.clone()); trim(cache); } return res; }).catch(() => hit);
        return hit || net;
      })
    );
  }
});
