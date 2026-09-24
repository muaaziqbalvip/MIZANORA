// =====================================================================
// MIZANORA — Category page controller
//
// Reuses the same product-grid rendering as Shop, but scoped to a
// single category read from the URL path (/category/{slug}). No
// category filter UI here — the category itself is the filter; sort
// and pagination still apply so this scales past a few dozen items.
// =====================================================================

import { getShopProducts, getCategoryBySlug } from "../services/catalog-service.js";
import { initScrollReveal } from "../utils/format.js";
import { icon } from "../utils/icons.js";
import {
  initShell, CATEGORY_ICON_MAP, productCardHtml, bindProductCardEvents,
  emptyStateHtml, escapeHtml, skeletonCards
} from "../shared.js";

// Path-based slug (production, via firebase.json rewrites) with a
// ?slug= fallback for local dev using a plain static server that
// doesn't know about the /category/** rewrite rule.
const slug = location.pathname.split("/category/")[1]?.replace(/\/$/, "")
  || new URLSearchParams(location.search).get("slug")
  || "";

const state = {
  category: null,
  sort: new URLSearchParams(location.search).get("sort") || "newest",
  cursorStack: []
};

init();

async function init() {
  initShell();
  bindSortSelect();

  if (!slug) {
    showNotFound();
    return;
  }

  state.category = await getCategoryBySlug(slug).catch(() => null);

  if (!state.category) {
    showNotFound();
    return;
  }

  renderCategoryHero(state.category);
  document.title = `${state.category.name} — MIZANORA`;

  await loadPage(1);
  initScrollReveal();
}

function renderCategoryHero(cat) {
  const hero = document.getElementById("category-hero");
  if (!hero) return;
  hero.innerHTML = `
    <div class="mz-container">
      <span class="mz-category-hero__icon">${icon(CATEGORY_ICON_MAP[cat.slug] || CATEGORY_ICON_MAP.default)}</span>
      <h1>${escapeHtml(cat.name)}</h1>
      <p id="result-count">Loading…</p>
    </div>
  `;
  const crumbEl = document.getElementById("breadcrumb-current");
  if (crumbEl) crumbEl.textContent = cat.name;
}

function showNotFound() {
  document.getElementById("category-hero")?.remove();
  const grid = document.getElementById("shop-grid");
  if (grid) {
    grid.innerHTML = emptyStateHtml({
      title: "Category not found",
      sub: "This category may have been removed or renamed. Browse all products instead.",
      iconName: "grid",
      ctaHtml: `<a href="/shop" class="mz-btn mz-btn--primary">Go to Shop</a>`
    });
  }
  const pag = document.getElementById("pagination");
  if (pag) pag.innerHTML = "";
}

function bindSortSelect() {
  const select = document.getElementById("sort-select");
  if (!select) return;
  select.value = state.sort;
  select.addEventListener("change", () => {
    state.sort = select.value;
    state.cursorStack = [];
    const params = new URLSearchParams(location.search);
    if (state.sort === "newest") params.delete("sort");
    else params.set("sort", state.sort);
    const qs = params.toString();
    history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
    loadPage(1);
  });
}

async function loadPage(targetPage) {
  const grid = document.getElementById("shop-grid");
  const countEl = document.getElementById("result-count");
  if (!grid || !state.category) return;

  grid.innerHTML = skeletonCards(9);

  const cursor = state.cursorStack[targetPage - 1] || null;

  try {
    const result = await getShopProducts({
      categoryId: state.category.id,
      sort: state.sort,
      cursor,
      direction: "forward"
    });

    if (!result.hasResults && targetPage === 1) {
      grid.innerHTML = emptyStateHtml({
        title: "No products in this category yet",
        sub: "Check back soon, or browse other categories.",
        iconName: "search",
        ctaHtml: `<a href="/shop" class="mz-btn mz-btn--outline">Browse All Products</a>`
      });
      if (countEl) countEl.textContent = "0 products";
      document.getElementById("pagination").innerHTML = "";
      return;
    }

    grid.innerHTML = result.items.map(productCardHtml).join("");
    bindProductCardEvents(grid, result.items);
    initScrollReveal();

    state.cursorStack[targetPage] = result.lastDoc;

    if (countEl) countEl.textContent = `${result.items.length} product${result.items.length === 1 ? "" : "s"} on this page`;
    renderPagination(targetPage, targetPage > 1, result.items.length === 12);
  } catch (err) {
    console.error("[MIZANORA] Category query failed:", err);
    grid.innerHTML = emptyStateHtml({
      title: "Couldn't load products",
      sub: "Check your connection, or that Firestore composite indexes are deployed.",
      iconName: "grid"
    });
  }
}

function renderPagination(page, canGoPrev, canGoNext) {
  const el = document.getElementById("pagination");
  if (!el) return;
  el.innerHTML = `
    <button id="prev-page" ${canGoPrev ? "" : "disabled"}>${icon("arrowLeft")} Prev</button>
    <span style="color:var(--mz-text-faint);font-size:0.85rem;">Page ${page}</span>
    <button id="next-page" ${canGoNext ? "" : "disabled"}>Next ${icon("arrowRight")}</button>
  `;
  el.querySelector("#prev-page")?.addEventListener("click", () => {
    if (page <= 1) return;
    loadPage(page - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  el.querySelector("#next-page")?.addEventListener("click", () => {
    loadPage(page + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}
