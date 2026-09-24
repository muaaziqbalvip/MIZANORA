// =====================================================================
// MIZANORA — Firebase initialization
//
// Values below are placeholders. Replace with your real project config
// from Firebase Console > Project Settings > General > Your apps > SDK
// setup and configuration. This config is safe to expose publicly —
// it identifies the project, it is not a secret. Real protection comes
// from firestore.rules / database.rules.json, not from hiding this.
//
// See docs/FIREBASE-ARCHITECTURE.md and README.md "Firebase Project
// Setup" for full instructions.
// =====================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore, connectFirestoreEmulator
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import {
  getAuth, connectAuthEmulator
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getDatabase, connectDatabaseEmulator
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
import {
  getFunctions, connectFunctionsEmulator
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-functions.js";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAX_Pt55gCgztQN16FU4fFdctrYhtCsIqM",
  authDomain: "mizanora-market.firebaseapp.com",
  databaseURL: "https://mizanora-market-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "mizanora-market",
  storageBucket: "mizanora-market.firebasestorage.app",
  messagingSenderId: "798291284486",
  appId: "1:798291284486:web:be3af55e98ad3dfe3fe987",
  measurementId: "G-KCETRC0RF1"
};
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const rtdb = getDatabase(app);
export const functions = getFunctions(app);

// Flip this on for local development against `firebase emulators:start`.
// Never true in production — see README "Local Development".
const USE_EMULATORS = false;

if (USE_EMULATORS && location.hostname === "localhost") {
  connectFirestoreEmulator(db, "localhost", 8080);
  connectAuthEmulator(auth, "http://localhost:9099");
  connectDatabaseEmulator(rtdb, "localhost", 9000);
  connectFunctionsEmulator(functions, "localhost", 5001);
  console.info("[MIZANORA] Connected to Firebase emulators.");
}
