// Pages by the URL's hash (#/app/spx/keys): one static file, no path rewriting needed.
import { useSyncExternalStore } from 'react';

export const TABS = ['overview', 'installs', 'requests', 'keys', 'listing'] as const;
export type Tab = (typeof TABS)[number];

/** The client's own area (C3), apart from the owner's: #/my, #/my/licenses, #/my/messages. */
export const MY_TABS = ['home', 'licenses', 'messages'] as const;
export type MyTab = (typeof MY_TABS)[number];

export type Route =
  /** owner: #/owner, the owner's home (and sign-in) even on a device that isn't known as the owner's. */
  | { page: 'home'; owner?: boolean }
  | { page: 'dashboard' }
  | { page: 'clients' }
  | { page: 'client'; id: string }
  | { page: 'apps' }
  | { page: 'inbox' }
  | { page: 'app'; app: string; tab: Tab; query: URLSearchParams }
  | { page: 'settings' }
  | { page: 'check' }
  | { page: 'add' }
  /** The public store (no sign-in): every published app, or one of them. */
  | { page: 'store'; app: string | null }
  /** A client's one-time invite link (#/join/<token>): set up their passkey. */
  | { page: 'join'; token: string }
  /** The client's own area, behind their passkey. */
  | { page: 'my'; tab: MyTab };

export function parse(hash: string): Route {
  const [path = '', search = ''] = hash.replace(/^#/, '').split('?');
  const parts = path.split('/').filter(Boolean);
  if (parts[0] === 'app' && parts[1]) {
    const tab = (TABS as readonly string[]).includes(parts[2] ?? '') ? (parts[2] as Tab) : 'overview';
    return { page: 'app', app: decodeURIComponent(parts[1]), tab, query: new URLSearchParams(search) };
  }
  if (parts[0] === 'owner') return { page: 'home', owner: true };
  if (parts[0] === 'store') return { page: 'store', app: parts[1] ? decodeURIComponent(parts[1]) : null };
  if (parts[0] === 'add') return { page: 'add' };
  if (parts[0] === 'dashboard') return { page: 'dashboard' };
  if (parts[0] === 'clients' && parts[1]) return { page: 'client', id: decodeURIComponent(parts[1]) };
  if (parts[0] === 'clients') return { page: 'clients' };
  if (parts[0] === 'join' && parts[1]) return { page: 'join', token: parts[1] };
  if (parts[0] === 'my') return { page: 'my', tab: (MY_TABS as readonly string[]).includes(parts[1] ?? '') ? (parts[1] as MyTab) : 'home' };
  if (parts[0] === 'apps') return { page: 'apps' };
  if (parts[0] === 'inbox') return { page: 'inbox' };
  if (parts[0] === 'settings') return { page: 'settings' };
  if (parts[0] === 'check') return { page: 'check' };
  return { page: 'home' };
}

export const href = {
  home: '#/',
  owner: '#/owner',
  settings: '#/settings',
  check: '#/check',
  add: '#/add',
  dashboard: '#/dashboard',
  clients: '#/clients',
  client: (id: string) => `#/clients/${encodeURIComponent(id)}`,
  my: (tab: MyTab = 'home') => (tab === 'home' ? '#/my' : `#/my/${tab}`),
  apps: '#/apps',
  inbox: '#/inbox',
  store: (id?: string) => (id ? `#/store/${encodeURIComponent(id)}` : '#/store'),
  app: (id: string, tab: Tab = 'overview', query?: Record<string, string>) =>
    `#/app/${encodeURIComponent(id)}${tab === 'overview' ? '' : `/${tab}`}${query ? `?${new URLSearchParams(query)}` : ''}`,
};

const subscribe = (fn: () => void) => {
  window.addEventListener('hashchange', fn);
  return () => window.removeEventListener('hashchange', fn);
};

export const useHash = () => useSyncExternalStore(subscribe, () => location.hash);

export const go = (to: string) => {
  location.hash = to;
};
