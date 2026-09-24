#!/usr/bin/env node
// =====================================================================
// MIZANORA — Dynamic sitemap generator
//
// Firestore product/category pages need their own sitemap URLs for
// search engines to discover them — but that list changes every time
// a product is added, so it can't be hand-written like sitemap.xml.
//
// Run this after adding/removing products or categories (or on a
// schedule via a Cloud Scheduler + Cloud Function if you want it fully
// automatic — this script is the simple manual/CI version):
//
//   cd scripts && node generate-sitemap.js
//
// Requires the same service-account.json as bootstrap-first-admin.js.
// Writes public/sitemap-products.xml and public/sitemap-categories.xml,
// and prints the <sitemapindex> block to add to sitemap.xml.
// =====================================================================

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_URL = "https://mizanora.example.com"; // update to your real domain

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(join(__dirname, "service-account.json"), "utf8"));
} catch {
  console.error("Missing scripts/service-account.json — see bootstrap-first-admin.js for how to get one.");
  process.exit(1);
}

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

function urlEntry(loc, changefreq, priority) {
  return `  <url><loc>${loc}</loc><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
}

async function generateProducts() {
  const snap = await db.collection("products").where("active", "==", true).get();
  const entries = snap.docs.map((d) =>
    urlEntry(`${SITE_URL}/product/${d.data().slug || d.id}`, "weekly", "0.6")
  );
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`;
  writeFileSync(join(__dirname, "../public/sitemap-products.xml"), xml);
  console.log(`✅ sitemap-products.xml — ${snap.size} products`);
}

async function generateCategories() {
  const snap = await db.collection("categories").where("active", "==", true).get();
  const entries = snap.docs.map((d) =>
    urlEntry(`${SITE_URL}/category/${d.data().slug}`, "weekly", "0.6")
  );
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`;
  writeFileSync(join(__dirname, "../public/sitemap-categories.xml"), xml);
  console.log(`✅ sitemap-categories.xml — ${snap.size} categories`);
}

await generateProducts();
await generateCategories();

console.log(`
Add these to public/sitemap.xml (or create a sitemap index) so crawlers find them:

<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${SITE_URL}/sitemap.xml</loc></sitemap>
  <sitemap><loc>${SITE_URL}/sitemap-products.xml</loc></sitemap>
  <sitemap><loc>${SITE_URL}/sitemap-categories.xml</loc></sitemap>
</sitemapindex>
`);
