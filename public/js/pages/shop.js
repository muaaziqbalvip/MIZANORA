// =====================================================================
// MIZANORA — Shop page controller
//
// Reads filters from the URL (?category=&sort=&featured=) so the page
// is shareable/bookmarkable, and never fetches more than one page of
// PAGE_SIZE products from Firestore at a time.
// =====================================================================

import { getShopProducts, getActiveCategories } from "../services/catalog-service.js";
import { initScrollReveal } from "../utils/format.js";
import { icon } from "../utils/icons.js";
import {
  initShell, productCardHtml, bindProductCardEvents,
  emptyStateHtml, escapeHtml, skeletonCards
} from "../shared.js";

const state = {
  categoryId: null,
  categorySlug: new URLSearchParams(location.search).get("category") || null,
  sort: new URLSearchParams(location.search).get("sort") || "newest",
  featuredOnly: new URLSearchParams(location.search).get("featured") === "true",
  cursorStack: [], // cursorStack[n] = cursor to fetch page n+1; cursorStack[0] is unused/null
  categories: []
};

init();

async function init() {
  initShell();
  bindFilterDrawer();
  bindSortSelect();

  state.categories = await getActiveCategories().catch(() => []);
  renderCategoryFilters();

  if (state.categorySlug) {
    const match = state.categories.find((c) => c.slug === state.categorySlug);
    state.categoryId = match?.id || null;
  }

  await loadPage(1);
  initScrollReveal();
}

// ---------------------------------------------------------------------
function renderCategoryFilters() {
  const list = document.getElementById("category-filter-list");
  if (!list) return;

  const allOption = `
    <label class="mz-filter-option ${!state.categoryId ? "is-active" : ""}">
      <input type="radio" name="cat-filter" ${!state.categoryId ? "checked" : ""} data-cat-filter="" />
      All Products
    </label>`;

  const options = state.categories.map((c) => `
    <label class="mz-filter-option ${state.categoryId === c.id ? "is-active" : ""}">
      <input type="radio" name="cat-filter" ${state.categoryId === c.id ? "checked" : ""} data-cat-filter="${c.id}" data-cat-slug="${c.slug}" />
      ${escapeHtml(c.name)}
    </label>`).join("");

  list.innerHTML = allOption + options;

  list.querySelectorAll("[data-cat-filter]").forEach((input) => {
    input.addEventListener("change", () => {
      state.categoryId = input.dataset.catFilter || null;
      state.categorySlug = input.dataset.catSlug || null;
      resetPagination();
      updateUrl();
      loadPage(1);
      renderCategoryFilters();
      closeDrawer();
    });
  });
}

function bindSortSelect() {
  const select = document.getElementById("sort-select");
  if (!select) return;
  select.value = state.sort;
  select.addEventListener("change", () => {
    state.sort = select.value;
    resetPagination();
    updateUrl();
    loadPage(1);
  });
}

function bindFilterDrawer() {
  const toggle = document.getElementById("filters-toggle");
  const drawer = document.getElementById("filters-panel");
  const backdrop = document.getElementById("filters-backdrop");
  const close = document.getElementById("filters-close");
  if (!toggle || !drawer) return;

  toggle.addEventListener("click", () => {
    drawer.classList.add("is-open");
    backdrop?.classList.add("is-open");
  });
  const closeFn = () => closeDrawer();
  close?.addEventListener("click", closeFn);
  backdrop?.addEventListener("click", closeFn);
}

function closeDrawer() {
  document.getElementById("filters-panel")?.classList.remove("is-open");
  document.getElementById("filters-backdrop")?.classList.remove("is-open");
}

function resetPagination() {
  state.cursorStack = [];
}

function updateUrl() {
  const params = new URLSearchParams();
  if (state.categorySlug) params.set("category", state.categorySlug);
  if (state.sort !== "newest") params.set("sort", state.sort);
  if (state.featuredOnly) params.set("featured", "true");
  const qs = params.toString();
  history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
}

// ---------------------------------------------------------------------
// Pagination strategy: we keep a stack of "cursor to start this page"
// (null for page 1, otherwise the lastDoc of the previous page). Going
// back just pops the stack and re-queries forward from the new top —
// simpler and more robust than mixing startAfter/endBefore.
async function loadPage(targetPage) {
  const grid = document.getElementById("shop-grid");
  const countEl = document.getElementById("result-count");
  if (!grid) return;

  grid.innerHTML = skeletonCards(9);

  const cursor = state.cursorStack[targetPage - 1] || null; // cursorStack[0] is always null (page 1 start)

  try {
    const result = await getShopProducts({
      categoryId: state.categoryId,
      sort: state.sort,
      featuredOnly: state.featuredOnly,
      cursor,
      direction: "forward"
    });

    if (!result.hasResults && targetPage === 1) {
      grid.innerHTML = emptyStateHtml({
        title: "No products found",
        sub: "Try a different category or clear your filters.",
        iconName: "search"
      });
      if (countEl) countEl.textContent = "0 products";
      renderPagination(1, false, false);
      return;
    }

    grid.innerHTML = result.items.map(productCardHtml).join("");
    bindProductCardEvents(grid, result.items);
    initScrollReveal();

    // store the cursor for the *next* page (this page's lastDoc)
    state.cursorStack[targetPage] = result.lastDoc;
    state.currentPage = targetPage;

    if (countEl) countEl.textContent = `${result.items.length} product${result.items.length === 1 ? "" : "s"} on this page`;
    renderPagination(targetPage, targetPage > 1, result.items.length === 12);
  } catch (err) {
    console.error("[MIZANORA] Shop query failed:", err);
    grid.innerHTML = emptyStateHtml({
      title: "Couldn't load products",
      sub: "Check your connection, or that Firestore composite indexes are deployed — see docs/FIRESTORE-INDEXES.md.",
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
