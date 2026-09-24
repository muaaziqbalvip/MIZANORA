// =====================================================================
// MIZANORA — Cart store (client-side state shell)
//
// Phase 1 scope: local cart count + add/remove used by product cards
// on the homepage. Full cart page, quantity editing, and Firestore
// sync for logged-in users lands in Phase 3 (Cart & Checkout). This
// file is intentionally the single source of truth from day one so
// later phases extend it rather than replace it.
// =====================================================================

const CART_KEY = "mizanora_cart_v1";

function readCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("mz:cart-updated", { detail: { items } }));
}

export function getCart() {
  return readCart();
}

export function getCartCount() {
  return readCart().reduce((sum, item) => sum + item.quantity, 0);
}

export function addToCart(product, quantity = 1) {
  const items = readCart();
  const existing = items.find((i) => i.productId === product.id);
  if (existing) {
    existing.quantity += quantity;
  } else {
    items.push({
      productId: product.id,
      title: product.title,
      price: product.price,
      thumbnail: product.thumbnail,
      quantity
    });
  }
  writeCart(items);
  return items;
}

export function removeFromCart(productId) {
  const items = readCart().filter((i) => i.productId !== productId);
  writeCart(items);
  return items;
}

export function updateQuantity(productId, quantity) {
  const items = readCart();
  const item = items.find((i) => i.productId === productId);
  if (item) {
    item.quantity = Math.max(1, quantity);
    writeCart(items);
  }
  return items;
}

export function isInCart(productId) {
  return readCart().some((i) => i.productId === productId);
}
