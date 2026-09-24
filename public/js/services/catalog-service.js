// =====================================================================
// MIZANORA — Products / Categories / Banners read service
//
// Read-only queries used by the storefront. Every query here is
// intentionally limited (see FIREBASE-ARCHITECTURE.md §"Performance")
// so we never pull the entire catalog for a homepage render.
// =====================================================================

import { db } from "./firebase-init.js";
import {
  collection, query, where, orderBy, limit, limitToLast, startAfter, endBefore,
  getDocs, doc, getDoc, documentId
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

export async function getFeaturedProducts(max = 8) {
  const q = query(
    collection(db, "products"),
    where("active", "==", true),
    where("featured", "==", true),
    orderBy("createdAt", "desc"),
    limit(max)
  );
  return snapToArray(await getDocs(q));
}

export async function getBestsellers(max = 8) {
  const q = query(
    collection(db, "products"),
    where("active", "==", true),
    where("bestseller", "==", true),
    orderBy("rating", "desc"),
    limit(max)
  );
  return snapToArray(await getDocs(q));
}

export async function getNewArrivals(max = 8) {
  const q = query(
    collection(db, "products"),
    where("active", "==", true),
    orderBy("createdAt", "desc"),
    limit(max)
  );
  return snapToArray(await getDocs(q));
}

export async function getActiveCategories(max = 12) {
  const q = query(
    collection(db, "categories"),
    where("active", "==", true),
    orderBy("order", "asc"),
    limit(max)
  );
  return snapToArray(await getDocs(q));
}

export async function getActiveBanners(type = "hero", max = 5) {
  const q = query(
    collection(db, "banners"),
    where("active", "==", true),
    where("type", "==", type),
    orderBy("order", "asc"),
    limit(max)
  );
  return snapToArray(await getDocs(q));
}

export async function getApprovedReviews(max = 8) {
  const q = query(
    collection(db, "reviews"),
    where("status", "==", "approved"),
    orderBy("createdAt", "desc"),
    limit(max)
  );
  return snapToArray(await getDocs(q));
}

function snapToArray(snap) {
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// =====================================================================
// PHASE 2 — Shop, Category, Product Detail, Search
// =====================================================================

const SORT_FIELDS = {
  newest: { field: "createdAt", dir: "desc" },
  price_asc: { field: "price", dir: "asc" },
  price_desc: { field: "price", dir: "desc" },
  rating: { field: "rating", dir: "desc" },
};
const PAGE_SIZE = 12;

/**
 * Paginated, filterable product listing for the Shop page.
 * Only ever fetches one page (PAGE_SIZE) at a time — never the whole catalog.
 *
 * @param {Object} opts
 * @param {string} [opts.categoryId]
 * @param {'newest'|'price_asc'|'price_desc'|'rating'} [opts.sort]
 * @param {boolean} [opts.featuredOnly]
 * @param {import("firebase/firestore").QueryDocumentSnapshot} [opts.cursor] - last doc of previous page, for "next"
 * @param {'forward'|'backward'} [opts.direction]
 */
export async function getShopProducts(opts = {}) {
  const { categoryId, sort = "newest", featuredOnly = false, cursor, direction = "forward" } = opts;
  const { field, dir } = SORT_FIELDS[sort] || SORT_FIELDS.newest;

  const clauses = [where("active", "==", true)];
  if (categoryId) clauses.push(where("categoryId", "==", categoryId));
  if (featuredOnly) clauses.push(where("featured", "==", true));

  let q;
  if (direction === "forward") {
    q = query(
      collection(db, "products"),
      ...clauses,
      orderBy(field, dir),
      ...(cursor ? [startAfter(cursor)] : []),
      limit(PAGE_SIZE)
    );
  } else {
    q = query(
      collection(db, "products"),
      ...clauses,
      orderBy(field, dir),
      ...(cursor ? [endBefore(cursor)] : []),
      limitToLast(PAGE_SIZE)
    );
  }

  const snap = await getDocs(q);
  return {
    items: snapToArray(snap),
    firstDoc: snap.docs[0] || null,
    lastDoc: snap.docs[snap.docs.length - 1] || null,
    hasResults: !snap.empty,
  };
}

export async function getProductBySlug(slug) {
  const q = query(collection(db, "products"), where("slug", "==", slug), where("active", "==", true), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

export async function getProductById(id) {
  const d = await getDoc(doc(db, "products", id));
  return d.exists() ? { id: d.id, ...d.data() } : null;
}

export async function getCategoryBySlug(slug) {
  const q = query(collection(db, "categories"), where("slug", "==", slug), where("active", "==", true), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

/** Related products: same category, excluding the current product, capped small. */
export async function getRelatedProducts(categoryId, excludeId, max = 4) {
  const q = query(
    collection(db, "products"),
    where("active", "==", true),
    where("categoryId", "==", categoryId),
    orderBy("rating", "desc"),
    limit(max + 1) // fetch one extra in case the current product is in the set
  );
  const snap = await getDocs(q);
  return snapToArray(snap).filter((p) => p.id !== excludeId).slice(0, max);
}

export async function getReviewsForProduct(productId, max = 20) {
  const q = query(
    collection(db, "reviews"),
    where("productId", "==", productId),
    where("status", "==", "approved"),
    orderBy("createdAt", "desc"),
    limit(max)
  );
  return snapToArray(await getDocs(q));
}

/**
 * Lightweight search-suggestion query. Uses a prefix range on `title`
 * (Firestore's standard trick for "starts with") plus a tag-array
 * check, all under a hard limit — never a full-collection scan.
 * For production-scale fuzzy search, swap this for Algolia/Typesense
 * synced via a Cloud Function; documented as a TODO in README Phase 7.
 */
export async function searchProducts(term, max = 20) {
  const clean = term.trim();
  if (!clean) return [];
  const lower = clean.toLowerCase();

  const titleQ = query(
    collection(db, "products"),
    where("active", "==", true),
    orderBy("titleLower"),
    where("titleLower", ">=", lower),
    where("titleLower", "<=", lower + "\uf8ff"),
    limit(max)
  );
  const tagQ = query(
    collection(db, "products"),
    where("active", "==", true),
    where("tags", "array-contains", lower),
    limit(max)
  );

  const [titleSnap, tagSnap] = await Promise.all([
    getDocs(titleQ).catch(() => ({ docs: [] })),
    getDocs(tagQ).catch(() => ({ docs: [] })),
  ]);

  const byId = new Map();
  [...titleSnap.docs, ...tagSnap.docs].forEach((d) => byId.set(d.id, { id: d.id, ...d.data() }));
  return Array.from(byId.values()).slice(0, max);
}
