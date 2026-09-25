// =====================================================================
// MIZANORA — Account page controller
// =====================================================================

import {
  onAuthChange, registerWithEmail, loginWithEmail, loginWithGoogle,
  logout, sendPasswordReset, mapAuthError
} from "../services/auth-service.js";
import {
  getCustomerProfile, getAddresses, addAddress, deleteAddress, setDefaultAddress,
  getCustomerOrders, getFirestoreWishlist, mergeGuestWishlist
} from "../services/customer-service.js";
import { getProductById } from "../services/catalog-service.js";
import { getWishlist } from "../services/wishlist-store.js";
import { getCustomerNotifications } from "../services/notification-service.js";
import { icon } from "../utils/icons.js";
import { formatPKR, initials } from "../utils/format.js";
import { getCurrentLocationAddress } from "../utils/geolocation.js";
import { initShell, escapeHtml, productCardHtml, bindProductCardEvents, emptyStateHtml } from "../shared.js";

let currentUser = null;
let hasMergedWishlist = false;

init();

function init() {
  initShell();
  onAuthChange(handleAuthChange);
}

async function handleAuthChange(user) {
  currentUser = user;

  if (!user) {
    renderAuthForms();
    return;
  }

  // One-time merge of any guest wishlist into the account. initShell()
  // (called above) already subscribes to auth state and hydrates the
  // local wishlist cache from Firestore for every page — this only
  // needs to handle the merge-in of pre-login local favorites.
  if (!hasMergedWishlist) {
    hasMergedWishlist = true;
    const localIds = getWishlist();
    if (localIds.length > 0) {
      await mergeGuestWishlist(user.uid, localIds).catch((e) => console.warn("[MIZANORA] Wishlist merge failed:", e));
    }
  }

  await renderDashboard(user);
}

// =====================================================================
// SIGNED-OUT STATE — login / register forms
// =====================================================================
function renderAuthForms() {
  const root = document.getElementById("account-root");
  root.innerHTML = `
    <div class="mz-auth-wrap">
      <h1>Welcome to MIZANORA</h1>
      <p class="mz-auth-wrap__sub">Sign in to track orders, save addresses, and build your wishlist.</p>

      <div class="mz-auth-tabs">
        <button class="mz-auth-tab is-active" id="tab-login">Sign In</button>
        <button class="mz-auth-tab" id="tab-register">Create Account</button>
      </div>

      <div class="mz-checkout-alert" id="auth-alert"></div>

      <form class="mz-checkout-form" id="login-form">
        <div class="mz-form-group">
          <label>Email</label>
          <input type="email" name="email" required autocomplete="email" />
        </div>
        <div class="mz-form-group">
          <label>Password</label>
          <input type="password" name="password" required autocomplete="current-password" />
        </div>
        <button type="submit" class="mz-btn mz-btn--primary mz-btn--lg mz-btn--full">Sign In</button>
        <button type="button" class="mz-btn mz-btn--ghost mz-btn--full" id="forgot-password-btn">Forgot password?</button>
      </form>

      <form class="mz-checkout-form" id="register-form" style="display:none;">
        <div class="mz-form-group">
          <label>Full Name</label>
          <input type="text" name="name" required autocomplete="name" />
        </div>
        <div class="mz-form-group">
          <label>Email</label>
          <input type="email" name="email" required autocomplete="email" />
        </div>
        <div class="mz-form-group">
          <label>Phone (optional)</label>
          <input type="tel" name="phone" autocomplete="tel" />
        </div>
        <div class="mz-form-group">
          <label>Password</label>
          <input type="password" name="password" required autocomplete="new-password" minlength="6" />
        </div>
        <button type="submit" class="mz-btn mz-btn--primary mz-btn--lg mz-btn--full">Create Account</button>
      </form>

      <div class="mz-auth-divider">or continue with</div>
      <button class="mz-google-btn" id="google-btn">
        ${googleIconSvg()} Continue with Google
      </button>

      <p class="mz-auth-link">
        <a href="/shop">Continue as guest instead →</a>
      </p>
    </div>
  `;

  bindAuthTabs();
  bindAuthForms();
}

function bindAuthTabs() {
  const loginTab = document.getElementById("tab-login");
  const registerTab = document.getElementById("tab-register");
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");

  loginTab.addEventListener("click", () => {
    loginTab.classList.add("is-active");
    registerTab.classList.remove("is-active");
    loginForm.style.display = "flex";
    registerForm.style.display = "none";
    hideAuthAlert();
  });
  registerTab.addEventListener("click", () => {
    registerTab.classList.add("is-active");
    loginTab.classList.remove("is-active");
    registerForm.style.display = "flex";
    loginForm.style.display = "none";
    hideAuthAlert();
  });
}

function bindAuthForms() {
  document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAuthAlert();
    const fd = new FormData(e.target);
    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      await loginWithEmail(fd.get("email"), fd.get("password"));
      // onAuthChange fires automatically and renders the dashboard
    } catch (err) {
      showAuthAlert(mapAuthError(err));
      btn.disabled = false;
    }
  });

  document.getElementById("register-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAuthAlert();
    const fd = new FormData(e.target);
    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      await registerWithEmail({
        name: fd.get("name"),
        email: fd.get("email"),
        password: fd.get("password"),
        phone: fd.get("phone") || null
      });
    } catch (err) {
      showAuthAlert(mapAuthError(err));
      btn.disabled = false;
    }
  });

  document.getElementById("google-btn").addEventListener("click", async () => {
    hideAuthAlert();
    try {
      await loginWithGoogle();
    } catch (err) {
      showAuthAlert(mapAuthError(err));
    }
  });

  document.getElementById("forgot-password-btn").addEventListener("click", async () => {
    const email = document.querySelector('#login-form [name="email"]').value.trim();
    if (!email) {
      showAuthAlert("Enter your email above first, then tap 'Forgot password?' again.");
      return;
    }
    try {
      await sendPasswordReset(email);
      showAuthAlert("Password reset email sent — check your inbox.", true);
    } catch (err) {
      showAuthAlert(mapAuthError(err));
    }
  });
}

function showAuthAlert(msg, isSuccess = false) {
  const el = document.getElementById("auth-alert");
  el.textContent = msg;
  el.classList.add("is-visible");
  el.style.color = isSuccess ? "var(--mz-success)" : "";
  el.style.borderColor = isSuccess ? "var(--mz-success)" : "";
  el.style.background = isSuccess ? "rgba(78,159,110,0.12)" : "";
}
function hideAuthAlert() {
  document.getElementById("auth-alert")?.classList.remove("is-visible");
}

// =====================================================================
// SIGNED-IN STATE — dashboard
// =====================================================================
async function renderDashboard(user) {
  const root = document.getElementById("account-root");
  const profile = await getCustomerProfile(user.uid).catch(() => null);
  const displayName = profile?.name || user.displayName || "MIZANORA Customer";

  root.innerHTML = `
    <div class="mz-account-shell">
      <nav class="mz-account-nav">
        <div class="mz-account-nav__user">
          <span class="mz-account-nav__avatar">${initials(displayName)}</span>
          <div>
            <div class="mz-account-nav__name">${escapeHtml(displayName)}</div>
            <div class="mz-account-nav__email">${escapeHtml(user.email || "")}</div>
          </div>
        </div>
        <button class="mz-account-nav-item is-active" data-panel="profile">${icon("user")} Profile</button>
        <button class="mz-account-nav-item" data-panel="orders">${icon("cart")} Orders</button>
        <button class="mz-account-nav-item" data-panel="wishlist">${icon("heart")} Wishlist</button>
        <button class="mz-account-nav-item" data-panel="addresses">${icon("truck")} Addresses</button>
        <button class="mz-account-nav-item" data-panel="notifications">${icon("sparkle")} Notifications</button>
        <button class="mz-account-nav-item is-danger" id="logout-btn">${icon("x")} Sign Out</button>
      </nav>

      <div>
        <div class="mz-account-panel is-active" data-panel-content="profile">
          <h2>Profile</h2>
          <div id="profile-content"><div class="mz-skeleton" style="height:200px;"></div></div>
        </div>
        <div class="mz-account-panel" data-panel-content="orders">
          <h2>Order History</h2>
          <div id="orders-content"><div class="mz-skeleton" style="height:120px;margin-bottom:12px;"></div><div class="mz-skeleton" style="height:120px;"></div></div>
        </div>
        <div class="mz-account-panel" data-panel-content="wishlist">
          <h2>Wishlist</h2>
          <div id="wishlist-content"><div class="mz-product-grid"><div class="mz-skeleton" style="aspect-ratio:0.72;"></div><div class="mz-skeleton" style="aspect-ratio:0.72;"></div></div></div>
        </div>
        <div class="mz-account-panel" data-panel-content="addresses">
          <h2>Saved Addresses</h2>
          <div id="addresses-content"><div class="mz-skeleton" style="height:80px;margin-bottom:12px;"></div></div>
        </div>
        <div class="mz-account-panel" data-panel-content="notifications">
          <h2>Notifications</h2>
          <div id="notifications-content"><div class="mz-skeleton" style="height:80px;margin-bottom:12px;"></div></div>
        </div>
      </div>
    </div>
  `;

  bindDashboardNav();
  document.getElementById("logout-btn").addEventListener("click", () => logout());

  renderProfilePanel(user, profile);
  renderOrdersPanel(user);
  renderWishlistPanel(user);
  renderAddressesPanel(user);
  renderNotificationsPanel(user);
}

function bindDashboardNav() {
  document.querySelectorAll(".mz-account-nav-item[data-panel]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".mz-account-nav-item[data-panel]").forEach((b) => b.classList.remove("is-active"));
      document.querySelectorAll(".mz-account-panel").forEach((p) => p.classList.remove("is-active"));
      btn.classList.add("is-active");
      document.querySelector(`[data-panel-content="${btn.dataset.panel}"]`)?.classList.add("is-active");
    });
  });
}

function renderProfilePanel(user, profile) {
  const host = document.getElementById("profile-content");
  host.innerHTML = `
    <div class="mz-order-card" style="max-width:480px;">
      <div class="mz-form-group" style="margin-bottom:16px;">
        <label>Name</label>
        <div style="color:var(--mz-text);">${escapeHtml(profile?.name || user.displayName || "—")}</div>
      </div>
      <div class="mz-form-group" style="margin-bottom:16px;">
        <label>Email</label>
        <div style="color:var(--mz-text);">${escapeHtml(user.email || "—")}</div>
      </div>
      <div class="mz-form-group">
        <label>Phone</label>
        <div style="color:var(--mz-text);">${escapeHtml(profile?.phone || "—")}</div>
      </div>
    </div>
  `;
}

async function renderOrdersPanel(user) {
  const host = document.getElementById("orders-content");
  try {
    const orders = await getCustomerOrders(user.uid);
    if (orders.length === 0) {
      host.innerHTML = emptyStateHtml({
        title: "No orders yet",
        sub: "Your order history will show up here once you place your first order.",
        iconName: "cart",
        ctaHtml: `<a href="/shop" class="mz-btn mz-btn--primary">Start Shopping</a>`
      });
      return;
    }
    host.innerHTML = orders.map(orderCardHtml).join("");
  } catch (err) {
    console.error("[MIZANORA] Order history failed:", err);
    host.innerHTML = emptyStateHtml({
      title: "Couldn't load orders",
      sub: "Check your connection and try again.",
      iconName: "cart"
    });
  }
}

function orderCardHtml(o) {
  const date = o.createdAt?.toDate ? o.createdAt.toDate() : (o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000) : null);
  return `
    <div class="mz-order-card">
      <div class="mz-order-card__top">
        <div>
          <div class="mz-order-card__id">${escapeHtml(o.orderId)}</div>
          ${date ? `<div class="mz-order-card__date">${date.toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" })}</div>` : ""}
        </div>
        <span class="mz-status-pill ${o.orderStatus}">${(o.orderStatus || "").replace(/_/g, " ")}</span>
      </div>
      <div class="mz-order-card__items">${o.items.map((i) => `${escapeHtml(i.title)} × ${i.quantity}`).join(", ")}</div>
      <div class="mz-order-card__bottom">
        <span class="mz-order-card__total">${formatPKR(o.total)}</span>
        <a href="/track-order?id=${encodeURIComponent(o.orderId)}" class="mz-btn mz-btn--outline" style="padding:0.5rem 1.1rem;font-size:0.8rem;">Track Order</a>
      </div>
    </div>
  `;
}

async function renderWishlistPanel(user) {
  const host = document.getElementById("wishlist-content");
  try {
    const productIds = await getFirestoreWishlist(user.uid);
    if (productIds.length === 0) {
      host.innerHTML = emptyStateHtml({
        title: "Your wishlist is empty",
        sub: "Tap the heart icon on any product to save it here.",
        iconName: "heart",
        ctaHtml: `<a href="/shop" class="mz-btn mz-btn--primary">Browse Products</a>`
      });
      return;
    }
    const products = (await Promise.all(productIds.map((id) => getProductById(id)))).filter(Boolean);
    host.innerHTML = `<div class="mz-product-grid" id="wishlist-grid">${products.map(productCardHtml).join("")}</div>`;
    bindProductCardEvents(document.getElementById("wishlist-grid"), products);
  } catch (err) {
    console.error("[MIZANORA] Wishlist load failed:", err);
    host.innerHTML = emptyStateHtml({ title: "Couldn't load wishlist", sub: "Check your connection and try again.", iconName: "heart" });
  }
}

async function renderAddressesPanel(user) {
  const host = document.getElementById("addresses-content");

  async function refresh() {
    const addresses = await getAddresses(user.uid).catch(() => []);
    host.innerHTML = `
      ${addresses.length === 0 ? `<p style="color:var(--mz-text-dim);font-size:0.9rem;margin-bottom:var(--mz-space-4);">No saved addresses yet.</p>` : addresses.map((a) => `
        <div class="mz-address-card ${a.isDefault ? "is-default" : ""}">
          <div>
            <div class="mz-address-card__label">${escapeHtml(a.label || "Address")} ${a.isDefault ? `<span class="mz-address-card__badge">Default</span>` : ""}</div>
            <div class="mz-address-card__text">${escapeHtml(a.address)}, ${escapeHtml(a.city)}, ${escapeHtml(a.province)}</div>
          </div>
          <div class="mz-address-card__actions">
            ${!a.isDefault ? `<button data-set-default="${a.id}">Set Default</button>` : ""}
            <button data-delete-address="${a.id}">Delete</button>
          </div>
        </div>
      `).join("")}
      <form id="add-address-form" style="margin-top:var(--mz-space-5);display:flex;flex-direction:column;gap:var(--mz-space-3);max-width:480px;">
        <div class="mz-form-row">
          <div class="mz-form-group"><label>Label</label><input type="text" name="label" placeholder="Home, Office…" required /></div>
          <div class="mz-form-group"><label>City</label><input type="text" name="city" required /></div>
        </div>
        <div class="mz-form-group">
          <label>Address</label>
          <div class="mz-address-input-row">
            <textarea name="address" required></textarea>
            <button type="button" class="mz-locate-btn" id="account-locate-btn">📍 Use my current location</button>
          </div>
          <span class="mz-locate-status" id="account-locate-status"></span>
        </div>
        <div class="mz-form-group"><label>Province</label><input type="text" name="province" required /></div>
        <button type="submit" class="mz-btn mz-btn--outline">Add Address</button>
      </form>
    `;

    document.getElementById("account-locate-btn").addEventListener("click", async () => {
      const btn = document.getElementById("account-locate-btn");
      const status = document.getElementById("account-locate-status");
      btn.disabled = true;
      status.textContent = "Detecting your location…";
      status.className = "mz-locate-status is-loading";
      try {
        const loc = await getCurrentLocationAddress();
        const form = document.getElementById("add-address-form");
        if (loc.address) form.querySelector('[name="address"]').value = loc.address;
        if (loc.city) form.querySelector('[name="city"]').value = loc.city;
        if (loc.province) form.querySelector('[name="province"]').value = loc.province;
        status.textContent = "✓ Address filled — please double-check it.";
        status.className = "mz-locate-status is-success";
      } catch (err) {
        status.textContent = err.message;
        status.className = "mz-locate-status is-error";
      } finally {
        btn.disabled = false;
      }
    });

    host.querySelectorAll("[data-delete-address]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await deleteAddress(user.uid, btn.dataset.deleteAddress);
        refresh();
      });
    });
    host.querySelectorAll("[data-set-default]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await setDefaultAddress(user.uid, btn.dataset.setDefault);
        refresh();
      });
    });
    document.getElementById("add-address-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      await addAddress(user.uid, {
        label: fd.get("label"),
        address: fd.get("address"),
        city: fd.get("city"),
        province: fd.get("province"),
        postalCode: null,
        isDefault: addresses.length === 0
      });
      refresh();
    });
  }

  refresh();
}

async function renderNotificationsPanel(user) {
  const host = document.getElementById("notifications-content");
  try {
    const notifications = await getCustomerNotifications(user.uid);
    if (notifications.length === 0) {
      host.innerHTML = emptyStateHtml({
        title: "No notifications yet",
        sub: "Order updates and announcements from MIZANORA will show up here.",
        iconName: "sparkle"
      });
      return;
    }

    host.innerHTML = notifications.map((n) => {
      const date = n.createdAt?.toDate ? n.createdAt.toDate() : null;
      return `
        <div class="mz-order-card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
            <strong style="color:var(--mz-text);font-size:0.9rem;">${escapeHtml(n.title)}</strong>
            <span style="font-size:0.7rem;color:var(--mz-text-faint);white-space:nowrap;">${date ? date.toLocaleDateString("en-PK", { day: "numeric", month: "short" }) : ""}</span>
          </div>
          <p style="font-size:0.85rem;color:var(--mz-text-dim);margin-top:6px;">${escapeHtml(n.body)}</p>
        </div>
      `;
    }).join("");
  } catch (err) {
    console.error("[MIZANORA] Load notifications failed:", err);
    host.innerHTML = emptyStateHtml({ title: "Couldn't load notifications", sub: "Check your connection and try again.", iconName: "sparkle" });
  }
}

function googleIconSvg() {
  return `<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.85A11 11 0 0012 23z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 010-4.2V7.05H2.18a11 11 0 000 9.9z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 00-9.82 6.05l3.66 2.85C6.71 7.3 9.14 5.38 12 5.38z"/></svg>`;
}
