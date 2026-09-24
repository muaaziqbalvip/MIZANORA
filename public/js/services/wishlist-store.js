// MIZANORA — Wishlist store (localStorage shell; Firestore sync for
// logged-in users added in Phase 4: Customer Account).

const WISHLIST_KEY = "mizanora_wishlist_v1";

function readWishlist() {
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeWishlist(ids) {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent("mz:wishlist-updated", { detail: { ids } }));
}

export function getWishlist() {
  return readWishlist();
}

export function isWishlisted(productId) {
  return readWishlist().includes(productId);
}

export function toggleWishlist(productId) {
  const ids = readWishlist();
  const idx = ids.indexOf(productId);
  if (idx > -1) {
    ids.splice(idx, 1);
  } else {
    ids.push(productId);
  }
  writeWishlist(ids);
  return ids.includes(productId);
}

/** Called once after a guest's wishlist is merged into their new/existing account. */
export function clearLocalWishlist() {
  writeWishlist([]);
}

/**
 * Replaces the local cache wholesale with the authoritative list from
 * Firestore — called once on login so product cards site-wide show the
 * correct wishlist state without each card doing its own Firestore read.
 */
export function hydrateLocalWishlist(remoteIds) {
  writeWishlist(remoteIds);
}
