// =====================================================================
// MIZANORA — Order confirmation page
//
// Reads the order result that checkout.js stashed in sessionStorage
// right after a successful createOrder call. If that's missing (direct
// visit, refresh after session cleared), falls back to showing just
// the order ID from the URL with a link to track it — never re-fetches
// full order details here without the phone-verification trackOrder
// flow, since this page has no owner-auth context to read /orders directly.
// =====================================================================

import { icon } from "../utils/icons.js";
import { formatPKR } from "../utils/format.js";
import { initShell, escapeHtml } from "../shared.js";

init();

function init() {
  initShell();

  const orderId = new URLSearchParams(location.search).get("id");
  const stashed = readStashedOrder();

  if (!orderId) {
    showGenericFallback();
    return;
  }

  document.getElementById("order-id-display").textContent = orderId;

  if (stashed && stashed.orderId === orderId) {
    renderFullSummary(stashed);
  } else {
    renderMinimal(orderId);
  }
}

function readStashedOrder() {
  try {
    const raw = sessionStorage.getItem("mizanora_last_order");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function renderFullSummary(order) {
  const host = document.getElementById("summary-host");
  if (!host) return;
  host.innerHTML = `
    <div class="mz-confirmation__summary">
      ${order.items.map((i) => `
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--mz-border-soft);font-size:0.88rem;">
          <span style="color:var(--mz-text-dim);">${escapeHtml(i.title)} × ${i.quantity}</span>
          <span style="color:var(--mz-text);">${formatPKR(i.price * i.quantity)}</span>
        </div>
      `).join("")}
      <div style="display:flex;justify-content:space-between;padding:10px 0 0;font-size:0.88rem;color:var(--mz-text-dim);">
        <span>Subtotal</span><span>${formatPKR(order.subtotal)}</span>
      </div>
      ${order.discount > 0 ? `
      <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:0.88rem;color:var(--mz-success);">
        <span>Discount</span><span>-${formatPKR(order.discount)}</span>
      </div>` : ""}
      <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:0.88rem;color:var(--mz-text-dim);">
        <span>Shipping</span><span>${formatPKR(order.shippingFee)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:12px 0 0;margin-top:8px;border-top:1px solid var(--mz-border-soft);font-size:1.05rem;font-weight:700;">
        <span>Total (Pay on Delivery)</span><span style="color:var(--mz-gold);">${formatPKR(order.total)}</span>
      </div>
    </div>
  `;
}

function renderMinimal(orderId) {
  const host = document.getElementById("summary-host");
  if (!host) return;
  host.innerHTML = `
    <div class="mz-confirmation__summary" style="text-align:center;color:var(--mz-text-dim);font-size:0.9rem;">
      Order details aren't available in this session. You can look up the full status anytime using your Order ID and phone number.
    </div>
  `;
}

function showGenericFallback() {
  document.getElementById("confirmation-root").innerHTML = `
    <div class="mz-confirmation">
      <div class="mz-confirmation__icon">${icon("shield")}</div>
      <h1>No order found</h1>
      <p style="color:var(--mz-text-dim);margin-bottom:var(--mz-space-6);">We couldn't find an order to confirm. If you just placed one, check your email or track it with your Order ID.</p>
      <div class="mz-confirmation__actions">
        <a href="/track-order" class="mz-btn mz-btn--outline">Track an Order</a>
        <a href="/shop" class="mz-btn mz-btn--primary">Continue Shopping</a>
      </div>
    </div>
  `;
}
