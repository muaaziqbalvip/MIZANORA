'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { searchProducts } from '@/lib/search';
import { formatPKR } from '@/lib/format';

// Search with live suggestions (loads the small product list the first time you tap the box).
export default function SearchBox({ id, className = '', categories = [] }) {
  const [q, setQ] = useState('');
  const [list, setList] = useState(null);
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const away = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, []);

  const load = () => { if (!list) fetch('/api/search-index').then((r) => r.json()).then(setList).catch(() => setList([])); };
  const hits = useMemo(() => (list ? searchProducts(list, q) : []), [list, q]);
  const go = (e) => { e.preventDefault(); setOpen(false); router.push(q.trim() ? `/products?q=${encodeURIComponent(q.trim())}` : '/products'); };

  return (
    <div ref={box} className={`relative ${className}`}>
      <form onSubmit={go} role="search" className="flex">
        <label htmlFor={id} className="sr-only">Search products</label>
        <input id={id} value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => { load(); setOpen(true); }} type="search" autoComplete="off" placeholder="Search for products, brands and more"
          className="min-w-0 flex-1 rounded-l-full border-0 bg-white px-4 py-2.5 text-sm text-cream placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-saffron" />
        <button type="submit" aria-label="Search" className="rounded-r-full bg-saffron px-4 text-[#2B1B00] hover:brightness-95"><Search size={19} /></button>
      </form>
      {open && (
        <div className="absolute inset-x-0 top-full z-50 mt-1.5 overflow-hidden rounded-2xl border border-line bg-white text-cream shadow-2xl">
          {q.trim().length < 2 ? (
            <div className="p-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-faint">Popular categories</p>
              <div className="flex flex-wrap gap-2">
                {categories.slice(0, 8).map((c) => <Link key={c.slug} href={`/category/${c.slug}`} onClick={() => setOpen(false)} className="rounded-full bg-raised px-3 py-1.5 text-sm font-semibold text-dim hover:text-gold">{c.name}</Link>)}
                <Link href="/products" onClick={() => setOpen(false)} className="rounded-full bg-gold px-3 py-1.5 text-sm font-semibold text-white">All products</Link>
              </div>
            </div>
          ) : !list ? <p className="p-3 text-sm text-dim">Searching...</p> : hits.length === 0 ? (
            <p className="p-3 text-sm text-dim">No match for &quot;{q}&quot;. Try another word, or <Link href="/products" className="font-bold text-gold" onClick={() => setOpen(false)}>browse all products</Link>.</p>
          ) : (
            <ul>
              {hits.map((p) => (
                <li key={p.id}><Link href={`/product/${p.slug}`} onClick={() => setOpen(false)} className="flex items-center gap-3 px-3 py-2 hover:bg-raised">
                  <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-raised">{p.image && <Image src={p.image} alt="" fill sizes="44px" className="object-cover" />}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{p.name}</span><span className="text-xs text-faint">{p.category}</span></span>
                  <span className="text-sm font-bold text-gold">{formatPKR(p.price)}</span>
                </Link></li>
              ))}
              <li><button type="button" onClick={go} className="w-full border-t border-line px-3 py-2.5 text-left text-sm font-bold text-gold hover:bg-raised">See all results for &quot;{q}&quot;</button></li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
