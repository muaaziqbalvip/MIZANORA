// =====================================================================
// MIZANORA Admin — Shell helpers shared across every admin page
// =====================================================================

import { logout } from "../../js/services/auth-service.js";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", href: "/admin/", icon: "grid" },
  { key: "products", label: "Products", href: "/admin/products.html", icon: "box" },
  { key: "categories", label: "Categories", href: "/admin/categories.html", icon: "layers" },
  { key: "orders", label: "Orders", href: "/admin/orders.html", icon: "cart" },
  { key: "coupons", label: "Coupons", href: "/admin/coupons.html", icon: "tag" },
  { key: "reviews", label: "Reviews", href: "/admin/reviews.html", icon: "star" },
  { key: "banners", label: "Banners", href: "/admin/banners.html", icon: "image" },
  { key: "notifications", label: "Notifications", href: "/admin/notifications.html", icon: "bell" }
];

const ICONS = {
  grid: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>`,
  box: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>`,
  layers: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l9 5-9 5-9-5z"/><path d="M3 12l9 5 9-5"/><path d="M3 17l9 5 9-5"/></svg>`,
  cart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.5 3h2l2.6 12.4a2 2 0 002 1.6h8.8a2 2 0 002-1.6L21 8H6"/></svg>`,
  menu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>`,
  logout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>`,
  external: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/></svg>`,
  tag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.6 12.9L12.9 20.6a2 2 0 01-2.8 0l-8-8a2 2 0 010-2.8L9.8 2.1a2 2 0 011.4-.6H18a2 2 0 012 2v6.7c0 .5-.2 1-.6 1.4z"/><circle cx="14.5" cy="7.5" r="1.5"/></svg>`,
  star: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.5l2.9 6.3 6.9.6-5.2 4.6 1.6 6.8-6.2-3.7-6.2 3.7 1.6-6.8-5.2-4.6 6.9-.6z"/></svg>`,
  image: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>`,
  bell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/></svg>`
};

export function renderAdminShell(activeKey, user) {
  const sidebar = document.getElementById("admin-sidebar");
  if (!sidebar) return;

  sidebar.innerHTML = `
    <div class="mz-admin-logo">
      <img src="/assets/icons/logo-mark.png" alt="" />
      <div><span>MIZANORA</span><small>ADMIN</small></div>
    </div>
    <div class="mz-admin-nav-group">
      <div class="mz-admin-nav-label">Manage</div>
      ${NAV_ITEMS.map((item) => `
        <a href="${item.href}" class="mz-admin-nav-item ${item.key === activeKey ? "is-active" : ""}">
          ${ICONS[item.icon]} ${item.label}
        </a>
      `).join("")}
    </div>
    <div class="mz-admin-sidebar__footer">
      <a href="/" class="mz-admin-nav-item">${ICONS.external} View Store</a>
      <button class="mz-admin-nav-item" id="admin-logout-btn" style="width:100%;text-align:left;">${ICONS.logout} Sign Out</button>
    </div>
  `;

  document.getElementById("admin-logout-btn")?.addEventListener("click", () => logout());

  const toggle = document.getElementById("admin-mobile-toggle");
  const backdrop = document.getElementById("admin-backdrop");
  if (toggle) {
    toggle.innerHTML = ICONS.menu;
    toggle.addEventListener("click", () => {
      sidebar.classList.add("is-open");
      backdrop?.classList.add("is-open");
    });
  }
  backdrop?.addEventListener("click", () => {
    sidebar.classList.remove("is-open");
    backdrop.classList.remove("is-open");
  });
}

export function escapeHtml(str = "") {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

export function formatPKR(amount) {
  if (amount == null || isNaN(amount)) return "Rs. 0";
  return "Rs. " + Math.round(amount).toLocaleString("en-PK");
}
