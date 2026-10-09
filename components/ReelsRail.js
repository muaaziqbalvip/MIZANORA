'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown, ChevronUp, ExternalLink, Play, Share2, ShoppingBag, X } from 'lucide-react';
import { parseVideo } from '@/lib/video';
import { formatPKR } from '@/lib/format';

function Viewer({ reels, start, onClose }) {
  const [i, setI] = useState(start);
  const r = reels[i];
  const v = parseVideo(r.url);
  const y0 = useRef(null);

  const go = useCallback((d) => setI((c) => Math.min(reels.length - 1, Math.max(0, c + d))), [reels.length]);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const key = (e) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowDown') go(1); if (e.key === 'ArrowUp') go(-1); };
    window.addEventListener('keydown', key);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', key); };
  }, [go, onClose]);

  const share = async () => {
    const url = `${window.location.origin}${r.href}`;
    try { if (navigator.share) { await navigator.share({ title: r.title, url }); return; } } catch (_) { return; }
    try { await navigator.clipboard.writeText(url); } catch (_) {}
  };
  const swipe = { onTouchStart: (e) => { y0.current = e.touches[0].clientY; }, onTouchEnd: (e) => { if (y0.current === null) return; const dy = e.changedTouches[0].clientY - y0.current; y0.current = null; if (Math.abs(dy) > 50) go(dy < 0 ? 1 : -1); } };

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-black text-white" role="dialog" aria-modal="true" aria-label="Reels">
      <div className="flex items-center justify-between px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button type="button" onClick={onClose} aria-label="Close reels" className="grid h-10 w-10 place-items-center rounded-full bg-white/15"><X size={22} /></button>
        <span className="text-sm font-semibold">{i + 1} / {reels.length}</span>
        <button type="button" onClick={share} aria-label="Share" className="grid h-10 w-10 place-items-center rounded-full bg-white/15"><Share2 size={20} /></button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2">
        <div className={`relative overflow-hidden rounded-2xl bg-black ${v.vertical ? 'h-full max-h-full aspect-[9/16]' : 'w-full max-w-3xl aspect-video'}`} style={v.vertical ? { maxWidth: '100%' } : undefined}>
          {v.type === 'file'
            ? <video key={r.id} src={v.src} autoPlay controls loop playsInline className="h-full w-full bg-black object-contain" />
            : <iframe key={r.id} src={v.src} title={r.title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen className="h-full w-full border-0" />}
        </div>
        {/* Swipe strip on the left edge (touches on the video itself belong to the video player) */}
        <div className="absolute inset-y-0 left-0 w-9" {...swipe} aria-hidden="true" />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 flex-col gap-3">
          <button type="button" onClick={() => go(-1)} disabled={i === 0} aria-label="Previous reel" className="grid h-11 w-11 place-items-center rounded-full bg-white/20 backdrop-blur disabled:opacity-30"><ChevronUp size={24} /></button>
          <button type="button" onClick={() => go(1)} disabled={i === reels.length - 1} aria-label="Next reel" className="grid h-11 w-11 place-items-center rounded-full bg-white/20 backdrop-blur disabled:opacity-30"><ChevronDown size={24} /></button>
        </div>
      </div>

      <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3" {...swipe}>
        <p className="line-clamp-2 text-base font-bold">{r.title}</p>
        <div className="mt-2 flex items-center gap-3">
          {r.price > 0 && <span className="text-xl font-extrabold text-saffron">{formatPKR(r.price)}</span>}
          <Link href={r.href} onClick={onClose} className="btn-sun ml-auto !py-3"><ShoppingBag size={18} /> Shop now</Link>
          <a href={r.url} target="_blank" rel="noopener noreferrer" aria-label="Open the original video" className="grid h-11 w-11 place-items-center rounded-full bg-white/15"><ExternalLink size={18} /></a>
        </div>
      </div>
    </div>
  );
}

// A row of vertical video cards. Tap one to watch full screen and shop from it.
export default function ReelsRail({ reels, grid = false }) {
  const [open, setOpen] = useState(-1);
  const usable = reels.filter((r) => parseVideo(r.url));
  if (!usable.length) return null;
  return (
    <>
      <div className={grid ? 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5' : 'no-sb flex snap-x gap-3 overflow-x-auto pb-2'}>
        {usable.map((r, n) => {
          const v = parseVideo(r.url);
          const thumb = v.thumb || r.image;
          return (
            <button key={r.id} type="button" onClick={() => setOpen(n)} aria-label={`Watch reel: ${r.title}`}
              className={`group relative aspect-[9/15] snap-start overflow-hidden rounded-2xl bg-gradient-to-br from-gold to-[#073D28] text-left text-white shadow-md ${grid ? 'w-full' : 'w-40 shrink-0 sm:w-48'}`}>
              {thumb && <Image src={thumb} alt="" fill sizes="192px" className="object-cover transition group-hover:scale-105" />}
              <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/25" />
              <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[0.65rem] font-bold">{v.label}</span>
              <span className="absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-gold"><Play size={22} fill="currentColor" /></span>
              <span className="absolute inset-x-2 bottom-2">
                <span className="line-clamp-2 block text-sm font-bold leading-tight">{r.title}</span>
                <span className="mt-1.5 flex items-center justify-between gap-1">
                  {r.price > 0 ? <span className="text-sm font-extrabold text-saffron">{formatPKR(r.price)}</span> : <span />}
                  <span className="rounded-full bg-saffron px-2.5 py-1 text-[0.7rem] font-extrabold text-[#2B1B00]">Shop now</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {open >= 0 && <Viewer reels={usable} start={open} onClose={() => setOpen(-1)} />}
    </>
  );
}
