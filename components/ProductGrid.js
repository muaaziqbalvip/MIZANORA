'use client';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import ProductCard from './ProductCard';
import { search as trackSearch } from '@/lib/metaPixel';
import { describeIntent, smartSearch } from '@/lib/search';
import { aiIntent } from '@/lib/aiSearch';
import VoiceButton from './VoiceButton';
import { addRecentQuery, logSearch } from '@/lib/searchHistory';
import { colorHex, isColorOption } from '@/lib/options';

// Search + sort run in the browser, so /products stays a fast, fully static (SEO-friendly) page.
export default function ProductGrid({ products }) {
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get('q') || '');
  useEffect(() => { setQ(sp.get('q') || ''); }, [sp]);
  const [sort, setSort] = useState('new');
  const [cat, setCat] = useState('');
  const [price, setPrice] = useState(-1);
  const [color, setColor] = useState('');
  const [stock, setStock] = useState(false);
  useEffect(() => { const t = q.trim(); if (t.length < 3) return undefined; const h = setTimeout(() => trackSearch(t), 1200); return () => clearTimeout(h); }, [q]);
  const [ai, setAi] = useState(null);
  const found = useMemo(() => (q.trim() ? smartSearch(products, q, { limit: 500 }) : { results: products, intent: {} }), [products, q]);
  useEffect(() => {
    setAi(null);
    if (q.trim().length < 4 || found.results.length) return undefined;
    let live = true;
    const t = setTimeout(async () => { const i = await aiIntent(q); if (live && i) setAi(smartSearch(products, q, { limit: 500, intent: i })); }, 700);
    return () => { live = false; clearTimeout(t); };
  }, [products, q, found.results.length]);
  const view = ai && ai.results.length ? ai : found;
  const chips = describeIntent(view.intent || {});
  const PRICES = [['Under 1,000', 0, 1000], ['1,000 - 3,000', 1000, 3000], ['3,000 - 6,000', 3000, 6000], ['6,000 and above', 6000, 0]];
  const cats = useMemo(() => [...new Set(products.map((p) => p.category).filter(Boolean))], [products]);
  const colors = useMemo(() => {
    const n = {};
    products.forEach((p) => (p.options || []).filter((o) => isColorOption(o.name)).forEach((o) => o.values.forEach((v) => { n[v] = (n[v] || 0) + 1; })));
    return Object.entries(n).sort((a, b) => b[1] - a[1]).slice(0, 14).map((x) => x[0]);
  }, [products]);
  const filters = (cat ? 1 : 0) + (price >= 0 ? 1 : 0) + (color ? 1 : 0) + (stock ? 1 : 0);
  const list = useMemo(() => {
    let r = view.results;
    if (cat) r = r.filter((p) => p.category === cat);
    if (price >= 0) { const [, lo, hi] = PRICES[price]; r = r.filter((p) => p.price >= lo && (!hi || p.price < hi)); }
    if (color) r = r.filter((p) => (p.options || []).some((o) => isColorOption(o.name) && o.values.includes(color)));
    if (stock) r = r.filter((p) => p.inStock);
    if (sort === 'low') r = [...r].sort((a, b) => a.price - b.price);
    if (sort === 'high') r = [...r].sort((a, b) => b.price - a.price);
    return r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, sort, cat, price, color, stock]);
  useEffect(() => { const t = q.trim(); if (t.length < 3) return undefined; const h = setTimeout(() => { addRecentQuery(t); logSearch(t, list.length); }, 1800); return () => clearTimeout(h); }, [q, list.length]);
  const clearAll = () => { setCat(''); setPrice(-1); setColor(''); setStock(false); };
  const chip = (on) => `shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${on ? 'border-gold bg-gold text-white' : 'border-line bg-surface text-dim hover:border-gold'}`;

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Search products</span>
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Try: red suit under 2000, black joota, sasta watch" className="input !pl-10 !pr-12" type="search" />
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2"><VoiceButton onText={setQ} /></span>
        </label>
        <label>
          <span className="sr-only">Sort</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="input sm:w-52">
            <option value="new">Newest first</option>
            <option value="low">Price: low to high</option>
            <option value="high">Price: high to low</option>
          </select>
        </label>
      </div>
      <div className="no-sb -mx-1 mb-2 flex gap-2 overflow-x-auto px-1 pb-1" aria-label="Filters">
        <button type="button" onClick={() => setStock(!stock)} aria-pressed={stock} className={chip(stock)}>In stock</button>
        {PRICES.map(([l], n) => <button key={l} type="button" onClick={() => setPrice(price === n ? -1 : n)} aria-pressed={price === n} className={chip(price === n)}>{l}</button>)}
      </div>
      {cats.length > 1 && <div className="no-sb -mx-1 mb-2 flex gap-2 overflow-x-auto px-1 pb-1" aria-label="Categories">{cats.map((c) => <button key={c} type="button" onClick={() => setCat(cat === c ? '' : c)} aria-pressed={cat === c} className={chip(cat === c)}>{c}</button>)}</div>}
      {colors.length > 0 && <div className="no-sb -mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1" aria-label="Colours">{colors.map((c) => <button key={c} type="button" onClick={() => setColor(color === c ? '' : c)} aria-pressed={color === c} className={`${chip(color === c)} inline-flex items-center gap-1.5`}>{colorHex(c) && <span className="h-3.5 w-3.5 rounded-full border border-black/20" style={{ background: colorHex(c) }} aria-hidden="true" />}{c}</button>)}</div>}
      <div className="mb-3 flex items-center justify-between text-sm text-dim"><span><b className="text-cream">{list.length}</b> product{list.length === 1 ? '' : 's'}</span>{filters > 0 && <button type="button" onClick={clearAll} className="font-bold text-gold">Clear filters ({filters})</button>}</div>
      {chips.length > 0 && <p className="mb-3 flex flex-wrap items-center gap-1.5 text-xs"><span className="font-bold text-gold">Understood:</span>{chips.map((c) => <span key={c} className="rounded-full bg-gold/10 px-2.5 py-1 font-semibold text-gold">{c}</span>)}</p>}
      {list.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-8 text-center text-dim"><p>No products found{filters ? ' with these filters' : ''}.</p>{filters > 0 && <button type="button" onClick={clearAll} className="btn-ghost mt-3 !py-2">Clear filters</button>}</div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
          {list.map((p, i) => <ProductCard key={p.id} p={p} priority={i < 4} />)}
        </div>
      )}
    </div>
  );
}
