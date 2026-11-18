import React from 'react';
import { statsOf } from '../lib/apps';
import { plural } from '../lib/format';
import { href } from '../router';
import { useControl } from '../state/control';
import { AppIcon } from '../components/AppIcon';
import { Icon } from '../components/Icon';
import { Chip, PageHead } from '../components/ui';

/** Every app you sell, as tiles: tap one for its installations, requests, keys and store listing. */
export const Apps: React.FC = () => {
  const control = useControl();
  return (
    <>
      <PageHead
        eyebrow="Everything you sell"
        title="Apps"
        actions={control.signedIn && <a href={href.add}><button className="primary"><Icon name="plus" size={18} /> Add app</button></a>}
      />
      <div className="apps">
        {control.products.map((p) => {
          const stats = statsOf(p, control.installations, control.requests);
          return (
            <a key={p.id} className="app-card" href={href.app(p.id)}>
              <AppIcon app={p} />
              <div>
                <div className="app-name">{p.name}</div>
                {p.tagline && <div className="app-sub">{p.tagline}</div>}
              </div>
              {control.signedIn && (
                <div className="app-stats">
                  <Chip tone="info">{plural(stats.installs.length, 'installation')}</Chip>
                  {stats.waiting.length > 0 && <Chip tone="warn">{plural(stats.waiting.length, 'request')}</Chip>}
                  {stats.attention.length > 0 && <Chip tone="bad">{plural(stats.attention.length, 'alert')}</Chip>}
                  <Chip tone={p.published ? 'ok' : 'info'}>{p.published ? 'On the store' : 'Not on the store'}</Chip>
                </div>
              )}
            </a>
          );
        })}
        {control.signedIn && (
          <a className="app-card add" href={href.add}>
            <span className="app-icon" style={{ width: 56, height: 56, borderRadius: 14 }}><Icon name="plus" size={26} /></span>
            <div><div className="app-name">Add app</div><div className="app-sub">A new app you sell</div></div>
          </a>
        )}
      </div>
    </>
  );
};
