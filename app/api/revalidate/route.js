import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getAuth } from 'firebase-admin/auth';
import { adminApp, adminReady } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Called by the admin panel after saving a product so the public pages update immediately.
export async function POST(req) {
  if (!adminReady() || !process.env.ADMIN_UID) return NextResponse.json({ ok: false }, { status: 503 });
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  try {
    const decoded = await getAuth(adminApp()).verifyIdToken(token);
    if (decoded.uid !== process.env.ADMIN_UID) return NextResponse.json({ ok: false }, { status: 403 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const { slug } = await req.json().catch(() => ({}));
  ['/', '/products', '/sitemap.xml'].forEach((p) => revalidatePath(p));
  if (slug) revalidatePath(`/product/${String(slug).slice(0, 80)}`);
  return NextResponse.json({ ok: true });
}
