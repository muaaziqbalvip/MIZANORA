'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

// Swipeable banner slider (CSS scroll-snap, no library). Auto-advances; stops when the visitor touches it.
export default function BannerCarousel({ banners }) {
  const ref = useRef(null);
  const [i, setI] = useState(0);
  const paused = useRef(false);

  const go = useCallback((n) => {
    const el = ref.current;
    if (!el) return;
    const next = (n + banners.length) % banners.length;
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
    setI(next);
  }, [banners.length]);

  useEffect(() => {
    if (banners.length < 2) return undefined;
    const t = setInterval(() => { if (!paused.current) go(i + 1); }, 5000);
    return () => clearInterval(t);
  }, [i, go, banners.length]);

  const onScroll = () => {
    const el = ref.current;
    if (el) setI(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <section aria-roledescription="carousel" aria-label="Offers" className="relative">
      <div ref={ref} onScroll={onScroll} onTouchStart={() => { paused.current = true; }} onMouseEnter={() => { paused.current = true; }} onMouseLeave={() => { paused.current = false; }}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth rounded-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {banners.map((b, n) => (
          <Link key={b.id} href={b.link} className="relative block aspect-[16/8] w-full shrink-0 snap-center bg-raised sm:aspect-[16/6]" aria-label={b.title || 'Offer'}>
            <Image src={b.image} alt={b.title || 'Mizanora offer'} fill priority={n === 0} sizes="(max-width:1280px) 100vw, 1280px" className="object-cover" />
            {(b.title || b.subtitle) && (
              <span className="absolute inset-0 flex flex-col justify-center bg-gradient-to-r from-black/70 via-black/30 to-transparent p-5 sm:p-10">
                {b.title && <span className="max-w-md font-display text-2xl font-bold leading-tight sm:text-5xl">{b.title}</span>}
                {b.subtitle && <span className="mt-1 max-w-md text-sm text-dim sm:text-lg">{b.subtitle}</span>}
                <span className="mt-3 w-fit rounded-full bg-gold px-5 py-2 text-sm font-semibold text-ink">{b.cta}</span>
              </span>
            )}
          </Link>
        ))}
      </div>
      {banners.length > 1 && (
        <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
          {banners.map((b, n) => (
            <button key={b.id} aria-label={`Show offer ${n + 1}`} onClick={() => go(n)} className={`h-2 rounded-full transition-all ${n === i ? 'w-6 bg-gold' : 'w-2 bg-white/50'}`} />
          ))}
        </div>
      )}
    </section>
  );
}
