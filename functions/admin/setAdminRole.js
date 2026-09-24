// =====================================================================
// MIZANORA — setAdminRole Cloud Function
//
// An existing admin promotes another user to admin. The very FIRST
// admin can't be created this way (no admin exists yet to call it) —
// see scripts/bootstrap-first-admin.js, run once via the Firebase CLI
// with the Admin SDK directly, never exposed as a callable endpoint.
// =====================================================================

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { auth, db } from "../admin-init.js";
import { FieldValue } from "firebase-admin/firestore";

export const setAdminRole = onCall({ region: "us-central1" }, async (request) => {
  if (request.auth?.token?.admin !== true) {
    throw new HttpsError("permission-denied", "Only existing admins can grant admin access.");
  }

  const { targetUid, targetEmail } = request.data;
  if (!targetUid && !targetEmail) {
    throw new HttpsError("invalid-argument", "Provide either targetUid or targetEmail.");
  }

  const targetUser = targetUid
    ? await auth.getUser(targetUid)
    : await auth.getUserByEmail(targetEmail);

  await auth.setCustomUserClaims(targetUser.uid, { admin: true });

  await db.collection("admins").doc(targetUser.uid).set({
    uid: targetUser.uid,
    name: targetUser.displayName || targetUser.email,
    email: targetUser.email,
    addedBy: request.auth.uid,
    addedAt: FieldValue.serverTimestamp()
  });

  return { success: true, uid: targetUser.uid, email: targetUser.email };
});

export const removeAdminRole = onCall({ region: "us-central1" }, async (request) => {
  if (request.auth?.token?.admin !== true) {
    throw new HttpsError("permission-denied", "Only existing admins can remove admin access.");
  }
  const { targetUid } = request.data;
  if (!targetUid) throw new HttpsError("invalid-argument", "targetUid is required.");
  if (targetUid === request.auth.uid) {
    throw new HttpsError("failed-precondition", "You cannot remove your own admin access.");
  }

  await auth.setCustomUserClaims(targetUid, { admin: false });
  await db.collection("admins").doc(targetUid).delete();

  return { success: true };
});
