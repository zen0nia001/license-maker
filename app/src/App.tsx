import React from 'react';
import { href, parse, useHash } from './router';
import { useSigning } from './state/signing';
import { Home } from './pages/Home';
import { AppPage } from './pages/app/AppPage';
import { Settings } from './pages/Settings';
import { Check } from './pages/Check';

export const App: React.FC = () => {
  const route = parse(useHash());
  const signing = useSigning();
  const current = (page: string) => (route.page === page ? 'page' : undefined);
  return (
    <>
      <header className="topbar">
        <div className="topbar-in">
          <a className="brand" href={href.home}>
            <span className="seal" aria-hidden="true">CTRL</span>
            <span className="brand-name">Control Center</span>
          </a>
          <nav className="nav" aria-label="Main">
            <a href={href.home} aria-current={current('home') ?? current('app')}>Apps</a>
            <a href={href.check} aria-current={current('check')}>Check a key</a>
            <a href={href.settings} aria-current={current('settings')}>Settings</a>
          </nav>
          {signing.hasKey && (
            <div className="keystate">
              {signing.unlocked
                ? <button className="small" onClick={signing.lock} title="The signing key is unlocked">🔓 Lock</button>
                : <a href={href.settings}><button className="small" title="The signing key is locked">🔒</button></a>}
            </div>
          )}
        </div>
      </header>
      <main className="main">
        {route.page === 'home' && <Home />}
        {route.page === 'app' && <AppPage key={route.app} app={route.app} tab={route.tab} query={route.query} />}
        {route.page === 'settings' && <Settings />}
        {route.page === 'check' && <Check />}
      </main>
    </>
  );
};
