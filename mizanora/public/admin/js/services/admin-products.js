// =====================================================================
// MIZANORA Admin — Product management service
//
// Client-side writes here work ONLY because Security Rules require
// isAdmin() (the custom claim) for any /products write — see
// firestore.rules. This is the one place in the whole app where the
// browser writes product price/stock directly, and it's safe because
// only a verified admin can reach it.
// =====================================================================

import { db } from "../../../js/services/firebase-init.js";
import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc,
  query, orderBy, limit, startAfter, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const PAGE_SIZE = 20;

export async function listProductsAdmin(cursor = null) {
  const q = query(
    collection(db, "products"),
    orderBy("createdAt", "desc"),
    ...(cursor ? [startAfter(cursor)] : []),
    limit(PAGE_SIZE)
  );
  const snap = await getDocs(q);
  return {
    items: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    lastDoc: snap.docs[snap.docs.length - 1] || null,
    hasMore: snap.docs.length === PAGE_SIZE
  };
}

export async function getProductAdmin(id) {
  const snap = await getDoc(doc(db, "products", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * @param {Object} data - product fields (title, price, stock, images[], etc.)
 * Automatically derives titleLower and slug if not provided, and stamps
 * timestamps + sensible defaults for fields the admin form doesn't ask for.
 */
export async function createProduct(data) {
  const payload = {
    ...withDerivedFields(data),
    rating: 0,
    reviewCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  const ref = await addDoc(collection(db, "products"), payload);
  return ref.id;
}

export async function updateProduct(id, data) {
  await updateDoc(doc(db, "products", id), {
    ...withDerivedFields(data),
    updatedAt: serverTimestamp()
  });
}

export async function deleteProduct(id) {
  await deleteDoc(doc(db, "products", id));
}

export async function toggleProductActive(id, active) {
  await updateDoc(doc(db, "products", id), { active, updatedAt: serverTimestamp() });
}

function withDerivedFields(data) {
  const out = { ...data };
  if (out.title) {
    out.titleLower = out.title.toLowerCase();
    if (!out.slug) {
      out.slug = out.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    }
  }
  if (out.stock !== undefined) {
    out.stockStatus = out.stock === 0 ? "out_of_stock" : out.stock <= 5 ? "low_stock" : "in_stock";
  }
  // Firestore's addDoc/updateDoc throw on any field explicitly set to
  // undefined — strip them defensively rather than let a form gap crash the save.
  Object.keys(out).forEach((key) => {
    if (out[key] === undefined) delete out[key];
  });
  return out;
}
