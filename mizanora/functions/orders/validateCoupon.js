// =====================================================================
// MIZANORA — validateCoupon Cloud Function
//
// Used by the Checkout page to show "coupon applied" before the order
// is placed. This is a PREVIEW only — createOrder re-validates the
// coupon itself and is the actual source of truth for the discount
// applied to a real order, so a race (coupon expiring/exhausting
// between preview and submit) can never result in an over-discounted
// order — worst case createOrder just applies zero discount instead.
// =====================================================================

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "../admin-init.js";
import { Timestamp } from "firebase-admin/firestore";

export const validateCoupon = onCall({ region: "us-central1" }, async (request) => {
  const { code, subtotal } = request.data;

  if (!code || typeof subtotal !== "number") {
    throw new HttpsError("invalid-argument", "Coupon code and current subtotal are required.");
  }

  const snap = await db.collection("coupons").doc(code.trim().toUpperCase()).get();

  if (!snap.exists) {
    return { valid: false, reason: "Coupon code not found." };
  }

  const coupon = snap.data();
  const now = Timestamp.now();

  if (!coupon.active) return { valid: false, reason: "This coupon is no longer active." };
  if (coupon.expiry.toMillis() <= now.toMillis()) return { valid: false, reason: "This coupon has expired." };
  if (coupon.usedCount >= coupon.usageLimit) return { valid: false, reason: "This coupon has reached its usage limit." };
  if (subtotal < coupon.minimumOrder) {
    return { valid: false, reason: `Minimum order of Rs. ${coupon.minimumOrder.toLocaleString("en-PK")} required.` };
  }

  let discount = coupon.type === "percentage"
    ? Math.min(subtotal * (coupon.discount / 100), coupon.maximumDiscount || Infinity)
    : coupon.discount;
  discount = Math.round(discount);

  return { valid: true, discount, type: coupon.type, code: snap.id };
});
