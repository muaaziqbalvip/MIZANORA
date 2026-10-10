'use client';
import { useEffect, useMemo, useState } from 'react';
import { collection, doc, limit, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { FileDown, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { dbClient } from '@/lib/firebase-client';
import { ORDER_STATUSES } from '@/lib/constants';
import { formatDate, formatPKR } from '@/lib/format';
import { normalizePhone } from '@/lib/validate';
import { downloadCsv, ordersToCsv } from '@/lib/csv';

const STATUS_STYLE = {
  Pending: 'bg-yellow-500/15 text-yellow-800',
  Verified: 'bg-blue-500/15 text-blue-800',
  Dispatched: 'bg-green-500/15 text-green-800',
  Cancelled: 'bg-red-500/15 text-red-700',
};

function waMessage(o) {
  const items = o.items.map((i) => `${i.name}${i.size ? ` (${i.size})` : ''} x${i.qty}`).join(', ');
  return `Assalam o Alaikum ${o.customer.name}, aap ne Mizanora se order ${o.orderId} kiya hai.\nItems: ${items}\nTotal (COD): ${formatPKR(o.total)}\nAddress: ${o.customer.address}, ${o.customer.city}\nKya aap order confirm karte hain? Shukriya.`;
}

export default function AdminOrders() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('All');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState('');
  const [max, setMax] = useState(100); // newest 100 orders first; "Load more" adds 100 (each order read costs 1 Firestore read)

  useEffect(() => {
    const qy = query(collection(dbClient(), 'orders'), orderBy('createdAtMs', 'desc'), limit(max));
    return onSnapshot(qy, (snap) => setOrders(snap.docs.map((d) => ({ ...d.data(), orderId: d.id }))), (e) => setError(e.message));
  }, [max]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (orders || []).filter((o) => (filter === 'All' || o.status === filter) &&
      (!t || `${o.orderId} ${o.customer?.name} ${o.customer?.phone} ${o.customer?.city}`.toLowerCase().includes(t)));
  }, [orders, filter, q]);

  const counts = useMemo(() => {
    const c = { All: (orders || []).length };
    ORDER_STATUSES.forEach((s) => { c[s] = (orders || []).filter((o) => o.status === s).length; });
    return c;
  }, [orders]);

  const stats = useMemo(() => {
    const list = orders || [];
    const live = list.filter((o) => o.status !== 'Cancelled');
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const sales = live.reduce((t, o) => t + (Number(o.total) || 0), 0);
    return { today: list.filter((o) => (o.createdAtMs || 0) >= start.getTime()).length, pending: list.filter((o) => o.status === 'Pending').length, sales, avg: live.length ? Math.round(sales / live.length) : 0 };
  }, [orders]);

  const setStatus = (id, status) => updateDoc(doc(dbClient(), 'orders', id), { status, [`${status.toLowerCase()}At`]: Date.now() }).catch((e) => alert(e.message));
  const setTracking = (id, trackingId) => updateDoc(doc(dbClient(), 'orders', id), { trackingId }).catch((e) => alert(e.message));
  const exportCsv = () => downloadCsv(`mizanora-orders-${filter.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`, ordersToCsv(shown));

  if (error) return <p className="card text-red-700">Could not load orders: {error}. Check your Firestore rules and that you are signed in as the admin.</p>;
  if (!orders) return <p className="text-dim">Loading orders...</p>;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-4xl font-bold">Orders <span className="text-lg text-faint">live</span></h1>
        <button onClick={exportCsv} disabled={!shown.length} className="btn-gold !py-2.5"><FileDown size={18} /> Export {shown.length} to CSV</button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[['Orders today', stats.today], ['Pending now', stats.pending], ['Sales (not cancelled)', formatPKR(stats.sales)], ['Avg. order', formatPKR(stats.avg)]].map(([l, v]) => (
          <div key={l} className="card !p-3"><p className="text-xs text-faint">{l}</p><p className="text-xl font-extrabold text-gold">{v}</p></div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="tablist">
        {['All', ...ORDER_STATUSES].map((s) => (
          <button key={s} role="tab" aria-selected={filter === s} onClick={() => setFilter(s)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${filter === s ? 'bg-gold text-ink' : 'bg-raised text-dim'}`}>{s} ({counts[s]})</button>
        ))}
      </div>
      <input className="input mt-3" placeholder="Search by order ID, name, phone or city" value={q} onChange={(e) => setQ(e.target.value)} type="search" />

      <ul className="mt-4 space-y-3">
        {shown.length === 0 && <li className="card text-center text-dim">No orders here yet.</li>}
        {shown.map((o) => {
          const ph = normalizePhone(o.customer?.phone);
          const isOpen = open === o.orderId;
          return (
            <li key={o.orderId} className="card !p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <button className="min-w-0 text-left" onClick={() => setOpen(isOpen ? '' : o.orderId)} aria-expanded={isOpen}>
                  <p className="font-semibold text-cream">{o.orderId} · {o.customer?.name}</p>
                  <p className="text-sm text-dim">{o.customer?.city} · {o.customer?.phone} · {formatDate(o.createdAtMs)}</p>
                  <p className="mt-1 text-sm text-gold">{formatPKR(o.total)} · {o.items.reduce((s, i) => s + i.qty, 0)} item(s)</p>
                </button>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLE[o.status] || ''}`}>{o.status}</span>
                  {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </div>

              {isOpen && (
                <div className="mt-4 space-y-4 border-t border-line pt-4 text-sm">
                  <div>
                    <p className="mb-1 font-semibold text-cream">Items</p>
                    <ul className="space-y-1 text-dim">{o.items.map((i, n) => <li key={n}>{i.name}{i.size ? ` (${i.size})` : ''} x {i.qty} = {formatPKR(i.price * i.qty)}</li>)}</ul>
                    <p className="mt-1 text-dim">Delivery: {o.shipping > 0 ? formatPKR(o.shipping) : 'Free'} · <b className="text-cream">COD total {formatPKR(o.total)}</b></p>
                  </div>
                  <div className="rounded-xl bg-raised p-3 text-dim">
                    <p className="font-semibold text-cream">{o.customer?.name} · {o.customer?.phone}</p>
                    <p>{o.customer?.address}</p>
                    <p>{o.customer?.city}, {o.customer?.province}</p>
                    <p>Landmark: {o.customer?.landmark}</p>
                    {o.customer?.notes && <p>Notes: {o.customer.notes}</p>}
                  </div>
                  <div className="flex flex-wrap items-end gap-3">
                    <div>
                      <label className="label" htmlFor={`st-${o.orderId}`}>Status</label>
                      <select id={`st-${o.orderId}`} className="input !py-2" value={o.status} onChange={(e) => setStatus(o.orderId, e.target.value)}>
                        {ORDER_STATUSES.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label" htmlFor={`tr-${o.orderId}`}>Tracking ID</label>
                      <input id={`tr-${o.orderId}`} className="input !py-2" defaultValue={o.trackingId || ''} onBlur={(e) => e.target.value !== (o.trackingId || '') && setTracking(o.orderId, e.target.value.trim())} placeholder="Courier tracking #" />
                    </div>
                    {ph && (
                      <a className="btn-wa !py-2.5" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${ph.wa}?text=${encodeURIComponent(waMessage(o))}`}>
                        <MessageCircle size={18} /> WhatsApp customer
                      </a>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {orders.length >= max && <button type="button" className="btn-ghost mt-4 w-full" onClick={() => setMax((m) => m + 100)}>Load 100 older orders</button>}
    </div>
  );
}
