// Server-side coupon check. Coupons live in Firestore "coupons/{CODE}" (admin-only), so shoppers cannot invent discounts.
export async function priceCoupon(db, rawCode, subtotal) {
  const code = String(rawCode || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 30);
  if (!code) return { ok: false, error: 'Enter a coupon code.' };
  const snap = await db.collection('coupons').doc(code).get();
  if (!snap.exists) return { ok: false, error: 'This coupon code is not valid.' };
  const c = snap.data();
  if (c.active === false) return { ok: false, error: 'This coupon is no longer active.' };
  if (c.expiresAtMs && Date.now() > Number(c.expiresAtMs)) return { ok: false, error: 'This coupon has expired.' };
  if (c.usageLimit && Number(c.used || 0) >= Number(c.usageLimit)) return { ok: false, error: 'This coupon has been fully used.' };
  const min = Number(c.minOrder) || 0;
  if (subtotal < min) return { ok: false, error: `This coupon needs an order of at least Rs. ${min}.` };
  const value = Number(c.value) || 0;
  let discount = c.type === 'percent' ? Math.floor((subtotal * Math.min(value, 90)) / 100) : Math.floor(value);
  if (c.maxDiscount) discount = Math.min(discount, Number(c.maxDiscount));
  discount = Math.max(0, Math.min(discount, subtotal));
  if (!discount) return { ok: false, error: 'This coupon gives no discount on your cart.' };
  const label = c.type === 'percent' ? `${Math.min(value, 90)}% off` : `Rs. ${Math.floor(value)} off`;
  return { ok: true, code, discount, label };
}
