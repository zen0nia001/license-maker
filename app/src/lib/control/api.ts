// Talking to Control (the owner's control service, C:\Dev\Control). Its address is fixed per host in
// control.config.json, which is also the only extra address the Content-Security-Policy allows.
import config from '../../../control.config.json';

export const CONTROL_URL: string | null = (config.controlUrls as Record<string, string>)[location.hostname] ?? null;

/** The owner's session: a bearer token kept in this tab only (sessionStorage), never the signing key. */
export type Session = { token: string; expiresAt: string };
const SESSION_KEY = 'control.session';

export const session = {
  get(): Session | null {
    try {
      const s = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null') as Session | null;
      return s && Date.parse(s.expiresAt) > Date.now() ? s : null;
    } catch {
      return null;
    }
  },
  set(s: Session) {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
    } catch {
      /* private mode: this page only */
    }
    memory = s;
  },
  clear() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* nothing kept */
    }
    memory = null;
  },
};
let memory: Session | null = session.get();
export const currentSession = () => memory;

/** Told when Control answers 401 to an owner call: the session ended. */
const signedOutListeners = new Set<() => void>();
export const onSignedOut = (fn: () => void) => {
  signedOutListeners.add(fn);
  return () => void signedOutListeners.delete(fn);
};

export async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!CONTROL_URL) throw new Error('Control is not set up for this address.');
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (memory) headers.Authorization = `Bearer ${memory.token}`;
  let res: Response;
  try {
    res = await fetch(CONTROL_URL + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store' });
  } catch {
    throw new Error("Control can't be reached. Check the internet connection.");
  }
  const json = res.status === 204 ? null : await res.json().catch(() => null);
  if (res.status === 401 && path.startsWith('/owner/') && !path.startsWith('/owner/auth/')) {
    session.clear();
    signedOutListeners.forEach((fn) => fn());
  }
  if (!res.ok) throw new Error((json as { error?: { message?: string } } | null)?.error?.message || `Control answered ${res.status}.`);
  return json as T;
}
