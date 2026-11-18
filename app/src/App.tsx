import React, { useEffect, useState } from 'react';
import { href, parse, useHash, type Route } from './router';
import { useControl } from './state/control';
import { useSigning } from './state/signing';
import { Icon, Logo, type IconName } from './components/Icon';
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { Clients } from './pages/Clients';
import { Apps } from './pages/Apps';
import { Inbox } from './pages/Inbox';
import { AppPage } from './pages/app/AppPage';
import { Settings } from './pages/Settings';
import { Check } from './pages/Check';
import { AddApp } from './pages/AddApp';
import { StorePage } from './pages/store/Store';

type NavItem = { to: string; label: string; icon: IconName; active: (r: Route) => boolean; count?: number; external?: boolean };

const RAIL_KEY = 'controlCenter.railMini';
const readMini = () => {
  try {
    return localStorage.getItem(RAIL_KEY) === '1';
  } catch {
    return false;
  }
};

/** The owner's app: a floating side rail (icons only when folded; a drawer on phones), the page beside it.
 *  The public store (#/store) has its own page without any of this. */
export const App: React.FC = () => {
  const route = parse(useHash());
  const control = useControl();
  const signing = useSigning();
  const [mini, setMini] = useState(readMini);
  const [open, setOpen] = useState(false);

  // A link was followed: close the phone drawer.
  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener('hashchange', close);
    return () => window.removeEventListener('hashchange', close);
  }, []);

  if (route.page === 'store') return <StorePage app={route.app} />;

  const groups: { label?: string; items: NavItem[] }[] = [
    {
      items: [
        { to: href.home, label: 'Home', icon: 'home', active: (r) => r.page === 'home' },
        { to: href.dashboard, label: 'Dashboard', icon: 'dashboard', active: (r) => r.page === 'dashboard' },
      ],
    },
    {
      label: 'Manage',
      items: [
        { to: href.clients, label: 'Clients', icon: 'clients', active: (r) => r.page === 'clients' },
        { to: href.apps, label: 'Apps', icon: 'apps', active: (r) => r.page === 'apps' || r.page === 'app' || r.page === 'add' },
        { to: href.inbox, label: 'Inbox', icon: 'inbox', active: (r) => r.page === 'inbox', count: control.inboxCount },
      ],
    },
    {
      label: 'Tools',
      items: [
        { to: href.check, label: 'Check a key', icon: 'shield', active: (r) => r.page === 'check' },
        { to: href.store(), label: 'Your store', icon: 'store', active: () => false, external: true },
        { to: href.settings, label: 'Settings', icon: 'settings', active: (r) => r.page === 'settings' },
      ],
    },
  ];

  const fold = () => {
    const next = !mini;
    setMini(next);
    try {
      localStorage.setItem(RAIL_KEY, next ? '1' : '0');
    } catch {
      /* this visit only */
    }
  };

  return (
    <div className="shell">
      <div className="mobilebar">
        <button className="icon-btn" aria-label="Open the menu" onClick={() => setOpen(true)}><Icon name="menu" /></button>
        <Logo size={28} />
        <b>Control Center</b>
        <span className="spacer" />
        <KeyButton compact />
      </div>
      <div className={`backdrop${open ? ' open' : ''}`} onClick={() => setOpen(false)} />

      <aside className={`rail${mini ? ' mini' : ''}${open ? ' open' : ''}`} aria-label="Main menu">
        <div className="rail-brand">
          <Logo />
          <b>Control Center</b>
          <button className="icon-btn" aria-label={mini ? 'Unfold the menu' : 'Fold the menu'} title={mini ? 'Unfold' : 'Fold'} onClick={fold}><Icon name="rail" size={18} /></button>
        </div>
        <nav className="rail-nav">
          {groups.map((g, i) => (
            <React.Fragment key={i}>
              {g.label && <div className="rail-label">{g.label}</div>}
              {g.items.map((item) => (
                <a
                  key={item.label} className="rail-link" href={item.to} title={item.label}
                  aria-current={item.active(route) ? 'page' : undefined}
                  {...(item.external ? { target: '_blank', rel: 'noopener' } : {})}
                >
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                  {!!item.count && <em className="count" aria-label={`${item.count} waiting`}>{item.count}</em>}
                </a>
              ))}
            </React.Fragment>
          ))}
        </nav>
        <div className="rail-foot">
          <div className="me">
            <span className="avatar" style={{ width: 36, height: 36 }}><Icon name="user" size={20} /></span>
            <div className="me-text">
              <b>Owner</b>
              <span>{control.signedIn ? 'Signed in to Control' : control.available ? 'Not signed in' : 'Keys only on this address'}</span>
            </div>
          </div>
          {signing.hasKey && <KeyButton />}
        </div>
      </aside>

      <main className="page">
        {route.page === 'home' && <Home />}
        {route.page === 'dashboard' && <Dashboard />}
        {route.page === 'clients' && <Clients />}
        {route.page === 'apps' && <Apps />}
        {route.page === 'inbox' && <Inbox />}
        {route.page === 'app' && <AppPage key={route.app} app={route.app} tab={route.tab} query={route.query} />}
        {route.page === 'settings' && <Settings />}
        {route.page === 'check' && <Check />}
        {route.page === 'add' && <AddApp />}
      </main>
    </div>
  );
};

/** The signing key's state: unlocked (tap to lock), or locked (tap to unlock in Settings). */
const KeyButton: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const signing = useSigning();
  if (!signing.hasKey) return null;
  if (signing.unlocked) {
    return (
      <button className={`key-pill on${compact ? ' small' : ''}`} onClick={signing.lock} title="The signing key is unlocked: tap to lock it">
        <Icon name="unlocked" size={18} /><span>Key unlocked · Lock</span>
      </button>
    );
  }
  return (
    <a href={href.settings} style={{ display: 'contents' }}>
      <button className={`key-pill${compact ? ' small' : ''}`} title="The signing key is locked">
        <Icon name="locked" size={18} /><span>Key locked</span>
      </button>
    </a>
  );
};
