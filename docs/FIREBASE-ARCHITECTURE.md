# MIZANORA — Firebase Architecture

This document explains **why** each piece of data lives where it lives. Read this before touching the schema — it's the contract the whole app is built against.

---

## 1. The core rule

> **Firestore = permanent business records. Realtime Database = live, ephemeral state. Storage = files. Auth = identity. Cloud Functions = anything that must not be trusted to the browser.**

We never store the same fact as the *source of truth* in two places. Where RTDB shows a live mirror of something (e.g. order status), Firestore remains the record of truth and RTDB is written *after* Firestore, by the same trusted write path (a Cloud Function), never independently.

---

## 2. Firestore — structured, permanent, queryable

Firestore is used for anything that needs: complex queries, pagination, strong consistency for business records, and long-term history.

```
/products/{productId}
/categories/{categoryId}
/collections/{collectionId}
/orders/{orderId}
/customers/{customerId}
/reviews/{reviewId}
/coupons/{couponId}
/banners/{bannerId}
/admins/{uid}
/resellers/{resellerId}
/notifications/{notificationId}
/store_content/{docId}          // homepage CMS blocks
/order_history/{orderId}/events/{eventId}   // subcollection: audit trail per order
```

### Why these live in Firestore
- **Products, categories, orders, customers** — these are the permanent business ledger. We need `where()`/`orderBy()` queries (filter by category, price range, stock status), pagination (`startAfter`), and they must survive forever with full history.
- **Reviews, coupons, banners** — structured documents with moderation workflows (pending/approved/rejected) that benefit from Firestore's query filters.
- **order_history subcollection** — an immutable audit trail (status changes, who changed them, when) — append-only, never mutated, exactly what Firestore subcollections are for.

---

## 3. Realtime Database — live, ephemeral, high-frequency

RTDB is used only for state that (a) changes often, (b) many clients need to see instantly, and (c) doesn't need complex querying.

```
/live_orders/{orderId}
    status: "out_for_delivery"
    updatedAt: <server timestamp>

/stock_counters/{productId}
    stock: 14

/store_settings
    isStoreOpen: true
    announcementBar: { text, active }
    codEnabled: true

/admin_presence/{uid}
    online: true
    lastSeen: <timestamp>

/live_notifications/{customerId}/{notifId}
    title, body, read, createdAt

/cart_sessions/{sessionId}      // guest cart only — logged-in cart lives in Firestore /customers/{id}/cart
    items: {...}
    updatedAt
```

### Why these live in RTDB
- **live_orders** — customer's order-tracking screen needs sub-second push updates on status change without polling Firestore. RTDB's `onValue` listener is cheaper and faster for this single-key watch.
- **stock_counters** — a mirror, not the source of truth. The *authoritative* stock number lives on the Firestore product document; this mirror lets the product page show "3 left!" reactively without a Firestore listener per visitor. Written only by the order-creation Cloud Function, right after it decrements Firestore stock.
- **store_settings / announcement bar** — admin flips a switch, every open tab updates instantly, no rebuild/redeploy.
- **admin_presence** — classic RTDB `onDisconnect()` use case.
- **cart_sessions (guest only)** — cheap, ephemeral, auto-expires in practice; doesn't need Firestore's document read/write cost for a cart someone abandons in 2 minutes. Logged-in users get a proper Firestore cart subcollection since it should persist reliably across devices.

---

## 4. Storage

```
/products/{productId}/{filename}
/reviews/{reviewId}/{filename}
/banners/{filename}
/admin-uploads/{uid}/{filename}
```

**Decision on file hosting:** per your instruction, product/review images are uploaded via **ImgBB** (`api.imgbb.com/1/upload`) rather than Firebase Storage, to keep the media pipeline simple for a solo-founder workflow. The Firestore product document stores the returned ImgBB URL (`images: [url, ...]`) rather than a Storage path. Firebase Storage paths above are kept in the architecture for `admin-uploads` (e.g. CSV imports, invoices) since ImgBB is images-only.

**Security implication:** the ImgBB key is a write-only upload credential with no read-side secrets to protect, but it is still a credential — it must live in an environment variable (`IMGBB_API_KEY` via `.env`), never hardcoded into shipped JS. See Section 7.

---

## 5. Authentication

- Firebase Authentication: Email/Password + Google Sign-In (optional).
- **Guest checkout is always allowed** — COD orders never require login, per spec Section 11.
- Admin role is **not** a Firestore field a client can set. It's granted via a custom claim (`admin: true`) set only by a Cloud Function that itself checks the caller is already an existing admin (or, for the very first admin, via the Firebase Admin SDK from the CLI — see README "First Admin Setup").

---

## 6. Cloud Functions — the trust boundary

Functions exist wherever a client **must not** be trusted to compute or assert a value.

| Function | Trigger | Why it must be server-side |
|---|---|---|
| `createOrder` | Callable | Recomputes price/discount/subtotal/total from **Firestore product data**, ignoring any price the client sent. Validates stock ≥ quantity. Decrements stock atomically (transaction). Writes the Firestore order, then mirrors status to RTDB `/live_orders/{orderId}`. |
| `updateOrderStatus` | Callable (admin only) | Checks custom claim `admin === true` before writing. Updates Firestore order + appends to `order_history` subcollection + mirrors to RTDB. |
| `setAdminRole` | Callable (admin only) | Only an existing admin can promote another uid. Sets custom claim + writes `/admins/{uid}`. |
| `validateCoupon` | Callable | Server checks expiry, usage limit, minimum order — client never self-approves a discount. |
| `moderateReview` | Callable (admin only) | Flips review status; only approved reviews are ever readable by `list` queries (enforced by rules, not just UI). |

This is the direct fix for spec Section 33 ("do not blindly trust client-side price/discount/stock/total").

---

## 7. Environment & secrets

```
.env.example
  FIREBASE_API_KEY=
  FIREBASE_AUTH_DOMAIN=
  FIREBASE_PROJECT_ID=
  FIREBASE_STORAGE_BUCKET=
  FIREBASE_MESSAGING_SENDER_ID=
  FIREBASE_APP_ID=
  FIREBASE_DATABASE_URL=
  IMGBB_API_KEY=
```

Firebase's client config (apiKey, projectId, etc.) is **safe to expose** — it's not a secret, it identifies the project; real protection comes from Security Rules, not from hiding this config. The **ImgBB key** and any future Firebase **service-account** key are the only true secrets and must never appear in code shipped to the browser or committed to git — service-account keys are only ever used inside Cloud Functions' own runtime, which the browser never sees.
