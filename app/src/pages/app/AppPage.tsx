import React from 'react';
import { lookOf, statsOf } from '../../lib/apps';
import { href, TABS, type Tab } from '../../router';
import { useControl } from '../../state/control';
import { ControlSignIn } from '../../components/ControlSignIn';
import { Msg } from '../../components/ui';
import type { Product } from '../../lib/control/types';
import type { AppStats } from '../../lib/apps';
import { Overview } from './Overview';
import { Installs } from './Installs';
import { Requests } from './Requests';
import { Keys } from './Keys';
import { Listing } from './Listing';
import { InstallerTab } from './Installer';
import { AppIcon } from '../../components/AppIcon';

export type TabProps = { product: Product; stats: AppStats; query: URLSearchParams };

const LABELS: Record<Tab, string> = { overview: 'Overview', installs: 'Installations', requests: 'Requests', keys: 'Keys', listing: 'Store listing', installer: 'Installer' };

/** One app: its header, then Overview · Installations · Requests · Keys. */
export const AppPage: React.FC<{ app: string; tab: Tab; query: URLSearchParams }> = ({ app, tab, query }) => {
  const control = useControl();
  const product = control.products.find((p) => p.id === app);
  if (!product) {
    return (
      <>
        <Msg>There's no app "{app}" here.</Msg>
        <a href={href.apps}>← Your apps</a>
      </>
    );
  }
  const look = lookOf(product);
  const stats = statsOf(product, control.installations, control.requests);
  const props: TabProps = { product, stats, query };
  const count: Partial<Record<Tab, number>> = { installs: stats.installs.length, requests: stats.waiting.length };

  return (
    <>
      <div className="app-head">
        <AppIcon app={product} />
        <div>
          <h1>{product.name}</h1>
          {look.tagline && <p className="muted small">{look.tagline}</p>}
        </div>
      </div>
      <nav className="tabs" aria-label={`${product.name} sections`}>
        {TABS.map((t) => (
          <a key={t} href={href.app(product.id, t)} aria-current={t === tab ? 'page' : undefined}>
            {LABELS[t]}{count[t] ? ` (${count[t]})` : ''}
          </a>
        ))}
      </nav>
      {tab === 'overview' && <Overview {...props} />}
      {tab === 'installs' && <NeedsControl><Installs {...props} /></NeedsControl>}
      {tab === 'requests' && <NeedsControl><Requests {...props} /></NeedsControl>}
      {tab === 'keys' && <Keys {...props} />}
      {tab === 'listing' && <NeedsControl><Listing key={product.id} {...props} /></NeedsControl>}
      {tab === 'installer' && <NeedsControl><InstallerTab key={product.id} {...props} /></NeedsControl>}
    </>
  );
};

/** Installations and requests come from Control: without it (or signed out), say so instead. */
export const NeedsControl: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const control = useControl();
  if (!control.available) return <Msg tone="info">Control isn't connected on this address yet. This part works once it's live.</Msg>;
  if (!control.signedIn) return <ControlSignIn />;
  return <>{children}</>;
};
