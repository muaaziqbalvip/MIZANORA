// =====================================================================
// MIZANORA Admin — Orders page
// =====================================================================

import { requireAdmin } from "./auth-guard.js";
import { renderAdminShell, formatPKR, escapeHtml } from "./admin-shared.js";
import { listOrdersAdmin, updateOrderStatusAdmin } from "./services/admin-orders.js";

const STATUS_OPTIONS = [
  "placed", "confirmed", "processing", "packed", "shipped",
  "out_for_delivery", "delivered", "cancelled", "returned"
];

let currentFilter = "";

init();

async function init() {
  const user = await requireAdmin();
  renderAdminShell("orders", user);

  bindFilter();
  await loadOrders();

  document.getElementById("modal-backdrop").addEventListener("click", (e) => {
    if (e.target.id === "modal-backdrop") closeModal();
  });
}

function bindFilter() {
  const select = document.getElementById("status-filter");
  select.addEventListener("change", () => {
    currentFilter = select.value;
    loadOrders();
  });
}

async function loadOrders() {
  const host = document.getElementById("orders-table");
  host.innerHTML = `<div class="mz-skeleton" style="height:300px;"></div>`;

  try {
    const orders = await listOrdersAdmin({ status: currentFilter || null });
    if (orders.length === 0) {
      host.innerHTML = `<div class="mz-empty-admin">No orders${currentFilter ? ` with status "${currentFilter}"` : ""} yet.</div>`;
      return;
    }

    host.innerHTML = `
      <div class="mz-admin-table-wrap">
        <table class="mz-admin-table">
          <thead><tr><th>Order ID</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th><th></th></tr></thead>
          <tbody>
            ${orders.map(orderRow).join("")}
          </tbody>
        </table>
      </div>
    `;

    host.querySelectorAll("[data-view-order]").forEach((btn) => {
      btn.addEventListener("click", () => openOrderModal(orders.find((o) => o.id === btn.dataset.viewOrder)));
    });
  } catch (err) {
    console.error("[MIZANORA Admin] Load orders failed:", err);
    host.innerHTML = `<div class="mz-empty-admin">Couldn't load orders. Check your connection and that Firestore indexes are deployed (see docs/FIRESTORE-INDEXES.md).</div>`;
  }
}

function orderRow(o) {
  const date = o.createdAt?.toDate ? o.createdAt.toDate() : null;
  return `
    <tr>
      <td style="color:var(--mz-gold);font-family:var(--mz-font-display);">${escapeHtml(o.orderId || o.id)}</td>
      <td style="color:var(--mz-text);">${escapeHtml(o.customerName || "—")}<br><span style="font-size:0.75rem;color:var(--mz-text-faint);">${escapeHtml(o.phone || "")}</span></td>
      <td>${o.items?.length || 0} item${o.items?.length === 1 ? "" : "s"}</td>
      <td>${formatPKR(o.total)}</td>
      <td><span class="mz-admin-badge ${statusBadgeClass(o.orderStatus)}">${(o.orderStatus || "").replace(/_/g, " ")}</span></td>
      <td style="font-size:0.8rem;">${date ? date.toLocaleDateString("en-PK", { day: "numeric", month: "short" }) : "—"}</td>
      <td><button class="mz-admin-icon-btn" data-view-order="${o.id}" title="View / Update">→</button></td>
    </tr>
  `;
}

function statusBadgeClass(status) {
  if (status === "delivered") return "active";
  if (status === "cancelled" || status === "returned") return "out";
  if (status === "placed" || status === "confirmed") return "low";
  return "low";
}

function openOrderModal(order) {
  if (!order) return;
  const backdrop = document.getElementById("modal-backdrop");
  backdrop.style.display = "flex";
  backdrop.innerHTML = `
    <div class="mz-modal">
      <div class="mz-modal__head">
        <h3>${escapeHtml(order.orderId || order.id)}</h3>
        <button class="mz-admin-icon-btn" id="modal-close">✕</button>
      </div>

      <div style="margin-bottom:var(--mz-space-5);">
        <div style="font-size:0.85rem;color:var(--mz-text-dim);line-height:1.7;">
          <strong style="color:var(--mz-text);">${escapeHtml(order.customerName)}</strong><br>
          ${escapeHtml(order.phone)}${order.email ? ` · ${escapeHtml(order.email)}` : ""}<br>
          ${escapeHtml(order.address)}, ${escapeHtml(order.city)}, ${escapeHtml(order.province)}
          ${order.notes ? `<br><em>Note: ${escapeHtml(order.notes)}</em>` : ""}
        </div>
      </div>

      <div style="margin-bottom:var(--mz-space-5);border-top:1px solid var(--mz-border-soft);border-bottom:1px solid var(--mz-border-soft);padding:var(--mz-space-3) 0;">
        ${(order.items || []).map((i) => `
          <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:0.85rem;">
            <span style="color:var(--mz-text-dim);">${escapeHtml(i.title)} × ${i.quantity}</span>
            <span style="color:var(--mz-text);">${formatPKR(i.price * i.quantity)}</span>
          </div>
        `).join("")}
        <div style="display:flex;justify-content:space-between;padding-top:10px;margin-top:6px;border-top:1px solid var(--mz-border-soft);font-weight:700;font-size:0.9rem;">
          <span>Total</span><span style="color:var(--mz-gold);">${formatPKR(order.total)}</span>
        </div>
      </div>

      <div class="mz-checkout-alert" id="status-alert"></div>

      <form class="mz-checkout-form" id="status-form">
        <div class="mz-form-group">
          <label>Order Status</label>
          <select name="status">
            ${STATUS_OPTIONS.map((s) => `<option value="${s}" ${order.orderStatus === s ? "selected" : ""}>${s.replace(/_/g, " ")}</option>`).join("")}
          </select>
        </div>
        <div class="mz-form-row">
          <div class="mz-form-group">
            <label>Tracking Number</label>
            <input type="text" name="trackingNumber" value="${escapeHtml(order.trackingNumber || "")}" />
          </div>
          <div class="mz-form-group">
            <label>Courier</label>
            <input type="text" name="courier" value="${escapeHtml(order.courier || "")}" />
          </div>
        </div>
        <div class="mz-form-group">
          <label>Internal Note (optional)</label>
          <input type="text" name="note" placeholder="Visible to admins only" />
        </div>
        <button type="submit" class="mz-btn mz-btn--primary mz-btn--lg mz-btn--full">Update Order</button>
      </form>
    </div>
  `;

  document.getElementById("modal-close").addEventListener("click", closeModal);
  document.getElementById("status-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Updating…";

    try {
      await updateOrderStatusAdmin({
        orderId: order.orderId || order.id,
        status: fd.get("status"),
        trackingNumber: fd.get("trackingNumber")?.trim() || null,
        courier: fd.get("courier")?.trim() || null,
        note: fd.get("note")?.trim() || null
      });
      closeModal();
      loadOrders();
    } catch (err) {
      console.error("[MIZANORA Admin] Update order status failed:", err);
      const alert = document.getElementById("status-alert");
      alert.textContent = "Couldn't update order. Check your connection and try again.";
      alert.classList.add("is-visible");
      btn.disabled = false;
      btn.textContent = "Update Order";
    }
  });
}

function closeModal() {
  document.getElementById("modal-backdrop").style.display = "none";
  document.getElementById("modal-backdrop").innerHTML = "";
}
