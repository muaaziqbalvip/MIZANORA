// =====================================================================
// MIZANORA — Authentication service
//
// Guest checkout always stays available (spec §11) — this service is
// opt-in. Sign-up also creates the /customers/{uid} Firestore profile
// doc, since Security Rules require the doc to exist before a customer
// can write addresses/wishlist/cart subcollections under it.
// =====================================================================

import { auth, db } from "./firebase-init.js";
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  onAuthStateChanged, updateProfile, GoogleAuthProvider, signInWithPopup,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  doc, setDoc, getDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

/** Subscribe to auth state. Returns an unsubscribe function. */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser() {
  return auth.currentUser;
}

export async function registerWithEmail({ name, email, password, phone }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  await setDoc(doc(db, "customers", cred.user.uid), {
    uid: cred.user.uid,
    name,
    email,
    phone: phone || null,
    createdAt: serverTimestamp()
  });
  return cred.user;
}

export async function loginWithEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);

  // First-time Google sign-in: ensure the /customers profile doc exists.
  const profileRef = doc(db, "customers", cred.user.uid);
  const existing = await getDoc(profileRef);
  if (!existing.exists()) {
    await setDoc(profileRef, {
      uid: cred.user.uid,
      name: cred.user.displayName || "MIZANORA Customer",
      email: cred.user.email,
      phone: null,
      createdAt: serverTimestamp()
    });
  }
  return cred.user;
}

export async function logout() {
  await signOut(auth);
}

export async function sendPasswordReset(email) {
  await sendPasswordResetEmail(auth, email);
}

export function mapAuthError(err) {
  const code = err?.code || "";
  const map = {
    "auth/email-already-in-use": "An account with this email already exists. Try signing in instead.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/weak-password": "Password should be at least 6 characters.",
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
    "auth/popup-closed-by-user": "Sign-in was cancelled.",
    "auth/unauthorized-domain": "This website's domain isn't authorized in Firebase yet. (Add it under Authentication → Settings → Authorized domains.)",
    "auth/configuration-not-found": "Email/Password sign-in isn't enabled in Firebase yet. (Authentication → Sign-in method.)",
    "auth/network-request-failed": "Network error — please check your internet connection and try again.",
    "auth/api-key-not-valid.-please-pass-a-valid-api-key.": "Firebase API key looks invalid — double check firebase-init.js.",
    "auth/invalid-api-key": "Firebase API key looks invalid — double check firebase-init.js."
  };
  if (map[code]) return map[code];
  // Unmapped error: surface the raw code so it's screenshot-able and fixable,
  // instead of a dead-end generic message.
  return code ? `Something went wrong (${code}). Please try again.` : "Something went wrong. Please try again.";
}
