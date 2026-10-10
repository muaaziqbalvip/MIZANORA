import { NextResponse } from 'next/server';
import { adminDb, adminReady } from '@/lib/firebase-admin';
import { priceCoupon } from '@/lib/coupons';
import { effective } from '@/lib/sale';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Checks a coupon against the real prices in the database (not the browser's numbers).
export async function POST(req) {
  if (!adminReady()) return NextResponse.json({ ok: false, error: 'Coupons are not available right now.' }, { status: 503 });
  let b;
  try { b = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 }); }
  const rawItems = Array.isArray(b.items) ? b.items.slice(0, 15) : [];
  const ids = [...new Set(rawItems.map((i) => String(i.id || '')))].filter(Boolean);
  if (!ids.length) return NextResponse.json({ ok: false, error: 'Your cart is empty.' }, { status: 400 });
  try {
    const db = adminDb();
    const snaps = await db.getAll(...ids.map((id) => db.collection('products').doc(id)));
    const byId = Object.fromEntries(snaps.filter((s) => s.exists).map((s) => [s.id, s.data()]));
    const subtotal = rawItems.reduce((s, r) => s + effective(byId[String(r.id)]?.price, byId[String(r.id)]?.comparePrice, byId[String(r.id)]?.saleEndsAtMs).price * Math.max(1, Math.min(10, Math.floor(Number(r.qty)) || 1)), 0);
    return NextResponse.json(await priceCoupon(db, b.code, subtotal));
  } catch (e) {
    console.error('coupon failed', e.message);
    return NextResponse.json({ ok: false, error: 'Could not check the coupon. Try again.' }, { status: 500 });
  }
}
