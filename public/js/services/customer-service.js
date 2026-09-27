// =====================================================================
// MIZANORA — Customer data service
//
// Everything here operates under /customers/{uid} and its
// subcollections, scoped by Security Rules to the signed-in owner
// (or an admin). Called only when a user is authenticated — pages
// using this must check auth state first (see account pages).
// =====================================================================

import { db } from "./firebase-init.js";
import {
  doc, getDoc, updateDoc, collection, addDoc, deleteDoc, getDocs,
  query, where, orderBy, limit, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// ---- Profile ----
export async function getCustomerProfile(uid) {
  const snap = await getDoc(doc(db, "customers", uid));
  return snap.exists() ? snap.data() : null;
}

export async function updateCustomerProfile(uid, updates) {
  await updateDoc(doc(db, "customers", uid), updates);
}

// ---- Addresses ----
export async function getAddresses(uid) {
  const snap = await getDocs(collection(db, "customers", uid, "addresses"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addAddress(uid, address) {
  const ref = await addDoc(collection(db, "customers", uid, "addresses"), address);
  return ref.id;
}

export async function deleteAddress(uid, addressId) {
  await deleteDoc(doc(db, "customers", uid, "addresses", addressId));
}

export async function setDefaultAddress(uid, addressId) {
  const addresses = await getAddresses(uid);
  await Promise.all(
    addresses.map((a) =>
      updateDoc(doc(db, "customers", uid, "addresses", a.id), { isDefault: a.id === addressId })
    )
  );
}

// ---- Order history (queries the top-level /orders collection, scoped by rules to this customerId) ----
export async function getCustomerOrders(uid, max = 20) {
  const q = query(
    collection(db, "orders"),
    where("customerId", "==", uid),
    orderBy("createdAt", "desc"),
    limit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ---- Firestore-synced wishlist (logged-in users only; guests use wishlist-store.js/localStorage) ----
export async function getFirestoreWishlist(uid) {
  const snap = await getDocs(collection(db, "customers", uid, "wishlist"));
  return snap.docs.map((d) => d.id);
}

export async function addToFirestoreWishlist(uid, productId) {
  await setDoc(doc(db, "customers", uid, "wishlist", productId), {
    addedAt: serverTimestamp()
  });
}

export async function removeFromFirestoreWishlist(uid, productId) {
  await deleteDoc(doc(db, "customers", uid, "wishlist", productId));
}

/**
 * One-time merge of a guest's localStorage wishlist into their account
 * right after login/signup, so items they favorited before creating an
 * account aren't lost. Called once from the auth state listener.
 */
export async function mergeGuestWishlist(uid, localWishlistIds) {
  if (!localWishlistIds || localWishlistIds.length === 0) return;
  await Promise.all(localWishlistIds.map((id) => addToFirestoreWishlist(uid, id)));
}

// ---- Reviews (customer-submitted; always start as "pending" — admin
// approves via the moderateReview Cloud Function, which then updates
// the product's denormalized rating/reviewCount). ----
export async function submitReview(uid, customerName, { productId, rating, title, comment, photos }) {
  const ref = await addDoc(collection(db, "reviews"), {
    customerId: uid,
    customerName: customerName || "Customer",
    productId,
    rating,
    title: title || null,
    comment: comment || "",
    photos: photos || [],
    status: "pending",
    createdAt: serverTimestamp()
  });
  return ref.id;
}

// ---- Loyalty / reward points ----
// 1 point per Rs. 100 spent, awarded when an order is marked "delivered"
// (see functions/orders/updateOrderStatus.js). Redemption value: Rs. 1 per point.
export async function getLoyaltyPoints(uid) {
  const profile = await getCustomerProfile(uid);
  return profile?.loyaltyPoints || 0;
}
