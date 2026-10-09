'use client';
import { useState } from 'react';
import Image from 'next/image';

export default function Gallery({ images, name }) {
  const [i, setI] = useState(0);
  if (!images.length) return <div className="grid aspect-square place-items-center rounded-2xl bg-raised font-display text-5xl text-bronze">M</div>;
  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-line bg-raised">
        <Image src={images[i]} alt={`${name} - photo ${i + 1}`} fill priority={i === 0} sizes="(max-width:1024px) 100vw, 50vw" className="object-cover" />
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
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
