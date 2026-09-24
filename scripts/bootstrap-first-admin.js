#!/usr/bin/env node
// =====================================================================
// MIZANORA — First Admin Bootstrap Script
//
// Run this ONCE, locally, to create your very first admin account.
// After that, use the admin dashboard's "Add Admin" screen (which
// calls the setAdminRole Cloud Function) for every admin after this one.
//
// Why this can't be a Cloud Function: setAdminRole requires an existing
// admin to call it — there's a chicken-and-egg problem for admin #1.
// This script uses the Admin SDK directly, run from your own machine
// with a service account key that has full trusted access — the same
// tier of trust as the Cloud Functions runtime.
//
// USAGE:
//   1. Firebase Console > Project Settings > Service Accounts >
//      Generate new private key. Save it as service-account.json in
//      this scripts/ folder (it's .gitignore'd — never commit it).
//   2. npm install firebase-admin --no-save   (from the scripts/ folder)
//   3. node bootstrap-first-admin.js you@example.com
// =====================================================================

import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const email = process.argv[2];
if (!email) {
  console.error("Usage: node bootstrap-first-admin.js <email>");
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(join(__dirname, "service-account.json"), "utf8"));
} catch {
  console.error("Missing scripts/service-account.json — download it from Firebase Console > Project Settings > Service Accounts.");
  process.exit(1);
}

initializeApp({ credential: cert(serviceAccount) });
const auth = getAuth();
const db = getFirestore();

const user = await auth.getUserByEmail(email).catch(() => null);
if (!user) {
  console.error(`No Firebase Auth user found for ${email}. Create the account first (sign up normally on the site), then re-run this script.`);
  process.exit(1);
}

await auth.setCustomUserClaims(user.uid, { admin: true });
await db.collection("admins").doc(user.uid).set({
  uid: user.uid,
  name: user.displayName || user.email,
  email: user.email,
  addedBy: "bootstrap-script",
  addedAt: FieldValue.serverTimestamp()
});

console.log(`✅ ${email} is now an admin. They must sign out and back in for the new permission to take effect (custom claims refresh on token re-issue).`);
