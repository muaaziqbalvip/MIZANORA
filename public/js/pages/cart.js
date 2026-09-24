// =====================================================================
// MIZANORA — Cart page controller
// =====================================================================

import { getCart, updateQuantity, removeFromCart } from "../services/cart-store.js";
import { validateCoupon } from "../services/order-service.js";
import { icon } from "../utils/icons.js";
import { formatPKR } from "../utils/format.js";
import { initShell, escapeHtml } from "../shared.js";

const SHIPPING_FEE = 200; // must match functions/orders/createOrder.js SHIPPING_FEE — preview only, server is authoritative

let appliedCoupon = null; // { code, discount }

init();

function init() {
  initShell();
  render();
  window.addEventListener("mz:cart-updated", () => {
    appliedCoupon = null; // subtotal changed — re-validate on next apply rather than show a stale discount
    sessionStorage.removeItem("mizanora_applied_coupon");
    render();
  });
  bindCouponForm();
}

function render() {
  const items = getCart();
  const layout = document.getElementById("cart-layout");
  if (!layout) return;

  if (items.length === 0) {
    layout.innerHTML = `
      <div class="mz-empty-cart">
        ${icon("cart")}
        <h2>Your cart is empty</h2>
        <p>Looks like you haven't added anything yet.</p>
        <a href="/shop" class="mz-btn mz-btn--primary">Start Shopping</a>
      </div>
    `;
    return;
  }

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discount = appliedCoupon?.discount || 0;
  const total = Math.max(0, subtotal - discount + SHIPPING_FEE);

  layout.innerHTML = `
    <div>
      <h1 class="mz-page-title">Shopping Cart</h1>
      <div id="cart-items">
        ${items.map(cartItemHtml).join("")}
      </div>
    </div>
    <aside class="mz-summary-card">
      <h3>Order Summary</h3>
      <div class="mz-summary-row"><span>Subtotal</span><span>${formatPKR(subtotal)}</span></div>
      ${discount > 0 ? `<div class="mz-summary-row is-discount"><span>Discount (${appliedCoupon.code})</span><span>-${formatPKR(discount)}</span></div>` : ""}
      <div class="mz-summary-row"><span>Shipping</span><span>${formatPKR(SHIPPING_FEE)}</span></div>
      <div id="coupon-slot"></div>
      <div class="mz-summary-row is-total"><span>Total</span><span>${formatPKR(total)}</span></div>
      <a href="/checkout" class="mz-btn mz-btn--primary mz-btn--full mz-btn--lg" style="margin-top:var(--mz-space-4);">
        Proceed to Checkout
      </a>
      <a href="/shop" class="mz-btn mz-btn--ghost mz-btn--full" style="margin-top:var(--mz-space-2);">
        Continue Shopping
      </a>
    </aside>
  `;

  renderCouponSlot();
  bindItemEvents(items);
}

function cartItemHtml(item) {
  return `
    <div class="mz-cart-item" data-id="${item.productId}">
      <div class="mz-cart-item__img"><img src="${item.thumbnail || ""}" alt="${escapeHtml(item.title)}" /></div>
      <div>
        <div class="mz-cart-item__title">${escapeHtml(item.title)}</div>
        <div class="mz-cart-item__price">${formatPKR(item.price)}</div>
        <button class="mz-cart-item__remove" data-remove="${item.productId}">Remove</button>
      </div>
      <div class="mz-cart-item__right">
        <div class="mz-cart-item__line-total">${formatPKR(item.price * item.quantity)}</div>
        <div class="mz-qty-selector">
          <button data-qty-minus="${item.productId}" aria-label="Decrease quantity">−</button>
          <span>${item.quantity}</span>
          <button data-qty-plus="${item.productId}" aria-label="Increase quantity">+</button>
        </div>
      </div>
    </div>
  `;
}

function bindItemEvents(items) {
  document.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", () => removeFromCart(btn.dataset.remove));
  });
  document.querySelectorAll("[data-qty-minus]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = items.find((i) => i.productId === btn.dataset.qtyMinus);
      if (item) updateQuantity(item.productId, item.quantity - 1);
    });
  });
  document.querySelectorAll("[data-qty-plus]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = items.find((i) => i.productId === btn.dataset.qtyPlus);
      if (item) updateQuantity(item.productId, item.quantity + 1);
    });
  });
}

function bindCouponForm() {
  // form is re-rendered each time, so we delegate from a stable ancestor
  document.body.addEventListener("submit", async (e) => {
    if (e.target.id !== "coupon-form") return;
    e.preventDefault();
    const input = document.getElementById("coupon-input");
    const msgEl = document.getElementById("coupon-msg");
    const code = input.value.trim();
    if (!code) return;

    const items = getCart();
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    msgEl.textContent = "Checking…";
    msgEl.className = "mz-coupon-msg";

    try {
      const result = await validateCoupon(code, subtotal);
      if (result.valid) {
        appliedCoupon = { code: result.code, discount: result.discount };
        sessionStorage.setItem("mizanora_applied_coupon", JSON.stringify(appliedCoupon));
        render();
      } else {
        appliedCoupon = null;
        sessionStorage.removeItem("mizanora_applied_coupon");
        msgEl.textContent = result.reason || "Invalid coupon.";
        msgEl.className = "mz-coupon-msg is-error";
      }
    } catch (err) {
      console.error("[MIZANORA] Coupon validation failed:", err);
      msgEl.textContent = "Couldn't validate coupon — check your connection.";
      msgEl.className = "mz-coupon-msg is-error";
    }
  });
}

function renderCouponSlot() {
  const slot = document.getElementById("coupon-slot");
  if (!slot) return;
  if (appliedCoupon) {
    slot.innerHTML = `
      <div class="mz-coupon-msg is-success">
        "${escapeHtml(appliedCoupon.code)}" applied ✓
        <button type="button" id="remove-coupon" style="margin-left:8px;text-decoration:underline;color:inherit;">Remove</button>
      </div>
      <div class="mz-coupon-msg" id="coupon-msg" style="display:none;"></div>
    `;
    document.getElementById("remove-coupon")?.addEventListener("click", () => {
      appliedCoupon = null;
      sessionStorage.removeItem("mizanora_applied_coupon");
      render();
    });
  } else {
    slot.innerHTML = `
      <form class="mz-coupon-form" id="coupon-form">
        <input type="text" id="coupon-input" placeholder="Coupon code" />
        <button type="submit" class="mz-btn mz-btn--outline">Apply</button>
      </form>
      <div class="mz-coupon-msg" id="coupon-msg"></div>
    `;
  }
}
