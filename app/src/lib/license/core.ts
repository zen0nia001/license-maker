// The license format and the locked key: a faithful port of License Maker's CORE (the same as
// tools/PosLicenseTool / SpxLicenseTool and LicenseFormat.cs in the POS and SPX). Keys made here and keys made by
// the old app, and the saved locked key, must stay interchangeable: app/scripts/check-core.mjs checks that against
// the old code. Pure functions (Web Crypto only), no DOM, so that check can run them in Node.

export const PUBLIC_KEY_SPKI =
  'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAELqb3YGIm+moD5Ib3Reswe0ZKfUHs8XLlvXuWakPR+nuuUexENTeDXlDqChjYuTcXLOLb66zLm9MEcNEd7braLA==';
export const PRODUCTS = { POS: 'POS1', SPX: 'SPX1' } as const;
export type ProductCode = keyof typeof PRODUCTS;
export type Plan = 'trial' | 'monthly' | 'yearly';

const UTF8 = new TextEncoder();
/** Asia/Manila: UTC+8 all year. */
export const STORE_OFFSET_HOURS = 8;
/** A free trial is this many days at most (the first day counts). */
export const TRIAL_DAYS = 3;
export const PBKDF2_ITERATIONS = 600000;

export const b64ToBytes = (b64: string): Uint8Array => {
  const s = atob(b64);
  const a = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i);
  return a;
};
export const bytesToB64 = (bytes: Uint8Array): string => {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
};
export const b64url = (bytes: Uint8Array): string => bytesToB64(bytes).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
export const fromB64url = (s: string): Uint8Array => {
  let t = s.replace(/-/g, '+').replace(/_/g, '/');
  while (t.length % 4) t += '=';
  return b64ToBytes(t);
};

const ECDSA = { name: 'ECDSA', namedCurve: 'P-256' } as const;
const SIGN = { name: 'ECDSA', hash: 'SHA-256' } as const;

function pemBody(pem: string): string | null {
  const m = /-----BEGIN PRIVATE KEY-----([\s\S]*?)-----END PRIVATE KEY-----/.exec(pem || '');
  return m ? m[1]!.replace(/\s+/g, '') : null;
}

export async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const body = pemBody(pem);
  if (!body) throw new Error('That is not a private key. Use the whole private-key.pem, including the BEGIN and END lines.');
  try {
    return await crypto.subtle.importKey('pkcs8', b64ToBytes(body), ECDSA, false, ['sign']);
  } catch {
    throw new Error('That key could not be read. Use the whole private-key.pem again.');
  }
}

export const importPublicKey = (spki: string = PUBLIC_KEY_SPKI) => crypto.subtle.importKey('spki', b64ToBytes(spki), ECDSA, false, ['verify']);

function signedBytes(prefix: string, body: Uint8Array): Uint8Array {
  const p = UTF8.encode(prefix + '.');
  const out = new Uint8Array(p.length + body.length);
  out.set(p);
  out.set(body, p.length);
  return out;
}

/** Valid THROUGH lastDay ('yyyy-mm-dd') in the store's time zone: it ends at the next local midnight. */
export function expiresAt(lastDay: string): Date {
  const [y, m, d] = lastDay.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + 1) - STORE_OFFSET_HOURS * 3600e3);
}
const isoUtc = (date: Date) => date.toISOString().replace(/\.\d{3}Z$/, '+00:00');
const newLicenseId = () => [...crypto.getRandomValues(new Uint8Array(6))].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
export const ID_PATTERN = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

export type LicensePayload = {
  v: number;
  lid: string;
  cust: string;
  iid: string;
  iat: string;
  exp: string;
  plan?: Plan;
  pay?: string;
  msgr?: string;
  tel?: string;
};

export type Verified = { ok: true; product: ProductCode; payload: LicensePayload } | { ok: false; error: string };

export async function verifyLicense(publicKey: CryptoKey, text: string): Promise<Verified> {
  const parts = (text || '').replace(/\s+/g, '').split('.');
  const product = (Object.keys(PRODUCTS) as ProductCode[]).find((k) => PRODUCTS[k] === parts[0]);
  if (parts.length !== 3 || !product) return { ok: false, error: 'This is not a POS or SPX license key.' };
  let body: Uint8Array, signature: Uint8Array;
  try {
    body = fromB64url(parts[1]!);
    signature = fromB64url(parts[2]!);
  } catch {
    return { ok: false, error: 'The key is damaged. Copy it again, all of it.' };
  }
  if (!(await crypto.subtle.verify(SIGN, publicKey, signature, signedBytes(parts[0]!, body))))
    return { ok: false, error: 'This key is not genuine, or it has been changed.' };
  try {
    return { ok: true, product, payload: JSON.parse(new TextDecoder().decode(body)) as LicensePayload };
  } catch {
    return { ok: false, error: 'The key is in a format this app does not know.' };
  }
}

export type MakeInput = {
  product: ProductCode;
  installationId: string;
  customer: string;
  lastDay: string;
  plan?: Plan | null;
  pay?: string;
  messenger?: string;
  mobile?: string;
  now?: Date;
};

export async function makeLicense(privateKey: CryptoKey, publicKey: CryptoKey, input: MakeInput): Promise<{ license: string; payload: LicensePayload }> {
  const { product, installationId, customer, lastDay, plan = null, pay = '', messenger = '', mobile = '', now = new Date() } = input;
  const prefix = PRODUCTS[product];
  const iid = installationId.trim().toUpperCase();
  if (!prefix) throw new Error('Choose POS or SPX.');
  if (!ID_PATTERN.test(iid)) throw new Error('The Installation ID looks like K7QX-2M9D-HT4P-W8RB: four groups of four letters or digits.');
  if (!customer.trim()) throw new Error("Enter the customer's name.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(lastDay || '')) throw new Error('Choose the last day the license works.');
  const exp = expiresAt(lastDay);
  if (exp <= now) throw new Error('That date is already past. Choose a later one.');
  const payload: LicensePayload = { v: 1, lid: newLicenseId(), cust: customer.trim(), iid, iat: isoUtc(now), exp: isoUtc(exp) };
  if (plan) payload.plan = plan; // older app versions ignore it
  // A trial ends by midnight after its 3rd day (today counts): never longer.
  if (plan === 'trial' && exp.getTime() - now.getTime() > TRIAL_DAYS * 864e5) throw new Error(`A free trial is ${TRIAL_DAYS} days at most.`);
  const payText = (pay || '').split('\n').map((l) => l.trim()).filter(Boolean).join('\n');
  if (payText.length > 500) throw new Error('The payment details are longer than 500 characters.');
  if (payText) payload.pay = payText; // shown on the client's trial notice and license screen
  const msgr = (messenger || '').trim().replace(/^(https?:\/\/)?(www\.)?(m\.me|facebook\.com|fb\.com)\//i, '').replace(/\/+$/, '');
  if (msgr && !/^[A-Za-z0-9.]{3,50}$/.test(msgr)) throw new Error('That Messenger username looks wrong: use the name in m.me/juan.delacruz.');
  if (msgr) payload.msgr = msgr; // "I've paid" opens m.me/<this>
  const tel = (mobile || '').replace(/[\s()-]/g, '');
  if (tel && !/^\+?[0-9]{7,15}$/.test(tel)) throw new Error('That mobile number looks wrong.');
  if (tel) payload.tel = tel; // "I've paid" by SMS
  const body = UTF8.encode(JSON.stringify(payload));
  const signature = new Uint8Array(await crypto.subtle.sign(SIGN, privateKey, signedBytes(prefix, body)));
  const license = `${prefix}.${b64url(body)}.${b64url(signature)}`;
  // Like the license tool: refuse to hand out a key the app would reject.
  const check = await verifyLicense(publicKey, license);
  if (!check.ok) throw new Error('This key is not the one the apps check against. Set up again with the right private-key.pem.');
  return { license, payload };
}

/** The saved key: encrypted with a key derived from the password (PBKDF2-SHA256 + AES-GCM). */
export type LockedBox = { v: number; iter?: number; salt: string; iv: string; data: string };

async function passwordKey(password: string, salt: Uint8Array, iterations: number) {
  const base = await crypto.subtle.importKey('raw', UTF8.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function sealText(text: string, password: string): Promise<LockedBox> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await passwordKey(password, salt, PBKDF2_ITERATIONS);
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, UTF8.encode(text)));
  return { v: 1, iter: PBKDF2_ITERATIONS, salt: bytesToB64(salt), iv: bytesToB64(iv), data: bytesToB64(data) };
}

export async function openText(box: LockedBox, password: string): Promise<string> {
  try {
    const key = await passwordKey(password, b64ToBytes(box.salt), box.iter || 310000);
    return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBytes(box.iv) }, key, b64ToBytes(box.data)));
  } catch {
    throw new Error('Wrong password.');
  }
}

/** The locked backup code: the locked key as one line of text, "LMK1.<base64url(json)>". */
export const backupCodeOf = (box: LockedBox) => 'LMK1.' + b64url(UTF8.encode(JSON.stringify(box)));

export function boxOfBackupCode(code: string): LockedBox {
  const t = (code || '').replace(/\s+/g, '');
  if (!t.startsWith('LMK1.')) throw new Error('That is not a locked backup code. It starts with LMK1.');
  try {
    const box = JSON.parse(new TextDecoder().decode(fromB64url(t.slice(5)))) as LockedBox;
    if (!box.salt || !box.iv || !box.data) throw new Error();
    return box;
  } catch {
    throw new Error('The locked backup code is incomplete. Copy all of it again.');
  }
}

// ---- Dates (store time, 'yyyy-mm-dd') -----------------------------------------------------------------------

export const PLAN_LABELS: Record<Plan, string> = { trial: 'Free trial', monthly: 'Monthly', yearly: 'Yearly' };

export const storeToday = () => new Date(Date.now() + STORE_OFFSET_HOURS * 3600e3).toISOString().slice(0, 10);

/** The last day for an expiry (it ends at midnight after that day, store time). */
export const lastDayOf = (expIso: string) => new Date(new Date(expIso).getTime() + STORE_OFFSET_HOURS * 3600e3 - 1).toISOString().slice(0, 10);

/** Same day `months` later, held to the month's last day (Jan 31 + 1 month = Feb 28), like the PC tool. */
export function addMonths(day: string, months: number): string {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  const last = new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m - 1 + months, Math.min(d, last))).toISOString().slice(0, 10);
}

export function addDays(day: string, days: number): string {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** The last day of a plan whose first day is `start` (that day counts): Nov 14 gives trial Nov 16, monthly Dec 13. */
export function planEnd(plan: Plan, start: string): string {
  if (plan === 'trial') return addDays(start, TRIAL_DAYS - 1);
  return addDays(addMonths(start, plan === 'monthly' ? 1 : 12), -1);
}

export const fmtDay = (day: string) => new Date(day + 'T12:00:00Z').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
