import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getAuth } from 'firebase-admin/auth';
import { adminApp, adminReady } from '@/lib/firebase-admin';
import { SITE } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Called by the admin panel after saving a product so the public pages update immediately.
export async function POST(req) {
  if (!adminReady()) return NextResponse.json({ ok: false }, { status: 503 });
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  try {
    const decoded = await getAuth(adminApp()).verifyIdToken(token);
    const byUid = process.env.ADMIN_UID && decoded.uid === process.env.ADMIN_UID;
    const byEmail = decoded.email_verified && SITE.adminEmails.includes(String(decoded.email || '').toLowerCase());
    if (!byUid && !byEmail) return NextResponse.json({ ok: false }, { status: 403 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const { slug } = await req.json().catch(() => ({}));
  ['/', '/products', '/sitemap.xml'].forEach((p) => revalidatePath(p));
  revalidatePath('/category/[slug]', 'page');
  if (slug) revalidatePath(`/product/${String(slug).slice(0, 80)}`);
  return NextResponse.json({ ok: true });
}
