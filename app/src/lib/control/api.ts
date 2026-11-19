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

/** A client's session (C1): kept on their own phone (localStorage) for its 30 days, apart from the owner's. */
export type ClientSession = Session & { name: string };
const CLIENT_SESSION_KEY = 'control.clientSession';
let clientMemory: ClientSession | null = null;
const clientListeners = new Set<() => void>();

export const clientSession = {
  get(): ClientSession | null {
    try {
      const s = JSON.parse(localStorage.getItem(CLIENT_SESSION_KEY) || 'null') as ClientSession | null;
      return s && Date.parse(s.expiresAt) > Date.now() ? s : null;
    } catch {
      return clientMemory;
    }
  },
  set(s: ClientSession) {
    clientMemory = s;
    try {
      localStorage.setItem(CLIENT_SESSION_KEY, JSON.stringify(s));
    } catch {
      /* this visit only */
    }
    clientListeners.forEach((fn) => fn());
  },
  clear() {
    clientMemory = null;
    try {
      localStorage.removeItem(CLIENT_SESSION_KEY);
    } catch {
      /* nothing kept */
    }
    clientListeners.forEach((fn) => fn());
  },
};
clientMemory = clientSession.get();
export const currentClientSession = () => clientMemory;

/** Told when the client session starts or ends (sign-in, sign-out, or Control said 401). */
export const onClientSession = (fn: () => void) => {
  clientListeners.add(fn);
  return () => void clientListeners.delete(fn);
};

async function request(method: string, path: string, body: unknown, token: string | undefined): Promise<Response> {
  if (!CONTROL_URL) throw new Error('Control is not set up for this address.');
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    return await fetch(CONTROL_URL + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store' });
  } catch {
    throw new Error("Control can't be reached. Check the internet connection.");
  }
}

async function answer<T>(res: Response): Promise<T> {
  const json = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new Error((json as { error?: { message?: string } } | null)?.error?.message || `Control answered ${res.status}.`);
  return json as T;
}

/** A call as the owner (/owner/…), with the owner's session. */
export async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await request(method, path, body, memory?.token);
  if (res.status === 401 && path.startsWith('/owner/') && !path.startsWith('/owner/auth/')) {
    session.clear();
    signedOutListeners.forEach((fn) => fn());
  }
  return answer<T>(res);
}

/** Uploads a file as the request body (the owner's installers: PUT /owner/installers/:app?name=…). */
export async function apiUpload<T>(path: string, file: Blob): Promise<T> {
  if (!CONTROL_URL) throw new Error('Control is not set up for this address.');
  let res: Response;
  try {
    res = await fetch(CONTROL_URL + path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/octet-stream', ...(memory ? { Authorization: `Bearer ${memory.token}` } : {}) },
      body: file,
      cache: 'no-store',
    });
  } catch {
    throw new Error("Control can't be reached. Check the internet connection.");
  }
  return answer<T>(res);
}

/** Downloads a file as the signed-in client and saves it on this device (their installers). */
export async function clientDownload(path: string, filename: string): Promise<void> {
  const res = await request('GET', path, undefined, clientMemory?.token);
  if (!res.ok) await answer(res);
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** Sends a picture as the signed-in client (their payment screenshot: PUT /client/license-requests/:id/proof). */
export async function clientUpload<T>(path: string, file: Blob): Promise<T> {
  if (!CONTROL_URL) throw new Error('Control is not set up for this address.');
  let res: Response;
  try {
    res = await fetch(CONTROL_URL + path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/octet-stream', ...(clientMemory ? { Authorization: `Bearer ${clientMemory.token}` } : {}) },
      body: file,
      cache: 'no-store',
    });
  } catch {
    throw new Error("Control can't be reached. Check the internet connection.");
  }
  if (res.status === 401) clientSession.clear();
  return answer<T>(res);
}

/** A file the owner opens (a client's payment screenshot), as a Blob. */
export async function apiBlob(path: string): Promise<Blob> {
  const res = await request('GET', path, undefined, memory?.token);
  if (!res.ok) await answer(res);
  return res.blob();
}

/** A call as the signed-in client (/client/…). Never sends the owner's token. */
export async function clientApi<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await request(method, path, body, clientMemory?.token);
  if (res.status === 401 && path.startsWith('/client/') && !path.startsWith('/client/auth/')) clientSession.clear();
  return answer<T>(res);
}
