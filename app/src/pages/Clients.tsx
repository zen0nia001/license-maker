import React, { useState } from 'react';
import type { Installation } from '../lib/control/types';
import { ago, day, plural } from '../lib/format';
import { href } from '../router';
import { useControl } from '../state/control';
import { Icon } from '../components/Icon';
import { Card, Chip, Empty, PageHead, initials, type Tone } from '../components/ui';
import { NeedsControl } from './app/AppPage';

/** A client's name: the customer on their license, else your name for the installation, else its ID. */
export const clientNameOf = (i: Installation) => i.customer || i.label || i.installationId || 'Unnamed';

/** Your clients: everyone running one of your apps (ignored installations left out), each with their installations. */
export function clientsOf(installations: Installation[]): { name: string; installs: Installation[] }[] {
  const byName = new Map<string, Installation[]>();
  for (const i of installations) {
    if (i.status === 'ignored') continue;
    const name = clientNameOf(i);
    byName.set(name, [...(byName.get(name) ?? []), i]);
  }
  return [...byName.entries()].map(([name, installs]) => ({ name, installs })).sort((a, b) => a.name.localeCompare(b.name));
}

/** How a license stands, as a coloured chip. */
export function licenseChip(i: Installation): { tone: Tone; text: string } {
  const l = i.license;
  if (!l) return { tone: 'info', text: 'Not reported yet' };
  if (l.state !== 'Valid') return { tone: 'bad', text: l.state === 'Missing' ? 'No license' : l.state };
  const plan = l.plan === 'trial' ? 'Trial' : l.plan === 'yearly' ? 'Yearly' : l.plan === 'monthly' ? 'Monthly' : 'Licensed';
  if (l.daysLeft != null && l.daysLeft <= 7) return { tone: 'warn', text: `${plan} · ${plural(l.daysLeft, 'day')} left` };
  return { tone: 'ok', text: plan };
}

export const Clients: React.FC = () => (
  <>
    <PageHead eyebrow="Everyone running your apps" title="Clients" />
    <NeedsControl><ClientsTable /></NeedsControl>
  </>
);

const ClientsTable: React.FC = () => {
  const control = useControl();
  const [q, setQ] = useState('');
  const clients = clientsOf(control.installations);
  const needle = q.trim().toLowerCase();
  const shown = needle
    ? clients.filter((c) => c.name.toLowerCase().includes(needle) || c.installs.some((i) => `${i.product.name} ${i.installationId ?? ''} ${i.label ?? ''}`.toLowerCase().includes(needle)))
    : clients;

  return (
    <Card
      title={`${plural(clients.length, 'client')}`}
      actions={
        <label className="search">
          <Icon name="search" size={18} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clients, apps, IDs" aria-label="Search clients" />
        </label>
      }
    >
      {shown.length === 0 ? (
        <Empty icon={<Icon name="clients" size={30} />}>{clients.length ? 'No client matches that.' : 'No clients yet. They appear once their app checks in with Control.'}</Empty>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Client</th><th>App</th><th>License</th><th>Ends</th><th>Last seen</th><th aria-label="Open" /></tr>
            </thead>
            <tbody>
              {shown.flatMap((c) =>
                c.installs.map((i, n) => {
                  const chip = licenseChip(i);
                  return (
                    <tr key={i.id}>
                      <td>
                        {n === 0 ? (
                          <div className="who-cell">
                            <span className="avatar" style={{ width: 34, height: 34, fontSize: '.8rem' }}>{initials(c.name)}</span>
                            <span>{c.name}{c.installs.length > 1 && <span className="muted small"> · {c.installs.length} apps</span>}</span>
                          </div>
                        ) : null}
                      </td>
                      <td>{i.product.name}</td>
                      <td><Chip tone={chip.tone}>{chip.text}</Chip></td>
                      <td>{day(i.license?.expiresAt)}</td>
                      <td className="muted">{ago(i.lastSeenAt)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <a href={href.app(i.product.id, 'installs', { open: i.id })}><button className="icon-btn" aria-label={`Open ${c.name}'s ${i.product.name}`}><Icon name="open" size={18} /></button></a>
                      </td>
                    </tr>
                  );
                }),
              )}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};
