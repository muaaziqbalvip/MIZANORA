'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, ShoppingBag, X } from 'lucide-react';
import { useCart } from './CartProvider';
import InstallButton from './InstallButton';

const NAV = [['/products', 'Products'], ['/how-to-order', 'How to order'], ['/blog', 'Blog'], ['/about', 'About'], ['/contact', 'Contact']];

export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { count } = useCart();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2.5 font-display text-2xl font-bold tracking-[0.14em]" onClick={() => setOpen(false)}>
          <Image src="/icons/icon-192.png" alt="" width={34} height={34} className="rounded-md" priority />
          MIZANORA
        </Link>
        <nav className="hidden items-center gap-6 md:flex" aria-label="Main">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className={`text-sm font-medium hover:text-gold ${pathname.startsWith(href) ? 'text-gold' : 'text-dim'}`}>{label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <div className="hidden lg:block"><InstallButton className="!px-4 !py-2 text-sm" /></div>
          <Link href="/cart" aria-label={`Cart, ${count} items`} className="relative rounded-full p-2.5 text-cream hover:text-gold">
            <ShoppingBag size={24} />
            {count > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1 text-xs font-bold text-ink">{count}</span>}
          </Link>
          <button className="rounded-full p-2.5 md:hidden" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-line bg-surface px-4 pb-4 md:hidden" aria-label="Mobile">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} onClick={() => setOpen(false)} className="block border-b border-line py-3.5 text-base text-cream">{label}</Link>
          ))}
          <div className="pt-4"><InstallButton full /></div>
        </nav>
      )}
    </header>
  );
}
