// =====================================================================
// MIZANORA — Shared storefront UI helpers
//
// Every page (home, shop, category, product, search) renders product
// cards and a navbar the same way. Centralizing it here means Phase 3+
// pages don't re-implement this, and a design tweak happens once.
// =====================================================================

import { addToCart, getCartCount } from "./services/cart-store.js";
import { toggleWishlist, isWishlisted, hydrateLocalWishlist } from "./services/wishlist-store.js";
import { onAuthChange, getCurrentUser } from "./services/auth-service.js";
import { addToFirestoreWishlist, removeFromFirestoreWishlist, getFirestoreWishlist } from "./services/customer-service.js";
import { icon } from "./utils/icons.js";
import { formatPKR, discountPercent } from "./utils/format.js";

export const CATEGORY_ICON_MAP = {
  electronics: "phone", fashion: "shirt", "home-living": "houseHeart",
  beauty: "drop", "sports-fitness": "dumbbell", books: "book",
  "toys-kids": "teddy", "islamic-products": "moon", default: "grid"
};

const NAV_ICON_MAP = {
  "search-icon-btn": "search", "cart-icon-slot": "cart",
  "wishlist-icon-btn": "heart", "account-icon-btn": "user",
  "hamburger-btn": "menu",
  "ic-bn-home": "home", "ic-bn-shop": "grid", "ic-bn-cat": "grid",
  "ic-bn-wish": "heart", "ic-bn-acc": "user"
};

let wishlistHydratedForUid = null;

/** Call once per page load — injects standard nav icons and wires cart badge + mobile menu. */
export function initShell() {
  for (const [id, name] of Object.entries(NAV_ICON_MAP)) {
    const el = document.getElementById(id);
    if (el && !el.innerHTML.trim()) el.innerHTML = icon(name);
  }
  renderCartBadge();
  window.addEventListener("mz:cart-updated", renderCartBadge);

  const hamburger = document.getElementById("hamburger-btn");
  const mobileMenu = document.getElementById("mobile-menu");
  if (hamburger && mobileMenu) {
    hamburger.addEventListener("click", () => mobileMenu.classList.toggle("is-open"));
  }

  // Keep the local wishlist cache in sync with Firestore for logged-in
  // users, so hearts render correctly on every page — not just /account,
  // which does its own (more thorough, guest-merge-aware) hydration.
  onAuthChange((user) => {
    if (user && wishlistHydratedForUid !== user.uid) {
      wishlistHydratedForUid = user.uid;
      getFirestoreWishlist(user.uid)
        .then(hydrateLocalWishlist)
        .catch((err) => console.warn("[MIZANORA] Wishlist hydration failed:", err));
    } else if (!user) {
      wishlistHydratedForUid = null;
    }
  });

  registerServiceWorker();
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  // Registered once per page load; the browser dedupes if already registered.
  navigator.serviceWorker.register("/service-worker.js").catch((err) => {
    console.warn("[MIZANORA] Service worker registration failed:", err);
  });
}

export function renderCartBadge() {
  const badge = document.getElementById("cart-badge");
  if (!badge) return;
  const count = getCartCount();
  badge.textContent = count;
  badge.style.display = count > 0 ? "flex" : "none";
}

export function escapeHtml(str = "") {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

export function productCardHtml(p) {
  const disc = discountPercent(p.price, p.compareAtPrice);
  const wished = isWishlisted(p.id);
  const outOfStock = p.stockStatus === "out_of_stock" || p.stock === 0;
  return `
    <div class="mz-pcard mz-reveal" data-id="${p.id}">
      <a href="/product/${p.slug || p.id}" class="mz-pcard__media">
        ${disc > 0 ? `<span class="mz-pcard__badge">-${disc}%</span>` : ""}
        ${outOfStock ? `<span class="mz-pcard__badge" style="left:auto;right:44px;background:var(--mz-text-faint);color:var(--mz-black);">Sold Out</span>` : ""}
        <img src="${p.thumbnail || p.images?.[0] || ""}" alt="${escapeHtml(p.title)}" loading="lazy" />
      </a>
      <button class="mz-pcard__wish ${wished ? "is-active" : ""}" data-wish="${p.id}" aria-label="Toggle wishlist">
        ${icon("heart")}
      </button>
      <div class="mz-pcard__body">
        <span class="mz-pcard__cat">${escapeHtml(p.tags?.[0] || "")}</span>
        <a href="/product/${p.slug || p.id}" class="mz-pcard__title">${escapeHtml(p.title)}</a>
        <span class="mz-pcard__rating">${icon("star")} ${(p.rating || 0).toFixed(1)} (${p.reviewCount || 0})</span>
        <div class="mz-pcard__price-row">
          <span class="mz-pcard__price">${formatPKR(p.price)}</span>
          ${p.compareAtPrice ? `<span class="mz-pcard__compare">${formatPKR(p.compareAtPrice)}</span>` : ""}
        </div>
        <button class="mz-pcard__add" data-add="${p.id}" ${outOfStock ? "disabled" : ""}>
          ${outOfStock ? "Out of Stock" : "Add to Cart"}
        </button>
      </div>
    </div>
  `;
}

/** Bind click handlers for a container that was just filled with productCardHtml() output. */
export function bindProductCardEvents(container, products) {
  container.querySelectorAll("[data-add]:not(:disabled)").forEach((btn) => {
    btn.addEventListener("click", () => {
      const product = products.find((p) => p.id === btn.dataset.add);
      if (!product) return;
      addToCart(product);
      btn.dataset.state = "added";
      btn.textContent = "Added ✓";
      setTimeout(() => {
        btn.dataset.state = "";
        btn.textContent = "Add to Cart";
      }, 1400);
    });
  });

  container.querySelectorAll("[data-wish]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const productId = btn.dataset.wish;
      const isNowWished = toggleWishlist(productId);
      btn.classList.toggle("is-active", isNowWished);

      const user = getCurrentUser();
      if (user) {
        const syncFn = isNowWished ? addToFirestoreWishlist : removeFromFirestoreWishlist;
        syncFn(user.uid, productId).catch((err) =>
          console.warn("[MIZANORA] Wishlist Firestore sync failed:", err)
        );
      }
    });
  });
}

export function emptyStateHtml({ title, sub, iconName = "search", ctaHtml = "" }) {
  return `
    <div class="mz-empty-state">
      ${icon(iconName)}
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(sub)}</p>
      ${ctaHtml}
    </div>
  `;
}

export function skeletonCards(n = 8) {
  return Array.from({ length: n })
    .map(() => `<div class="mz-skeleton" style="aspect-ratio:0.72;"></div>`)
    .join("");
}
