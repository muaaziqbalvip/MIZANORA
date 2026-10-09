import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Private keys pasted into Vercel often arrive with wrapping quotes, "\n" typed as text, or Windows line breaks. Fix all of that.
const fixKey = (k) => String(k || '').trim().replace(/^["']+|["']+$/g, '').replace(/\\n/g, '\n').replace(/\r/g, '');

// Two ways to configure (either works):
//  A) FIREBASE_SERVICE_ACCOUNT = the whole downloaded JSON file pasted as one value (easiest, hardest to get wrong)
//  B) FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
function creds() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    try {
      const j = JSON.parse(raw);
      if (j.client_email && j.private_key) return { projectId: j.project_id || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, clientEmail: j.client_email, privateKey: fixKey(j.private_key) };
    } catch { /* fall through to B */ }
  }
  return { projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: fixKey(process.env.FIREBASE_PRIVATE_KEY) };
}

export function adminReady() {
  const c = creds();
  return Boolean(c.projectId && c.clientEmail && c.privateKey);
}

export function adminApp() {
  if (!getApps().length) initializeApp({ credential: cert(creds()) });
  return getApps()[0];
}

export function adminDb() {
  adminApp();
  return getFirestore();
}

// Really tries the key (used by /api/health). Returns { ok } or { ok:false, reason } with a plain-language reason.
export async function adminCheck() {
  if (!adminReady()) return { ok: false, reason: 'FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY (or FIREBASE_SERVICE_ACCOUNT) are missing in Vercel.' };
  try {
    await adminDb().collection('products').limit(1).get();
    return { ok: true };
  } catch (e) {
    const m = String(e && e.message || e);
    if (/private key|PEM|DECODER|asn1|parse/i.test(m)) return { ok: false, reason: 'The private key is pasted wrongly. Use FIREBASE_SERVICE_ACCOUNT with the whole JSON file instead.' };
    if (/UNAUTHENTICATED|invalid_grant|16 /i.test(m)) return { ok: false, reason: 'Firebase rejected the key. Generate a new private key (Project settings > Service accounts) and paste it again.' };
    if (/PERMISSION_DENIED|7 /i.test(m)) return { ok: false, reason: 'This service account has no permission. Use the key from the same Firebase project.' };
    if (/NOT_FOUND|5 /i.test(m)) return { ok: false, reason: 'Firestore database is not created yet. Firebase Console > Firestore Database > Create database.' };
    return { ok: false, reason: `Firebase error: ${m.slice(0, 140)}` };
  }
}
