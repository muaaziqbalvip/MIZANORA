// =====================================================================
// MIZANORA Admin — Banners / Homepage CMS page
// =====================================================================

import { requireAdmin } from "./auth-guard.js";
import { renderAdminShell, escapeHtml } from "./admin-shared.js";
import {
  listBannersAdmin, createBanner, updateBanner, deleteBanner, toggleBannerActive
} from "./services/admin-banners.js";
import { uploadImageToImgbb } from "../../js/services/imgbb-service.js";

let editingId = null;
let uploadedImageUrl = null;

init();

async function init() {
  const user = await requireAdmin();
  renderAdminShell("banners", user);
  await loadBanners();

  document.getElementById("add-banner-btn").addEventListener("click", () => openModal());
  document.getElementById("modal-backdrop").addEventListener("click", (e) => {
    if (e.target.id === "modal-backdrop") closeModal();
  });
}

async function loadBanners() {
  const host = document.getElementById("banners-table");
  host.innerHTML = `<div class="mz-skeleton" style="height:200px;"></div>`;

  try {
    const banners = await listBannersAdmin();
    if (banners.length === 0) {
      host.innerHTML = `<div class="mz-empty-admin">No banners yet. Add a hero banner to control what shows on the homepage.</div>`;
      return;
    }

    host.innerHTML = `
      <div class="mz-admin-table-wrap">
        <table class="mz-admin-table">
          <thead><tr><th></th><th>Title</th><th>Type</th><th>Order</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${banners.map((b) => `
              <tr>
                <td>${b.image ? `<img src="${b.image}" class="mz-admin-table-img" alt="" />` : "—"}</td>
                <td style="color:var(--mz-text);">${escapeHtml(b.title || "Untitled")}</td>
                <td style="text-transform:capitalize;">${escapeHtml(b.type)}</td>
                <td>${b.order ?? "—"}</td>
                <td><span class="mz-admin-badge ${b.active ? "active" : "inactive"}">${b.active ? "Active" : "Inactive"}</span></td>
                <td style="white-space:nowrap;">
                  <button class="mz-admin-icon-btn" data-edit="${b.id}" title="Edit">✎</button>
                  <button class="mz-admin-icon-btn" data-toggle="${b.id}" data-active="${b.active}" title="${b.active ? "Deactivate" : "Activate"}">${b.active ? "⏸" : "▶"}</button>
                  <button class="mz-admin-icon-btn is-danger" data-delete="${b.id}" title="Delete">🗑</button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;

    host.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", () => openModal(banners.find((b) => b.id === btn.dataset.edit)));
    });
    host.querySelectorAll("[data-toggle]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await toggleBannerActive(btn.dataset.toggle, btn.dataset.active !== "true");
        loadBanners();
      });
    });
    host.querySelectorAll("[data-delete]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Delete this banner?")) return;
        await deleteBanner(btn.dataset.delete);
        loadBanners();
      });
    });
  } catch (err) {
    console.error("[MIZANORA Admin] Load banners failed:", err);
    host.innerHTML = `<div class="mz-empty-admin">Couldn't load banners. Check your connection.</div>`;
  }
}

function openModal(banner = null) {
  editingId = banner?.id || null;
  uploadedImageUrl = banner?.image || null;

  const backdrop = document.getElementById("modal-backdrop");
  backdrop.style.display = "flex";
  backdrop.innerHTML = `
    <div class="mz-modal">
      <div class="mz-modal__head">
        <h3>${banner ? "Edit Banner" : "Add Banner"}</h3>
        <button class="mz-admin-icon-btn" id="modal-close">✕</button>
      </div>
      <div class="mz-checkout-alert" id="modal-alert"></div>
      <form class="mz-checkout-form" id="banner-form">
        <div class="mz-form-group">
          <label>Type</label>
          <select name="type">
            <option value="hero" ${banner?.type === "hero" ? "selected" : ""}>Hero (homepage top)</option>
            <option value="promo" ${banner?.type === "promo" ? "selected" : ""}>Promotional</option>
            <option value="announcement" ${banner?.type === "announcement" ? "selected" : ""}>Announcement Bar</option>
          </select>
        </div>
        <div class="mz-form-group">
          <label>Title <span class="required">*</span></label>
          <input type="text" name="title" required value="${escapeHtml(banner?.title || "")}" />
        </div>
        <div class="mz-form-group">
          <label>Subtitle</label>
          <input type="text" name="subtitle" value="${escapeHtml(banner?.subtitle || "")}" />
        </div>
        <div class="mz-form-row">
          <div class="mz-form-group">
            <label>Button Text</label>
            <input type="text" name="ctaText" value="${escapeHtml(banner?.ctaText || "")}" />
          </div>
          <div class="mz-form-group">
            <label>Button Link</label>
            <input type="text" name="ctaLink" placeholder="/shop" value="${escapeHtml(banner?.ctaLink || "")}" />
          </div>
        </div>
        <div class="mz-form-group">
          <label>Sort Order</label>
          <input type="number" name="order" value="${banner?.order ?? 0}" />
        </div>

        <div class="mz-form-group">
          <label>Banner Image</label>
          <div class="mz-upload-zone" id="upload-zone">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></svg>
            <div style="font-size:0.85rem;color:var(--mz-text-dim);">Click to upload image</div>
            <input type="file" id="file-input" accept="image/*" style="display:none;" />
          </div>
          <div id="preview-slot" style="margin-top:12px;">
            ${uploadedImageUrl ? `<img src="${uploadedImageUrl}" style="max-width:200px;border-radius:8px;" alt="" />` : ""}
          </div>
        </div>

        <label class="mz-filter-option">
          <input type="checkbox" name="active" ${banner?.active !== false ? "checked" : ""} /> Active (visible on storefront)
        </label>

        <button type="submit" class="mz-btn mz-btn--primary mz-btn--lg mz-btn--full" id="save-btn">
          ${banner ? "Save Changes" : "Create Banner"}
        </button>
      </form>
    </div>
  `;

  document.getElementById("modal-close").addEventListener("click", closeModal);
  bindUpload();
  bindSubmit();
}

function bindUpload() {
  const zone = document.getElementById("upload-zone");
  const input = document.getElementById("file-input");
  zone.addEventListener("click", () => input.click());
  input.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const preview = document.getElementById("preview-slot");
    preview.innerHTML = `<div style="font-size:0.8rem;color:var(--mz-text-faint);">Uploading…</div>`;
    try {
      const result = await uploadImageToImgbb(file);
      uploadedImageUrl = result.url;
      preview.innerHTML = `<img src="${result.url}" style="max-width:200px;border-radius:8px;" alt="" />`;
    } catch (err) {
      console.error("[MIZANORA Admin] Banner image upload failed:", err);
      preview.innerHTML = `<div style="font-size:0.8rem;color:var(--mz-danger);">Upload failed: ${err.message}</div>`;
    }
  });
}

function bindSubmit() {
  document.getElementById("banner-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById("save-btn");
    const fd = new FormData(e.target);

    saveBtn.disabled = true;
    saveBtn.textContent = "Saving…";

    const payload = {
      type: fd.get("type"),
      title: fd.get("title").trim(),
      subtitle: fd.get("subtitle")?.trim() || null,
      ctaText: fd.get("ctaText")?.trim() || null,
      ctaLink: fd.get("ctaLink")?.trim() || null,
      order: Number(fd.get("order")) || 0,
      image: uploadedImageUrl || null,
      active: fd.get("active") === "on"
    };

    try {
      if (editingId) {
        await updateBanner(editingId, payload);
      } else {
        await createBanner(payload);
      }
      closeModal();
      loadBanners();
    } catch (err) {
      console.error("[MIZANORA Admin] Save banner failed:", err);
      showAlert("Couldn't save banner. Check your connection and try again.");
      saveBtn.disabled = false;
      saveBtn.textContent = editingId ? "Save Changes" : "Create Banner";
    }
  });
}

function showAlert(msg) {
  const el = document.getElementById("modal-alert");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("is-visible");
}

function closeModal() {
  document.getElementById("modal-backdrop").style.display = "none";
  document.getElementById("modal-backdrop").innerHTML = "";
  editingId = null;
  uploadedImageUrl = null;
}
