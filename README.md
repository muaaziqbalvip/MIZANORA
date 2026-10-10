# MIZANORA Store
Next.js 15 (App Router) + Tailwind + Firebase + Meta Pixel/CAPI + installable PWA. See SETUP.md.
Checks without installing: `node scripts/check.js` (syntax and imports).

## Firestore reads (quota saver)
Products/banners/reels are read from Firestore ONCE and shared by all pages through Next's data cache (tag `catalog`, see `lib/products.js`).
Visitors and bots never trigger Firestore reads. The cache refreshes when the admin saves something (`/api/revalidate`) or after 6 hours
(change with env var `CATALOG_CACHE_SECONDS`). Admin lists are cached in the browser session and updated locally after saves; orders load 100 at a time.
