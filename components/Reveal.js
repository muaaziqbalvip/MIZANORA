'use client';
import { useEffect, useRef, useState } from 'react';

// Sections glide in as you scroll to them. Content is always in the page for Google; only the animation is added after load.
export default function Reveal({ children, className = '' }) {
  const ref = useRef(null);
  const [state, setState] = useState('show'); // show | hide
  useEffect(() => {
    const el = ref.current;
    if (!el || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) || !('IntersectionObserver' in window)) return undefined;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return undefined;
    setState('hide');
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setState('show'); io.disconnect(); } }, { rootMargin: '0px 0px -8% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className={`transition-all duration-700 ease-out ${state === 'hide' ? 'translate-y-6 opacity-0' : 'translate-y-0 opacity-100'} ${className}`}>{children}</div>;
}
