// =====================================================================
// MIZANORA Admin — Send notifications
//
// Firestore write for the /notifications record (admin-only per rules)
// plus a Realtime Database mirror for instant delivery to online
// customers (per-customer) — consistent with the Firestore=record,
// RTDB=live-push split from FIREBASE-ARCHITECTURE.md.
// =====================================================================

import { db, rtdb } from "../../../js/services/firebase-init.js";
import {
  collection, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import {
  ref, push, set
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";

/**
 * @param {Object} notif
 * @param {'all'|'customer'} notif.audience
 * @param {string|null} notif.customerId - required when audience is 'customer'
 * @param {'announcement'|'order_update'|'promotion'|'system'} notif.type
 * @param {string} notif.title
 * @param {string} notif.body
 */
export async function sendNotification(notif) {
  const docRef = await addDoc(collection(db, "notifications"), {
    audience: notif.audience,
    customerId: notif.audience === "customer" ? notif.customerId : null,
    type: notif.type,
    title: notif.title,
    body: notif.body,
    createdAt: serverTimestamp()
  });

  // Live push mirror — only meaningful for a specific customer (an
  // "all" broadcast doesn't have a single RTDB path to push to without
  // a fan-out we're not implementing in this phase; those customers
  // will see it via their next Firestore read of /notifications).
  if (notif.audience === "customer" && notif.customerId) {
    const notifRef = push(ref(rtdb, `live_notifications/${notif.customerId}`));
    await set(notifRef, {
      title: notif.title,
      body: notif.body,
      read: false,
      createdAt: Date.now()
    });
  }

  return docRef.id;
}
