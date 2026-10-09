'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { LogOut } from 'lucide-react';
import { authClient, firebaseConfigured } from '@/lib/firebase-client';
import { SITE } from '@/lib/config';

// Login wall for /admin. The REAL protection is in firestore.rules (only the admin UID can read orders).
export default function AdminGate({ children }) {
  const [user, setUser] = useState(undefined); // undefined = still checking
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!firebaseConfigured) { setUser(null); return undefined; }
    return onAuthStateChanged(authClient(), (u) => setUser(u || null));
  }, []);

  async function login(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    try { await signInWithEmailAndPassword(authClient(), email.trim(), pw); }
    catch { setErr('Wrong email or password.'); }
    setBusy(false);
  }

  if (!firebaseConfigured) {
    return <div className="mx-auto max-w-lg p-8"><p className="card text-dim">Firebase is not configured yet. Add the NEXT_PUBLIC_FIREBASE_* variables in Vercel and redeploy.</p></div>;
  }
  if (user === undefined) return <p className="p-8 text-dim">Loading...</p>;

  const allowed = user && (!SITE.adminEmail || (user.email || '').toLowerCase() === SITE.adminEmail);
  if (!user || !allowed) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16">
        <h1 className="mb-6 text-center text-4xl font-bold">Admin login</h1>
        {user && !allowed && <p className="mb-3 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">This account is not the store admin.</p>}
        <form onSubmit={login} className="card space-y-4">
          <div><label htmlFor="em" className="label">Email</label><input id="em" type="email" autoComplete="username" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div><label htmlFor="pw" className="label">Password</label><input id="pw" type="password" autoComplete="current-password" className="input" value={pw} onChange={(e) => setPw(e.target.value)} required /></div>
          {err && <p role="alert" className="field-err">{err}</p>}
          <button className="btn-gold w-full" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
          {user && !allowed && <button type="button" className="btn-ghost w-full" onClick={() => signOut(authClient())}>Sign out</button>}
        </form>
      </div>
    );
  }

  const tab = (href, label) => (
    <Link href={href} className={`rounded-full px-4 py-2 text-sm font-semibold ${pathname.startsWith(href) ? 'bg-gold text-ink' : 'bg-raised text-dim'}`}>{label}</Link>
  );
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">{tab('/admin/orders', 'Orders')}{tab('/admin/products', 'Products')}</div>
        <button onClick={() => signOut(authClient())} className="flex items-center gap-2 text-sm text-dim hover:text-gold"><LogOut size={16} /> Sign out</button>
      </div>
      {children}
    </div>
  );
}
