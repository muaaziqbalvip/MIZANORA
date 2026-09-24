// =====================================================================
// MIZANORA Admin — Auth guard
//
// The custom claim (request.auth.token.admin === true) is the ONLY
// thing Security Rules and Cloud Functions trust for admin access.
// This guard just gives the admin UI a fast, friendly redirect when
// someone without that claim lands here — it is NOT itself a security
// boundary (a client-side check never is); firestore.rules and every
// admin-only Cloud Function independently re-check the claim.
// =====================================================================

import { auth } from "../../js/services/firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

/**
 * Resolves with the admin user, or redirects to /account and never
 * resolves (navigation interrupts execution) if the user isn't an
 * admin or isn't signed in.
 */
export function requireAdmin() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        location.href = "/account?next=/admin";
        return;
      }
      const tokenResult = await user.getIdTokenResult();
      if (tokenResult.claims.admin !== true) {
        location.href = "/";
        return;
      }
      resolve(user);
    });
  });
}
