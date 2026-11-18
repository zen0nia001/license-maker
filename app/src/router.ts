// Pages by the URL's hash (#/app/spx/keys): one static file, no path rewriting needed.
import { useSyncExternalStore } from 'react';

export const TABS = ['overview', 'installs', 'requests', 'keys', 'listing'] as const;
export type Tab = (typeof TABS)[number];

export type Route =
  | { page: 'home' }
  | { page: 'dashboard' }
  | { page: 'clients' }
  | { page: 'apps' }
  | { page: 'inbox' }
  | { page: 'app'; app: string; tab: Tab; query: URLSearchParams }
  | { page: 'settings' }
  | { page: 'check' }
  | { page: 'add' }
  /** The public store (no sign-in): every published app, or one of them. */
  | { page: 'store'; app: string | null };

export function parse(hash: string): Route {
  const [path = '', search = ''] = hash.replace(/^#/, '').split('?');
  const parts = path.split('/').filter(Boolean);
  if (parts[0] === 'app' && parts[1]) {
    const tab = (TABS as readonly string[]).includes(parts[2] ?? '') ? (parts[2] as Tab) : 'overview';
    return { page: 'app', app: decodeURIComponent(parts[1]), tab, query: new URLSearchParams(search) };
  }
  if (parts[0] === 'store') return { page: 'store', app: parts[1] ? decodeURIComponent(parts[1]) : null };
  if (parts[0] === 'add') return { page: 'add' };
  if (parts[0] === 'dashboard') return { page: 'dashboard' };
  if (parts[0] === 'clients') return { page: 'clients' };
  if (parts[0] === 'apps') return { page: 'apps' };
  if (parts[0] === 'inbox') return { page: 'inbox' };
  if (parts[0] === 'settings') return { page: 'settings' };
  if (parts[0] === 'check') return { page: 'check' };
  return { page: 'home' };
}

export const href = {
  home: '#/',
  settings: '#/settings',
  check: '#/check',
  add: '#/add',
  dashboard: '#/dashboard',
  clients: '#/clients',
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
