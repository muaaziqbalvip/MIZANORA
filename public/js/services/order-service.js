// =====================================================================
// MIZANORA — Order service (client)
//
// Every function here calls a Cloud Function via httpsCallable — never
// writes /orders directly (Security Rules block that anyway; see
// firestore.rules). This file is intentionally thin: all real logic
// and validation lives server-side in /functions.
// =====================================================================

import { functions } from "./firebase-init.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-functions.js";

/**
 * @param {Object} orderInput
 * @param {{productId:string, quantity:number}[]} orderInput.items
 * @param {string} orderInput.customerName
 * @param {string} orderInput.phone
 * @param {string} [orderInput.email]
 * @param {string} orderInput.address
 * @param {string} orderInput.city
 * @param {string} orderInput.province
 * @param {string} [orderInput.postalCode]
 * @param {string} [orderInput.notes]
 * @param {string} [orderInput.couponCode]
 */
export async function createOrder(orderInput) {
  const fn = httpsCallable(functions, "createOrder");
  const result = await fn(orderInput);
  return result.data; // { orderId, total, subtotal, shippingFee, discount, items }
}

/**
 * @param {string} orderId
 * @param {string} phone
 */
export async function trackOrder(orderId, phone) {
  const fn = httpsCallable(functions, "trackOrder");
  const result = await fn({ orderId, phone });
  return result.data;
}

/**
 * @param {string} code
 * @param {number} subtotal
 */
export async function validateCoupon(code, subtotal) {
  const fn = httpsCallable(functions, "validateCoupon");
  const result = await fn({ code, subtotal });
  return result.data; // { valid, discount?, reason? }
}
