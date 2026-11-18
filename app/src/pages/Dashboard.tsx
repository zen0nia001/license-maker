import React from 'react';
import { statsOf } from '../lib/apps';
import { day, plural } from '../lib/format';
import { href } from '../router';
import { useControl } from '../state/control';
import { AppIcon } from '../components/AppIcon';
import { Icon, type IconName } from '../components/Icon';
import { Card, Chip, Empty, PageHead } from '../components/ui';
import { NeedsControl } from './app/AppPage';
import { clientNameOf } from './Clients';

export const Dashboard: React.FC = () => (
  <>
    <PageHead eyebrow="How your apps are doing" title="Dashboard" />
    <NeedsControl><Board /></NeedsControl>
  </>
);

const DAY = 864e5;

const Board: React.FC = () => {
  const control = useControl();
  const installs = control.installations.filter((i) => i.status !== 'ignored');
  const now = Date.now();
  const valid = installs.filter((i) => i.license?.state === 'Valid');
  const ending = valid.filter((i) => i.license?.expiresAt && Date.parse(i.license.expiresAt) - now <= 30 * DAY);
  const locked = installs.filter((i) => i.license && i.license.state !== 'Valid');
  const unknown = installs.filter((i) => !i.license);
  const waiting = control.requests.filter((r) => r.status === 'pending');
  const perApp = control.products.map((p) => ({ p, stats: statsOf(p, control.installations, control.requests) }));
  const most = Math.max(1, ...perApp.map((a) => a.stats.installs.length));

  const kpis: { label: string; value: number; icon: IconName; tone?: 'bad' | 'warn' | 'ok'; to?: string }[] = [
    { label: 'Apps', value: control.products.length, icon: 'apps', to: href.apps },
    { label: 'Clients', value: control.clients.length, icon: 'clients', to: href.clients },
    { label: 'Installations', value: installs.length, icon: 'dashboard' },
    { label: 'Licenses ending in 30 days', value: ending.length, icon: 'key', tone: ending.length ? 'warn' : 'ok' },
    { label: 'Locked (no valid license)', value: locked.length, icon: 'locked', tone: locked.length ? 'bad' : 'ok' },
    { label: 'Requests waiting', value: waiting.length, icon: 'inbox', tone: waiting.length ? 'warn' : 'ok', to: href.inbox },
  ];

  return (
    <>
      <div className="kpis">
        {kpis.map((k) => {
          const body = (
            <>
              <span className={`kpi-icon`}><Icon name={k.icon} /></span>
              <b>{k.value}</b>
              <span>{k.label}</span>
            </>
          );
          return k.to
            ? <a key={k.label} href={k.to} className={`kpi${k.tone ? ` tone-${k.tone}` : ''}`}>{body}</a>
            : <div key={k.label} className={`kpi${k.tone ? ` tone-${k.tone}` : ''}`}>{body}</div>;
        })}
      </div>

      <div className="cols two">
        <Card title="Installations per app">
          <div className="bars">
            {perApp.map(({ p, stats }) => (
              <a key={p.id} className="bar-row" href={href.app(p.id, 'installs')} style={{ color: 'inherit', textDecoration: 'none' }}>
                <span className="label"><AppIcon app={p} size={26} /><span>{p.name}</span></span>
                <span className="bar-track"><span className="bar-fill" style={{ display: 'block', width: `${(stats.installs.length / most) * 100}%` }} /></span>
                <span className="n">{stats.installs.length}</span>
              </a>
            ))}
          </div>
        </Card>

        <Card title="License health">
          {installs.length === 0 ? (
            <Empty>No installations yet.</Empty>
          ) : (
            <div className="donut-wrap">
              <Donut
                parts={[
                  { value: valid.length - ending.length, color: 'var(--g3)' },
                  { value: ending.length, color: 'var(--g2)' },
                  { value: locked.length, color: 'var(--g1)' },
                  { value: unknown.length, color: 'var(--g4)' },
                ]}
                center={`${Math.round(((valid.length - ending.length) / installs.length) * 100)}%`}
                caption="healthy"
              />
              <div className="legend">
                <span><i style={{ background: 'var(--g3)' }} />Licensed · {valid.length - ending.length}</span>
                <span><i style={{ background: 'var(--g2)' }} />Ending within 30 days · {ending.length}</span>
                <span><i style={{ background: 'var(--g1)' }} />Locked · {locked.length}</span>
                {unknown.length > 0 && <span><i style={{ background: 'var(--g4)' }} />Not reported yet · {unknown.length}</span>}
              </div>
            </div>
          )}
        </Card>

        <Card title="Licenses ending soon">
          {ending.length === 0 ? (
            <Empty icon={<Icon name="check" size={28} />}>No license ends in the next 30 days.</Empty>
          ) : (
            <ul className="list">
              {[...ending].sort((a, b) => Date.parse(a.license!.expiresAt!) - Date.parse(b.license!.expiresAt!)).map((i) => (
                <li key={i.id}>
                  <div className="who">{clientNameOf(i)}</div>
                  <div className="acts">
                    <a href={href.app(i.product.id, 'keys', { iid: i.installationId ?? '', cust: i.customer ?? '' })}><button className="small">Renew</button></a>
                  </div>
                  <div className="meta">{i.product.name} · ends {day(i.license!.expiresAt)} · {plural(Math.max(0, i.license!.daysLeft ?? 0), 'day')} left</div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Versions running">
          {perApp.map(({ p, stats }) => {
            const counts = new Map<string, number>();
            stats.installs.forEach((i) => counts.set(i.version ?? 'unknown', (counts.get(i.version ?? 'unknown') ?? 0) + 1));
            return (
              <div key={p.id} className="row" style={{ alignItems: 'center' }}>
                <span style={{ flex: '0 0 120px', fontWeight: 750 }}>{p.name}</span>
                <div className="chips" style={{ flex: '1 1 200px' }}>
                  {counts.size === 0 ? <span className="muted small">—</span> : [...counts.entries()].map(([v, n]) => (
                    <Chip key={v} tone={v === stats.newestVersion ? 'ok' : 'info'}>{v === 'unknown' || v === 'dev' ? v : `v${v}`} · {n}</Chip>
                  ))}
                </div>
              </div>
            );
          })}
        </Card>
      </div>
    </>
  );
};

/** A ring chart: each part an arc in its colour, a figure in the middle. */
const Donut: React.FC<{ parts: { value: number; color: string }[]; center: string; caption: string }> = ({ parts, center, caption }) => {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  const r = 52;
  const len = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width="148" height="148" viewBox="0 0 148 148" role="img" aria-label={`${center} ${caption}`}>
      <circle cx="74" cy="74" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="14" />
      {parts.filter((p) => p.value > 0).map((p, i) => {
        const dash = (p.value / total) * len;
        const el = (
          <circle key={i} cx="74" cy="74" r={r} fill="none" stroke={p.color} strokeWidth="14" strokeLinecap="butt"
            strokeDasharray={`${dash} ${len - dash}`} strokeDashoffset={-offset} transform="rotate(-90 74 74)" />
        );
        offset += dash;
        return el;
      })}
      <text x="74" y="72" textAnchor="middle" style={{ font: '750 26px var(--sans)', fill: 'var(--ink)' }}>{center}</text>
      <text x="74" y="92" textAnchor="middle" style={{ font: '600 12px var(--sans)', fill: 'var(--muted)' }}>{caption}</text>
    </svg>
  );
};
