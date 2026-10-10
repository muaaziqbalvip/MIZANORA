import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { verifyAdmin } from '@/lib/adminAuth';
import { SITE } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Called by the admin panel after saving a product or banner so the public pages update immediately.
export async function POST(req) {
  const admin = await verifyAdmin(req);
  if (!admin.ok) return NextResponse.json({ ok: false }, { status: admin.status });
  const { slug } = await req.json().catch(() => ({}));
  ['/', '/products', '/reels', '/sitemap.xml', '/llms.txt'].forEach((p) => revalidatePath(p));
  revalidatePath('/category/[slug]', 'page');
  if (slug) revalidatePath(`/product/${String(slug).slice(0, 80)}`);
  // Tell Bing/Yandex (IndexNow) about the changed pages right away. Optional: needs INDEXNOW_KEY.
  const key = process.env.INDEXNOW_KEY;
  if (key && slug) {
    const host = new URL(SITE.url).host;
    fetch('https://api.indexnow.org/indexnow', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host, key, keyLocation: `${SITE.url}/api/indexnow-key`, urlList: [`${SITE.url}/product/${String(slug).slice(0, 80)}`, `${SITE.url}/`] }),
    }).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
