// =====================================================================
// MIZANORA — Home page controller
// =====================================================================

import {
  getFeaturedProducts, getBestsellers, getNewArrivals,
  getActiveCategories, getApprovedReviews, getActiveBanners
} from "../services/catalog-service.js";
import { icon } from "../utils/icons.js";
import { initials, initScrollReveal } from "../utils/format.js";
import {
  initShell, CATEGORY_ICON_MAP, productCardHtml, bindProductCardEvents,
  emptyStateHtml, escapeHtml
} from "../shared.js";

init();

async function init() {
  initShell();
  initHeroParticles();

  const [categories, featured, bestsellers, newArrivals, reviews, heroBanners, announcementBanners] = await Promise.all([
    getActiveCategories().catch(() => []),
    getFeaturedProducts().catch(() => []),
    getBestsellers().catch(() => []),
    getNewArrivals(8).catch(() => []),
    getApprovedReviews().catch(() => []),
    getActiveBanners("hero", 1).catch(() => []),
    getActiveBanners("announcement", 1).catch(() => [])
  ]);

  renderHero(heroBanners[0] || null);
  renderAnnouncementBar(announcementBanners[0] || null);
  renderCategories(categories);
  renderProductSection("featured-grid", featured);
  renderProductSection("bestsellers-grid", bestsellers);
  renderProductSection("new-arrivals-grid", newArrivals);
  renderReviews(reviews);

  hideLoader();
  initScrollReveal();
}

/**
 * Admin-controlled hero (Phase 6 CMS) overrides the static markup baked
 * into index.html when a hero banner exists in Firestore. A brand-new
 * store with no banners configured yet keeps the original hardcoded
 * hero — never a broken empty section.
 */
function renderHero(banner) {
  if (!banner) return; // keep the static hero already in the HTML

  const eyebrow = document.querySelector(".mz-hero__eyebrow");
  const heading = document.querySelector(".mz-hero h1");
  const sub = document.querySelector(".mz-hero__sub");
  const ctaPrimary = document.querySelector(".mz-hero__ctas .mz-btn--primary");
  const visualImg = document.querySelector(".mz-hero__visual img");

  if (heading) heading.textContent = banner.title || heading.textContent;
  if (sub && banner.subtitle) sub.textContent = banner.subtitle;
  if (ctaPrimary && banner.ctaText) {
    ctaPrimary.textContent = banner.ctaText;
    if (banner.ctaLink) ctaPrimary.setAttribute("href", banner.ctaLink);
  }
  if (visualImg && banner.image) {
    visualImg.src = banner.image;
    visualImg.style.objectFit = "cover";
  }
  if (eyebrow) eyebrow.style.display = banner.title ? "" : "none";
}

function renderAnnouncementBar(banner) {
  const bar = document.getElementById("announcement-bar");
  if (!bar || !banner) return;
  bar.textContent = banner.title || "";
  bar.style.display = banner.title ? "block" : "none";
}

function renderCategories(categories) {
  const grid = document.getElementById("category-grid");
  if (!grid) return;

  if (categories.length === 0) {
    grid.innerHTML = emptyStateHtml({
      title: "No categories yet",
      sub: "Add categories from the admin panel to populate this section.",
      iconName: "grid"
    });
    return;
  }

  grid.innerHTML = categories.map((cat) => `
    <a href="/category/${cat.slug}" class="mz-cat-card mz-reveal">
      <span class="mz-cat-card__icon">${icon(CATEGORY_ICON_MAP[cat.slug] || CATEGORY_ICON_MAP.default)}</span>
      <span>${escapeHtml(cat.name)}</span>
    </a>
  `).join("");
}

function renderProductSection(gridId, products) {
  const grid = document.getElementById(gridId);
  if (!grid) return;

  if (products.length === 0) {
    grid.innerHTML = emptyStateHtml({
      title: "Nothing here yet",
      sub: "Products added in the admin panel will appear here automatically.",
      iconName: "search"
    });
    return;
  }

  grid.innerHTML = products.map(productCardHtml).join("");
  bindProductCardEvents(grid, products);
}

function renderReviews(reviews) {
  const track = document.getElementById("reviews-track");
  if (!track) return;

  if (reviews.length === 0) {
    track.innerHTML = emptyStateHtml({
      title: "No reviews yet",
      sub: "Approved customer reviews will appear here.",
      iconName: "star"
    });
    return;
  }

  track.innerHTML = reviews.map((r) => `
    <div class="mz-review-card mz-reveal">
      <div class="mz-review-card__stars">${Array.from({ length: 5 }).map((_, i) => `<span style="opacity:${i < r.rating ? 1 : 0.25}">${icon("star")}</span>`).join("")}</div>
      <p>${escapeHtml(r.comment || "")}</p>
      <div class="mz-review-card__who">
        <span class="mz-review-card__avatar">${initials(r.customerName)}</span>
        <div><div class="mz-review-card__name">${escapeHtml(r.customerName || "Customer")}</div></div>
      </div>
    </div>
  `).join("");
}

function initHeroParticles() {
  const container = document.getElementById("hero-particles");
  if (!container || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const count = window.innerWidth < 700 ? 8 : 16;
  for (let i = 0; i < count; i++) {
    const p = document.createElement("span");
    p.className = "mz-particle";
    p.style.left = Math.random() * 100 + "%";
    p.style.bottom = Math.random() * 20 + "%";
    p.style.animationDelay = Math.random() * 8 + "s";
    p.style.animationDuration = 6 + Math.random() * 6 + "s";
    container.appendChild(p);
  }
}

function hideLoader() {
  const loader = document.getElementById("app-loader");
  if (!loader) return;
  setTimeout(() => {
    loader.classList.add("is-hidden");
    setTimeout(() => loader.remove(), 500);
  }, 350);
}
