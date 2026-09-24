// =====================================================================
// MIZANORA — Service Worker
//
// Caches the static app shell (HTML/CSS/JS/icons) AND the pinned
// Firebase SDK bundles (from gstatic.com) for instant repeat loads —
// this is what stops the splash/loading screen re-appearing every
// time the installed app is resumed or switched back to.
//
// Deliberately does NOT cache:
//   - Firestore/RTDB responses (product data, orders, prices, stock)
//   - Cloud Functions responses (checkout, tracking)
//   - Anything under /admin/
// Per spec §29: "Do not cache sensitive customer/order data insecurely."
// Those requests always go to the network; only the shell + SDK is cached.
// =====================================================================

const CACHE_NAME = "mizanora-shell-v3";

// Same-origin app shell.
const SHELL_ASSETS = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.json",
  "/css/tokens.css",
  "/css/base.css",
  "/css/home.css",
  "/js/page-chrome.js",
  "/js/shared.js",
  "/js/services/firebase-init.js",
  "/assets/icons/logo-mark.png",
  "/assets/icons/logo-mark-192.png",
  "/assets/icons/logo-mark-512.png",
  "/assets/icons/logo-full.png",
  "/assets/img/hero-banner.jpg"
];

// Firebase SDK, pinned at a fixed version — safe to cache aggressively
// since the URL itself changes if the version ever changes.
const FIREBASE_SDK_ASSETS = [
  "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js",
  "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js",
  "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js",
  "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js",
  "https://www.gstatic.com/firebasejs/10.13.0/firebase-functions.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all([
        cache.addAll(SHELL_ASSETS),
        // Cross-origin: fetch individually with catch, so one CDN hiccup
        // during install doesn't fail the whole service worker install.
        ...FIREBASE_SDK_ASSETS.map((url) =>
          fetch(url, { mode: "cors" })
            .then((res) => res.ok && cache.put(url, res))
            .catch(() => {})
        )
      ])
    )
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

  // Never intercept: live API/Firebase data calls, admin pages, or non-GET requests.
  const isLiveFirebaseData = url.hostname.includes("firebaseio.com")
    || url.hostname.includes("firestore.googleapis.com")
    || url.hostname.includes("identitytoolkit.googleapis.com")
    || url.hostname.includes("securetoken.googleapis.com")
    || url.hostname.includes("cloudfunctions.net")
    || url.hostname.includes("firebasestorage.app");
  const isFirebaseSdk = url.hostname === "www.gstatic.com" && url.pathname.startsWith("/firebasejs/");
  const isAdmin = url.pathname.startsWith("/admin");
  const isImgbb = url.hostname.includes("imgbb.com") || url.hostname.includes("ibb.co");

  if (event.request.method !== "GET" || isAdmin || isImgbb) {
    return; // let the browser handle it normally, straight to network
  }
  if (isLiveFirebaseData) {
    return; // always live data, never cached
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request, isFirebaseSdk ? { mode: "cors" } : undefined)
        .then((response) => {
          // Cache same-origin shell files AND the pinned Firebase SDK bundles.
          if (response.ok && (url.origin === self.location.origin || isFirebaseSdk)) {
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
