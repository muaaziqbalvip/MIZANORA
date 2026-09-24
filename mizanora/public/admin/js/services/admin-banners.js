// =====================================================================
// MIZANORA Admin — Banner & Homepage CMS service
// =====================================================================

import { db } from "../../../js/services/firebase-init.js";
import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

export async function listBannersAdmin() {
  const q = query(collection(db, "banners"), orderBy("order", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createBanner(data) {
  const payload = { ...stripUndefined(data), active: data.active !== false };
  const ref = await addDoc(collection(db, "banners"), payload);
  return ref.id;
}

export async function updateBanner(id, data) {
  await updateDoc(doc(db, "banners", id), stripUndefined(data));
}

export async function deleteBanner(id) {
  await deleteDoc(doc(db, "banners", id));
}

export async function toggleBannerActive(id, active) {
  await updateDoc(doc(db, "banners", id), { active });
}

function stripUndefined(obj) {
  const out = { ...obj };
  Object.keys(out).forEach((key) => {
    if (out[key] === undefined) delete out[key];
  });
  return out;
}
