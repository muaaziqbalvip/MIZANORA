// =====================================================================
// MIZANORA — WhatsApp/Meta Commerce Catalog → Firestore sync
//
// Direction: WhatsApp Business Catalog (managed in Meta Commerce
// Manager) → Mizanora's Firestore `products` collection. This is the
// REVERSE of the usual setup — here WhatsApp is the source of truth
// for products, and the website mirrors it.
//
// Requires two values, read from process.env at deploy time:
//   WHATSAPP_CATALOG_ID     — the Meta Product Catalog ID
//   WHATSAPP_ACCESS_TOKEN   — a System User access token with the
//                              catalog_management permission
//
// These come from GitHub Actions secrets — the deploy workflow writes
// them into functions/.env right before `firebase deploy` runs, so
// nothing is ever committed to the repo. See .github/workflows/deploy.yml.
//
// Callable manually (admin "Sync Now" button) and also runs on a
// schedule (see syncWhatsappCatalogScheduled below).
// =====================================================================

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { db } from "../admin-init.js";
import { FieldValue } from "firebase-admin/firestore";

const GRAPH_VERSION = "v21.0";

function slugify(text) {
  return text.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Meta prices arrive as strings like "1500.00 PKR" — pull out the number. */
function parsePrice(priceStr) {
  if (!priceStr) return 0;
  const match = String(priceStr).match(/[\d.]+/);
  return match ? Math.round(parseFloat(match[0])) : 0;
}

async function fetchAllCatalogProducts(catalogId, accessToken) {
  const fields = "id,retailer_id,name,description,price,sale_price,image_url,additional_image_urls,availability,category,url";
  let url = `https://graph.facebook.com/${GRAPH_VERSION}/${catalogId}/products?fields=${fields}&limit=100&access_token=${accessToken}`;
  const items = [];

  while (url) {
    const res = await fetch(url);
    const json = await res.json();
    if (json.error) {
      throw new HttpsError("failed-precondition", `Meta Graph API error: ${json.error.message}`);
    }
    items.push(...(json.data || []));
    url = json.paging?.next || null;
  }
  return items;
}

async function runSync() {
  const catalogId = process.env.WHATSAPP_CATALOG_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!catalogId || !accessToken) {
    throw new HttpsError(
      "failed-precondition",
      "WhatsApp catalog isn't configured yet. Add WHATSAPP_CATALOG_ID and WHATSAPP_ACCESS_TOKEN as GitHub Secrets, then redeploy."
    );
  }

  const items = await fetchAllCatalogProducts(catalogId, accessToken);

  let created = 0, updated = 0;
  const batchSize = 400; // Firestore batch write limit is 500
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = db.batch();
    const chunk = items.slice(i, i + batchSize);

    for (const item of chunk) {
      // Stable doc id so re-syncing updates the same product instead of duplicating.
      const docId = `wa_${item.retailer_id || item.id}`;
      const ref = db.collection("products").doc(docId);
      const images = [item.image_url, ...(item.additional_image_urls || [])].filter(Boolean);

      const data = {
        title: item.name || "Untitled Product",
        slug: slugify(item.name || item.id),
        description: item.description || "",
        price: parsePrice(item.sale_price || item.price),
        compareAtPrice: item.sale_price ? parsePrice(item.price) : null,
        images,
        thumbnail: images[0] || null,
        category: item.category || null,
        stockStatus: item.availability === "in stock" ? "in_stock" : "out_of_stock",
        source: "whatsapp_catalog",
        sourceProductId: item.id,
        sourceUrl: item.url || null,
        updatedAt: FieldValue.serverTimestamp()
      };

      const snap = await ref.get();
      if (snap.exists) {
        batch.update(ref, data);
        updated++;
      } else {
        batch.set(ref, { ...data, rating: 0, reviewCount: 0, createdAt: FieldValue.serverTimestamp() });
        created++;
      }
    }
    await batch.commit();
  }

  await db.collection("integration_logs").add({
    type: "whatsapp_catalog_sync",
    totalItems: items.length,
    created,
    updated,
    timestamp: FieldValue.serverTimestamp()
  });

  return { success: true, totalItems: items.length, created, updated };
}

// ---- Manual trigger (admin-only button in the dashboard) ----
export const syncWhatsappCatalog = onCall(
  { region: "us-central1", invoker: "public" },
  async (request) => {
    if (request.auth?.token?.admin !== true) {
      throw new HttpsError("permission-denied", "Only admins can sync the WhatsApp catalog.");
    }
    return runSync();
  }
);

// ---- Automatic sync every 6 hours, so the site stays close to what's in WhatsApp ----
export const syncWhatsappCatalogScheduled = onSchedule(
  { schedule: "every 6 hours", region: "us-central1" },
  async () => {
    await runSync();
  }
);
