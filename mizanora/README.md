# MIZANORA — E-commerce Platform

Premium halal e-commerce store. Black + metallic gold, built on Firebase.

## 📦 Phase status

- ✅ **Phase 1 — Architecture, Security Rules, Home Page**
- ✅ **Phase 2 — Shop, Categories, Product Detail, Search**
- ✅ **Phase 3 — Cart, Checkout (COD), Order Creation, Order Tracking**
- ✅ **Phase 4 — Customer Account (Auth, Profile, Orders, Wishlist)**
- ✅ **Phase 5 — Admin Dashboard (Products, Orders, Categories, Inventory)**
- ✅ **Phase 6 — Coupons, Reviews, Banners/CMS, Notifications**
- ✅ **Phase 7 — SEO, PWA, Static Pages, Deployment Guide** — **project complete**

---

## 🗂 What's new in Phase 6

```
public/admin/
├── coupons.html + js/coupons.js               ← coupon CRUD (code = doc ID, see note below)
├── reviews.html + js/reviews.js               ← pending/approved/rejected moderation queue
├── banners.html + js/banners.js               ← hero/promo/announcement CMS, ImgBB upload
├── notifications.html + js/notifications.js   ← send to all customers or one specific UID
└── js/services/
    ├── admin-coupons.js
    ├── admin-reviews.js
    ├── admin-banners.js
    └── admin-notifications.js

public/js/services/notification-service.js     ← customer-facing: reads "mine" + "all" notifications
```

The Home page now reads its hero and announcement bar from `/banners` (Firestore) when an admin has configured one — falling back to the original static hero on a brand-new store with no banners yet, so nothing breaks before the first CMS entry exists. The Account page gained a **Notifications** tab.

### Coupon codes are immutable by design

A coupon's Firestore document ID must equal its uppercase `code` — `createOrder` and `validateCoupon` (Phase 3) look coupons up by `doc(code.toUpperCase())` directly, not a query. This means the admin **Edit Coupon** form disables the code field: changing a code would mean creating a new document, not updating the existing one. To rename a code, delete the old coupon and create a new one.

### Review approval updates the product rating atomically

Approving a review doesn't just flip its status — `moderateReview` (Phase 5's Cloud Function, used here) recomputes the product's denormalized `rating`/`reviewCount` inside the same transaction, so a customer can never see a stale or inconsistent rating.

### Notification delivery model

Firestore `/notifications` is the permanent record for every notification (what the Account page's Notifications tab reads). For a notification targeted at **one specific customer**, an RTDB mirror is also written to `live_notifications/{uid}` for instant push-style delivery to anyone with the app open — consistent with the Firestore-is-truth/RTDB-is-live split from `FIREBASE-ARCHITECTURE.md`. A **broadcast to all customers** has no single RTDB path to push to (that would need a fan-out job this phase doesn't implement), so "all" notifications reach customers the next time their Account page queries Firestore — a small latency tradeoff, not a data-loss one.

### New Firestore indexes required

```bash
firebase deploy --only firestore:indexes
```
(adds `notifications` by `customerId`+`createdAt` and by `audience`+`createdAt` — see `docs/FIRESTORE-INDEXES.md`.)

---

## 🗂 What's new in Phase 5

```
functions/
├── admin/setAdminRole.js          ← promote/demote admins (admin-only, custom claims)
└── reviews/moderateReview.js      ← approve/reject reviews, updates denormalized product rating

scripts/
└── bootstrap-first-admin.js       ← run ONCE locally to create your first admin (see below)

public/admin/
├── index.html + js/dashboard.js       ← real stats (sales, orders, low stock) — zero-state, never fake numbers
├── products.html + js/products.js     ← product CRUD, ImgBB image upload with drag-and-drop + progress
├── categories.html + js/categories.js ← category CRUD
├── orders.html + js/orders.js         ← order list, filter by status, status/tracking updates
├── css/admin.css                      ← sidebar shell, data tables, modals, upload zone
└── js/
    ├── auth-guard.js                  ← client-side redirect for non-admins (rules are the real boundary)
    ├── admin-shared.js                ← sidebar nav rendering, shared helpers
    └── services/                      ← admin-products.js, admin-categories.js, admin-orders.js
```

### ⚠️ Required: create your first admin

Admin #1 can't be created through the app (there's no admin yet to grant the role) — that's what the bootstrap script is for:

1. Sign up a normal account on the live site with the email you want as admin.
2. Firebase Console → Project Settings → Service Accounts → **Generate new private key**. Save the downloaded file as `scripts/service-account.json` (already gitignored — never commit it).
3. `cd scripts && npm install firebase-admin --no-save`
4. `node bootstrap-first-admin.js you@example.com`
5. Sign out and back in on the site (custom claims only take effect on a fresh token) → `/admin` is now accessible.

Every admin after the first can be added via a "Promote to Admin" flow calling the `setAdminRole` Cloud Function (wire this into the admin UI in a later pass, or call it directly from the Firebase Console's Functions testing tool for now).

### ⚠️ Required: deploy the new Cloud Functions

```bash
firebase deploy --only functions
```
(re-run this — Phase 5 added `setAdminRole`, `removeAdminRole`, and `moderateReview` to `functions/index.js`.)

### Why the admin panel is allowed to write products/prices directly from the browser

Every other part of this app treats client-submitted price/stock as untrusted (see Phase 3's `createOrder`). The admin panel is the one deliberate exception: Firestore Security Rules require `isAdmin() == true` (the custom claim) for any write to `/products`, `/categories`, or `/banners` — see `firestore.rules`. A non-admin's browser literally cannot perform these writes, rules-enforced, regardless of what the client-side code tries to send. The admin dashboard's own `auth-guard.js` is just a friendly redirect, not the security boundary.

### Dashboard stats at scale

The dashboard currently computes stats by scanning up to 2,000 recent orders/products client-side (see `STATS_SCAN_LIMIT` in `admin/js/dashboard.js`). Fine for hundreds to low-thousands of orders. Past that, replace this with a scheduled Cloud Function that pre-computes daily/weekly totals into a small `/stats` document instead of raising the scan limit.

---

## 🗂 What's new in Phase 4

```
public/
├── account.html + js/pages/account.js     ← login/register + dashboard (profile, orders, wishlist, addresses)
├── css/account.css                        ← auth forms + dashboard shell styles
└── js/services/
    ├── auth-service.js                    ← Firebase Auth: email/password, Google, password reset
    └── customer-service.js                ← /customers/{uid} profile, addresses, order history, Firestore wishlist
```

`shared.js` was also updated: the wishlist heart button now syncs to Firestore automatically when a user is signed in (falls back to localStorage for guests, same as before), and every page hydrates its local wishlist cache from Firestore on login so hearts show correctly site-wide — not just on the Account page.

### ⚠️ Required: enable Auth sign-in methods

In Firebase Console → Authentication → Sign-in method, enable **Email/Password** (required) and **Google** (optional — the Google button will error until this is on, so remove it from `account.js` if you don't want it yet).

### Guest checkout is untouched

Signing in is entirely optional — Checkout (Phase 3) never requires it. A signed-in customer gets order history under `customerId`; a guest's order has `customerId: null` and is only reachable via `/track-order` (Order ID + phone).

### Known timing note

On first sign-in, the guest-wishlist merge (copying localStorage favorites into the new Firestore wishlist) and the site-wide hydration (reading Firestore back into localStorage) can race — worst case, a heart briefly doesn't show as active until the next page load. Not a data-loss bug, just a cosmetic delay; acceptable for this phase.

---

## 🗂 What's new in Phase 3

```
functions/
├── admin-init.js                  ← Firebase Admin SDK setup (server-only, trusted)
├── index.js                       ← exports every Cloud Function
├── package.json
└── orders/
    ├── createOrder.js             ← THE trust boundary: recomputes price/stock/total server-side
    ├── updateOrderStatus.js       ← admin-only status changes
    ├── trackOrder.js              ← guest-safe lookup by orderId + phone
    └── validateCoupon.js          ← checkout-time discount preview

public/
├── cart.html + js/pages/cart.js               ← line items, qty editing, coupon, live totals
├── checkout.html + js/pages/checkout.js       ← COD form, validation, calls createOrder
├── order-success.html + js/pages/order-success.js  ← confirmation w/ order ID
├── track-order.html + js/pages/track-order.js ← visual status timeline
├── css/cart.css                               ← shared by cart/checkout/confirmation/tracking
└── js/services/order-service.js               ← thin wrapper calling the Cloud Functions above
```

### ⚠️ Required: deploy Cloud Functions before testing checkout

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

Without this, clicking "Place Order" will fail — `createOrder` doesn't exist yet as a live endpoint. The client (`order-service.js`) calls it via `httpsCallable`, which requires the function to actually be deployed.

### Why order totals are never trusted from the browser

Every number the customer sees on the Cart/Checkout page (subtotal, discount, total) is a **preview** computed from the local cart for display only. When "Place Order" is clicked, `createOrder` re-reads each product's real price and stock directly from Firestore inside a transaction, ignores whatever price the browser sent, and computes the actual charged total server-side. This is the direct implementation of spec Section 33 — see `docs/FIREBASE-ARCHITECTURE.md` §6 for the full rationale.

### Testing the full order flow

1. Deploy Functions (above) and Firestore rules/indexes (Phase 1/2 steps).
2. Add a test product in Firebase Console with `active: true`, `stock: 10`, a real `price`.
3. (Optional) Add a test coupon: doc ID `TESTCODE`, `code: "TESTCODE"`, `type: "fixed"`, `discount: 200`, `minimumOrder: 0`, `maximumDiscount: null`, `expiry: <a future date>`, `usageLimit: 100`, `usedCount: 0`, `active: true`.
4. Add the product to cart from Shop/Product page → go to `/cart` → `/checkout` → fill the form → Place Order.
5. You'll land on `/order-success?id=MZN-...` — copy that ID and test `/track-order` with the same phone number.
6. Check Firestore: the product's `stock` should have decremented, and `/orders/{id}` should exist with `order_history` subcollection.

---

## 🗂 What's new in Phase 2

```
public/
├── shop.html + js/pages/shop.js          ← filterable, sorted, paginated product grid
├── category.html + js/pages/category.js  ← single-category listing (/category/{slug})
├── product.html + js/pages/product.js    ← gallery, qty, add/buy, tabs, reviews, related
├── search.html + js/pages/search.js      ← debounced search, recent + popular chips
├── css/shop.css                          ← filters sidebar, toolbar, pagination
├── css/product.css                       ← PDP-specific layout
├── css/search.css                        ← search box + chips
└── js/shared.js                          ← product card + nav-shell helpers used by every page
docs/
└── FIRESTORE-INDEXES.md                  ← every composite index these pages need
firestore.indexes.json                    ← the same indexes, deployable via CLI
firebase.json                             ← Hosting rewrites for clean URLs (/shop, /category/x, /product/x)
```

### ⚠️ Required: deploy indexes before testing Shop/Category/Search

These pages use compound queries (`where` + `orderBy` on different fields) that Firestore refuses to run without a composite index. Deploy them once:

```bash
firebase deploy --only firestore:indexes
```

Without this, Shop/Category pages will show "Couldn't load products" and the browser console will show a Firestore error with a direct link to auto-create the missing index — either works.

### ⚠️ Required: add `titleLower` when creating products

Search relies on a lowercase copy of the title (Firestore queries are case-sensitive and can't lowercase server-side). Until Phase 5's admin panel writes this automatically, when adding test products manually in the Firebase Console, set both:
```
title: "Premium Wireless Headphones"
titleLower: "premium wireless headphones"
```

### Seeding test data

To see Shop/Category/Product/Search working, add a few documents manually in Firebase Console → Firestore:
1. A `categories` doc with `active: true`, `order: 1`, `slug: "electronics"`, `name: "Electronics"`
2. A `products` doc with `active: true`, `slug`, `titleLower`, `categoryId` (matching the category's doc ID), `price`, `thumbnail` (any image URL), `stock`, `stockStatus: "in_stock"`

Phase 5's admin panel replaces this manual step entirely.

---

## 🗂 What's in Phase 1

```
mizanora/
├── public/
│   ├── index.html              ← Home page (live, functional)
│   ├── manifest.json
│   ├── css/
│   │   ├── tokens.css          ← design tokens (colors, type, spacing)
│   │   ├── base.css            ← reset + shared components (buttons, skeletons)
│   │   └── home.css            ← home page styles
│   ├── js/
│   │   ├── services/
│   │   │   ├── firebase-init.js    ← Firebase SDK setup (PLACEHOLDER CONFIG)
│   │   │   ├── catalog-service.js  ← products/categories/reviews queries
│   │   │   ├── cart-store.js       ← cart state (localStorage shell)
│   │   │   ├── wishlist-store.js   ← wishlist state (localStorage shell)
│   │   │   └── imgbb-service.js    ← ImgBB image upload
│   │   ├── utils/
│   │   │   ├── icons.js        ← inline SVG icon set
│   │   │   └── format.js       ← price formatting, scroll-reveal, etc.
│   │   ├── pages/
│   │   │   └── home.js         ← home page controller
│   │   └── env.example.js      ← local dev env template (copy to env.js)
│   └── assets/icons/           ← your MIZANORA logo files
├── docs/
│   ├── FIREBASE-ARCHITECTURE.md    ← WHY each DB is used where
│   └── DATA-MODEL.md               ← full field-level schema
├── firestore.rules
├── database.rules.json
└── .env.example
```

---

## 🔥 Firebase Project Setup

1. Go to [Firebase Console](https://console.firebase.google.com) → **Add project** → name it `mizanora` (or your choice).
2. Enable these products from the left sidebar:
   - **Authentication** → Sign-in method → enable Email/Password (and Google, optional)
   - **Firestore Database** → Create database → start in **production mode**
   - **Realtime Database** → Create database → start in **locked mode**
3. Go to **Project Settings → General → Your apps → Add app → Web (`</>`)**. Copy the config object shown.
4. Paste those values into `public/js/services/firebase-init.js`, replacing the `YOUR_...` placeholders.
5. Also set `databaseURL` there (shown on the Realtime Database page).

### Deploy Security Rules

Install the Firebase CLI once: `npm install -g firebase-tools`, then:

```bash
firebase login
firebase init            # select Firestore + Realtime Database, point to this folder
firebase deploy --only firestore:rules
firebase deploy --only database
```

This pushes `firestore.rules` and `database.rules.json` from this repo — read `docs/FIREBASE-ARCHITECTURE.md` first to understand *why* each rule exists before changing anything.

---

## 🖼 ImgBB Setup

1. You already have a key from [api.imgbb.com](https://api.imgbb.com/) — **if you shared it anywhere outside your own files, regenerate it now** from your ImgBB dashboard.
2. Copy `public/js/env.example.js` to `public/js/env.js` (this file is gitignored — it will never be committed):
   ```js
   window.__MIZANORA_ENV__ = {
     IMGBB_API_KEY: "your-real-key-here"
   };
   ```
3. `index.html` currently loads `env.example.js` for this preview — once you have your real `env.js`, swap the `<script>` tag to point at it.

**Important:** because this is a plain static site (no build step yet), the ImgBB key technically ships to any visitor's browser once deployed. That's an acceptable trade-off for a solo-founder MVP since ImgBB keys only grant *upload*, not account access — but if abuse becomes a concern later, move uploads behind a Cloud Function proxy (stubbed for you in Phase 5/6 admin work).

---

## 💻 Local Development

No build step required for Phase 1 — it's plain HTML/CSS/JS with ES modules.

```bash
cd public
python3 -m http.server 8000
# or: npx serve .
```

Open `http://localhost:8000`. The page will render its layout, skeletons, and hero immediately; product/category sections will show an empty state until your Firestore has real data (Phase 5 admin panel will let you add it without touching code — for now you can add test docs manually in the Firebase Console).

---

## 🎨 Brand Assets

Your logo files are already in `public/assets/icons/`:
- `logo-mark.png` — the gold M icon (used as favicon, PWA icon, loading screen)
- `logo-full.png` — full lockup with wordmark (used in nav, footer, hero)

The mobile UI poster you shared is saved as reference at `docs/reference-mobile-poster.png` — Phase 2/3 pages (Shop, Product Detail, Cart) will match its layout patterns closely.

---

## 🗂 What's new in Phase 7 (final)

```
public/
├── about.html, contact.html, faq.html            ← static pages (spec §4)
├── privacy-policy.html, terms.html, returns.html ← legal/policy pages (spec §4)
├── 404.html                                       ← branded not-found page, auto-served by Firebase Hosting
├── offline.html                                   ← shown by the service worker when there's no connection
├── service-worker.js                              ← app-shell caching + offline fallback (never caches Firestore/order data)
├── robots.txt, sitemap.xml                        ← static SEO files
└── js/page-chrome.js                              ← shared nav/footer renderer used by the Phase 7 static pages

scripts/generate-sitemap.js                        ← regenerates sitemap-products.xml / sitemap-categories.xml from Firestore
```

### Status pages already built in earlier phases
`404`-equivalent empty/error states, "product unavailable," "no search results," "order not found," and "permission denied" states were already implemented per-page as each feature was built (Shop's no-results state in Phase 2, Checkout's error alert in Phase 3, the standalone `404.html` here in Phase 7) rather than as a single generic component — see `.mz-empty-state` usage across `shared.js` callers and `.mz-page-error` in `static.css` for the shared visual pattern.

### PWA — what's real here vs. what needs a decision from you

- **Installable & offline-capable**: the manifest (Phase 1) plus this phase's service worker make the site installable and give it a graceful offline fallback for the app shell.
- **Not implemented**: push notifications through the browser's Push API (different from the in-app `/notifications` system built in Phase 6) — that requires VAPID keys and a user permission prompt, which is a product decision (do you want browser push at all?) rather than a default to bake in silently.

### Dynamic sitemap

Product and category pages can't go in a hand-written `sitemap.xml` — they change every time you add a product. Run `node scripts/generate-sitemap.js` after bulk catalog changes (or wire it to a scheduled Cloud Function later) to regenerate `sitemap-products.xml` / `sitemap-categories.xml`.

---

## ✅ Full Deployment Checklist

Run these once, in order, against your real Firebase project:

```bash
# 1. Install CLI + login
npm install -g firebase-tools
firebase login
firebase init   # select Hosting, Firestore, Realtime Database, Functions — point at this folder

# 2. Fill in real config
#    - public/js/services/firebase-init.js  → your Firebase web config
#    - public/js/env.js (copy from env.example.js) → your real ImgBB key
#    - firebase.json → confirm your project ID via `firebase use --add`

# 3. Deploy backend rules & functions
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
firebase deploy --only database
cd functions && npm install && cd ..
firebase deploy --only functions

# 4. Create your first admin (one-time)
cd scripts && npm install firebase-admin --no-save
node bootstrap-first-admin.js you@example.com
cd ..

# 5. Deploy the storefront
firebase deploy --only hosting

# 6. Post-deploy
node scripts/generate-sitemap.js   # after you've added real products/categories
#    Sign in as your admin account, go to /admin, add categories → products → a hero banner
```

### ⚠️ Header rule order matters in firebase.json

`/service-worker.js` must never be cached — browsers need to see updates immediately or customers get stuck on a stale version. Its `no-cache` header rule is placed **after** the general `**/*.@(css|js)` rule in `firebase.json`, because Firebase Hosting applies header rules in listed order and a later matching rule overrides the same header key from an earlier one. If you reorder these rules, move the general `.js` cache rule back above the `/service-worker.js` rule, or the service worker will get a long cache lifetime and updates won't reach users promptly.

---

## 🎉 Project Complete — What to Do Next

All 7 phases are built. Follow the **Deployment Checklist** above to go live. A few honest limitations worth knowing before you do:

- **Contact form has no backend yet** (see the note in `contact.html`) — it shows a success message but doesn't send or store anything. Wire it to a Cloud Function before relying on it.
- **Dashboard stats scan up to 2,000 recent records client-side** (Phase 5) — fine for a growing store, but replace with pre-computed aggregates if you cross into the tens of thousands of orders.
- **Browser push notifications** (the Push API, distinct from the in-app notification system) aren't implemented — a deliberate scope decision, not an oversight, since it needs your call on the permission-prompt UX.
- **Promoting admins beyond the first** currently requires calling the `setAdminRole` Cloud Function directly (e.g. via the Firebase Console's testing tool) — there's no dedicated "Add Admin" screen in the dashboard yet.
- This is a big, interconnected codebase built across many turns. Before putting real customer orders through it, test the full flow end-to-end yourself: browse → cart → checkout → track → admin fulfillment → review approval.

If you want any of these gaps closed, or a specific phase deepened further, just say which one.
