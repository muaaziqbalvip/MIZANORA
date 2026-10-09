'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Menu, Search, ShoppingBag, X } from 'lucide-react';
import { useCart } from './CartProvider';
import InstallButton from './InstallButton';

// Marketplace-style header: logo + big search + cart on top, scrollable category strip below.
export default function Header({ categories = [] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const router = useRouter();
  const { count } = useCart();

  const submit = (e) => {
    e.preventDefault();
    setOpen(false);
    router.push(q.trim() ? `/products?q=${encodeURIComponent(q.trim())}` : '/products');
  };

  const searchForm = (cls = '') => (
    <form onSubmit={submit} role="search" className={`flex ${cls}`}>
      <label htmlFor={`s-${cls ? 'm' : 'd'}`} className="sr-only">Search products</label>
      <input id={`s-${cls ? 'm' : 'd'}`} value={q} onChange={(e) => setQ(e.target.value)} type="search" placeholder="Search products, e.g. boots"
        className="min-w-0 flex-1 rounded-l-full border border-r-0 border-line bg-raised px-4 py-2.5 text-sm text-cream placeholder:text-faint focus:border-gold focus:outline-none" />
      <button type="submit" aria-label="Search" className="rounded-r-full bg-gold px-4 text-ink hover:bg-goldhi"><Search size={19} /></button>
    </form>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-3 sm:px-4">
        <button className="rounded-full p-2 md:hidden" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
        <Link href="/" className="flex shrink-0 items-center gap-2 font-display text-xl font-bold tracking-[0.12em] sm:text-2xl" onClick={() => setOpen(false)}>
          <Image src="/icons/icon-192.png" alt="" width={34} height={34} className="rounded-md" priority />
          <span className="hidden min-[380px]:inline">MIZANORA</span>
        </Link>
        {searchForm('hidden flex-1 md:flex md:max-w-2xl md:mx-auto')}
        <div className="ml-auto flex items-center gap-1">
          <div className="hidden xl:block"><InstallButton className="!px-4 !py-2 text-sm" /></div>
          <Link href="/cart" aria-label={`Cart, ${count} items`} className="relative rounded-full p-2.5 text-cream hover:text-gold">
            <ShoppingBag size={25} />
            {count > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1 text-xs font-bold text-ink">{count}</span>}
          </Link>
        </div>
      </div>

      <div className="px-3 pb-2.5 md:hidden">{searchForm()}</div>

      <nav aria-label="Categories" className="hidden border-t border-line md:block">
        <ul className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 text-sm">
          <li><Link href="/products" className="block whitespace-nowrap px-3 py-2.5 font-semibold text-cream hover:text-gold">All products</Link></li>
          {categories.slice(0, 10).map((c) => (
            <li key={c.slug}><Link href={`/category/${c.slug}`} className="block whitespace-nowrap px-3 py-2.5 text-dim hover:text-gold">{c.name}</Link></li>
          ))}
          <li className="ml-auto"><Link href="/blog" className="block whitespace-nowrap px-3 py-2.5 text-dim hover:text-gold">Blog</Link></li>
          <li><Link href="/how-to-order" className="block whitespace-nowrap px-3 py-2.5 text-dim hover:text-gold">How to order</Link></li>
          <li><Link href="/contact" className="block whitespace-nowrap px-3 py-2.5 text-dim hover:text-gold">Support</Link></li>
        </ul>
      </nav>

      {open && (
        <nav className="max-h-[70vh] overflow-y-auto border-t border-line bg-surface px-4 pb-4 md:hidden" aria-label="Mobile">
          {[['/products', 'All products'], ...categories.map((c) => [`/category/${c.slug}`, c.name]), ['/how-to-order', 'How to order'], ['/blog', 'Blog'], ['/about', 'About'], ['/contact', 'Support']].map(([href, label]) => (
            <Link key={href} href={href} onClick={() => setOpen(false)} className="block border-b border-line py-3.5 text-base text-cream">{label}</Link>
          ))}
          <div className="pt-4"><InstallButton full /></div>
        </nav>
      )}
    </header>
  );
}
