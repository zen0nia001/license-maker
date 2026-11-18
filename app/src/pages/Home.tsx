import React from 'react';
import { statsOf } from '../lib/apps';
import { plural, ago } from '../lib/format';
import { href } from '../router';
import { useControl } from '../state/control';
import { ControlSignIn } from '../components/ControlSignIn';
import { AppIcon } from '../components/AppIcon';
import { Icon } from '../components/Icon';
import { Card, Empty, Msg, PageHead } from '../components/ui';
import { ALERT_TEXT, nameOf } from './app/Installs';


const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

type Need = { key: string; kind: string; tone: string; title: string; sub: string; to: string };

/** Home: what needs you right now, your apps, and the big picture. */
export const Home: React.FC = () => {
  const control = useControl();
  const apps = control.products.map((p) => ({ p, stats: statsOf(p, control.installations, control.requests) }));
  const installs = control.installations.filter((i) => i.status !== 'ignored');

  const needs: Need[] = [
    ...control.clients.filter((c) => c.unreadMessages > 0).map((c) => ({
      key: c.id,
      kind: 'Client · message',
      tone: 'var(--warn)',
      title: c.business ? `${c.name}, ${c.business}` : c.name,
      sub: `${plural(c.unreadMessages, 'new message')} · ${ago(c.lastMessageAt)}`,
      to: href.client(c.id),
    })),
    ...control.inquiries.filter((q) => q.status === 'new').map((q) => ({
      key: q.id,
      kind: `${q.product?.name ?? 'Store'} · inquiry`,
      tone: 'var(--ok)',
      title: q.business ? `${q.name}, ${q.business}` : q.name,
      sub: q.message ? (q.message.length > 70 ? `${q.message.slice(0, 70)}…` : q.message) : `Wants to hear about ${q.product?.name ?? 'your apps'}`,
      to: href.inbox,
    })),
    ...control.requests.filter((r) => r.status === 'pending').map((r) => ({
      key: r.id,
      kind: `${r.product.name} · license request`,
      tone: 'var(--warn)',
      title: r.installation.label || r.installation.customer || r.installation.installationId || 'A client',
      sub: `Asked for ${r.plan === 'trial' ? 'a free trial' : `a ${r.plan} license`} ${ago(r.createdAt)}`,
      to: href.app(r.product.id, 'requests'),
    })),
    ...installs.filter((i) => i.alerts.length > 0 || i.status === 'new').map((i) => ({
      key: i.id,
      kind: `${i.product.name} · ${i.status === 'new' ? 'new installation' : 'installation'}`,
      tone: i.alerts.some((a) => a !== 'license_ending' && a !== 'backup_old') ? 'var(--bad)' : i.alerts.length ? 'var(--warn)' : 'var(--info)',
      title: nameOf(i),
      sub: i.alerts.length ? i.alerts.map((a) => ALERT_TEXT[a]).join(' · ') : 'Name it or accept it',
      to: href.app(i.product.id, 'installs', { open: i.id }),
    })),
  ];

  return (
    <>
      <PageHead
        eyebrow={`${greeting()} · ${new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}`}
        title="Home"
      />

      {!control.available && <Msg tone="info">Control isn't connected on this address yet: clients, installations and requests show up once it's live. Making keys works as before.</Msg>}
      {control.available && !control.signedIn && <ControlSignIn />}
      {control.signedIn && control.error && <Msg>{control.error}</Msg>}

      {control.signedIn && (
        <Card title={<>Needs you {needs.length > 0 && <span className="muted" style={{ marginLeft: 4, fontWeight: 600 }}>{needs.length}</span>}</>}>
          {needs.length === 0 ? (
            <Empty icon={<Icon name="check" size={30} />}>All caught up. Nothing is waiting for you.</Empty>
          ) : (
            <div className="needs">
              {needs.map((n) => (
                <a key={n.key} className="need" href={n.to} style={{ ['--tone' as string]: n.tone }}>
                  <span className="kind">{n.kind}</span>
                  <b>{n.title}</b>
                  <span className="sub">{n.sub}</span>
                </a>
              ))}
            </div>
          )}
        </Card>
      )}

      <div className="cols wide-left">
        <Card title="Your apps" actions={<a href={href.apps} className="small">See all</a>}>
          <div>
            {apps.map(({ p, stats }) => (
              <a key={p.id} className="app-row" href={href.app(p.id)}>
                <AppIcon app={p} size={46} />
                <div className="grow">
                  <div className="app-name">{p.name}</div>
                  <div className="app-sub">
                    {control.signedIn
                      ? [plural(stats.installs.length, 'installation'), stats.waiting.length ? plural(stats.waiting.length, 'request') : null, stats.newestVersion ? `v${stats.newestVersion}` : null].filter(Boolean).join(' · ')
                      : p.tagline}
                  </div>
                </div>
                <span className="go" aria-hidden="true"><Icon name="open" size={18} /></span>
              </a>
            ))}
            {control.signedIn && (
              <a className="app-row" href={href.add}>
                <span className="app-icon" style={{ width: 46, height: 46, borderRadius: 12 }}><Icon name="plus" /></span>
                <div className="grow"><div className="app-name">Add app</div><div className="app-sub">A new app you sell</div></div>
              </a>
            )}
          </div>
        </Card>

        <div className="hero">
          <div>
            <h2>Everything you run,<br />in one place.</h2>
            <p>Your apps, the businesses using them, and every license, from this one screen.</p>
          </div>
          <div className="hero-stats">
            <div><b>{control.products.length}</b><span>apps</span></div>
            {control.signedIn && <div><b>{installs.length}</b><span>installations</span></div>}
            {control.signedIn && <div><b>{control.clients.length}</b><span>clients</span></div>}
          </div>
        </div>
      </div>
    </>
  );
};
