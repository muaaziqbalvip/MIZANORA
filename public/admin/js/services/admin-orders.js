// =====================================================================
// MIZANORA Admin — Order management service
//
// Reading orders here works because Security Rules grant isAdmin()
// full read access to /orders. Writing status changes goes through
// the updateOrderStatus Cloud Function (never a direct Firestore
// write) — see firestore.rules "ORDERS" block: allow write: if false.
// =====================================================================

import { db, functions } from "../../../js/services/firebase-init.js";
import {
  collection, query, where, orderBy, limit, getDocs
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-functions.js";

const PAGE_SIZE = 25;

export async function listOrdersAdmin({ status = null, max = PAGE_SIZE } = {}) {
  const clauses = status ? [where("orderStatus", "==", status)] : [];
  const q = query(
    collection(db, "orders"),
    ...clauses,
    orderBy("createdAt", "desc"),
    limit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateOrderStatusAdmin({ orderId, status, trackingNumber, courier, note }) {
  const fn = httpsCallable(functions, "updateOrderStatus");
  const result = await fn({ orderId, status, trackingNumber, courier, note });
  return result.data;
}
