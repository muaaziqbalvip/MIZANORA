// =====================================================================
// MIZANORA — updateOrderStatus Cloud Function (admin only)
// =====================================================================

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db, rtdb } from "../admin-init.js";
import { FieldValue } from "firebase-admin/firestore";

const VALID_STATUSES = [
  "placed", "confirmed", "processing", "packed", "shipped",
  "out_for_delivery", "delivered", "cancelled", "returned"
];

export const updateOrderStatus = onCall({ region: "us-central1" }, async (request) => {
  if (request.auth?.token?.admin !== true) {
    throw new HttpsError("permission-denied", "Only admins can update order status.");
  }

  const { orderId, status, trackingNumber, courier, note } = request.data;

  if (!orderId || !VALID_STATUSES.includes(status)) {
    throw new HttpsError("invalid-argument", "Missing orderId or invalid status value.");
  }

  const orderRef = db.collection("orders").doc(orderId);
  const snap = await orderRef.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Order not found.");
  }

  const updates = {
    orderStatus: status,
    updatedAt: FieldValue.serverTimestamp()
  };
  if (trackingNumber !== undefined) updates.trackingNumber = trackingNumber;
  if (courier !== undefined) updates.courier = courier;
  if (status === "delivered") updates.paymentStatus = "paid"; // COD collected on delivery

  await orderRef.update(updates);

  await orderRef.collection("order_history").add({
    status,
    note: note || null,
    changedBy: request.auth.uid,
    timestamp: FieldValue.serverTimestamp()
  });

  await rtdb.ref(`live_orders/${orderId}`).update({
    status,
    updatedAt: Date.now()
  });

  return { success: true, orderId, status };
});
