// =====================================================================
// MIZANORA — moderateReview Cloud Function
//
// Only place a product's denormalized rating/reviewCount is written —
// never client-side, so a customer can't inflate their own rating
// (see DATA-MODEL.md "Denormalization note").
// =====================================================================

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "../admin-init.js";
import { FieldValue } from "firebase-admin/firestore";

export const moderateReview = onCall({ region: "us-central1" }, async (request) => {
  if (request.auth?.token?.admin !== true) {
    throw new HttpsError("permission-denied", "Only admins can moderate reviews.");
  }

  const { reviewId, status } = request.data;
  if (!reviewId || !["approved", "rejected"].includes(status)) {
    throw new HttpsError("invalid-argument", "reviewId and a valid status (approved/rejected) are required.");
  }

  const reviewRef = db.collection("reviews").doc(reviewId);

  await db.runTransaction(async (tx) => {
    const reviewSnap = await tx.get(reviewRef);
    if (!reviewSnap.exists) throw new HttpsError("not-found", "Review not found.");
    const review = reviewSnap.data();

    if (review.status === status) return; // no-op, already in that state

    tx.update(reviewRef, { status });

    if (status === "approved" && review.status !== "approved") {
      const productRef = db.collection("products").doc(review.productId);
      const productSnap = await tx.get(productRef);
      if (productSnap.exists) {
        const product = productSnap.data();
        const newCount = (product.reviewCount || 0) + 1;
        const newRating = ((product.rating || 0) * (product.reviewCount || 0) + review.rating) / newCount;
        tx.update(productRef, {
          rating: Math.round(newRating * 10) / 10,
          reviewCount: newCount,
          updatedAt: FieldValue.serverTimestamp()
        });
      }
    }
  });

  return { success: true };
});
