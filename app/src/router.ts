// Pages by the URL's hash (#/app/spx/keys): GitHub Pages serves one file and can't rewrite paths.
import { useSyncExternalStore } from 'react';

export const TABS = ['overview', 'installs', 'requests', 'keys'] as const;
export type Tab = (typeof TABS)[number];

export type Route =
  | { page: 'home' }
  | { page: 'app'; app: string; tab: Tab; query: URLSearchParams }
  | { page: 'settings' }
  | { page: 'check' };

export function parse(hash: string): Route {
  const [path = '', search = ''] = hash.replace(/^#/, '').split('?');
  const parts = path.split('/').filter(Boolean);
  if (parts[0] === 'app' && parts[1]) {
    const tab = (TABS as readonly string[]).includes(parts[2] ?? '') ? (parts[2] as Tab) : 'overview';
    return { page: 'app', app: decodeURIComponent(parts[1]), tab, query: new URLSearchParams(search) };
  }
  if (parts[0] === 'settings') return { page: 'settings' };
  if (parts[0] === 'check') return { page: 'check' };
  return { page: 'home' };
}

export const href = {
  home: '#/',
  settings: '#/settings',
  check: '#/check',
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
