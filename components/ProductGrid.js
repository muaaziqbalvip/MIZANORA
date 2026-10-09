'use client';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import ProductCard from './ProductCard';
import { search as trackSearch } from '@/lib/metaPixel';
import { describeIntent, smartSearch } from '@/lib/search';
import { aiIntent } from '@/lib/aiSearch';

// Search + sort run in the browser, so /products stays a fast, fully static (SEO-friendly) page.
export default function ProductGrid({ products }) {
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get('q') || '');
  useEffect(() => { setQ(sp.get('q') || ''); }, [sp]);
  const [sort, setSort] = useState('new');
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
  const list = useMemo(() => {
    let r = view.results;
    if (sort === 'low') r = [...r].sort((a, b) => a.price - b.price);
    if (sort === 'high') r = [...r].sort((a, b) => b.price - a.price);
    return r;
  }, [view, sort]);

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Search products</span>
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Try: red suit under 2000, black joota, sasta watch" className="input !pl-10" type="search" />
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
      {chips.length > 0 && <p className="mb-3 flex flex-wrap items-center gap-1.5 text-xs"><span className="font-bold text-gold">Understood:</span>{chips.map((c) => <span key={c} className="rounded-full bg-gold/10 px-2.5 py-1 font-semibold text-gold">{c}</span>)}</p>}
      {list.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface p-8 text-center text-dim">No products found.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
          {list.map((p, i) => <ProductCard key={p.id} p={p} priority={i < 4} />)}
        </div>
      )}
    </div>
  );
}
