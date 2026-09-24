// =====================================================================
// MIZANORA Admin — Send Notification page
// =====================================================================

import { requireAdmin } from "./auth-guard.js";
import { renderAdminShell } from "./admin-shared.js";
import { sendNotification } from "./services/admin-notifications.js";

init();

async function init() {
  const user = await requireAdmin();
  renderAdminShell("notifications", user);
  bindForm();
}

function bindForm() {
  const form = document.getElementById("notification-form");
  const audienceSelect = document.getElementById("audience-select");
  const customerIdGroup = document.getElementById("customer-id-group");

  audienceSelect.addEventListener("change", () => {
    customerIdGroup.style.display = audienceSelect.value === "customer" ? "flex" : "none";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const btn = form.querySelector("button[type=submit]");
    const alert = document.getElementById("send-alert");
    alert.classList.remove("is-visible");

    const audience = fd.get("audience");
    const customerId = fd.get("customerId")?.trim() || null;

    if (audience === "customer" && !customerId) {
      alert.textContent = "Please enter a customer UID for a targeted notification.";
      alert.classList.add("is-visible");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Sending…";

    try {
      await sendNotification({
        audience,
        customerId,
        type: fd.get("type"),
        title: fd.get("title").trim(),
        body: fd.get("body").trim()
      });
      form.reset();
      customerIdGroup.style.display = "none";
      alert.textContent = "Notification sent successfully.";
      alert.style.color = "var(--mz-success)";
      alert.style.borderColor = "var(--mz-success)";
      alert.style.background = "rgba(78,159,110,0.12)";
      alert.classList.add("is-visible");
    } catch (err) {
      console.error("[MIZANORA Admin] Send notification failed:", err);
      alert.textContent = "Couldn't send notification. Check your connection and try again.";
      alert.style.color = "";
      alert.style.borderColor = "";
      alert.style.background = "";
      alert.classList.add("is-visible");
    } finally {
      btn.disabled = false;
      btn.textContent = "Send Notification";
    }
  });
}
