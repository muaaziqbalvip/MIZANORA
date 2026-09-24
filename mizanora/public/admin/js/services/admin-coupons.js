// =====================================================================
// MIZANORA Admin — Coupon management service
//
// Direct client writes work here because Security Rules require
// isAdmin() for any /coupons write (see firestore.rules "COUPONS").
// Customer-facing validation and redemption still goes through the
// validateCoupon / createOrder Cloud Functions (Phase 3) — this admin
// service only manages the coupon records themselves.
// =====================================================================

import { db } from "../../../js/services/firebase-init.js";
import {
  collection, doc, setDoc, updateDoc, deleteDoc, getDocs, query, orderBy,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

export async function listCouponsAdmin() {
  const q = query(collection(db, "coupons"), orderBy("expiry", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Coupon doc ID MUST equal the uppercase code — createOrder/validateCoupon
 * look coupons up by doc(code.toUpperCase()) directly (see DATA-MODEL.md).
 */
export async function createCoupon(data) {
  const code = data.code.trim().toUpperCase();
  const payload = {
    code,
    type: data.type,
    discount: Number(data.discount),
    minimumOrder: Number(data.minimumOrder) || 0,
    maximumDiscount: data.maximumDiscount ? Number(data.maximumDiscount) : null,
    expiry: Timestamp.fromDate(new Date(data.expiry)),
    usageLimit: Number(data.usageLimit) || 1,
    usedCount: 0,
    active: data.active !== false
  };
  await setDoc(doc(db, "coupons", code), payload);
  return code;
}

export async function updateCoupon(id, data) {
  const payload = { ...data };
  if (payload.discount !== undefined) payload.discount = Number(payload.discount);
  if (payload.minimumOrder !== undefined) payload.minimumOrder = Number(payload.minimumOrder);
  if (payload.maximumDiscount !== undefined) {
    payload.maximumDiscount = payload.maximumDiscount ? Number(payload.maximumDiscount) : null;
  }
  if (payload.usageLimit !== undefined) payload.usageLimit = Number(payload.usageLimit);
  if (payload.expiry) payload.expiry = Timestamp.fromDate(new Date(payload.expiry));

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) delete payload[key];
  });

  await updateDoc(doc(db, "coupons", id), payload);
}

export async function deleteCoupon(id) {
  await deleteDoc(doc(db, "coupons", id));
}

export async function toggleCouponActive(id, active) {
  await updateDoc(doc(db, "coupons", id), { active });
}
