// =====================================================================
// MIZANORA Cloud Functions — Admin SDK init
//
// This file runs ONLY inside Google's Cloud Functions runtime — never
// in the browser. The Admin SDK here has full trusted access and is
// the reason order/price/stock logic lives here instead of the client.
// =====================================================================

import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getDatabase } from "firebase-admin/database";
import { getAuth } from "firebase-admin/auth";

export const app = initializeApp();
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const auth = getAuth(app);
