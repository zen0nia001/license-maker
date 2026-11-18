import React from 'react';
import { codeOf } from '../../lib/apps';
import { ago, plural } from '../../lib/format';
import { href } from '../../router';
import { useControl } from '../../state/control';
import { useSigning } from '../../state/signing';
import { Card, Chip } from '../../components/ui';
import { ALERT_TEXT, nameOf } from './Installs';
import type { TabProps } from './AppPage';

/** The app at a glance: its numbers, then what needs a look. */
export const Overview: React.FC<TabProps> = ({ product, stats }) => {
  const control = useControl();
  const signing = useSigning();
  const code = codeOf(product);
  const keysMade = code ? signing.issued.filter((k) => k.product === code).length : 0;

  return (
    <>
      <div className="tiles">
        {control.signedIn && (
          <>
            <a className="tile" href={href.app(product.id, 'installs')}><b>{stats.installs.length}</b><span>installations</span></a>
            <a className="tile" href={href.app(product.id, 'requests')}><b>{stats.waiting.length}</b><span>requests waiting</span></a>
            <a className="tile" href={href.app(product.id, 'installs')}><b>{stats.attention.length}</b><span>to look at</span></a>
            <div className="tile"><b>{stats.newestVersion ? `v${stats.newestVersion}` : '—'}</b><span>newest version running</span></div>
          </>
        )}
        <a className="tile" href={href.app(product.id, 'keys')}><b>{keysMade}</b><span>keys made on this device</span></a>
      </div>

      {control.signedIn && (stats.waiting.length > 0 || stats.attention.length > 0) && (
        <Card title="Needs a look">
          <ul className="list">
            {stats.waiting.map((r) => (
              <li key={r.id}>
                <div className="who">{r.installation.label || r.installation.customer || r.installation.installationId}</div>
                <div className="acts"><a href={href.app(product.id, 'requests')}><button className="small">Open</button></a></div>
                <div className="meta">asked for a {r.plan === 'trial' ? 'free trial' : `${r.plan} license`} {ago(r.createdAt)}</div>
              </li>
            ))}
            {stats.attention.map((i) => (
              <li key={i.id}>
                <div className="who">{nameOf(i)}</div>
                <div className="acts"><a href={href.app(product.id, 'installs', { open: i.id })}><button className="small">Open</button></a></div>
                <div className="chips wide">
                  {i.status === 'new' && <Chip tone="info">New: name or accept it</Chip>}
                  {i.alerts.map((a) => <Chip key={a} tone={a === 'license_ending' || a === 'backup_old' ? 'warn' : 'bad'}>{ALERT_TEXT[a]}</Chip>)}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {control.signedIn && stats.waiting.length === 0 && stats.attention.length === 0 && stats.installs.length > 0 && (
        <p className="muted">All {plural(stats.installs.length, 'installation')} look fine.</p>
      )}
    </>
  );
};
