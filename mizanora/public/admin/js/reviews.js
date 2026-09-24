// =====================================================================
// MIZANORA Admin — Reviews moderation page
// =====================================================================

import { requireAdmin } from "./auth-guard.js";
import { renderAdminShell, escapeHtml } from "./admin-shared.js";
import { listReviewsAdmin, moderateReviewAdmin } from "./services/admin-reviews.js";

let currentTab = "pending";

init();

async function init() {
  const user = await requireAdmin();
  renderAdminShell("reviews", user);
  bindTabs();
  await loadReviews();
}

function bindTabs() {
  document.querySelectorAll("[data-review-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentTab = btn.dataset.reviewTab;
      document.querySelectorAll("[data-review-tab]").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      loadReviews();
    });
  });
}

async function loadReviews() {
  const host = document.getElementById("reviews-list");
  host.innerHTML = `<div class="mz-skeleton" style="height:200px;"></div>`;

  try {
    const reviews = await listReviewsAdmin(currentTab);
    if (reviews.length === 0) {
      host.innerHTML = `<div class="mz-empty-admin">No ${currentTab} reviews.</div>`;
      return;
    }

    host.innerHTML = reviews.map(reviewCard).join("");
    bindActions();
  } catch (err) {
    console.error("[MIZANORA Admin] Load reviews failed:", err);
    host.innerHTML = `<div class="mz-empty-admin">Couldn't load reviews. Check your connection and that Firestore indexes are deployed.</div>`;
  }
}

function reviewCard(r) {
  const date = r.createdAt?.toDate ? r.createdAt.toDate() : null;
  return `
    <div class="mz-order-card" data-review-id="${r.id}">
      <div class="mz-order-card__top">
        <div>
          <div style="color:var(--mz-gold);">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</div>
          <div style="font-size:0.8rem;color:var(--mz-text-faint);margin-top:4px;">
            ${escapeHtml(r.customerName || "Customer")} ${date ? `· ${date.toLocaleDateString("en-PK", { day: "numeric", month: "short" })}` : ""}
          </div>
        </div>
      </div>
      ${r.title ? `<strong style="display:block;color:var(--mz-text);margin-bottom:6px;font-size:0.9rem;">${escapeHtml(r.title)}</strong>` : ""}
      <p style="font-size:0.85rem;color:var(--mz-text-dim);margin-bottom:var(--mz-space-4);">${escapeHtml(r.comment || "")}</p>
      ${currentTab === "pending" ? `
        <div style="display:flex;gap:8px;">
          <button class="mz-btn mz-btn--outline" style="padding:0.5rem 1.1rem;font-size:0.8rem;color:var(--mz-success);border-color:var(--mz-success);" data-approve="${r.id}">Approve</button>
          <button class="mz-btn mz-btn--outline" style="padding:0.5rem 1.1rem;font-size:0.8rem;color:var(--mz-danger);border-color:var(--mz-danger);" data-reject="${r.id}">Reject</button>
        </div>
      ` : `<span class="mz-admin-badge ${r.status === "approved" ? "active" : "out"}">${r.status}</span>`}
    </div>
  `;
}

function bindActions() {
  document.querySelectorAll("[data-approve]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        await moderateReviewAdmin(btn.dataset.approve, "approved");
        loadReviews();
      } catch (err) {
        console.error("[MIZANORA Admin] Approve review failed:", err);
        btn.disabled = false;
      }
    });
  });
  document.querySelectorAll("[data-reject]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        await moderateReviewAdmin(btn.dataset.reject, "rejected");
        loadReviews();
      } catch (err) {
        console.error("[MIZANORA Admin] Reject review failed:", err);
        btn.disabled = false;
      }
    });
  });
}
