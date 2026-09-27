// =====================================================================
// MIZANORA — Recently Viewed Products
//
// Purely a client-side convenience (localStorage), same pattern as the
// cart/wishlist stores. Keeps the last N products the visitor opened,
// most-recent first, so both guests and logged-in customers see it.
// =====================================================================

const STORAGE_KEY = "mizanora_recently_viewed_v1";
const MAX_ITEMS = 12;

function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function write(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* storage full/unavailable — silently skip, this is a non-critical feature */
  }
}

/** Call on a product page with the loaded product — records/moves it to the front. */
export function trackProductView(product) {
  if (!product?.id) return;
  const list = read().filter((p) => p.id !== product.id);
  list.unshift({
    id: product.id,
    slug: product.slug,
    title: product.title,
    thumbnail: product.thumbnail || product.images?.[0] || "",
    price: product.price,
    compareAtPrice: product.compareAtPrice || null,
    rating: product.rating || 0,
    reviewCount: product.reviewCount || 0,
    tags: product.tags || [],
    stockStatus: product.stockStatus || null,
    stock: product.stock ?? null
  });
  write(list.slice(0, MAX_ITEMS));
}

/** Returns recently viewed products, most-recent first, optionally excluding one id (the current product page). */
export function getRecentlyViewed(excludeId = null, max = 8) {
  return read().filter((p) => p.id !== excludeId).slice(0, max);
}
