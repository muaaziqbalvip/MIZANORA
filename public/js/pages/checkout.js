// =====================================================================
// MIZANORA — Checkout page controller
//
// Renders order review from the LOCAL cart (for display only). The
// actual price/stock/total used for the real order is computed
// server-side in createOrder — this page never trusts its own totals
// for anything beyond showing the customer a preview before they submit.
// =====================================================================

import { getCart } from "../services/cart-store.js";
import { createOrder } from "../services/order-service.js";
import { formatPKR } from "../utils/format.js";
import { getCurrentLocationAddress } from "../utils/geolocation.js";
import { icon } from "../utils/icons.js";
import { getCurrentUser } from "../services/auth-service.js";
import { getAddresses } from "../services/customer-service.js";
import { initShell, escapeHtml } from "../shared.js";

const SHIPPING_FEE = 200; // preview only — see cart.js note

const PROVINCES = [
  "Punjab", "Sindh", "Khyber Pakhtunkhwa", "Balochistan",
  "Gilgit-Baltistan", "Azad Kashmir", "Islamabad Capital Territory"
];

let couponState = readCouponFromSession();

function readCouponFromSession() {
  try {
    const raw = sessionStorage.getItem("mizanora_applied_coupon");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

init();

function init() {
  initShell();
  const items = getCart();

  if (items.length === 0) {
    document.getElementById("checkout-layout").innerHTML = `
      <div class="mz-empty-cart" style="grid-column:1/-1;">
        <h2>Your cart is empty</h2>
        <p>Add something to your cart before checking out.</p>
        <a href="/shop" class="mz-btn mz-btn--primary">Start Shopping</a>
      </div>
    `;
    return;
  }

  renderForm();
  renderSummary(items);
  bindForm(items);
}

function renderForm() {
  const host = document.getElementById("checkout-form-host");
  if (!host) return;
  host.innerHTML = `
    <div class="mz-checkout-alert" id="checkout-alert"></div>
    <div id="saved-addresses-host"></div>
    <form class="mz-checkout-form" id="checkout-form" novalidate>
      <div class="mz-form-group" data-field="customerName">
        <label>Full Name <span class="required">*</span></label>
        <input type="text" name="customerName" autocomplete="name" required />
        <span class="mz-form-error">Please enter your full name.</span>
      </div>

      <div class="mz-form-row">
        <div class="mz-form-group" data-field="phone">
          <label>Phone Number <span class="required">*</span></label>
          <input type="tel" name="phone" autocomplete="tel" placeholder="03XX-XXXXXXX" required />
          <span class="mz-form-error">Please enter a valid phone number.</span>
        </div>
        <div class="mz-form-group" data-field="email">
          <label>Email (optional)</label>
          <input type="email" name="email" autocomplete="email" />
          <span class="mz-form-error">Please enter a valid email.</span>
        </div>
      </div>

      <div class="mz-form-group" data-field="address">
        <label>Complete Address <span class="required">*</span></label>
        <div class="mz-address-input-row">
          <textarea name="address" autocomplete="street-address" required></textarea>
          <button type="button" class="mz-locate-btn" id="locate-btn">
            <span id="ic-locate"></span> Use my current location
          </button>
        </div>
        <span class="mz-form-error">Please enter your delivery address.</span>
        <span class="mz-locate-status" id="locate-status"></span>
      </div>

      <div class="mz-form-row">
        <div class="mz-form-group" data-field="city">
          <label>City <span class="required">*</span></label>
          <input type="text" name="city" autocomplete="address-level2" required />
          <span class="mz-form-error">Please enter your city.</span>
        </div>
        <div class="mz-form-group" data-field="province">
          <label>Province <span class="required">*</span></label>
          <select name="province" required>
            <option value="">Select province</option>
            ${PROVINCES.map((p) => `<option value="${p}">${p}</option>`).join("")}
          </select>
          <span class="mz-form-error">Please select your province.</span>
        </div>
      </div>

      <div class="mz-form-group">
        <label>Postal Code (optional)</label>
        <input type="text" name="postalCode" autocomplete="postal-code" />
      </div>

      <div class="mz-form-group">
        <label>Order Notes (optional)</label>
        <textarea name="notes" placeholder="Delivery instructions, landmark, etc."></textarea>
      </div>

      <div class="mz-payment-option">
        <span id="ic-cash"></span>
        <div>
          <strong>Cash on Delivery</strong>
          <span>Pay with cash when your order arrives</span>
        </div>
      </div>

      <button type="submit" class="mz-btn mz-btn--primary mz-btn--lg mz-btn--full" id="place-order-btn">
        Place Order
      </button>
    </form>
  `;

  document.getElementById("ic-cash").innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/></svg>`;
  document.getElementById("ic-locate").innerHTML = icon("pin") || `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.5 7-11.5A7 7 0 105 9.5C5 14.5 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.3"/></svg>`;
  bindLocateButton();
  renderSavedAddresses();
}

async function renderSavedAddresses() {
  const host = document.getElementById("saved-addresses-host");
  const user = getCurrentUser();
  if (!user || !host) return;

  const addresses = await getAddresses(user.uid).catch(() => []);
  if (addresses.length === 0) return;

  host.innerHTML = `
    <div class="mz-saved-addresses">
      <label>Choose a saved address</label>
      <div class="mz-saved-addresses__list">
        ${addresses.map((a) => `
          <button type="button" class="mz-saved-address-chip" data-address-id="${a.id}">
            <strong>${escapeHtml(a.label || "Address")}</strong>
            <span>${escapeHtml(a.address)}, ${escapeHtml(a.city)}</span>
          </button>
        `).join("")}
        <button type="button" class="mz-saved-address-chip is-new" data-address-id="__new">+ Enter a new address</button>
      </div>
    </div>
  `;

  host.querySelectorAll("[data-address-id]").forEach((chip) => {
    chip.addEventListener("click", () => {
      host.querySelectorAll(".mz-saved-address-chip").forEach((c) => c.classList.remove("is-selected"));
      chip.classList.add("is-selected");
      const id = chip.dataset.addressId;
      const form = document.getElementById("checkout-form");
      if (id === "__new") {
        form.querySelector('[name="address"]').value = "";
        form.querySelector('[name="city"]').value = "";
        form.querySelector('[name="province"]').value = "";
        return;
      }
      const a = addresses.find((x) => x.id === id);
      if (!a) return;
      form.querySelector('[name="address"]').value = a.address || "";
      form.querySelector('[name="city"]').value = a.city || "";
      if (a.postalCode) form.querySelector('[name="postalCode"]').value = a.postalCode;
      const provinceSelect = form.querySelector('[name="province"]');
      if (a.province && [...provinceSelect.options].some((o) => o.value === a.province)) {
        provinceSelect.value = a.province;
      }
    });
  });

  // Auto-select the default address, if any.
  const defaultChip = host.querySelector(`[data-address-id="${addresses.find((a) => a.isDefault)?.id}"]`);
  defaultChip?.click();
}

function bindLocateButton() {
  const btn = document.getElementById("locate-btn");
  const status = document.getElementById("locate-status");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    status.textContent = "Detecting your location…";
    status.className = "mz-locate-status is-loading";
    try {
      const loc = await getCurrentLocationAddress();
      const form = document.getElementById("checkout-form");
      if (loc.address) form.querySelector('[name="address"]').value = loc.address;
      if (loc.city) form.querySelector('[name="city"]').value = loc.city;
      if (loc.postalCode) form.querySelector('[name="postalCode"]').value = loc.postalCode;
      const provinceSelect = form.querySelector('[name="province"]');
      if (loc.province && [...provinceSelect.options].some((o) => o.value === loc.province)) {
        provinceSelect.value = loc.province;
      }
      status.textContent = "✓ Address filled from your location — please double-check it below.";
      status.className = "mz-locate-status is-success";
    } catch (err) {
      status.textContent = err.message;
      status.className = "mz-locate-status is-error";
    } finally {
      btn.disabled = false;
    }
  });

function renderSummary(items) {
  const host = document.getElementById("checkout-summary-host");
  if (!host) return;
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discount = couponState?.discount || 0;
  const total = Math.max(0, subtotal - discount + SHIPPING_FEE);

  host.innerHTML = `
    <aside class="mz-summary-card">
      <h3>Your Order</h3>
      <div style="max-height:260px;overflow-y:auto;margin-bottom:var(--mz-space-4);">
        ${items.map((i) => `
          <div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--mz-border-soft);">
            <div style="width:48px;height:48px;border-radius:8px;overflow:hidden;flex-shrink:0;background:var(--mz-surface-raised);">
              <img src="${i.thumbnail || ""}" alt="" style="width:100%;height:100%;object-fit:cover;" />
            </div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:0.82rem;color:var(--mz-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(i.title)}</div>
              <div style="font-size:0.75rem;color:var(--mz-text-faint);">Qty: ${i.quantity} × ${formatPKR(i.price)}</div>
            </div>
          </div>
        `).join("")}
      </div>
      <div class="mz-summary-row"><span>Subtotal</span><span>${formatPKR(subtotal)}</span></div>
      ${discount > 0 ? `<div class="mz-summary-row is-discount"><span>Discount</span><span>-${formatPKR(discount)}</span></div>` : ""}
      <div class="mz-summary-row"><span>Shipping</span><span>${formatPKR(SHIPPING_FEE)}</span></div>
      <div class="mz-summary-row is-total"><span>Total</span><span>${formatPKR(total)}</span></div>
    </aside>
  `;
}

function bindForm(items) {
  const form = document.getElementById("checkout-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    hideAlert();
    if (!validateForm(form)) return;
    openAddressConfirmModal(form, items);
  });
}

function openAddressConfirmModal(form, items) {
  const fd = new FormData(form);
  const overlay = document.createElement("div");
  overlay.className = "mz-modal-overlay is-open";
  overlay.innerHTML = `
    <div class="mz-modal" role="dialog" aria-modal="true" aria-label="Confirm delivery address">
      <h3>Confirm Your Delivery Address</h3>
      <p class="mz-modal__hint">Please double-check this before we place your order — it can't be changed once submitted.</p>
      <div class="mz-modal__address">
        <strong>${escapeHtml(fd.get("customerName").trim())}</strong> · ${escapeHtml(fd.get("phone").trim())}<br/>
        ${escapeHtml(fd.get("address").trim())}<br/>
        ${escapeHtml(fd.get("city").trim())}, ${escapeHtml(fd.get("province"))}
        ${fd.get("postalCode")?.trim() ? ` — ${escapeHtml(fd.get("postalCode").trim())}` : ""}
      </div>
      <div class="mz-modal__actions">
        <button type="button" class="mz-btn mz-btn--ghost" id="modal-edit-btn">Edit Address</button>
        <button type="button" class="mz-btn mz-btn--primary" id="modal-confirm-btn">Confirm &amp; Place Order</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";

  const close = () => {
    overlay.remove();
    document.body.style.overflow = "";
  };

  overlay.querySelector("#modal-edit-btn").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  overlay.querySelector("#modal-confirm-btn").addEventListener("click", async () => {
    close();
    await submitOrder(form, items);
  });
}

async function submitOrder(form, items) {
  const submitBtn = document.getElementById("place-order-btn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Placing Order…";

  const formData = new FormData(form);
  const payload = {
    items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
    customerName: formData.get("customerName").trim(),
    phone: formData.get("phone").trim(),
    email: formData.get("email")?.trim() || null,
    address: formData.get("address").trim(),
    city: formData.get("city").trim(),
    province: formData.get("province"),
    postalCode: formData.get("postalCode")?.trim() || null,
    notes: formData.get("notes")?.trim() || null,
    couponCode: couponState?.code || null
  };

  try {
    const result = await createOrder(payload);
    localStorage.removeItem("mizanora_cart_v1");
    sessionStorage.setItem("mizanora_last_order", JSON.stringify(result));
    location.href = `/order-success?id=${encodeURIComponent(result.orderId)}`;
  } catch (err) {
    console.error("[MIZANORA] createOrder failed:", err);
    submitBtn.disabled = false;
    submitBtn.textContent = "Place Order";
    showAlert(mapOrderError(err));
  }
}

function validateForm(form) {
  let valid = true;
  const required = ["customerName", "phone", "address", "city", "province"];

  required.forEach((name) => {
    const field = form.querySelector(`[name="${name}"]`);
    const group = field.closest(".mz-form-group");
    const value = field.value.trim();
    let fieldValid = value.length > 0;

    if (name === "phone" && fieldValid) {
      fieldValid = /^[0-9+\-\s()]{7,20}$/.test(value);
    }

    group.classList.toggle("has-error", !fieldValid);
    if (!fieldValid) valid = false;
  });

  const emailField = form.querySelector('[name="email"]');
  if (emailField.value.trim()) {
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailField.value.trim());
    emailField.closest(".mz-form-group").classList.toggle("has-error", !emailValid);
    if (!emailValid) valid = false;
  }

  if (!valid) {
    showAlert("Please fix the highlighted fields below.");
    document.querySelector(".mz-form-group.has-error")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return valid;
}

function mapOrderError(err) {
  const code = err?.code || "";
  if (code.includes("failed-precondition")) return err.message || "Some items in your cart are no longer available.";
  if (code.includes("not-found")) return "One or more products in your cart no longer exist. Please review your cart.";
  if (code.includes("invalid-argument")) return err.message || "Please check your order details and try again.";
  return "Something went wrong placing your order. Please check your connection and try again.";
}

function showAlert(msg) {
  const alert = document.getElementById("checkout-alert");
  alert.textContent = msg;
  alert.classList.add("is-visible");
}

function hideAlert() {
  document.getElementById("checkout-alert")?.classList.remove("is-visible");
}
