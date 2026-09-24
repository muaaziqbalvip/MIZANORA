# MIZANORA — Required Firestore Composite Indexes

Firestore auto-suggests these the first time a query runs and fails in the browser console (with a direct "Create Index" link) — but listing them here means you can create them all upfront via the CLI instead of discovering them one at a time in production.

Deploy with:
```bash
firebase deploy --only firestore:indexes
```
(requires a `firestore.indexes.json` — generate it by clicking each auto-suggested link once in a dev project, then export, or hand-write from the list below.)

## Required composite indexes

| Collection | Fields (in order) | Used by |
|---|---|---|
| `products` | `active` ASC, `featured` ASC, `createdAt` DESC | `getFeaturedProducts` |
| `products` | `active` ASC, `bestseller` ASC, `rating` DESC | `getBestsellers` |
| `products` | `active` ASC, `createdAt` DESC | `getNewArrivals`, `getShopProducts` (sort=newest, no category) |
| `products` | `active` ASC, `categoryId` ASC, `createdAt` DESC | `getShopProducts` (sort=newest, with category) |
| `products` | `active` ASC, `categoryId` ASC, `price` ASC | `getShopProducts` (sort=price_asc, with category) |
| `products` | `active` ASC, `categoryId` ASC, `price` DESC | `getShopProducts` (sort=price_desc, with category) |
| `products` | `active` ASC, `categoryId` ASC, `rating` DESC | `getShopProducts` (sort=rating, with category), `getRelatedProducts` |
| `products` | `active` ASC, `price` ASC | `getShopProducts` (sort=price_asc, no category) |
| `products` | `active` ASC, `price` DESC | `getShopProducts` (sort=price_desc, no category) |
| `products` | `active` ASC, `rating` DESC | `getShopProducts` (sort=rating, no category) |
| `products` | `active` ASC, `titleLower` ASC | `searchProducts` (title prefix match) |
| `products` | `active` ASC, `tags` ARRAY, (no extra sort needed) | `searchProducts` (tag match) — single-field, usually auto-indexed |
| `categories` | `active` ASC, `order` ASC | `getActiveCategories` |
| `banners` | `active` ASC, `type` ASC, `order` ASC | `getActiveBanners` |
| `reviews` | `status` ASC, `createdAt` DESC | `getApprovedReviews` |
| `reviews` | `productId` ASC, `status` ASC, `createdAt` DESC | `getReviewsForProduct` |
| `orders` | `customerId` ASC, `createdAt` DESC | `getCustomerOrders` (Phase 4 — account order history) |

**Note:** Firestore does not need a composite index for a single `where` + `orderBy` on the *same* field, or for single-field equality/array-contains alone — only for combinations across different fields. The table above already excludes those.
