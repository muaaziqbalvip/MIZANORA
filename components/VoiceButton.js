'use client';
import { useEffect, useRef, useState } from 'react';
import { Mic } from 'lucide-react';

// Voice search (Chrome and most Android phones). Speak in Urdu or English: "kala joota 3000 se kam".
export default function VoiceButton({ onText, className = '' }) {
  const [ok, setOk] = useState(false);
  const [on, setOn] = useState(false);
  const rec = useRef(null);
  const tried = useRef(false);
  useEffect(() => { setOk(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)); }, []);
  if (!ok) return null;

  const start = (lang) => {
    const R = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new R();
    rec.current = r;
    r.lang = lang; r.interimResults = false; r.maxAlternatives = 1;
    r.onstart = () => setOn(true);
    r.onend = () => setOn(false);
    r.onresult = (e) => { const t = e.results[0] && e.results[0][0] && e.results[0][0].transcript; if (t) onText(t); };
    r.onerror = (e) => { setOn(false); if (e.error === 'language-not-supported' && !tried.current) { tried.current = true; start('en-US'); } };
    try { r.start(); } catch (_) { setOn(false); }
  };
  const toggle = () => { if (on && rec.current) { rec.current.stop(); return; } tried.current = false; start('ur-PK'); };

  return (
    <button type="button" onClick={toggle} aria-pressed={on} aria-label={on ? 'Listening... tap to stop' : 'Search by voice'}
      className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-full ${on ? 'bg-red-600 text-white' : 'text-faint hover:text-gold'} ${className}`}>
      {on && <span className="absolute inset-0 animate-ping rounded-full bg-red-500/40" aria-hidden="true" />}
      <Mic size={19} className="relative" />
    </button>
  );
}
