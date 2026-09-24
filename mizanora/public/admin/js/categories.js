// =====================================================================
// MIZANORA Admin — Categories page
// =====================================================================

import { requireAdmin } from "./auth-guard.js";
import { renderAdminShell, escapeHtml } from "./admin-shared.js";
import {
  listCategoriesAdmin, createCategory, updateCategory, deleteCategory
} from "./services/admin-categories.js";

let editingId = null;

init();

async function init() {
  const user = await requireAdmin();
  renderAdminShell("categories", user);
  await loadCategories();

  document.getElementById("add-category-btn").addEventListener("click", () => openModal());
  document.getElementById("modal-backdrop").addEventListener("click", (e) => {
    if (e.target.id === "modal-backdrop") closeModal();
  });
}

async function loadCategories() {
  const host = document.getElementById("categories-table");
  host.innerHTML = `<div class="mz-skeleton" style="height:200px;"></div>`;

  try {
    const categories = await listCategoriesAdmin();
    if (categories.length === 0) {
      host.innerHTML = `<div class="mz-empty-admin">No categories yet. Click "Add Category" to create your first one.</div>`;
      return;
    }

    host.innerHTML = `
      <div class="mz-admin-table-wrap">
        <table class="mz-admin-table">
          <thead><tr><th>Name</th><th>Slug</th><th>Order</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${categories.map((c) => `
              <tr>
                <td style="color:var(--mz-text);">${escapeHtml(c.name)}</td>
                <td>${escapeHtml(c.slug)}</td>
                <td>${c.order ?? "—"}</td>
                <td><span class="mz-admin-badge ${c.active ? "active" : "inactive"}">${c.active ? "Active" : "Inactive"}</span></td>
                <td style="white-space:nowrap;">
                  <button class="mz-admin-icon-btn" data-edit="${c.id}" title="Edit">✎</button>
                  <button class="mz-admin-icon-btn is-danger" data-delete="${c.id}" title="Delete">🗑</button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;

    host.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", () => openModal(categories.find((c) => c.id === btn.dataset.edit)));
    });
    host.querySelectorAll("[data-delete]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Delete this category? Products in it will keep their categoryId but it will no longer resolve to a visible category.")) return;
        await deleteCategory(btn.dataset.delete);
        loadCategories();
      });
    });
  } catch (err) {
    console.error("[MIZANORA Admin] Load categories failed:", err);
    host.innerHTML = `<div class="mz-empty-admin">Couldn't load categories. Check your connection.</div>`;
  }
}

function openModal(category = null) {
  editingId = category?.id || null;
  const backdrop = document.getElementById("modal-backdrop");
  backdrop.style.display = "flex";
  backdrop.innerHTML = `
    <div class="mz-modal" style="max-width:480px;">
      <div class="mz-modal__head">
        <h3>${category ? "Edit Category" : "Add Category"}</h3>
        <button class="mz-admin-icon-btn" id="modal-close">✕</button>
      </div>
      <form class="mz-checkout-form" id="category-form">
        <div class="mz-form-group">
          <label>Name <span class="required">*</span></label>
          <input type="text" name="name" required value="${escapeHtml(category?.name || "")}" />
        </div>
        <div class="mz-form-group">
          <label>Slug (leave blank to auto-generate)</label>
          <input type="text" name="slug" value="${escapeHtml(category?.slug || "")}" />
        </div>
        <div class="mz-form-group">
          <label>Sort Order</label>
          <input type="number" name="order" value="${category?.order ?? 0}" />
        </div>
        <label class="mz-filter-option">
          <input type="checkbox" name="active" ${category?.active !== false ? "checked" : ""} /> Active (visible on storefront)
        </label>
        <button type="submit" class="mz-btn mz-btn--primary mz-btn--lg mz-btn--full">
          ${category ? "Save Changes" : "Create Category"}
        </button>
      </form>
    </div>
  `;

  document.getElementById("modal-close").addEventListener("click", closeModal);
  document.getElementById("category-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = {
      name: fd.get("name").trim(),
      slug: fd.get("slug")?.trim() || undefined,
      order: Number(fd.get("order")) || 0,
      active: fd.get("active") === "on"
    };
    try {
      if (editingId) {
        await updateCategory(editingId, payload);
      } else {
        await createCategory(payload);
      }
      closeModal();
      loadCategories();
    } catch (err) {
      console.error("[MIZANORA Admin] Save category failed:", err);
      alert("Couldn't save category. Check your connection and try again.");
    }
  });
}

function closeModal() {
  document.getElementById("modal-backdrop").style.display = "none";
  document.getElementById("modal-backdrop").innerHTML = "";
  editingId = null;
}
