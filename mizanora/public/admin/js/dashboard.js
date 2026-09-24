// =====================================================================
// MIZANORA Admin — Dashboard home
//
// Every number here is computed from real Firestore data. When there
// is no data, the card shows 0 — never a placeholder/fake figure
// (spec §15: "If data doesn't exist, show zero / empty states.").
// =====================================================================

import { requireAdmin } from "./auth-guard.js";
import { renderAdminShell, formatPKR } from "./admin-shared.js";
import { db } from "../../js/services/firebase-init.js";
import {
  collection, query, orderBy, limit, getDocs
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// Dashboard scans up to this many of the most recent orders/products to
// compute stats client-side. Fine for a store with hundreds to low
// thousands of orders; beyond that, replace this with Cloud
// Function-computed aggregates (e.g. a scheduled function that writes
// daily totals to a small /stats doc) rather than raising this limit.
const STATS_SCAN_LIMIT = 2000;

init();

async function init() {
  const user = await requireAdmin();
  renderAdminShell("dashboard", user);
  await loadStats();
}

async function loadStats() {
  const grid = document.getElementById("stat-grid");

  try {
    const [ordersSnap, productsSnap] = await Promise.all([
      getDocs(query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(STATS_SCAN_LIMIT))),
      getDocs(query(collection(db, "products"), orderBy("createdAt", "desc"), limit(STATS_SCAN_LIMIT)))
    ]);

    const orders = ordersSnap.docs.map((d) => d.data());
    const products = productsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isCancelledLike = (status) => status === "cancelled" || status === "returned";

    const totalSales = orders
      .filter((o) => !isCancelledLike(o.orderStatus))
      .reduce((sum, o) => sum + (o.total || 0), 0);

    const todaySales = orders
      .filter((o) => {
        const created = o.createdAt?.toDate ? o.createdAt.toDate() : null;
        return created && created >= today && !isCancelledLike(o.orderStatus);
      })
      .reduce((sum, o) => sum + (o.total || 0), 0);

    const pendingCount = orders.filter((o) => ["placed", "confirmed", "processing", "packed"].includes(o.orderStatus)).length;
    const deliveredCount = orders.filter((o) => o.orderStatus === "delivered").length;
    const cancelledCount = orders.filter((o) => isCancelledLike(o.orderStatus)).length;
    const lowStockCount = products.filter((p) => p.stock <= 5).length;

    grid.innerHTML = [
      statCard("Total Sales", formatPKR(totalSales), true),
      statCard("Today's Sales", formatPKR(todaySales), true),
      statCard("Total Orders", orders.length),
      statCard("Pending Orders", pendingCount),
      statCard("Delivered Orders", deliveredCount),
      statCard("Cancelled/Returned", cancelledCount),
      statCard("Total Products", products.length),
      statCard("Low Stock", lowStockCount)
    ].join("");

    renderLowStock(products);
  } catch (err) {
    console.error("[MIZANORA Admin] Dashboard stats failed:", err);
    grid.innerHTML = `<div class="mz-empty-admin" style="grid-column:1/-1;">Couldn't load dashboard stats. Check your connection and Firestore permissions.</div>`;
  }
}

function renderLowStock(products) {
  const host = document.getElementById("low-stock-list");
  const lowStock = products
    .filter((p) => p.stock <= 5)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 8);

  if (lowStock.length === 0) {
    host.innerHTML = `<div class="mz-empty-admin">No low-stock products right now.</div>`;
    return;
  }

  host.innerHTML = `
    <div class="mz-admin-table-wrap">
      <table class="mz-admin-table">
        <thead><tr><th>Product</th><th>Stock</th><th>Status</th></tr></thead>
        <tbody>
          ${lowStock.map((p) => `
            <tr>
              <td>${p.title || "Untitled"}</td>
              <td>${p.stock}</td>
              <td><span class="mz-admin-badge ${p.stock === 0 ? "out" : "low"}">${p.stock === 0 ? "Out of Stock" : "Low Stock"}</span></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function statCard(label, value, isGold = false) {
  return `
    <div class="mz-stat-card">
      <div class="mz-stat-card__label">${label}</div>
      <div class="mz-stat-card__value ${isGold ? "is-gold" : ""}">${value}</div>
    </div>
  `;
}
