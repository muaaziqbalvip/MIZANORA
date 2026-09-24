// =====================================================================
// MIZANORA Admin — Review moderation service
//
// Reading all reviews (any status) works because Security Rules grant
// isAdmin() full read access to /reviews. Approving/rejecting goes
// through the moderateReview Cloud Function — never a direct Firestore
// write — because approval also updates the product's denormalized
// rating/reviewCount, and that must happen atomically (see
// functions/reviews/moderateReview.js).
// =====================================================================

import { db, functions } from "../../../js/services/firebase-init.js";
import {
  collection, query, where, orderBy, getDocs
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-functions.js";

export async function listReviewsAdmin(status = "pending") {
  const q = query(
    collection(db, "reviews"),
    where("status", "==", status),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function moderateReviewAdmin(reviewId, status) {
  const fn = httpsCallable(functions, "moderateReview");
  const result = await fn({ reviewId, status });
  return result.data;
}
