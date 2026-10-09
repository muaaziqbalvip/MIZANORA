'use client';
import { useCallback, useEffect, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { dbClient } from '@/lib/firebase-client';
import { formatPKR } from '@/lib/format';

const EMPTY = { code: '', type: 'percent', value: '', minOrder: '', maxDiscount: '', usageLimit: '', expires: '', active: true };

export default function AdminCoupons() {
  const [list, setList] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [msg, setMsg] = useState('');
  const load = useCallback(async () => {
    const snap = await getDocs(collection(dbClient(), 'coupons'));
    setList(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, []);
  useEffect(() => { load().catch((e) => { setList([]); setMsg(e.code === 'permission-denied' ? 'Publish the updated firestore.rules first (it adds the coupons section).' : e.message); }); }, [load]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function save(e) {
    e.preventDefault();
    const code = form.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 30);
    const value = Number(form.value);
    if (!code || !(value > 0)) { setMsg('Enter a code and a discount value.'); return; }
    if (form.type === 'percent' && value > 90) { setMsg('Percent discount can be at most 90.'); return; }
    try {
      await setDoc(doc(dbClient(), 'coupons', code), {
        code, type: form.type, value, minOrder: Number(form.minOrder) || 0, maxDiscount: Number(form.maxDiscount) || 0,
        usageLimit: Number(form.usageLimit) || 0, expiresAtMs: form.expires ? new Date(`${form.expires}T23:59:59`).getTime() : 0,
        active: Boolean(form.active), used: (list.find((c) => c.id === code) || {}).used || 0,
      });
      setForm(EMPTY); setMsg(`Coupon ${code} saved.`); await load();
    } catch (e2) { setMsg(e2.message); }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <section>
        <h1 className="mb-4 text-3xl font-extrabold">Coupons</h1>
        {msg && <p role="status" className="mb-3 rounded-xl bg-raised p-3 text-sm">{msg}</p>}
        {!list ? <p className="text-dim">Loading...</p> : list.length === 0 ? <p className="card text-center text-dim">No coupons yet. Create one, for example WELCOME10 for 10% off.</p> : (
          <ul className="space-y-2">
            {list.map((c) => (
              <li key={c.id} className="card flex flex-wrap items-center gap-3 !p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{c.id} {c.active === false && <span className="text-xs text-red-700">(off)</span>}</p>
                  <p className="text-sm text-dim">{c.type === 'percent' ? `${c.value}% off` : `${formatPKR(c.value)} off`}{c.minOrder ? ` · min ${formatPKR(c.minOrder)}` : ''}{c.maxDiscount ? ` · max ${formatPKR(c.maxDiscount)}` : ''} · used {c.used || 0}{c.usageLimit ? `/${c.usageLimit}` : ''}{c.expiresAtMs ? ` · until ${new Date(c.expiresAtMs).toLocaleDateString()}` : ''}</p>
                </div>
                <button className="btn-ghost !px-4 !py-2 text-sm" onClick={() => setDoc(doc(dbClient(), 'coupons', c.id), { active: c.active === false }, { merge: true }).then(load)}>{c.active === false ? 'Turn on' : 'Turn off'}</button>
                <button className="px-2 text-sm text-red-700" onClick={() => { if (confirm(`Delete ${c.id}?`)) deleteDoc(doc(dbClient(), 'coupons', c.id)).then(load); }}>Delete</button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <form onSubmit={save} className="card h-fit space-y-3">
        <h2 className="text-xl font-bold">New coupon</h2>
        <div><label className="label" htmlFor="cc">Code</label><input id="cc" className="input uppercase" value={form.code} onChange={set('code')} placeholder="WELCOME10" required /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label" htmlFor="ct">Type</label><select id="ct" className="input" value={form.type} onChange={set('type')}><option value="percent">Percent %</option><option value="flat">Flat Rs.</option></select></div>
          <div><label className="label" htmlFor="cv">Value</label><input id="cv" type="number" min="1" className="input" value={form.value} onChange={set('value')} required /></div>
          <div><label className="label" htmlFor="cm">Min order (Rs.)</label><input id="cm" type="number" min="0" className="input" value={form.minOrder} onChange={set('minOrder')} /></div>
          <div><label className="label" htmlFor="cx">Max discount (Rs.)</label><input id="cx" type="number" min="0" className="input" value={form.maxDiscount} onChange={set('maxDiscount')} /></div>
          <div><label className="label" htmlFor="cu">Use limit</label><input id="cu" type="number" min="0" className="input" value={form.usageLimit} onChange={set('usageLimit')} placeholder="0 = no limit" /></div>
          <div><label className="label" htmlFor="ce">Expires</label><input id="ce" type="date" className="input" value={form.expires} onChange={set('expires')} /></div>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={set('active')} className="h-4 w-4 accent-[#0B6B45]" /> Active</label>
        <button className="btn-gold w-full">Save coupon</button>
      </form>
    </div>
  );
}
