// =====================================================================
// MIZANORA Admin — Category management service
// =====================================================================

import { db } from "../../../js/services/firebase-init.js";
import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

export async function listCategoriesAdmin() {
  const q = query(collection(db, "categories"), orderBy("order", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createCategory(data) {
  const payload = {
    ...data,
    slug: data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    active: data.active !== undefined ? data.active : true
  };
  const ref = await addDoc(collection(db, "categories"), payload);
  return ref.id;
}

export async function updateCategory(id, data) {
  const payload = { ...data };
  if (!payload.slug && payload.name) {
    payload.slug = payload.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }
  // Firestore's updateDoc throws on any field explicitly set to
  // undefined — strip them rather than let a blank optional field
  // (like slug when name is also blank) crash the save.
  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) delete payload[key];
  });
  await updateDoc(doc(db, "categories", id), payload);
}

export async function deleteCategory(id) {
  await deleteDoc(doc(db, "categories", id));
}
