import Link from 'next/link';
import Image from 'next/image';
import { formatPKR, discountPct } from '@/lib/format';
import QuickAdd from './QuickAdd';

export default function ProductCard({ p, priority = false }) {
  const off = discountPct(p.price, p.comparePrice);
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-line bg-surface transition hover:border-bronze hover:shadow-lg">
      <Link href={`/product/${p.slug}`} className="block flex-1">
        <div className="relative aspect-square bg-raised">
          {p.images[0] ? (
            <Image src={p.images[0]} alt={p.name} fill priority={priority} sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 20vw" className="object-cover transition duration-300 group-hover:scale-105" />
          ) : (
            <div className="grid h-full place-items-center font-display text-3xl text-bronze">M</div>
          )}
          {off > 0 && <span className="absolute left-2 top-2 rounded-md bg-red-600 px-2 py-0.5 text-xs font-bold text-white">-{off}%</span>}
        </div>
        <div className="p-3">
          <h3 className="line-clamp-2 min-h-[2.5rem] font-sans text-sm font-medium leading-snug text-cream">{p.name}</h3>
          <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
            <span className="text-base font-bold text-gold sm:text-lg">{formatPKR(p.price)}</span>
            {p.comparePrice > p.price && <span className="text-xs text-faint line-through">{formatPKR(p.comparePrice)}</span>}
          </p>
          <p className="mt-1 text-[0.7rem] font-medium text-dim">Cash on delivery</p>
        </div>
      </Link>
      <div className="px-3 pb-3"><QuickAdd p={p} /></div>
    </article>
  );
}
