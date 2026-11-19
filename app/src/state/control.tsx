// What Control knows (apps, installations, license requests) and the owner's session. Without a Control address
// for this host (control.config.json) the app still makes keys; Control's parts just say they aren't set up.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, CONTROL_URL, currentSession, onSignedOut, session } from '../lib/control/api';
import type { Client, Inquiry, Installation, LicenseRequest, Product } from '../lib/control/types';

export type ControlState = {
  /** A Control address is set for this host. */
  available: boolean;
  signedIn: boolean;
  /** Whether Control has an owner passkey yet (null until known): no → set up with the setup code. */
  hasPasskey: boolean | null;
  /** Whether a password sign-in is set up (the fallback to passkeys). */
  hasPassword: boolean;
  /** Signed in with a seeded password that must be changed before anything else. */
  mustChangePassword: boolean;
  products: Product[];
  installations: Installation[];
  requests: LicenseRequest[];
  /** Inquiries from the public store. */
  inquiries: Inquiry[];
  /** Client accounts (C1), with their unread messages. */
  clients: Client[];
  /** Messages from clients the owner hasn't read yet. */
  unreadMessages: number;
  /** Waiting for the owner: license requests pending + new inquiries + unread messages (the Inbox count). */
  inboxCount: number;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  /** After a sign-in or setup stored a session (mustChange: a seeded password was used). */
  signedInNow: (mustChange?: boolean) => void;
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

/** This device is the owner's: it has signed in to Control as the owner at least once. Then the bare address opens
 *  the owner's home; on any other device it opens the store, or the client's own area (App.tsx). */
const OWNER_DEVICE_KEY = 'controlCenter.ownerDevice';
export const isOwnerDevice = () => {
  try {
    return localStorage.getItem(OWNER_DEVICE_KEY) === '1';
  } catch {
    return false;
  }
};
/** This browser tab came in through the owner's private address (#/owner or an add-device link): its owner pages stay
 *  open (to sign in and look around) until the tab is closed, even before this device is known as the owner's. */
const OWNER_TAB_KEY = 'controlCenter.ownerTab';
export const isOwnerTab = () => {
  try {
    return sessionStorage.getItem(OWNER_TAB_KEY) === '1';
  } catch {
    return false;
  }
};
export const markOwnerTab = () => {
  try {
    sessionStorage.setItem(OWNER_TAB_KEY, '1');
  } catch {
    /* this page only */
  }
};
const markOwnerDevice = () => {
  try {
    localStorage.setItem(OWNER_DEVICE_KEY, '1');
  } catch {
    /* this visit only */
  }
};

const Ctx = createContext<ControlState | null>(null);
export const useControl = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useControl outside ControlProvider');
  return c;
};

export const ControlProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [signedIn, setSignedIn] = useState(() => !!currentSession());
  const [hasPasskey, setHasPasskey] = useState<boolean | null>(null);
  const [hasPassword, setHasPassword] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [requests, setRequests] = useState<LicenseRequest[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!CONTROL_URL) return;
    if (!currentSession()) {
      try {
        const status = await api<{ hasPasskey: boolean; hasPassword?: boolean }>('GET', '/owner/auth/status');
        setHasPasskey(status.hasPasskey);
        setHasPassword(!!status.hasPassword);
        setError(null);
      } catch (e) {
        setError((e as Error).message);
      }
      return;
    }
    setLoading(true);
    try {
      // A seeded password must be changed first: until then Control answers nothing else.
      const me = await api<{ mustChangePassword?: boolean }>('GET', '/owner/me');
      setMustChangePassword(!!me.mustChangePassword);
      if (me.mustChangePassword) {
        setError(null);
        return;
      }
      const [p, i, r, q, cl] = await Promise.all([
        api<Product[]>('GET', '/owner/products'),
        api<Installation[]>('GET', '/owner/installations'),
        api<LicenseRequest[]>('GET', '/owner/license-requests'),
        api<Inquiry[]>('GET', '/owner/inquiries'),
        api<Client[]>('GET', '/owner/clients'),
      ]);
      setProducts(p);
      setInstallations(i);
      setRequests(r);
      setInquiries(q);
      setClients(cl);
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

  // Signed in as the owner: remember this device as the owner's.
  useEffect(() => {
    if (signedIn) markOwnerDevice();
  }, [signedIn]);

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
      hasPassword,
      mustChangePassword: signedIn && mustChangePassword,
      products: signedIn && products.length ? products : BUILT_IN_PRODUCTS,
      installations: signedIn ? installations : [],
      requests: signedIn ? requests : [],
      inquiries: signedIn ? inquiries : [],
      clients: signedIn ? clients : [],
      unreadMessages: signedIn ? clients.reduce((n, c) => n + c.unreadMessages, 0) : 0,
      inboxCount: signedIn
        ? requests.filter((x) => x.status === 'pending').length + inquiries.filter((x) => x.status === 'new').length + clients.reduce((n, c) => n + c.unreadMessages, 0)
        : 0,
      loading,
      error,
      reload,
      signedInNow: (mustChange = false) => {
        setMustChangePassword(mustChange);
        setSignedIn(true);
      },
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
    [signedIn, hasPasskey, hasPassword, mustChangePassword, products, installations, requests, inquiries, clients, loading, error, reload],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};
