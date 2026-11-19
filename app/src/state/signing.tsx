// The signing key on this device: saved only locked (password → PBKDF2 → AES-GCM), unlocked only in memory, and
// locked again after 10 minutes in the background. Everything that makes a key goes through here; nothing else
// ever sees the private key, and it never goes near the network (only finished keys do).
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { addMonths, backupCodeOf, boxOfBackupCode, importPrivateKey, importPublicKey, makeLicense, openText, sealText, storeToday, type LicensePayload, type LockedBox, type Plan, type ProductCode, requestPeriod } from '../lib/license/core';
import { KEYS, store, type IssuedKey } from '../lib/storage';

export type PaymentDetails = { pay: string; msgr: string; tel: string };

export type MakeArgs = { product: ProductCode; installationId: string; customer: string; lastDay: string; plan: Plan | null };

type Signing = {
  /** A locked key is saved on this device (or for this visit, when the browser can't save). */
  hasKey: boolean;
  unlocked: boolean;
  /** The browser can't do the crypto (very old browsers). */
  unsupported: boolean;
  backupCode: string | null;
  saveFromBackupCode: (code: string, password: string) => Promise<string | null>;
  saveFromKeyFile: (pem: string, password: string, again: string) => Promise<string | null>;
  unlock: (password: string) => Promise<void>;
  lock: () => void;
  forget: () => void;
  payment: PaymentDetails;
  setPayment: (p: PaymentDetails) => void;
  issued: IssuedKey[];
  removeIssued: (item: IssuedKey) => void;
  /** Makes a key with the payment details, records it under "Made on this device". */
  make: (args: MakeArgs) => Promise<{ license: string; payload: LicensePayload; lastDay: string }>;
  /** The key a client asked for through Control: a renewal starts the day after the current key ends, else today. */
  makeForRequest: (args: { product: ProductCode; installationId: string; customer: string; plan: Plan; currentExpiresAt: string | null }) => Promise<string>;
};

/** Whether the key is unlocked right now, for code outside React (main.tsx: no reload into a new version then). */
export const unlockedNow = { current: false };

const Ctx = createContext<Signing | null>(null);
export const useSigning = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error('useSigning outside SigningProvider');
  return s;
};

/** The key must be the one the apps check against: make and check a throwaway license with it. */
const checkKey = (key: CryptoKey, publicKey: CryptoKey) =>
  makeLicense(key, publicKey, { product: 'POS', installationId: 'TEST-TEST-TEST-TEST', customer: 'Setup check', lastDay: addMonths(storeToday(), 1) });

export const SigningProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [publicKey, setPublicKey] = useState<CryptoKey | null>(null);
  const [unsupported, setUnsupported] = useState(false);
  const [box, setBox] = useState<LockedBox | null>(() => store.get<LockedBox>(KEYS.lockedKey));
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null);
  const [issued, setIssued] = useState<IssuedKey[]>(() => store.get<IssuedKey[]>(KEYS.issued) ?? []);
  const [payment, setPaymentState] = useState<PaymentDetails>(() => {
    const contact = store.get<{ msgr?: string; tel?: string }>(KEYS.contact) ?? {};
    return { pay: store.get<string>(KEYS.pay) ?? '', msgr: contact.msgr ?? '', tel: contact.tel ?? '' };
  });

  useEffect(() => {
    unlockedNow.current = !!privateKey;
  }, [privateKey]);

  useEffect(() => {
    importPublicKey().then(setPublicKey, () => setUnsupported(true));
  }, []);

  // Locks again after 10 minutes in the background.
  useEffect(() => {
    let hiddenAt = 0;
    const onVisibility = () => {
      if (document.hidden) hiddenAt = Date.now();
      else if (Date.now() - hiddenAt > 10 * 60e3) setPrivateKey(null);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  /** Saves the locked key; returns a warning when the browser won't keep it (private window). */
  const keep = useCallback((b: LockedBox): string | null => {
    setBox(b);
    const kept = store.set(KEYS.lockedKey, b);
    try {
      void navigator.storage?.persist?.();
    } catch {
      /* best effort */
    }
    return kept ? null : "This browser won't save it (private window?). It works until you close the app.";
  }, []);

  const value = useMemo<Signing>(() => {
    const needPublic = () => {
      if (!publicKey) throw new Error("This browser can't make licenses. Use Safari on iPhone or Chrome on Android.");
      return publicKey;
    };
    const record = (item: IssuedKey) => {
      const list = [item, ...(store.get<IssuedKey[]>(KEYS.issued) ?? [])].slice(0, 500);
      store.set(KEYS.issued, list);
      setIssued(list);
    };
    const make: Signing['make'] = async ({ product, installationId, customer, lastDay, plan }) => {
      if (!privateKey) throw new Error('Unlock the signing key first.');
      const { license, payload } = await makeLicense(privateKey, needPublic(), {
        product, installationId, customer, lastDay, plan, pay: payment.pay, messenger: payment.msgr, mobile: payment.tel,
      });
      record({ product, plan: payload.plan ?? null, customer: payload.cust, iid: payload.iid, lastDay, lid: payload.lid, license, at: payload.iat });
      return { license, payload, lastDay };
    };
    return {
      hasKey: !!box,
      unlocked: !!privateKey,
      unsupported,
      // The backup code is the saved box itself (still locked with the password), shown only while unlocked.
      backupCode: box && privateKey ? backupCodeOf(box) : null,
      async saveFromBackupCode(code, password) {
        const b = boxOfBackupCode(code);
        const key = await importPrivateKey(await openText(b, password));
        await checkKey(key, needPublic());
        setPrivateKey(key);
        return keep(b);
      },
      async saveFromKeyFile(pem, password, again) {
        if (password.length < 10) throw new Error('Choose a password of at least 10 characters.');
        if (password !== again) throw new Error('The two passwords are different. Type them again.');
        const key = await importPrivateKey(pem.trim());
        await checkKey(key, needPublic());
        const warning = keep(await sealText(pem.trim(), password));
        setPrivateKey(key);
        return warning;
      },
      async unlock(password) {
        if (!box) throw new Error('Set up the signing key first.');
        setPrivateKey(await importPrivateKey(await openText(box, password)));
      },
      lock: () => setPrivateKey(null),
      forget() {
        store.del(KEYS.lockedKey);
        setBox(null);
        setPrivateKey(null);
      },
      payment,
      setPayment(p) {
        setPaymentState(p);
        store.set(KEYS.pay, p.pay);
        store.set(KEYS.contact, { msgr: p.msgr, tel: p.tel });
      },
      issued,
      removeIssued(item) {
        const list = (store.get<IssuedKey[]>(KEYS.issued) ?? []).filter((x) => !(x.lid === item.lid && x.license === item.license));
        store.set(KEYS.issued, list);
        setIssued(list);
      },
      make,
      async makeForRequest({ product, installationId, customer, plan, currentExpiresAt }) {
        const { lastDay } = requestPeriod(plan, currentExpiresAt);
        return (await make({ product, installationId, customer, lastDay, plan })).license;
      },
    };
  }, [box, privateKey, publicKey, unsupported, payment, issued, keep]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

