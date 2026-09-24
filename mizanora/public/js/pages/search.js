// =====================================================================
// MIZANORA — Search page controller
//
// Debounces input, never queries on every keystroke. Keeps a small
// "recent searches" list client-side (localStorage) — this is a
// convenience feature, not user data with privacy weight, and never
// synced to any backend.
// =====================================================================

import { searchProducts } from "../services/catalog-service.js";
import { debounce, initScrollReveal } from "../utils/format.js";
import { icon } from "../utils/icons.js";
import { initShell, productCardHtml, bindProductCardEvents, emptyStateHtml, escapeHtml } from "../shared.js";

const RECENT_KEY = "mizanora_recent_searches_v1";
const POPULAR_TERMS = ["Headphones", "Abaya", "Smartwatch", "Cookware", "Skincare", "Prayer Mat"];

let currentTerm = "";

init();

function init() {
  initShell();

  const input = document.getElementById("search-input");
  const clearBtn = document.getElementById("search-clear");
  const initialTerm = new URLSearchParams(location.search).get("q") || "";

  input.value = initialTerm;
  toggleClear(initialTerm);

  if (initialTerm) {
    currentTerm = initialTerm;
    runSearch(initialTerm);
  } else {
    renderIdleState();
  }

  const debouncedSearch = debounce((term) => {
    currentTerm = term;
    updateUrl(term);
    if (term.trim().length < 2) {
      renderIdleState();
      return;
    }
    runSearch(term);
  }, 350);

  input.addEventListener("input", (e) => {
    toggleClear(e.target.value);
    debouncedSearch(e.target.value);
  });

  clearBtn.addEventListener("click", () => {
    input.value = "";
    toggleClear("");
    updateUrl("");
    renderIdleState();
    input.focus();
  });

  document.getElementById("search-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (input.value.trim().length >= 2) {
      saveRecentSearch(input.value.trim());
      runSearch(input.value.trim());
    }
  });
}

function toggleClear(value) {
  document.getElementById("search-clear")?.classList.toggle("is-visible", value.length > 0);
}

function updateUrl(term) {
  const params = new URLSearchParams();
  if (term) params.set("q", term);
  const qs = params.toString();
  history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
}

async function runSearch(term) {
  const results = document.getElementById("search-results");
  if (!results) return;

  results.innerHTML = `<div class="mz-product-grid">${Array.from({ length: 6 }).map(() => `<div class="mz-skeleton" style="aspect-ratio:0.72;"></div>`).join("")}</div>`;

  try {
    const products = await searchProducts(term);

    if (products.length === 0) {
      results.innerHTML = emptyStateHtml({
        title: `No results for "${term}"`,
        sub: "Try a different spelling, or browse categories instead.",
        iconName: "search",
        ctaHtml: `<a href="/shop" class="mz-btn mz-btn--outline">Browse All Products</a>`
      });
      return;
    }

    saveRecentSearch(term);
    results.innerHTML = `
      <p style="color:var(--mz-text-dim);font-size:0.9rem;margin-bottom:var(--mz-space-4);">${products.length} result${products.length === 1 ? "" : "s"} for "${escapeHtml(term)}"</p>
      <div class="mz-product-grid" id="search-grid">${products.map(productCardHtml).join("")}</div>
    `;
    bindProductCardEvents(document.getElementById("search-grid"), products);
    initScrollReveal();
  } catch (err) {
    console.error("[MIZANORA] Search failed:", err);
    results.innerHTML = emptyStateHtml({
      title: "Search unavailable",
      sub: "Something went wrong loading results. Please try again.",
      iconName: "search"
    });
  }
}

function renderIdleState() {
  const results = document.getElementById("search-results");
  if (!results) return;
  const recents = getRecentSearches();

  results.innerHTML = `
    ${recents.length ? `
      <div class="mz-search-section-label">Recent Searches</div>
      <div class="mz-search-chips">${recents.map((t) => `<button class="mz-search-chip" data-term="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join("")}</div>
    ` : ""}
    <div class="mz-search-section-label">Popular Searches</div>
    <div class="mz-search-chips">${POPULAR_TERMS.map((t) => `<button class="mz-search-chip" data-term="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join("")}</div>
  `;

  results.querySelectorAll("[data-term]").forEach((chip) => {
    chip.addEventListener("click", () => {
      const term = chip.dataset.term;
      document.getElementById("search-input").value = term;
      toggleClear(term);
      updateUrl(term);
      runSearch(term);
    });
  });
}

function getRecentSearches() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveRecentSearch(term) {
  const clean = term.trim();
  if (!clean) return;
  let recents = getRecentSearches().filter((t) => t.toLowerCase() !== clean.toLowerCase());
  recents.unshift(clean);
  recents = recents.slice(0, 6);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recents));
}
