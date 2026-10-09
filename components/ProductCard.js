import Link from 'next/link';
import Image from 'next/image';
import { formatPKR, discountPct } from '@/lib/format';

export default function ProductCard({ p, priority = false }) {
  const off = discountPct(p.price, p.comparePrice);
  return (
    <article className="group overflow-hidden rounded-2xl border border-line bg-surface transition hover:border-bronze">
      <Link href={`/product/${p.slug}`} className="block">
        <div className="relative aspect-square bg-raised">
          {p.images[0] ? (
            <Image src={p.images[0]} alt={p.name} fill priority={priority} sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw" className="object-cover transition duration-300 group-hover:scale-105" />
          ) : (
            <div className="grid h-full place-items-center font-display text-3xl text-bronze">M</div>
          )}
          {off > 0 && <span className="absolute left-2 top-2 rounded-full bg-gold px-2.5 py-1 text-xs font-bold text-ink">-{off}%</span>}
          {!p.inStock && <span className="absolute right-2 top-2 rounded-full bg-black/80 px-2.5 py-1 text-xs font-semibold text-cream">Sold out</span>}
        </div>
        <div className="p-3.5">
          <h3 className="line-clamp-2 min-h-[2.6rem] font-sans text-[0.95rem] font-medium leading-snug text-cream">{p.name}</h3>
          <p className="mt-2 flex items-baseline gap-2">
            <span className="text-lg font-bold text-gold">{formatPKR(p.price)}</span>
            {p.comparePrice > p.price && <span className="text-sm text-faint line-through">{formatPKR(p.comparePrice)}</span>}
          </p>
        </div>
      </Link>
    </article>
  );
}
