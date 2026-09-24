// =====================================================================
// MIZANORA — Service Worker
//
// Caches the static app shell (HTML/CSS/JS/icons) for fast repeat
// loads and an offline fallback page. Deliberately does NOT cache:
//   - Firestore/RTDB responses (product data, orders, prices, stock)
//   - Cloud Functions responses (checkout, tracking)
//   - Anything under /admin/
// Per spec §29: "Do not cache sensitive customer/order data insecurely."
// Those requests always go to the network; only the shell is cached.
// =====================================================================

const CACHE_NAME = "mizanora-shell-v2";

const SHELL_ASSETS = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.json",
  "/css/tokens.css",
  "/css/base.css",
  "/css/home.css",
  "/assets/icons/logo-mark.png",
  "/assets/icons/logo-mark-192.png",
  "/assets/icons/logo-mark-512.png",
  "/assets/icons/logo-full.png",
  "/assets/img/hero-banner.jpg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never intercept: API/Firebase calls, admin pages, or non-GET requests.
  const isFirebase = url.hostname.includes("firebaseio.com")
    || url.hostname.includes("googleapis.com")
    || url.hostname.includes("cloudfunctions.net")
    || url.hostname.includes("firebasestorage.app");
  const isAdmin = url.pathname.startsWith("/admin");
  const isImgbb = url.hostname.includes("imgbb.com") || url.hostname.includes("ibb.co");

  if (event.request.method !== "GET" || isFirebase || isAdmin || isImgbb) {
    return; // let the browser handle it normally, straight to network
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          // Cache same-origin successful shell-type responses (HTML/CSS/JS/images)
          // for next time, without touching cross-origin or opaque responses.
          if (response.ok && url.origin === self.location.origin) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline and not cached: show the offline fallback for navigations,
          // otherwise just fail (e.g. a missing image stays missing).
          if (event.request.mode === "navigate") {
            return caches.match("/offline.html");
          }
        });
    })
  );
});
