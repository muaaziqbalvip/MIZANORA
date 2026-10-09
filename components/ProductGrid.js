'use client';
import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import ProductCard from './ProductCard';

// Search + sort run in the browser, so /products stays a fast, fully static (SEO-friendly) page.
export default function ProductGrid({ products }) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('new');
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    let r = products.filter((p) => !t || `${p.name} ${p.category}`.toLowerCase().includes(t));
    if (sort === 'low') r = [...r].sort((a, b) => a.price - b.price);
    if (sort === 'high') r = [...r].sort((a, b) => b.price - a.price);
    return r;
  }, [products, q, sort]);

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Search products</span>
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" className="input !pl-10" type="search" />
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
      {list.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface p-8 text-center text-dim">No products found.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {list.map((p, i) => <ProductCard key={p.id} p={p} priority={i < 4} />)}
        </div>
      )}
    </div>
  );
}
