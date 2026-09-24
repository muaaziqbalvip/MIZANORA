// =====================================================================
// MIZANORA — Order tracking page
//
// Calls the trackOrder Cloud Function (verified by orderId + phone —
// see functions/orders/trackOrder.js for why this can't be a direct
// Firestore read for guest customers).
// =====================================================================

import { trackOrder } from "../services/order-service.js";
import { formatPKR } from "../utils/format.js";
import { initShell, escapeHtml } from "../shared.js";

const STATUS_FLOW = [
  { key: "placed", label: "Order Placed" },
  { key: "confirmed", label: "Confirmed" },
  { key: "processing", label: "Processing" },
  { key: "packed", label: "Packed" },
  { key: "shipped", label: "Shipped" },
  { key: "out_for_delivery", label: "Out for Delivery" },
  { key: "delivered", label: "Delivered" }
];

const CHECK_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M20 6L9 17l-5-5"/></svg>`;

init();

function init() {
  initShell();

  const params = new URLSearchParams(location.search);
  const prefillId = params.get("id");

  const form = document.getElementById("track-form");
  if (prefillId) {
    document.getElementById("track-order-id").value = prefillId;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const orderId = document.getElementById("track-order-id").value.trim();
    const phone = document.getElementById("track-phone").value.trim();

    if (!orderId || !phone) return;

    const btn = document.getElementById("track-submit");
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Searching…";
    hideError();
    document.getElementById("track-result").innerHTML = "";

    try {
      const order = await trackOrder(orderId, phone);
      renderResult(order);
    } catch (err) {
      console.error("[MIZANORA] trackOrder failed:", err);
      showError(err?.code === "not-found"
        ? "No order found with that Order ID and phone number. Please double-check and try again."
        : "Something went wrong. Please check your connection and try again.");
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });
}

function renderResult(order) {
  const host = document.getElementById("track-result");
  const isCancelled = order.orderStatus === "cancelled" || order.orderStatus === "returned";

  host.innerHTML = `
    <div class="mz-confirmation__summary" style="margin-top:var(--mz-space-6);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--mz-space-4);flex-wrap:wrap;gap:8px;">
        <div>
          <div style="font-family:var(--mz-font-display);font-size:1.3rem;color:var(--mz-gold);">${escapeHtml(order.orderId)}</div>
          <div style="font-size:0.8rem;color:var(--mz-text-faint);">${order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" }) : ""}</div>
        </div>
        <div style="font-size:0.85rem;color:var(--mz-text-dim);">${escapeHtml(order.city)}</div>
      </div>

      ${order.trackingNumber ? `
      <div style="font-size:0.85rem;color:var(--mz-text-dim);margin-bottom:var(--mz-space-4);">
        Tracking: <strong style="color:var(--mz-text);">${escapeHtml(order.trackingNumber)}</strong>
        ${order.courier ? ` via ${escapeHtml(order.courier)}` : ""}
      </div>` : ""}

      ${isCancelled ? renderCancelledState(order) : renderTimeline(order)}

      <div style="margin-top:var(--mz-space-6);padding-top:var(--mz-space-4);border-top:1px solid var(--mz-border-soft);">
        ${order.items.map((i) => `
          <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:0.85rem;color:var(--mz-text-dim);">
            <span>${escapeHtml(i.title)} × ${i.quantity}</span><span>${formatPKR(i.price * i.quantity)}</span>
          </div>
        `).join("")}
        <div style="display:flex;justify-content:space-between;padding-top:10px;margin-top:6px;border-top:1px solid var(--mz-border-soft);font-weight:700;">
          <span>Total</span><span style="color:var(--mz-gold);">${formatPKR(order.total)}</span>
        </div>
      </div>
    </div>
  `;
}

function renderTimeline(order) {
  const currentIdx = STATUS_FLOW.findIndex((s) => s.key === order.orderStatus);
  const historyByStatus = new Map((order.history || []).map((h) => [h.status, h]));

  return `
    <div class="mz-timeline">
      ${STATUS_FLOW.map((step, i) => {
        const isDone = i < currentIdx;
        const isCurrent = i === currentIdx;
        const event = historyByStatus.get(step.key);
        return `
          <div class="mz-timeline-step ${isDone ? "is-done" : ""} ${isCurrent ? "is-current" : ""}">
            <div class="mz-timeline-step__dot">${isDone ? CHECK_SVG : i + 1}</div>
            <div>
              <div class="mz-timeline-step__label">${step.label}</div>
              ${event?.timestamp ? `<div class="mz-timeline-step__time">${new Date(event.timestamp).toLocaleString("en-PK", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</div>` : ""}
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderCancelledState(order) {
  const label = order.orderStatus === "cancelled" ? "Order Cancelled" : "Order Returned";
  return `
    <div class="mz-timeline">
      <div class="mz-timeline-step is-cancelled is-current">
        <div class="mz-timeline-step__dot">✕</div>
        <div>
          <div class="mz-timeline-step__label">${label}</div>
          <div class="mz-timeline-step__time">This order will not be delivered.</div>
        </div>
      </div>
    </div>
  `;
}

function showError(msg) {
  const el = document.getElementById("track-error");
  el.textContent = msg;
  el.classList.add("is-visible");
}

function hideError() {
  document.getElementById("track-error")?.classList.remove("is-visible");
}
