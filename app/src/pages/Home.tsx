import React from 'react';
import { lookOf, statsOf } from '../lib/apps';
import { plural } from '../lib/format';
import { href } from '../router';
import { useControl } from '../state/control';
import { ControlSignIn } from '../components/ControlSignIn';
import { Chip, Msg } from '../components/ui';

/** The home screen: what needs you, then every app as a card (tap one for its page). */
export const Home: React.FC = () => {
  const control = useControl();
  const apps = control.products.map((p) => ({ p, look: lookOf(p), stats: statsOf(p, control.installations, control.requests) }));
  const waiting = apps.filter((a) => a.stats.waiting.length > 0);
  const attention = apps.filter((a) => a.stats.attention.length > 0);

  return (
    <>
      <div>
        <h1>Your apps</h1>
        <p className="muted small">Tap an app for its installations, license requests and keys.</p>
      </div>

      {!control.available && (
        <Msg tone="info">
          Control isn't connected on this address yet, so installations and license requests don't show here. Making keys works as before.
        </Msg>
      )}
      {control.available && !control.signedIn && <ControlSignIn />}
      {control.signedIn && control.error && <Msg>{control.error}</Msg>}

      {(waiting.length > 0 || attention.length > 0) && (
        <div className="inbox">
          {waiting.map(({ p, stats }) => (
            <a key={`r-${p.id}`} href={href.app(p.id, 'requests')}>
              <Chip tone="warn">{p.name}: {plural(stats.waiting.length, 'license request')} waiting</Chip>
            </a>
          ))}
          {attention.map(({ p, stats }) => (
            <a key={`a-${p.id}`} href={href.app(p.id, 'installs')}>
              <Chip tone="bad">{p.name}: {plural(stats.attention.length, 'installation')} to look at</Chip>
            </a>
          ))}
        </div>
      )}

      <div className="apps">
        {apps.map(({ p, look, stats }) => (
          <a key={p.id} className="app-card" href={href.app(p.id)}>
            <div className="app-icon" style={{ background: look.color }} aria-hidden="true">{look.icon}</div>
            <div>
              <div className="app-name">{p.name}</div>
              {look.tagline && <div className="app-sub">{look.tagline}</div>}
            </div>
            {control.signedIn && (
              <div className="app-stats">
                <Chip tone="info">{plural(stats.installs.length, 'installation')}</Chip>
                {stats.newestVersion && <Chip tone="info">v{stats.newestVersion}</Chip>}
                {stats.waiting.length > 0 && <Chip tone="warn">{plural(stats.waiting.length, 'request')}</Chip>}
                {stats.attention.length > 0 && <Chip tone="bad">{plural(stats.attention.length, 'alert')}</Chip>}
              </div>
            )}
          </a>
        ))}
      </div>
    </>
  );
};
