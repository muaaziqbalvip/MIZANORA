// =====================================================================
// MIZANORA — trackOrder Cloud Function
//
// Firestore rules deny direct client reads of /orders unless the
// caller is the order's owner or an admin (see firestore.rules). A
// guest checkout customer is neither, so order tracking needs a
// server-verified lookup: prove you know the phone number on the
// order, and get back a status view — never the full order document
// or other customers' PII beyond what they already know.
// =====================================================================

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "../admin-init.js";

export const trackOrder = onCall({ region: "us-central1" }, async (request) => {
  const { orderId, phone } = request.data;

  if (!orderId || !phone) {
    throw new HttpsError("invalid-argument", "Order ID and phone number are required.");
  }

  const snap = await db.collection("orders").doc(orderId.trim().toUpperCase()).get();

  if (!snap.exists) {
    throw new HttpsError("not-found", "No order found with that ID.");
  }

  const order = snap.data();
  const normalize = (p) => p.replace(/[\s\-()]/g, "");

  if (normalize(order.phone) !== normalize(phone)) {
    // Same error as "not found" — don't reveal that the order ID is
    // valid but the phone is wrong; that would let someone confirm
    // guesses about which order IDs exist.
    throw new HttpsError("not-found", "No order found with that ID and phone number.");
  }

  const history = await snap.ref
    .collection("order_history")
    .orderBy("timestamp", "asc")
    .get();

  return {
    orderId: order.orderId,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    trackingNumber: order.trackingNumber,
    courier: order.courier,
    items: order.items,
    subtotal: order.subtotal,
    shippingFee: order.shippingFee,
    discount: order.discount,
    total: order.total,
    address: order.address,
    city: order.city,
    createdAt: order.createdAt?.toMillis?.() || null,
    history: history.docs.map((d) => ({
      status: d.data().status,
      note: d.data().note,
      timestamp: d.data().timestamp?.toMillis?.() || null
    }))
  };
});
