import crypto from 'crypto';
import { NextResponse, after } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb, adminReady } from '@/lib/firebase-admin';
import { validateCustomer, normalizePhone } from '@/lib/validate';
import { SITE, shippingFor } from '@/lib/config';
import { effective } from '@/lib/sale';
import { sendCapi } from '@/lib/capi';
import { priceCoupon } from '@/lib/coupons';
import { optionsOf, validVariant } from '@/lib/options';
import { getAuth } from 'firebase-admin/auth';
import { adminApp } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Best-effort anti-spam (per server instance): only orders that were really placed are counted, so typing mistakes,
// coupon tries and test attempts can never lock a real customer out. Real protection is validation + honeypot + server-side pricing.
const placed = new Map();
const recentCount = (ip) => { const now = Date.now(); const a = (placed.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000); placed.set(ip, a); return a.length; };
const countOrder = (ip) => { const a = placed.get(ip) || []; a.push(Date.now()); placed.set(ip, a); if (placed.size > 5000) placed.clear(); };

const cut = (v) => String(v || '').replace(/[<>]/g, '').slice(0, 80);
const cleanTouch = (t) => (t && typeof t === 'object' ? { source: cut(t.source), medium: cut(t.medium), campaign: cut(t.campaign), content: cut(t.content) } : null);
const cleanAttr = (a) => (a && typeof a === 'object' ? { first: cleanTouch(a.first), last: cleanTouch(a.last) } : null);

const newOrderId = () => `MZ-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
const fail = (msg, status = 400) => NextResponse.json({ ok: false, error: msg }, { status });

export async function POST(req) {
  if (!adminReady()) return fail('The store is not fully set up yet. Please contact support on WhatsApp.', 503);

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  if (recentCount(ip) >= 12) return fail('You have placed several orders in a short time. Please wait a few minutes, or contact support on WhatsApp if you need more.', 429);

  let body;
  try { body = await req.json(); } catch { return fail('Invalid request'); }

  // Bots fill hidden fields. Pretend success so they do not retry.
  if (body.website) return NextResponse.json({ ok: true, order: { orderId: 'MZ-00000000', items: [], customer: {}, total: 0, shipping: 0 } });

  const { ok, clean } = validateCustomer(body.customer);
  if (!ok) return fail('Please check your delivery details and try again.');

  const rawItems = Array.isArray(body.items) ? body.items.slice(0, 15) : [];
  if (!rawItems.length) return fail('Your cart is empty.');

  try {
    const db = adminDb();
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
      const size = String(r.size || '');
      if (!validVariant(optionsOf(p), size)) return fail(`Please choose the options (for example colour and size) for ${p.name} again.`);
      items.push({ id: String(r.id), slug: String(r.id), name: p.name, price: effective(p.price, p.comparePrice, p.saleEndsAtMs).price, qty, size, image: (p.images && p.images[0]) || '' });
    }
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);

    // Optional: a signed-in customer's order is linked to their account so it shows in their order history.
    let uid = '', email = '';
    const tok = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (tok) { try { const d = await getAuth(adminApp()).verifyIdToken(tok); uid = d.uid; email = String(d.email || '').toLowerCase(); } catch { /* guest order */ } }

    // Optional coupon, re-checked here with real prices.
    let discount = 0, couponCode = '';
    if (body.coupon) {
      const r = await priceCoupon(db, body.coupon, subtotal);
      if (!r.ok) return fail(r.error);
      discount = r.discount; couponCode = r.code;
    }
    const shipping = shippingFor(subtotal - discount);
    const total = subtotal - discount + shipping;

    const now = Date.now();
    const base = {
      status: 'Pending', customer: clean, items, subtotal, discount, couponCode, shipping, total, paymentMethod: 'COD', uid, email, marketingOptIn: Boolean(body.marketingOptIn), attribution: cleanAttr(body.attribution),
      createdAt: FieldValue.serverTimestamp(), createdAtMs: now, trackingId: '',
    };

    let orderId = '';
    for (let attempt = 0; attempt < 4 && !orderId; attempt++) {
      const id = newOrderId();
      try { await db.collection('orders').doc(id).create({ orderId: id, ...base }); orderId = id; }
      catch (e) { if (attempt === 3) throw e; } // ID collision is extremely unlikely; retry
    }

    countOrder(ip);
    if (couponCode) { try { await db.collection('coupons').doc(couponCode).update({ used: FieldValue.increment(1) }); } catch (_) { /* counting is best effort */ } }

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
      phoneWa: phone ? phone.wa : '', fullName: clean.name, city: clean.city, email, uid,
    }));

    return NextResponse.json({
      ok: true,
      order: { orderId, createdAtMs: now, status: 'Pending', customer: clean, items, subtotal, discount, couponCode, shipping, total },
    });
  } catch (e) {
    console.error('order failed', e && e.message);
    return fail('Our order system is having a problem right now. Your order was not placed. Please try again in a minute, or send it to support on WhatsApp.', 500);
  }
}
