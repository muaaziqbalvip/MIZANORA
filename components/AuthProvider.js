'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { authClient, firebaseConfigured } from '@/lib/firebase-client';

// user === undefined while checking, null when signed out.
const Ctx = createContext({ user: null, ready: true });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);
  useEffect(() => {
    if (!firebaseConfigured) { setUser(null); return undefined; }
    return onAuthStateChanged(authClient(), (u) => setUser(u || null));
  }, []);
  return <Ctx.Provider value={{ user: user || null, ready: user !== undefined }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
