// =====================================================================
// MIZANORA Admin — Coupons page
// =====================================================================

import { requireAdmin } from "./auth-guard.js";
import { renderAdminShell, formatPKR, escapeHtml } from "./admin-shared.js";
import {
  listCouponsAdmin, createCoupon, updateCoupon, deleteCoupon, toggleCouponActive
} from "./services/admin-coupons.js";

let editingId = null;

init();

async function init() {
  const user = await requireAdmin();
  renderAdminShell("coupons", user);
  await loadCoupons();

  document.getElementById("add-coupon-btn").addEventListener("click", () => openModal());
  document.getElementById("modal-backdrop").addEventListener("click", (e) => {
    if (e.target.id === "modal-backdrop") closeModal();
  });
}

async function loadCoupons() {
  const host = document.getElementById("coupons-table");
  host.innerHTML = `<div class="mz-skeleton" style="height:200px;"></div>`;

  try {
    const coupons = await listCouponsAdmin();
    if (coupons.length === 0) {
      host.innerHTML = `<div class="mz-empty-admin">No coupons yet. Click "Add Coupon" to create your first one.</div>`;
      return;
    }

    const now = Date.now();
    host.innerHTML = `
      <div class="mz-admin-table-wrap">
        <table class="mz-admin-table">
          <thead><tr><th>Code</th><th>Discount</th><th>Min. Order</th><th>Usage</th><th>Expiry</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${coupons.map((c) => {
              const expiryMs = c.expiry?.toMillis ? c.expiry.toMillis() : 0;
              const isExpired = expiryMs < now;
              return `
                <tr>
                  <td style="color:var(--mz-gold);font-weight:700;">${escapeHtml(c.code)}</td>
                  <td>${c.type === "percentage" ? `${c.discount}%` : formatPKR(c.discount)}</td>
                  <td>${formatPKR(c.minimumOrder)}</td>
                  <td>${c.usedCount || 0} / ${c.usageLimit}</td>
                  <td style="font-size:0.8rem;${isExpired ? "color:var(--mz-danger);" : ""}">${expiryMs ? new Date(expiryMs).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" }) : "—"}</td>
                  <td><span class="mz-admin-badge ${c.active && !isExpired ? "active" : "inactive"}">${isExpired ? "Expired" : c.active ? "Active" : "Inactive"}</span></td>
                  <td style="white-space:nowrap;">
                    <button class="mz-admin-icon-btn" data-edit="${c.id}" title="Edit">✎</button>
                    <button class="mz-admin-icon-btn" data-toggle="${c.id}" data-active="${c.active}" title="${c.active ? "Deactivate" : "Activate"}">${c.active ? "⏸" : "▶"}</button>
                    <button class="mz-admin-icon-btn is-danger" data-delete="${c.id}" title="Delete">🗑</button>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;

    host.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", () => openModal(coupons.find((c) => c.id === btn.dataset.edit)));
    });
    host.querySelectorAll("[data-toggle]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await toggleCouponActive(btn.dataset.toggle, btn.dataset.active !== "true");
        loadCoupons();
      });
    });
    host.querySelectorAll("[data-delete]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Delete this coupon? This cannot be undone.")) return;
        await deleteCoupon(btn.dataset.delete);
        loadCoupons();
      });
    });
  } catch (err) {
    console.error("[MIZANORA Admin] Load coupons failed:", err);
    host.innerHTML = `<div class="mz-empty-admin">Couldn't load coupons. Check your connection.</div>`;
  }
}

function openModal(coupon = null) {
  editingId = coupon?.id || null;
  const expiryValue = coupon?.expiry?.toMillis
    ? new Date(coupon.expiry.toMillis()).toISOString().slice(0, 10)
    : "";

  const backdrop = document.getElementById("modal-backdrop");
  backdrop.style.display = "flex";
  backdrop.innerHTML = `
    <div class="mz-modal" style="max-width:520px;">
      <div class="mz-modal__head">
        <h3>${coupon ? "Edit Coupon" : "Add Coupon"}</h3>
        <button class="mz-admin-icon-btn" id="modal-close">✕</button>
      </div>
      <form class="mz-checkout-form" id="coupon-form">
        <div class="mz-form-group">
          <label>Code <span class="required">*</span></label>
          <input type="text" name="code" required value="${escapeHtml(coupon?.code || "")}" style="text-transform:uppercase;" ${coupon ? "disabled" : ""} />
          ${coupon ? `<span style="font-size:0.75rem;color:var(--mz-text-faint);">Code can't be changed after creation — delete and recreate if needed.</span>` : ""}
        </div>
        <div class="mz-form-row">
          <div class="mz-form-group">
            <label>Type</label>
            <select name="type">
              <option value="percentage" ${coupon?.type === "percentage" ? "selected" : ""}>Percentage (%)</option>
              <option value="fixed" ${coupon?.type === "fixed" ? "selected" : ""}>Fixed Amount (Rs.)</option>
            </select>
          </div>
          <div class="mz-form-group">
            <label>Discount Value <span class="required">*</span></label>
            <input type="number" name="discount" min="0" required value="${coupon?.discount || ""}" />
          </div>
        </div>
        <div class="mz-form-row">
          <div class="mz-form-group">
            <label>Minimum Order (Rs.)</label>
            <input type="number" name="minimumOrder" min="0" value="${coupon?.minimumOrder || 0}" />
          </div>
          <div class="mz-form-group">
            <label>Max Discount Cap (% only, optional)</label>
            <input type="number" name="maximumDiscount" min="0" value="${coupon?.maximumDiscount || ""}" />
          </div>
        </div>
        <div class="mz-form-row">
          <div class="mz-form-group">
            <label>Expiry Date <span class="required">*</span></label>
            <input type="date" name="expiry" required value="${expiryValue}" />
          </div>
          <div class="mz-form-group">
            <label>Usage Limit</label>
            <input type="number" name="usageLimit" min="1" value="${coupon?.usageLimit || 100}" />
          </div>
        </div>
        <label class="mz-filter-option">
          <input type="checkbox" name="active" ${coupon?.active !== false ? "checked" : ""} /> Active
        </label>
        <button type="submit" class="mz-btn mz-btn--primary mz-btn--lg mz-btn--full">
          ${coupon ? "Save Changes" : "Create Coupon"}
        </button>
      </form>
    </div>
  `;

  document.getElementById("modal-close").addEventListener("click", closeModal);
  document.getElementById("coupon-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = {
      code: fd.get("code"),
      type: fd.get("type"),
      discount: fd.get("discount"),
      minimumOrder: fd.get("minimumOrder"),
      maximumDiscount: fd.get("maximumDiscount") || null,
      expiry: fd.get("expiry"),
      usageLimit: fd.get("usageLimit"),
      active: fd.get("active") === "on"
    };
    try {
      if (editingId) {
        delete payload.code; // code is immutable once created (it's the doc ID)
        await updateCoupon(editingId, payload);
      } else {
        await createCoupon(payload);
      }
      closeModal();
      loadCoupons();
    } catch (err) {
      console.error("[MIZANORA Admin] Save coupon failed:", err);
      alert("Couldn't save coupon. Check your connection and try again.");
    }
  });
}

function closeModal() {
  document.getElementById("modal-backdrop").style.display = "none";
  document.getElementById("modal-backdrop").innerHTML = "";
  editingId = null;
}
