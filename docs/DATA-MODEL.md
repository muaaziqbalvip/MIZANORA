# MIZANORA — Firestore Data Model

Full field-level schema. Every collection below is created by app code the first time it's needed — Firestore doesn't require pre-declaring collections, but this doc is the contract for what fields every doc must have.

---

## `/products/{productId}`

```ts
{
  id: string,                 // == doc id
  title: string,
  titleLower: string,           // lowercase copy of title, written on every save — powers prefix search (see catalog-service.js searchProducts). Firestore can't lowercase in a query.
  slug: string,                // unique, url-safe, used in /product/{slug}
  description: string,         // full HTML-safe rich description
  shortDescription: string,    // shown on card / above the fold
  price: number,                // current selling price (PKR, integer)
  compareAtPrice: number | null, // strike-through price, null if no discount
  costPrice: number,            // admin-only, never sent to client queries that customers run
  sku: string,
  categoryId: string,           // ref -> /categories/{id}
  subcategoryId: string | null,
  images: string[],             // ImgBB URLs, first is primary
  thumbnail: string,            // ImgBB URL, optimized small version
  stock: number,
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock',
  featured: boolean,
  bestseller: boolean,
  active: boolean,              // false = hidden from storefront entirely
  tags: string[],
  rating: number,               // denormalized average, updated by moderateReview function
  reviewCount: number,          // denormalized count
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**Denormalization note:** `rating`/`reviewCount` are written only by the `moderateReview` Cloud Function when a review is approved — never computed client-side — so a customer can't inflate their own product's rating.

---

## `/categories/{categoryId}`

```ts
{
  id: string,
  name: string,
  slug: string,
  icon: string,          // icon key (see icon-map.js) or ImgBB URL
  parentId: string | null,
  order: number,          // manual sort order for nav
  active: boolean
}
```

---

## `/orders/{orderId}`

Order IDs are human-readable: `MZN-YYYYMMDD-####` (see `createOrder` function for generation logic — sequential counter kept in a `/counters/orders` doc, incremented via transaction to avoid collisions).

```ts
{
  orderId: string,             // "MZN-20260921-0001", also == doc id
  customerId: string | null,   // null for guest orders
  customerName: string,
  phone: string,
  email: string | null,
  address: string,
  city: string,
  province: string,
  postalCode: string | null,
  notes: string | null,
  items: [{
    productId: string,
    title: string,             // snapshot at time of order (product may change later)
    price: number,              // snapshot — the price actually charged
    quantity: number,
    thumbnail: string
  }],
  subtotal: number,             // computed server-side from snapshot prices
  shippingFee: number,
  discount: number,
  couponCode: string | null,
  total: number,                 // subtotal - discount + shippingFee, server-computed
  paymentMethod: 'cod',
  paymentStatus: 'pending' | 'paid' | 'refunded',
  orderStatus: 'placed' | 'confirmed' | 'processing' | 'packed'
             | 'shipped' | 'out_for_delivery' | 'delivered'
             | 'cancelled' | 'returned',
  trackingNumber: string | null,
  courier: string | null,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### `/orders/{orderId}/order_history/{eventId}` (subcollection)

```ts
{
  status: string,        // the orderStatus at this event
  note: string | null,
  changedBy: string,     // admin uid, or "system"
  timestamp: Timestamp
}
```

---

## `/customers/{uid}`

```ts
{
  uid: string,
  name: string,
  email: string,
  phone: string | null,
  createdAt: Timestamp
}
```

### `/customers/{uid}/addresses/{addressId}`
```ts
{ label: string, address: string, city: string, province: string, postalCode: string | null, isDefault: boolean }
```

### `/customers/{uid}/wishlist/{productId}`
```ts
{ addedAt: Timestamp }
```

### `/customers/{uid}/cart/{itemId}`
```ts
{ productId: string, quantity: number, addedAt: Timestamp }
```

---

## `/reviews/{reviewId}`

```ts
{
  productId: string,
  orderId: string,          // proves purchase — only deliverable orders can be reviewed
  customerId: string,
  customerName: string,
  rating: number,           // 1-5
  title: string,
  comment: string,
  images: string[],          // optional, ImgBB URLs
  status: 'pending' | 'approved' | 'rejected',
  createdAt: Timestamp
}
```

---

## `/coupons/{couponId}`

**Convention: `couponId` (the document ID) must equal the uppercase `code`.** The `createOrder` and `validateCoupon` Cloud Functions look coupons up by `doc(code.toUpperCase())` directly — not by a `where("code", "==", ...)` query — so a coupon created with doc ID `SAVE20` and `code: "SAVE20"` works; a mismatched doc ID silently fails to be found.

```ts
{
  code: string,               // uppercase, unique — MUST match the document ID
  type: 'percentage' | 'fixed',
  discount: number,           // 15 (=15%) or 500 (=Rs.500) depending on type
  minimumOrder: number,
  maximumDiscount: number | null,   // caps a percentage discount
  expiry: Timestamp,
  usageLimit: number,
  usedCount: number,
  active: boolean
}
```

---

## `/banners/{bannerId}`

```ts
{
  type: 'hero' | 'promo' | 'announcement',
  title: string,
  subtitle: string | null,
  image: string | null,        // ImgBB URL
  ctaText: string | null,
  ctaLink: string | null,
  order: number,
  active: boolean,
  startsAt: Timestamp | null,
  endsAt: Timestamp | null
}
```

---

## `/store_content/{docId}`

Freeform homepage-section documents keyed by a known id (`homepage_sections`, `about_page`, `faq`, etc.) so admin can toggle/reorder sections without redeploying:

```ts
{
  sections: [
    { type: 'categories' | 'featured' | 'bestsellers' | 'reviews' | 'newsletter', visible: boolean, order: number }
  ]
}
```

---

## `/admins/{uid}`
```ts
{ uid: string, name: string, addedBy: string, addedAt: Timestamp }
```
(Written only by `setAdminRole` Cloud Function — see FIREBASE-ARCHITECTURE.md §6.)

---

## `/notifications/{notificationId}`
```ts
{
  audience: 'all' | 'customer',
  customerId: string | null,
  type: 'announcement' | 'order_update' | 'promotion' | 'system',
  title: string,
  body: string,
  createdAt: Timestamp
}
```
