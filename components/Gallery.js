'use client';
import { useState } from 'react';
import Image from 'next/image';

export default function Gallery({ images, name }) {
  const [i, setI] = useState(0);
  if (!images.length) return <div className="grid aspect-square place-items-center rounded-2xl bg-raised font-display text-5xl text-bronze">M</div>;
  const go = (d) => setI((c) => (c + d + images.length) % images.length);
  let x0 = null;
  return (
    <div className="min-w-0 max-w-full">
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-line bg-raised"
        onTouchStart={(e) => { x0 = e.touches[0].clientX; }}
        onTouchEnd={(e) => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 45 && images.length > 1) go(dx < 0 ? 1 : -1); }}>
        <Image src={images[i]} alt={`${name} - photo ${i + 1}`} fill priority={i === 0} sizes="(max-width:1024px) 100vw, 50vw" className="object-cover" />
        {images.length > 1 && <span className="absolute bottom-2 right-2 rounded-full bg-black/55 px-2.5 py-0.5 text-xs font-semibold text-white">{i + 1} / {images.length}</span>}
      </div>
      {images.length > 1 && (
        <div className="no-sb mt-3 flex w-full max-w-full gap-2 overflow-x-auto pb-1">
          {images.map((src, n) => (
            <button key={src + n} onClick={() => setI(n)} aria-label={`Show photo ${n + 1}`}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 ${n === i ? 'border-gold' : 'border-line'}`}>
              <Image src={src} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
