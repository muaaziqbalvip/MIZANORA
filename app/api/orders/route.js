import crypto from 'crypto';
import { NextResponse, after } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb, adminReady } from '@/lib/firebase-admin';
import { validateCustomer, normalizePhone } from '@/lib/validate';
import { SITE } from '@/lib/config';
import { sendCapi } from '@/lib/capi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Best-effort rate limit (per server instance). Real protection is the validation + honeypot + server-side pricing.
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > 6;
}

const newOrderId = () => `MZ-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
const fail = (msg, status = 400) => NextResponse.json({ ok: false, error: msg }, { status });

export async function POST(req) {
  if (!adminReady()) return fail('The store is not fully set up yet. Please order on WhatsApp.', 503);

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  if (limited(ip)) return fail('Too many orders from this connection. Please wait a few minutes or order on WhatsApp.', 429);

  let body;
  try { body = await req.json(); } catch { return fail('Invalid request'); }

  // Bots fill hidden fields. Pretend success so they do not retry.
  if (body.website) return NextResponse.json({ ok: true, order: { orderId: 'MZ-00000000', items: [], customer: {}, total: 0, shipping: 0 } });

  const { ok, clean } = validateCustomer(body.customer);
  if (!ok) return fail('Please check your delivery details and try again.');

  const rawItems = Array.isArray(body.items) ? body.items.slice(0, 15) : [];
  if (!rawItems.length) return fail('Your cart is empty.');

  const db = adminDb();
  try {
    const ids = [...new Set(rawItems.map((i) => String(i.id || '')))].filter(Boolean);
    if (!ids.length) return fail('Your cart is empty.');
    const snaps = await db.getAll(...ids.map((id) => db.collection('products').doc(id)));
    const byId = Object.fromEntries(snaps.filter((s) => s.exists).map((s) => [s.id, s.data()]));

    // Prices come from the database, never from the browser.
    const items = [];
    for (const r of rawItems) {
      const p = byId[String(r.id)];
      const qty = Math.floor(Number(r.qty));
      if (!p || p.active === false) return fail('One of the products is no longer available. Please refresh your cart.');
      if (p.inStock === false) return fail(`${p.name} is currently sold out.`);
      if (!(qty >= 1 && qty <= 10)) return fail('Invalid quantity.');
      const sizes = Array.isArray(p.sizes) ? p.sizes : [];
      const size = String(r.size || '');
      if (sizes.length && !sizes.includes(size)) return fail(`Please select a valid size for ${p.name}.`);
      items.push({ id: String(r.id), slug: String(r.id), name: p.name, price: Number(p.price) || 0, qty, size, image: (p.images && p.images[0]) || '' });
    }
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const shipping = SITE.shippingFee;
    const total = subtotal + shipping;

    const now = Date.now();
    const base = {
      status: 'Pending', customer: clean, items, subtotal, shipping, total, paymentMethod: 'COD',
      createdAt: FieldValue.serverTimestamp(), createdAtMs: now, trackingId: '',
    };

    let orderId = '';
    for (let attempt = 0; attempt < 4 && !orderId; attempt++) {
      const id = newOrderId();
      try { await db.collection('orders').doc(id).create({ orderId: id, ...base }); orderId = id; }
      catch (e) { if (attempt === 3) throw e; } // ID collision is extremely unlikely; retry
    }

    // Server-side Purchase (Conversions API). Same eventID as the browser Purchase so Meta counts it once.
    const phone = normalizePhone(clean.phone);
    after(() => sendCapi({
      eventName: 'Purchase', eventId: orderId, sourceUrl: body.sourceUrl || SITE.url,
      customData: {
        value: total, currency: 'PKR', order_id: orderId, content_type: 'product',
        content_ids: items.map((i) => i.id), contents: items.map((i) => ({ id: i.id, quantity: i.qty })),
        num_items: items.reduce((s, i) => s + i.qty, 0),
      },
      ip, userAgent: req.headers.get('user-agent') || '', fbp: body.fbp, fbc: body.fbc,
      phoneWa: phone ? phone.wa : '', fullName: clean.name, city: clean.city,
    }));

    return NextResponse.json({
      ok: true,
      order: { orderId, createdAtMs: now, status: 'Pending', customer: clean, items, subtotal, shipping, total },
    });
  } catch (e) {
    console.error('order failed', e);
    return fail('We could not place your order right now. Please try again, or order on WhatsApp.', 500);
  }
}
