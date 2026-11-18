// What Control knows (apps, installations, license requests) and the owner's session. Without a Control address
// for this host (control.config.json) the app still makes keys; Control's parts just say they aren't set up.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, CONTROL_URL, currentSession, onSignedOut, session } from '../lib/control/api';
import type { Inquiry, Installation, LicenseRequest, Product } from '../lib/control/types';

export type ControlState = {
  /** A Control address is set for this host. */
  available: boolean;
  signedIn: boolean;
  /** Whether Control has an owner passkey yet (null until known): no → set up with the setup code. */
  hasPasskey: boolean | null;
  products: Product[];
  installations: Installation[];
  requests: LicenseRequest[];
  /** Inquiries from the public store. */
  inquiries: Inquiry[];
  /** Waiting for the owner: license requests pending + new inquiries (the Inbox count). */
  inboxCount: number;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  /** After a passkey sign-in or setup stored a session. */
  signedInNow: () => void;
  signOut: () => Promise<void>;
};

/** The apps that sign keys here, for when Control isn't connected (or not signed in): the same ids as Control's. */
const builtIn = (id: string, name: string, licensePrefix: string, icon: string, color: string, tagline: string, sort: number): Product => ({
  id, name, licensePrefix, icon, color, tagline, sort,
  imageRepo: null, description: null, priceMonthly: null, priceYearly: null, features: [], published: false,
});
export const BUILT_IN_PRODUCTS: Product[] = [
  builtIn('pos', 'POS', 'POS1', '🧾', '#2563eb', 'Point of sale for shops', 1),
  builtIn('spx', 'SPX Hub', 'SPX1', '🛵', '#ee4d2d', 'Records for SPX delivery hubs', 2),
];

const Ctx = createContext<ControlState | null>(null);
export const useControl = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useControl outside ControlProvider');
  return c;
};

export const ControlProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [signedIn, setSignedIn] = useState(() => !!currentSession());
  const [hasPasskey, setHasPasskey] = useState<boolean | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [requests, setRequests] = useState<LicenseRequest[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!CONTROL_URL) return;
    if (!currentSession()) {
      try {
        setHasPasskey((await api<{ hasPasskey: boolean }>('GET', '/owner/auth/status')).hasPasskey);
        setError(null);
      } catch (e) {
        setError((e as Error).message);
      }
      return;
    }
    setLoading(true);
    try {
      const [p, i, r, q] = await Promise.all([
        api<Product[]>('GET', '/owner/products'),
        api<Installation[]>('GET', '/owner/installations'),
        api<LicenseRequest[]>('GET', '/owner/license-requests'),
        api<Inquiry[]>('GET', '/owner/inquiries'),
      ]);
      setProducts(p);
      setInstallations(i);
      setRequests(r);
      setInquiries(q);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload, signedIn]);

  // Session ended (Control said 401): back to signed out.
  useEffect(() => onSignedOut(() => setSignedIn(false)), []);

  // Back on the app (from a notification, or another app): show what changed.
  useEffect(() => {
    const onVisibility = () => {
      if (!document.hidden) void reload();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [reload]);

  const value = useMemo<ControlState>(
    () => ({
      available: !!CONTROL_URL,
      signedIn,
      hasPasskey,
      products: signedIn && products.length ? products : BUILT_IN_PRODUCTS,
      installations: signedIn ? installations : [],
      requests: signedIn ? requests : [],
      inquiries: signedIn ? inquiries : [],
      inboxCount: signedIn ? requests.filter((x) => x.status === 'pending').length + inquiries.filter((x) => x.status === 'new').length : 0,
      loading,
      error,
      reload,
      signedInNow: () => setSignedIn(true),
      async signOut() {
        try {
          await api('POST', '/owner/auth/logout');
        } catch {
          /* signed out here anyway */
        }
        session.clear();
        setSignedIn(false);
      },
    }),
    [signedIn, hasPasskey, products, installations, requests, inquiries, loading, error, reload],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};
