// =====================================================================
// MIZANORA — createOrder Cloud Function
//
// THE reason this exists: spec Section 33 forbids trusting client-side
// price/discount/stock/total. This function recomputes every number
// from Firestore product documents, validates stock in a transaction,
// and is the ONLY path that writes to /orders.
// =====================================================================

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db, rtdb } from "../admin-init.js";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

const SHIPPING_FEE = 200; // flat rate — swap for a rules table if you need zone-based rates later

export const createOrder = onCall({ region: "us-central1" }, async (request) => {
  const data = request.data;
  const authUid = request.auth?.uid || null;

  // ---- 1. Basic shape validation ----
  if (!Array.isArray(data.items) || data.items.length === 0) {
    throw new HttpsError("invalid-argument", "Order must contain at least one item.");
  }
  if (!data.customerName || !data.phone || !data.address || !data.city || !data.province) {
    throw new HttpsError("invalid-argument", "Missing required customer/shipping details.");
  }
  if (!/^[0-9+\-\s()]{7,20}$/.test(data.phone)) {
    throw new HttpsError("invalid-argument", "Phone number looks invalid.");
  }

  const itemIds = data.items.map((i) => i.productId);
  if (new Set(itemIds).size !== itemIds.length) {
    throw new HttpsError("invalid-argument", "Duplicate product in order — combine quantities client-side.");
  }

  // ---- 2. Transaction: read real product docs, validate stock, compute totals server-side ----
  const orderResult = await db.runTransaction(async (tx) => {
    const productRefs = data.items.map((i) => db.collection("products").doc(i.productId));
    const productSnaps = await Promise.all(productRefs.map((ref) => tx.get(ref)));

    const lineItems = [];
    let subtotal = 0;

    for (let i = 0; i < productSnaps.length; i++) {
      const snap = productSnaps[i];
      const requestedQty = Number(data.items[i].quantity);

      if (!snap.exists) {
        throw new HttpsError("not-found", `Product ${data.items[i].productId} no longer exists.`);
      }
      const product = snap.data();

      if (!product.active) {
        throw new HttpsError("failed-precondition", `"${product.title}" is no longer available.`);
      }
      if (!Number.isInteger(requestedQty) || requestedQty < 1) {
        throw new HttpsError("invalid-argument", `Invalid quantity for "${product.title}".`);
      }
      if (product.stock < requestedQty) {
        throw new HttpsError(
          "failed-precondition",
          `Only ${product.stock} of "${product.title}" left in stock.`
        );
      }

      // Price is taken ONLY from the trusted product document — the
      // client's submitted price/title/thumbnail are ignored entirely.
      const linePrice = product.price;
      subtotal += linePrice * requestedQty;

      lineItems.push({
        productId: snap.id,
        title: product.title,
        price: linePrice,
        quantity: requestedQty,
        thumbnail: product.thumbnail || product.images?.[0] || ""
      });
    }

    // ---- 3. Coupon validation (server-side, never trust a client-sent discount) ----
    let discount = 0;
    let couponCode = null;
    if (data.couponCode) {
      const couponSnap = await tx.get(db.collection("coupons").doc(data.couponCode.toUpperCase()));
      if (couponSnap.exists) {
        const coupon = couponSnap.data();
        const now = Timestamp.now();
        const valid = coupon.active
          && coupon.expiry.toMillis() > now.toMillis()
          && coupon.usedCount < coupon.usageLimit
          && subtotal >= coupon.minimumOrder;

        if (valid) {
          discount = coupon.type === "percentage"
            ? Math.min(subtotal * (coupon.discount / 100), coupon.maximumDiscount || Infinity)
            : coupon.discount;
          discount = Math.round(discount);
          couponCode = couponSnap.id;
          tx.update(couponSnap.ref, { usedCount: FieldValue.increment(1) });
        }
        // Invalid/expired coupon silently applies zero discount rather
        // than failing the whole order — client should validateCoupon
        // first for a good UX, this is the safety net.
      }
    }

    const shippingFee = SHIPPING_FEE;
    const total = Math.max(0, subtotal - discount + shippingFee);

    // ---- 4. Generate sequential human-readable order ID: MZN-YYYYMMDD-#### ----
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const counterRef = db.collection("counters").doc(`orders_${dateStr}`);
    const counterSnap = await tx.get(counterRef);
    const nextSeq = (counterSnap.exists ? counterSnap.data().count : 0) + 1;
    const orderId = `MZN-${dateStr}-${String(nextSeq).padStart(4, "0")}`;

    tx.set(counterRef, { count: nextSeq }, { merge: true });

    // ---- 5. Decrement stock for every product atomically ----
    for (let i = 0; i < productRefs.length; i++) {
      const newStock = productSnaps[i].data().stock - lineItems[i].quantity;
      tx.update(productRefs[i], {
        stock: newStock,
        stockStatus: newStock === 0 ? "out_of_stock" : newStock <= 5 ? "low_stock" : "in_stock",
        updatedAt: FieldValue.serverTimestamp()
      });
    }

    // ---- 6. Write the order (the only place /orders is ever written) ----
    const orderRef = db.collection("orders").doc(orderId);
    tx.set(orderRef, {
      orderId,
      customerId: authUid,
      customerName: data.customerName,
      phone: data.phone,
      email: data.email || null,
      address: data.address,
      city: data.city,
      province: data.province,
      postalCode: data.postalCode || null,
      notes: data.notes || null,
      items: lineItems,
      subtotal,
      shippingFee,
      discount,
      couponCode,
      total,
      paymentMethod: "cod",
      paymentStatus: "pending",
      orderStatus: "placed",
      trackingNumber: null,
      courier: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    // Audit trail — first event in the order's history subcollection
    tx.set(orderRef.collection("order_history").doc(), {
      status: "placed",
      note: "Order placed by customer",
      changedBy: "system",
      timestamp: FieldValue.serverTimestamp()
    });

    return { orderId, total, subtotal, shippingFee, discount, items: lineItems };
  });

  // ---- 7. Mirror live status to Realtime Database (outside the transaction — RTDB isn't transactional with Firestore) ----
  await rtdb.ref(`live_orders/${orderResult.orderId}`).set({
    status: "placed",
    customerId: authUid,
    updatedAt: Date.now()
  });

  return orderResult;
});
