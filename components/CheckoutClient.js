'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useCart } from './CartProvider';
import { SITE, waLink } from '@/lib/config';
import { CITIES, CITY_PROVINCE, PROVINCES } from '@/lib/constants';
import { validateCustomer } from '@/lib/validate';
import { formatPKR } from '@/lib/format';
import { initiateCheckout, getCookie } from '@/lib/metaPixel';

const EMPTY = { name: '', phone: '', address: '', landmark: '', city: '', cityOther: '', province: '', notes: '', website: '' };

export default function CheckoutClient() {
  const { items, ready, subtotal, clear } = useCart();
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState('');
  const fired = useRef(false);
  const formRef = useRef(null);

  const shipping = items.length ? SITE.shippingFee : 0;
  const total = subtotal + shipping;

  // Returning customers: fill in the details they used last time (stored only on their own device).
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('mz_customer') || 'null');
      if (saved) setForm((f) => ({ ...f, ...saved }));
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (ready && items.length && !fired.current) {
      fired.current = true;
      initiateCheckout(items, subtotal);
    }
  }, [ready, items, subtotal]);

  const set = (k) => (e) => {
    const v = e.target.value;
    setForm((f) => {
      const n = { ...f, [k]: v };
      if (k === 'city' && CITY_PROVINCE[v]) n.province = CITY_PROVINCE[v];
      return n;
    });
  };

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    const city = form.city === 'Other' ? form.cityOther.trim() : form.city;
    const { ok, errors: errs, clean } = validateCustomer({ ...form, city });
    if (!ok) {
      setErrors(errs);
      const first = formRef.current && formRef.current.querySelector('[aria-invalid="true"]');
      if (first) first.focus();
      return;
    }
    setErrors({});
    setServerError('');
    setBusy(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: clean,
          items: items.map((i) => ({ id: i.id, size: i.size || '', qty: i.qty })),
          website: form.website, // honeypot: real people leave it empty
          fbp: getCookie('_fbp'), fbc: getCookie('_fbc'), sourceUrl: window.location.href,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'We could not place your order. Please try again, or order on WhatsApp.');
      try {
        localStorage.setItem('mz_last_order', JSON.stringify(data.order));
        localStorage.setItem('mz_customer', JSON.stringify({
          name: form.name, phone: form.phone, address: form.address, landmark: form.landmark,
          city: form.city, cityOther: form.cityOther, province: form.province,
        }));
      } catch (_) {}
      clear();
      router.push(`/thank-you?id=${encodeURIComponent(data.order.orderId)}`);
    } catch (err) {
      setServerError(err.message);
      setBusy(false);
    }
  }

  if (!ready) return <p className="text-dim">Loading...</p>;
  if (!items.length) {
    return (
      <div className="card text-center">
        <p className="text-lg">Your cart is empty.</p>
        <Link href="/products" className="btn-gold mt-4">Browse products</Link>
      </div>
    );
  }

  const field = (k, label, props = {}, hint) => (
    <div>
      <label htmlFor={k} className="label">{label}</label>
      <input id={k} name={k} value={form[k]} onChange={set(k)} className={`input ${errors[k] ? 'input-err' : ''}`}
        aria-invalid={errors[k] ? 'true' : 'false'} aria-describedby={errors[k] ? `${k}-e` : undefined} {...props} />
      {hint && !errors[k] && <p className="mt-1.5 text-xs text-faint">{hint}</p>}
      {errors[k] && <p id={`${k}-e`} className="field-err">{errors[k]}</p>}
    </div>
  );

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Delivery details</h2>
        {field('name', 'Full name', { autoComplete: 'name', placeholder: 'e.g. Ahmed Ali' })}
        {field('phone', 'WhatsApp / mobile number', { type: 'tel', inputMode: 'tel', autoComplete: 'tel', placeholder: '0300-1234567' }, 'We will confirm your order on this number.')}
        <div>
          <label htmlFor="address" className="label">Complete street address</label>
          <textarea id="address" name="address" rows={3} value={form.address} onChange={set('address')} autoComplete="street-address"
            placeholder="House / building #, street, area" className={`input ${errors.address ? 'input-err' : ''}`}
            aria-invalid={errors.address ? 'true' : 'false'} />
          {errors.address && <p className="field-err">{errors.address}</p>}
        </div>
        {field('landmark', 'Nearest landmark', { placeholder: 'e.g. near Jamia Masjid, opposite school' })}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="city" className="label">City</label>
            <select id="city" name="city" value={form.city} onChange={set('city')} className={`input ${errors.city ? 'input-err' : ''}`} aria-invalid={errors.city ? 'true' : 'false'}>
              <option value="">Select city</option>
              {[...CITIES].sort().map((c) => <option key={c} value={c}>{c}</option>)}
              <option value="Other">Other city</option>
            </select>
            {errors.city && <p className="field-err">{errors.city}</p>}
          </div>
          <div>
            <label htmlFor="province" className="label">Province / region</label>
            <select id="province" name="province" value={form.province} onChange={set('province')} className={`input ${errors.province ? 'input-err' : ''}`} aria-invalid={errors.province ? 'true' : 'false'}>
              <option value="">Select province</option>
              {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            {errors.province && <p className="field-err">{errors.province}</p>}
          </div>
        </div>
        {form.city === 'Other' && field('cityOther', 'Your city name', { placeholder: 'Type your city' })}
        <div>
          <label htmlFor="notes" className="label">Order notes (optional)</label>
          <textarea id="notes" name="notes" rows={2} value={form.notes} onChange={set('notes')} className="input" placeholder="Anything we should know?" />
        </div>
        {/* Honeypot field for bots */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>Website<input tabIndex={-1} autoComplete="off" name="website" value={form.website} onChange={set('website')} /></label>
        </div>
      </div>

      <aside className="h-fit space-y-4 lg:sticky lg:top-24">
        <div className="card">
          <h2 className="mb-3 text-2xl font-semibold">Your order</h2>
          <ul className="space-y-3">
            {items.map((i) => (
              <li key={i.key} className="flex gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-raised">{i.image && <Image src={i.image} alt="" fill sizes="56px" className="object-cover" />}</div>
                <div className="min-w-0 flex-1 text-sm"><p className="line-clamp-2">{i.name}</p><p className="text-faint">{i.size ? `Size ${i.size} · ` : ''}Qty {i.qty}</p></div>
                <p className="text-sm font-semibold">{formatPKR(i.price * i.qty)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-line pt-3 text-sm">
            <div className="flex justify-between"><dt className="text-dim">Subtotal</dt><dd>{formatPKR(subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-dim">Delivery</dt><dd>{shipping > 0 ? formatPKR(shipping) : 'Free'}</dd></div>
            <div className="flex justify-between text-base font-bold"><dt>Pay on delivery</dt><dd className="text-gold">{formatPKR(total)}</dd></div>
          </dl>
        </div>
        {serverError && (
          <div role="alert" className="rounded-xl border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">
            {serverError}{' '}
            <a className="underline" href={waLink('Assalam o Alaikum, I could not place my order on the website.')} target="_blank" rel="noopener noreferrer">Order on WhatsApp instead</a>
          </div>
        )}
        <button type="submit" disabled={busy} className="btn-gold w-full !py-4 text-base">
          {busy ? <><Loader2 className="animate-spin" size={20} /> Placing order...</> : `Place order · ${formatPKR(total)}`}
        </button>
        <p className="text-center text-xs text-faint">Cash on delivery. We will confirm your order on WhatsApp before dispatch.</p>
      </aside>
    </form>
  );
}
