// =====================================================================
// MIZANORA — Customer notification service
//
// A customer's notifications are "addressed to me" OR "broadcast to
// all" — two different field values, so Firestore needs two separate
// queries (it can't OR across different fields in one query). Results
// are merged and sorted client-side.
// =====================================================================

import { db } from "./firebase-init.js";
import {
  collection, query, where, orderBy, limit, getDocs
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

export async function getCustomerNotifications(uid, max = 20) {
  const mineQuery = query(
    collection(db, "notifications"),
    where("customerId", "==", uid),
    orderBy("createdAt", "desc"),
    limit(max)
  );
  const allQuery = query(
    collection(db, "notifications"),
    where("audience", "==", "all"),
    orderBy("createdAt", "desc"),
    limit(max)
  );

  const [mineSnap, allSnap] = await Promise.all([getDocs(mineQuery), getDocs(allQuery)]);

  const merged = [...mineSnap.docs, ...allSnap.docs]
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
    .slice(0, max);

  return merged;
}
