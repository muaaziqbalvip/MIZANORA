'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { SITE, waLink } from '@/lib/config';
import { formatPKR } from '@/lib/format';
import { purchase } from '@/lib/metaPixel';
import { WhatsAppIcon } from './Icons';
import InstallButton from './InstallButton';

export default function ThankYouClient() {
  const sp = useSearchParams();
  const id = sp.get('id') || '';
  const [order, setOrder] = useState(null);

  useEffect(() => {
    try {
      const o = JSON.parse(localStorage.getItem('mz_last_order') || 'null');
      if (o && (!id || o.orderId === id)) setOrder(o);
    } catch (_) {}
  }, [id]);

  // Purchase event: once per order, only here, with the real order value in PKR and the order ID.
  useEffect(() => { if (order) purchase(order); }, [order]);

  const orderId = order ? order.orderId : id;
  const lines = order ? order.items.map((i) => `${i.name}${i.size ? ` (size ${i.size})` : ''} x${i.qty}`).join(', ') : '';
  const msg = order
    ? `Assalam o Alaikum, I placed order ${order.orderId} on Mizanora.\nName: ${order.customer.name}\nItems: ${lines}\nTotal (COD): ${formatPKR(order.total)}\nCity: ${order.customer.city}\nI need help with this order.`
    : `Assalam o Alaikum, I placed order ${orderId} on Mizanora and need help.`;

  return (
    <div>
      <div className="text-center">
        <CheckCircle2 className="mx-auto text-gold" size={56} />
        <h1 className="mt-3 text-4xl font-bold">Thank you! Order received</h1>
        {orderId && <p className="mt-2 text-dim">Your order ID is <b className="text-cream">{orderId}</b></p>}
      </div>

      <p className="mt-4 rounded-xl border border-line bg-surface p-4 text-center text-dim">We will call or message <b className="text-cream">{order ? order.customer.phone : 'your number'}</b> to confirm your order. Please keep your phone nearby.</p>
      <a href={waLink(msg)} target="_blank" rel="noopener noreferrer" className="btn-wa mt-4 w-full">
        <WhatsAppIcon size={22} /> Chat with support about this order
      </a>
      <p className="mt-2 text-center text-xs text-faint">WhatsApp is for support only. Your order is already placed.</p>

      {order && (
        <div className="card mt-6">
          <h2 className="mb-3 text-2xl font-semibold">Order summary</h2>
          <ul className="space-y-2 text-sm">
            {order.items.map((i) => (
              <li key={`${i.id}${i.size}`} className="flex justify-between gap-3"><span>{i.name}{i.size ? ` (size ${i.size})` : ''} x {i.qty}</span><span>{formatPKR(i.price * i.qty)}</span></li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm">
            <div className="flex justify-between"><dt className="text-dim">Delivery</dt><dd>{order.shipping > 0 ? formatPKR(order.shipping) : 'Free'}</dd></div>
            <div className="flex justify-between text-base font-bold"><dt>Pay on delivery</dt><dd className="text-gold">{formatPKR(order.total)}</dd></div>
          </dl>
          <div className="mt-4 rounded-xl bg-raised p-3.5 text-sm text-dim">
            <p className="font-semibold text-cream">{order.customer.name} · {order.customer.phone}</p>
            <p>{order.customer.address}, {order.customer.city}, {order.customer.province}</p>
            <p>Landmark: {order.customer.landmark}</p>
            {order.customer.notes && <p>Notes: {order.customer.notes}</p>}
          </div>
        </div>
      )}

      <div className="card mt-6">
        <h2 className="text-2xl font-semibold">Order faster next time</h2>
        <p className="mt-1 text-sm text-dim">Install the Mizanora app. Your details are remembered on your phone, so your next order takes seconds.</p>
        <InstallButton className="mt-3" full />
        <div className="mt-3 flex flex-wrap gap-3">
          <Link href="/products" className="btn-ghost !py-2.5">Continue shopping</Link>
          <Link href="/connect" className="btn-ghost !py-2.5">Follow {SITE.name}</Link>
        </div>
      </div>
    </div>
  );
}
