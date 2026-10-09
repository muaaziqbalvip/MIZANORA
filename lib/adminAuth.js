import { getAuth } from 'firebase-admin/auth';
import { adminApp, adminReady } from './firebase-admin';
import { SITE } from './config';

// Server-side admin check for API routes. The browser sends its Firebase ID token.
// Admin = the UID in ADMIN_UID, or a verified Google email listed in NEXT_PUBLIC_ADMIN_EMAIL.
export async function verifyAdmin(req) {
  if (!adminReady()) return { ok: false, status: 503, error: 'Server is not configured yet (Firebase Admin variables are missing in Vercel).' };
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return { ok: false, status: 401, error: 'Please sign in again.' };
  try {
    const d = await getAuth(adminApp()).verifyIdToken(token);
    const byUid = Boolean(process.env.ADMIN_UID) && d.uid === process.env.ADMIN_UID;
    const byEmail = Boolean(d.email_verified) && SITE.adminEmails.includes(String(d.email || '').toLowerCase());
    if (!byUid && !byEmail) return { ok: false, status: 403, error: 'not_admin', uid: d.uid };
    return { ok: true, uid: d.uid };
  } catch {
    return { ok: false, status: 401, error: 'Please sign in again.' };
  }
}
