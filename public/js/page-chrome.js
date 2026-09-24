// =====================================================================
// MIZANORA — Shared page chrome (header/footer) for static content
// pages. Storefront pages built in earlier phases (Home, Shop, etc.)
// already have this markup inline in their HTML; this module exists
// so Phase 7's static pages don't repeat ~80 lines of identical
// nav/footer HTML in six separate files.
// =====================================================================

import { icon } from "./utils/icons.js";

export function renderPageChrome(activeHref = "") {
  const header = document.getElementById("site-header");
  const footer = document.getElementById("site-footer");
  const bottomNav = document.getElementById("site-bottom-nav");

  if (header) {
    header.innerHTML = `
      <div class="mz-container mz-nav__inner">
        <a href="/" class="mz-nav__logo">
          <img src="/assets/icons/logo-mark.png" alt="MIZANORA" />
          <span class="mz-nav__logo-text">MIZANORA</span>
        </a>
        <nav class="mz-nav__links" aria-label="Main navigation">
          <a href="/" ${navStyle("/", activeHref)}>Home</a>
          <a href="/shop" ${navStyle("/shop", activeHref)}>Shop</a>
          <a href="/categories" ${navStyle("/categories", activeHref)}>Categories</a>
          <a href="/about" ${navStyle("/about", activeHref)}>About</a>
          <a href="/contact" ${navStyle("/contact", activeHref)}>Contact</a>
        </nav>
        <div class="mz-nav__actions">
          <a href="/search" class="mz-icon-btn" aria-label="Search" id="search-icon-btn"></a>
          <a href="/wishlist" class="mz-icon-btn" aria-label="Wishlist" id="wishlist-icon-btn"></a>
          <a href="/cart" class="mz-icon-btn" aria-label="Cart">
            <span id="cart-icon-slot"></span>
            <span class="mz-cart-badge" id="cart-badge" style="display:none;">0</span>
          </a>
          <a href="/account" class="mz-icon-btn" aria-label="Account" id="account-icon-btn"></a>
          <button class="mz-icon-btn mz-nav__hamburger" id="hamburger-btn" aria-label="Menu"></button>
        </div>
      </div>
    `;
    header.className = "mz-nav";
  }

  if (footer) {
    footer.innerHTML = `
      <div class="mz-container">
        <div class="mz-footer__grid">
          <div class="mz-footer__brand">
            <img src="/assets/icons/logo-full.png" alt="MIZANORA" />
            <p>Shop smart. Shop halal. Shop MIZANORA. A premium store built on trust, fairness, and quality.</p>
          </div>
          <div>
            <h4>Shop</h4>
            <ul>
              <li><a href="/shop">All Products</a></li>
              <li><a href="/categories">Categories</a></li>
              <li><a href="/offers">Offers</a></li>
              <li><a href="/track-order">Track Order</a></li>
            </ul>
          </div>
          <div>
            <h4>Company</h4>
            <ul>
              <li><a href="/about">About MIZANORA</a></li>
              <li><a href="/contact">Contact</a></li>
              <li><a href="/faq">FAQ</a></li>
            </ul>
          </div>
          <div>
            <h4>Policies</h4>
            <ul>
              <li><a href="/privacy-policy">Privacy Policy</a></li>
              <li><a href="/terms">Terms &amp; Conditions</a></li>
              <li><a href="/returns">Return &amp; Refund Policy</a></li>
            </ul>
          </div>
        </div>
        <div class="mz-footer__bottom">
          <span>© 2026 MIZANORA. All rights reserved.</span>
          <span>Made with fairness, for everyone.</span>
        </div>
      </div>
    `;
    footer.className = "mz-footer";
  }

  if (bottomNav) {
    bottomNav.innerHTML = `
      <div class="mz-bottom-nav__inner">
        <a href="/" ${activeHref === "/" ? 'class="is-active"' : ""}><span id="ic-bn-home"></span>Home</a>
        <a href="/shop" ${activeHref === "/shop" ? 'class="is-active"' : ""}><span id="ic-bn-shop"></span>Shop</a>
        <a href="/categories" ${activeHref === "/categories" ? 'class="is-active"' : ""}><span id="ic-bn-cat"></span>Categories</a>
        <a href="/wishlist"><span id="ic-bn-wish"></span>Wishlist</a>
        <a href="/account"><span id="ic-bn-acc"></span>Account</a>
      </div>
    `;
    bottomNav.className = "mz-bottom-nav";
    bottomNav.setAttribute("aria-label", "Mobile navigation");
  }
}

function navStyle(href, activeHref) {
  return href === activeHref ? 'style="color:var(--mz-gold);"' : "";
}
