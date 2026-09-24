// =====================================================================
// MIZANORA Admin — Products page
// =====================================================================

import { requireAdmin } from "./auth-guard.js";
import { renderAdminShell, formatPKR, escapeHtml } from "./admin-shared.js";
import {
  listProductsAdmin, createProduct, updateProduct, deleteProduct, toggleProductActive
} from "./services/admin-products.js";
import { listCategoriesAdmin } from "./services/admin-categories.js";
import { uploadMultipleToImgbb } from "../../js/services/imgbb-service.js";

let categories = [];
let pendingImages = []; // { url, thumbUrl } collected during the current modal session
let editingProductId = null;

init();

async function init() {
  const user = await requireAdmin();
  renderAdminShell("products", user);

  categories = await listCategoriesAdmin().catch(() => []);
  await loadProducts();

  document.getElementById("add-product-btn").addEventListener("click", () => openModal());
  document.getElementById("modal-backdrop").addEventListener("click", (e) => {
    if (e.target.id === "modal-backdrop") closeModal();
  });
}

async function loadProducts() {
  const tableHost = document.getElementById("products-table");
  tableHost.innerHTML = `<div class="mz-skeleton" style="height:300px;"></div>`;

  try {
    const { items } = await listProductsAdmin();
    if (items.length === 0) {
      tableHost.innerHTML = `<div class="mz-empty-admin">No products yet. Click "Add Product" to create your first one.</div>`;
      return;
    }

    tableHost.innerHTML = `
      <div class="mz-admin-table-wrap">
        <table class="mz-admin-table">
          <thead><tr><th></th><th>Product</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${items.map(productRow).join("")}
          </tbody>
        </table>
      </div>
    `;
    bindRowEvents(items);
  } catch (err) {
    console.error("[MIZANORA Admin] Load products failed:", err);
    tableHost.innerHTML = `<div class="mz-empty-admin">Couldn't load products. Check your connection.</div>`;
  }
}

function productRow(p) {
  const stockBadge = p.stockStatus === "out_of_stock" ? "out" : p.stockStatus === "low_stock" ? "low" : "active";
  const stockLabel = p.stockStatus === "out_of_stock" ? "Out of Stock" : p.stockStatus === "low_stock" ? "Low Stock" : "In Stock";
  return `
    <tr>
      <td><img src="${p.thumbnail || p.images?.[0] || ""}" class="mz-admin-table-img" alt="" /></td>
      <td style="color:var(--mz-text);">${escapeHtml(p.title || "Untitled")}</td>
      <td>${formatPKR(p.price)}</td>
      <td><span class="mz-admin-badge ${stockBadge}">${p.stock} · ${stockLabel}</span></td>
      <td><span class="mz-admin-badge ${p.active ? "active" : "inactive"}">${p.active ? "Active" : "Inactive"}</span></td>
      <td style="white-space:nowrap;">
        <button class="mz-admin-icon-btn" data-edit="${p.id}" title="Edit">✎</button>
        <button class="mz-admin-icon-btn" data-toggle="${p.id}" data-active="${p.active}" title="${p.active ? "Deactivate" : "Activate"}">${p.active ? "⏸" : "▶"}</button>
        <button class="mz-admin-icon-btn is-danger" data-delete="${p.id}" title="Delete">🗑</button>
      </td>
    </tr>
  `;
}

function bindRowEvents(items) {
  document.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => openModal(items.find((p) => p.id === btn.dataset.edit)));
  });
  document.querySelectorAll("[data-toggle]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const active = btn.dataset.active === "true";
      await toggleProductActive(btn.dataset.toggle, !active);
      loadProducts();
    });
  });
  document.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this product? This cannot be undone.")) return;
      await deleteProduct(btn.dataset.delete);
      loadProducts();
    });
  });
}

// =====================================================================
// MODAL — create/edit form
// =====================================================================
function openModal(product = null) {
  editingProductId = product?.id || null;
  pendingImages = product?.images?.map((url) => ({ url, thumbUrl: url })) || [];

  const backdrop = document.getElementById("modal-backdrop");
  backdrop.style.display = "flex";
  backdrop.innerHTML = `
    <div class="mz-modal">
      <div class="mz-modal__head">
        <h3>${product ? "Edit Product" : "Add Product"}</h3>
        <button class="mz-admin-icon-btn" id="modal-close">✕</button>
      </div>
      <div class="mz-checkout-alert" id="modal-alert"></div>
      <form class="mz-checkout-form" id="product-form">
        <div class="mz-form-group">
          <label>Title <span class="required">*</span></label>
          <input type="text" name="title" required value="${escapeHtml(product?.title || "")}" />
        </div>
        <div class="mz-form-group">
          <label>Short Description</label>
          <input type="text" name="shortDescription" value="${escapeHtml(product?.shortDescription || "")}" />
        </div>
        <div class="mz-form-group">
          <label>Full Description</label>
          <textarea name="description">${escapeHtml(product?.description || "")}</textarea>
        </div>
        <div class="mz-form-row">
          <div class="mz-form-group">
            <label>Price (Rs.) <span class="required">*</span></label>
            <input type="number" name="price" min="0" required value="${product?.price || ""}" />
          </div>
          <div class="mz-form-group">
            <label>Compare-at Price (optional)</label>
            <input type="number" name="compareAtPrice" min="0" value="${product?.compareAtPrice || ""}" />
          </div>
        </div>
        <div class="mz-form-row">
          <div class="mz-form-group">
            <label>Stock <span class="required">*</span></label>
            <input type="number" name="stock" min="0" required value="${product?.stock ?? ""}" />
          </div>
          <div class="mz-form-group">
            <label>SKU</label>
            <input type="text" name="sku" value="${escapeHtml(product?.sku || "")}" />
          </div>
        </div>
        <div class="mz-form-group">
          <label>Category</label>
          <select name="categoryId">
            <option value="">No category</option>
            ${categories.map((c) => `<option value="${c.id}" ${product?.categoryId === c.id ? "selected" : ""}>${escapeHtml(c.name)}</option>`).join("")}
          </select>
        </div>
        <div class="mz-form-group">
          <label>Tags (comma-separated)</label>
          <input type="text" name="tags" value="${escapeHtml((product?.tags || []).join(", "))}" />
        </div>

        <div class="mz-form-row">
          <label class="mz-filter-option"><input type="checkbox" name="featured" ${product?.featured ? "checked" : ""} /> Featured</label>
          <label class="mz-filter-option"><input type="checkbox" name="bestseller" ${product?.bestseller ? "checked" : ""} /> Bestseller</label>
        </div>

        <div class="mz-form-group">
          <label>Images</label>
          <div class="mz-upload-zone" id="upload-zone">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></svg>
            <div style="font-size:0.85rem;color:var(--mz-text-dim);">Click to upload images</div>
            <input type="file" id="file-input" accept="image/*" multiple style="display:none;" />
          </div>
          <div class="mz-upload-preview-grid" id="preview-grid"></div>
        </div>

        <button type="submit" class="mz-btn mz-btn--primary mz-btn--lg mz-btn--full" id="save-btn">
          ${product ? "Save Changes" : "Create Product"}
        </button>
      </form>
    </div>
  `;

  document.getElementById("modal-close").addEventListener("click", closeModal);
  bindUploadZone();
  renderPreviewGrid();
  bindFormSubmit();
}

function closeModal() {
  document.getElementById("modal-backdrop").style.display = "none";
  document.getElementById("modal-backdrop").innerHTML = "";
  editingProductId = null;
  pendingImages = [];
}

function bindUploadZone() {
  const zone = document.getElementById("upload-zone");
  const input = document.getElementById("file-input");

  zone.addEventListener("click", () => input.click());
  zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("is-dragover"); });
  zone.addEventListener("dragleave", () => zone.classList.remove("is-dragover"));
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("is-dragover");
    handleFiles(Array.from(e.dataTransfer.files));
  });
  input.addEventListener("change", (e) => handleFiles(Array.from(e.target.files)));
}

async function handleFiles(files) {
  if (files.length === 0) return;

  const placeholderIndexStart = pendingImages.length;
  files.forEach(() => pendingImages.push({ url: null, uploading: true, progress: 0 }));
  renderPreviewGrid();

  try {
    const results = await uploadMultipleToImgbb(files, (overallPct, fileIndex) => {
      const idx = placeholderIndexStart + fileIndex;
      if (pendingImages[idx]) {
        pendingImages[idx].progress = overallPct;
        updateProgressUI(idx, overallPct);
      }
    });
    results.forEach((r, i) => {
      pendingImages[placeholderIndexStart + i] = { url: r.url, thumbUrl: r.thumbUrl };
    });
    renderPreviewGrid();
  } catch (err) {
    console.error("[MIZANORA Admin] Image upload failed:", err);
    showModalAlert(err.message || "Image upload failed. Check your ImgBB API key is configured.");
    pendingImages.splice(placeholderIndexStart, files.length);
    renderPreviewGrid();
  }
}

function updateProgressUI(idx, pct) {
  const el = document.querySelector(`[data-preview-progress="${idx}"]`);
  if (el) el.textContent = `${pct}%`;
}

function renderPreviewGrid() {
  const grid = document.getElementById("preview-grid");
  if (!grid) return;
  grid.innerHTML = pendingImages.map((img, i) => `
    <div class="mz-upload-preview">
      ${img.uploading
        ? `<div class="mz-upload-preview__progress" data-preview-progress="${i}">${img.progress || 0}%</div>`
        : `<img src="${img.thumbUrl || img.url}" alt="" />
           <button type="button" class="mz-upload-preview__remove" data-remove-img="${i}">✕</button>`
      }
    </div>
  `).join("");

  grid.querySelectorAll("[data-remove-img]").forEach((btn) => {
    btn.addEventListener("click", () => {
      pendingImages.splice(Number(btn.dataset.removeImg), 1);
      renderPreviewGrid();
    });
  });
}

function bindFormSubmit() {
  document.getElementById("product-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById("save-btn");
    const fd = new FormData(e.target);

    const readyImages = pendingImages.filter((img) => !img.uploading && img.url);
    if (readyImages.length === 0) {
      showModalAlert("Please upload at least one product image, or wait for uploads to finish.");
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = "Saving…";

    const payload = {
      title: fd.get("title").trim(),
      shortDescription: fd.get("shortDescription")?.trim() || "",
      description: fd.get("description")?.trim() || "",
      price: Number(fd.get("price")),
      compareAtPrice: fd.get("compareAtPrice") ? Number(fd.get("compareAtPrice")) : null,
      stock: Number(fd.get("stock")),
      sku: fd.get("sku")?.trim() || "",
      categoryId: fd.get("categoryId") || null,
      tags: fd.get("tags") ? fd.get("tags").split(",").map((t) => t.trim()).filter(Boolean) : [],
      featured: fd.get("featured") === "on",
      bestseller: fd.get("bestseller") === "on",
      active: true,
      images: readyImages.map((img) => img.url),
      thumbnail: readyImages[0].thumbUrl || readyImages[0].url
    };

    try {
      if (editingProductId) {
        await updateProduct(editingProductId, payload);
      } else {
        await createProduct(payload);
      }
      closeModal();
      loadProducts();
    } catch (err) {
      console.error("[MIZANORA Admin] Save product failed:", err);
      showModalAlert("Couldn't save product. Check your connection and try again.");
      saveBtn.disabled = false;
      saveBtn.textContent = editingProductId ? "Save Changes" : "Create Product";
    }
  });
}

function showModalAlert(msg) {
  const el = document.getElementById("modal-alert");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("is-visible");
}
