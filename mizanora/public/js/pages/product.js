// =====================================================================
// MIZANORA — Product Detail page controller
// =====================================================================

import {
  getProductBySlug, getProductById, getRelatedProducts, getReviewsForProduct
} from "../services/catalog-service.js";
import { addToCart } from "../services/cart-store.js";
import { toggleWishlist, isWishlisted } from "../services/wishlist-store.js";
import { icon } from "../utils/icons.js";
import { formatPKR, discountPercent, initials, initScrollReveal } from "../utils/format.js";
import {
  initShell, productCardHtml, bindProductCardEvents, emptyStateHtml, escapeHtml
} from "../shared.js";

const slugOrId = location.pathname.split("/product/")[1]?.replace(/\/$/, "")
  || new URLSearchParams(location.search).get("slug")
  || "";

let quantity = 1;
let currentProduct = null;

init();

async function init() {
  initShell();

  if (!slugOrId) {
    showNotFound();
    return;
  }

  // try slug first (canonical, SEO-friendly), fall back to raw id
  currentProduct = await getProductBySlug(slugOrId).catch(() => null);
  if (!currentProduct) currentProduct = await getProductById(slugOrId).catch(() => null);

  if (!currentProduct) {
    showNotFound();
    return;
  }

  document.title = `${currentProduct.title} — MIZANORA`;
  updateMetaTags(currentProduct);
  renderProduct(currentProduct);
  bindTabs();
  bindGalleryZoom();

  const [reviews, related] = await Promise.all([
    getReviewsForProduct(currentProduct.id).catch(() => []),
    getRelatedProducts(currentProduct.categoryId, currentProduct.id).catch(() => [])
  ]);

  renderReviews(reviews);
  renderRelated(related);
  initScrollReveal();
}

function showNotFound() {
  const root = document.getElementById("pdp-root");
  if (!root) return;
  root.innerHTML = emptyStateHtml({
    title: "Product not found",
    sub: "This product may be out of stock, unpublished, or the link is incorrect.",
    iconName: "search",
    ctaHtml: `<a href="/shop" class="mz-btn mz-btn--primary">Continue Shopping</a>`
  });
}

function updateMetaTags(p) {
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute("content", p.shortDescription || p.description?.slice(0, 155) || "");

  const schema = document.createElement("script");
  schema.type = "application/ld+json";
  schema.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    description: p.shortDescription || "",
    image: p.images || [p.thumbnail],
    sku: p.sku,
    offers: {
      "@type": "Offer",
      priceCurrency: "PKR",
      price: p.price,
      availability: p.stockStatus === "out_of_stock" ? "https://schema.org/OutOfStock" : "https://schema.org/InStock"
    },
    aggregateRating: p.reviewCount > 0 ? {
      "@type": "AggregateRating",
      ratingValue: p.rating,
      reviewCount: p.reviewCount
    } : undefined
  });
  document.head.appendChild(schema);
}

function renderProduct(p) {
  const images = p.images?.length ? p.images : [p.thumbnail].filter(Boolean);
  const disc = discountPercent(p.price, p.compareAtPrice);
  const stock = p.stockStatus || (p.stock > 5 ? "in_stock" : p.stock > 0 ? "low_stock" : "out_of_stock");
  const stockLabel = { in_stock: "In Stock", low_stock: `Only ${p.stock} left`, out_of_stock: "Out of Stock" }[stock];
  const stockClass = { in_stock: "in-stock", low_stock: "low-stock", out_of_stock: "out-of-stock" }[stock];

  document.getElementById("pdp-root").innerHTML = `
    <div class="mz-pdp">
      <div class="mz-pdp-gallery">
        <div class="mz-pdp-gallery__main" id="gallery-main">
          <img src="${images[0] || ""}" alt="${escapeHtml(p.title)}" id="gallery-main-img" />
        </div>
        ${images.length > 1 ? `
        <div class="mz-pdp-gallery__thumbs">
          ${images.map((img, i) => `
            <button class="mz-pdp-gallery__thumb ${i === 0 ? "is-active" : ""}" data-img="${img}">
              <img src="${img}" alt="" loading="lazy" />
            </button>
          `).join("")}
        </div>` : ""}
      </div>

      <div class="mz-pdp-info">
        <span class="mz-pdp-info__cat">${escapeHtml(p.tags?.[0] || "")}</span>
        <h1>${escapeHtml(p.title)}</h1>
        <div class="mz-pdp-info__rating">
          <span class="stars">${Array.from({ length: 5 }).map((_, i) => `<span style="opacity:${i < Math.round(p.rating || 0) ? 1 : 0.25}">${icon("star")}</span>`).join("")}</span>
          <span>${(p.rating || 0).toFixed(1)} (${p.reviewCount || 0} reviews)</span>
        </div>
        <div class="mz-pdp-info__price-row">
          <span class="mz-pdp-info__price">${formatPKR(p.price)}</span>
          ${p.compareAtPrice ? `<span class="mz-pdp-info__compare">${formatPKR(p.compareAtPrice)}</span>` : ""}
          ${disc > 0 ? `<span class="mz-pdp-info__badge-disc">-${disc}%</span>` : ""}
        </div>
        <div class="mz-pdp-info__stock ${stockClass}"><span class="dot"></span>${stockLabel}</div>

        <p class="mz-pdp-info__short">${escapeHtml(p.shortDescription || "")}</p>

        <div style="display:flex;align-items:center;gap:var(--mz-space-4);margin-bottom:var(--mz-space-5);">
          <div class="mz-qty-selector">
            <button id="qty-minus" aria-label="Decrease quantity">−</button>
            <span id="qty-value">1</span>
            <button id="qty-plus" aria-label="Increase quantity" ${stock === "out_of_stock" ? "disabled" : ""}>+</button>
          </div>
        </div>

        <div class="mz-pdp-actions">
          <button class="mz-btn mz-btn--outline mz-btn--lg" id="add-cart-btn" ${stock === "out_of_stock" ? "disabled" : ""}>
            ${icon("cart")} Add to Cart
          </button>
          <button class="mz-btn mz-btn--primary mz-btn--lg" id="buy-now-btn" ${stock === "out_of_stock" ? "disabled" : ""}>
            Buy Now
          </button>
          <button class="mz-pdp-wish-btn ${isWishlisted(p.id) ? "is-active" : ""}" id="wish-btn" aria-label="Toggle wishlist">
            ${icon("heart")}
          </button>
        </div>

        <div class="mz-pdp-meta">
          <div class="mz-pdp-meta__row">${icon("truck")} Delivery in 3–5 business days across Pakistan</div>
          <div class="mz-pdp-meta__row">${icon("refresh")} Easy returns within 7 days of delivery</div>
          <div class="mz-pdp-meta__row">${icon("shield")} Cash on Delivery — pay when it arrives</div>
        </div>
      </div>
    </div>

    <div class="mz-pdp-tabs">
      <div class="mz-pdp-tabs__nav">
        <button class="mz-pdp-tabs__btn is-active" data-tab="description">Description</button>
        <button class="mz-pdp-tabs__btn" data-tab="specs">Specifications</button>
        <button class="mz-pdp-tabs__btn" data-tab="reviews">Reviews (${p.reviewCount || 0})</button>
      </div>
      <div class="mz-pdp-tabs__panel is-active" id="tab-description">
        ${escapeHtml(p.description || "No description available.").replace(/\n/g, "<br>")}
      </div>
      <div class="mz-pdp-tabs__panel" id="tab-specs">
        <table style="width:100%;border-collapse:collapse;">
          <tbody>
            <tr><td style="padding:8px 0;color:var(--mz-text-faint);">SKU</td><td style="padding:8px 0;">${escapeHtml(p.sku || "—")}</td></tr>
            <tr><td style="padding:8px 0;color:var(--mz-text-faint);">Category</td><td style="padding:8px 0;">${escapeHtml(p.tags?.[0] || "—")}</td></tr>
          </tbody>
        </table>
      </div>
      <div class="mz-pdp-tabs__panel" id="tab-reviews">
        <div id="reviews-container"></div>
      </div>
    </div>

    <div class="mz-related" id="related-container"></div>
  `;

  bindProductActions(p);
}

function bindProductActions(p) {
  const qtyValue = document.getElementById("qty-value");
  document.getElementById("qty-minus").addEventListener("click", () => {
    quantity = Math.max(1, quantity - 1);
    qtyValue.textContent = quantity;
  });
  document.getElementById("qty-plus").addEventListener("click", () => {
    quantity = Math.min(p.stock || 99, quantity + 1);
    qtyValue.textContent = quantity;
  });

  document.getElementById("add-cart-btn").addEventListener("click", (e) => {
    addToCart(p, quantity);
    const btn = e.currentTarget;
    const original = btn.innerHTML;
    btn.innerHTML = "Added ✓";
    setTimeout(() => (btn.innerHTML = original), 1400);
  });

  document.getElementById("buy-now-btn").addEventListener("click", () => {
    addToCart(p, quantity);
    location.href = "/checkout";
  });

  document.getElementById("wish-btn").addEventListener("click", (e) => {
    const active = toggleWishlist(p.id);
    e.currentTarget.classList.toggle("is-active", active);
  });

  document.querySelectorAll(".mz-pdp-gallery__thumb").forEach((thumb) => {
    thumb.addEventListener("click", () => {
      document.getElementById("gallery-main-img").src = thumb.dataset.img;
      document.querySelectorAll(".mz-pdp-gallery__thumb").forEach((t) => t.classList.remove("is-active"));
      thumb.classList.add("is-active");
    });
  });
}

function bindTabs() {
  document.querySelectorAll(".mz-pdp-tabs__btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".mz-pdp-tabs__btn").forEach((b) => b.classList.remove("is-active"));
      document.querySelectorAll(".mz-pdp-tabs__panel").forEach((p) => p.classList.remove("is-active"));
      btn.classList.add("is-active");
      document.getElementById(`tab-${btn.dataset.tab}`)?.classList.add("is-active");
    });
  });
}

function bindGalleryZoom() {
  const main = document.getElementById("gallery-main");
  main?.addEventListener("click", () => main.classList.toggle("is-zoomed"));
}

function renderReviews(reviews) {
  const summaryHost = document.getElementById("tab-reviews");
  const container = document.getElementById("reviews-container");
  if (!container) return;

  if (reviews.length === 0) {
    container.innerHTML = emptyStateHtml({
      title: "No reviews yet",
      sub: "Be the first to review this product after your order is delivered.",
      iconName: "star"
    });
    return;
  }

  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  container.innerHTML = `
    <div class="mz-review-summary">
      <div class="mz-review-summary__score">${avg.toFixed(1)}</div>
      <div>
        <div class="mz-review-summary__stars">${Array.from({ length: 5 }).map((_, i) => `<span style="opacity:${i < Math.round(avg) ? 1 : 0.25}">${icon("star")}</span>`).join("")}</div>
        <div class="mz-review-summary__count">Based on ${reviews.length} review${reviews.length === 1 ? "" : "s"}</div>
      </div>
    </div>
    <div class="mz-review-list">
      ${reviews.map((r) => `
        <div class="mz-review-card">
          <div class="mz-review-card__stars">${Array.from({ length: 5 }).map((_, i) => `<span style="opacity:${i < r.rating ? 1 : 0.25}">${icon("star")}</span>`).join("")}</div>
          ${r.title ? `<strong style="display:block;color:var(--mz-text);margin-bottom:6px;font-size:0.9rem;">${escapeHtml(r.title)}</strong>` : ""}
          <p>${escapeHtml(r.comment || "")}</p>
          <div class="mz-review-card__who">
            <span class="mz-review-card__avatar">${initials(r.customerName)}</span>
            <div><div class="mz-review-card__name">${escapeHtml(r.customerName || "Customer")}</div></div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderRelated(related) {
  const container = document.getElementById("related-container");
  if (!container || related.length === 0) return;

  container.innerHTML = `
    <div class="mz-section__head"><h2>You May Also Like</h2></div>
    <div class="mz-product-grid" id="related-grid">
      ${related.map(productCardHtml).join("")}
    </div>
  `;
  bindProductCardEvents(document.getElementById("related-grid"), related);
}
