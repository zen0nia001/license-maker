import React, { useState } from 'react';
import { api } from '../lib/control/api';
import type { Client, Installation } from '../lib/control/types';
import { ago, day, plural } from '../lib/format';
import { go, href } from '../router';
import { useControl } from '../state/control';
import { Icon } from '../components/Icon';
import { ActionButton, Card, Chip, Empty, Field, PageHead, Segmented, initials, type Tone } from '../components/ui';
import { NeedsControl } from './app/AppPage';

/** A client's name for an installation: its client account, else the customer on its license, your label, its ID. */
export const clientNameOf = (i: Installation) => i.client?.name || i.customer || i.label || i.installationId || 'Unnamed';

/** How a license stands, as a coloured chip. */
export function licenseChip(i: { license: Installation['license'] }): { tone: Tone; text: string } {
  const l = i.license;
  if (!l) return { tone: 'info', text: 'Not reported yet' };
  if (l.state !== 'Valid') return { tone: 'bad', text: l.state === 'Missing' ? 'No license' : l.state };
  const plan = l.plan === 'trial' ? 'Trial' : l.plan === 'yearly' ? 'Yearly' : l.plan === 'monthly' ? 'Monthly' : 'Licensed';
  if (l.daysLeft != null && l.daysLeft <= 7) return { tone: 'warn', text: `${plan} · ${plural(l.daysLeft, 'day')} left` };
  return { tone: 'ok', text: plan };
}

/** Where a client stands with their sign-in. */
export function accessChip(c: Client): { tone: Tone; text: string } {
  if (c.status === 'disabled') return { tone: 'bad', text: 'Turned off' };
  if (c.passkeys > 0) return { tone: 'ok', text: c.lastSeenAt ? `Signed in ${ago(c.lastSeenAt)}` : 'Has a passkey' };
  if (c.inviteExpiresAt) return { tone: 'warn', text: `Invited · until ${day(c.inviteExpiresAt)}` };
  return { tone: 'info', text: 'Not invited yet' };
}

export const CONTACT_KINDS = [
  { value: 'messenger', label: 'Messenger' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'email', label: 'Email' },
] as const;
export type ContactKind = (typeof CONTACT_KINDS)[number]['value'];

export const Clients: React.FC = () => {
  const [adding, setAdding] = useState(false);
  return (
    <>
      <PageHead
        eyebrow="Everyone running your apps"
        title="Clients"
        actions={!adding && <button className="primary" onClick={() => setAdding(true)}><Icon name="plus" size={18} /> Add client</button>}
      />
      <NeedsControl>
        {adding && <AddClient onClose={() => setAdding(false)} />}
        <ClientList />
        <Unlinked />
      </NeedsControl>
    </>
  );
};

const AddClient: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const control = useControl();
  const [name, setName] = useState('');
  const [business, setBusiness] = useState('');
  const [kind, setKind] = useState<ContactKind>('messenger');
  const [contact, setContact] = useState('');
  const save = async () => {
    const made = await api<Client>('POST', '/owner/clients', { name, business, contactKind: contact.trim() ? kind : null, contact });
    await control.reload();
    go(href.client(made.id));
  };
  return (
    <Card title="New client" actions={<button className="small" onClick={onClose}>Cancel</button>}>
      <div className="stack">
        <div className="row">
          <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Maria Reyes" autoFocus /></Field>
          <Field label="Business (optional)"><input value={business} onChange={(e) => setBusiness(e.target.value)} placeholder="e.g. Reyes Express" /></Field>
        </div>
        <Segmented label="How to reach them" value={kind} options={[...CONTACT_KINDS]} onChange={setKind} />
        <Field label={kind === 'messenger' ? 'Messenger username (optional)' : kind === 'mobile' ? 'Mobile number (optional)' : 'Email (optional)'}>
          <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder={kind === 'messenger' ? 'm.me/their.name' : kind === 'mobile' ? '0917 123 4567' : 'name@example.com'} />
        </Field>
        <div><ActionButton className="primary" onClick={save}>Add client</ActionButton></div>
      </div>
    </Card>
  );
};

const ClientList: React.FC = () => {
  const control = useControl();
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const all = control.clients;
  const shown = needle ? all.filter((c) => `${c.name} ${c.business ?? ''} ${c.contact ?? ''}`.toLowerCase().includes(needle)) : all;
  return (
    <Card
      title={plural(all.length, 'client')}
      actions={
        all.length > 0 && (
          <label className="search">
            <Icon name="search" size={18} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clients" aria-label="Search clients" />
          </label>
        )
      }
    >
      {shown.length === 0 ? (
        <Empty icon={<Icon name="clients" size={30} />}>
          {all.length ? 'No client matches that.' : 'No clients yet. Add one, link their installations, and send them an invite to their own page.'}
        </Empty>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Client</th><th>Apps</th><th>Sign-in</th><th>Messages</th><th aria-label="Open" /></tr>
            </thead>
            <tbody>
              {shown.map((c) => {
                const chip = accessChip(c);
                return (
                  <tr key={c.id} className="clickable" onClick={() => go(href.client(c.id))}>
                    <td>
                      <div className="who-cell">
                        <span className="avatar" style={{ width: 34, height: 34, fontSize: '.8rem' }}>{initials(c.name)}</span>
                        <span>{c.name}{c.business && <span className="muted small"> · {c.business}</span>}</span>
                      </div>
                    </td>
                    <td>{c.installations}</td>
                    <td><Chip tone={chip.tone}>{chip.text}</Chip></td>
                    <td>{c.unreadMessages > 0 ? <Chip tone="warn">{plural(c.unreadMessages, 'new message')}</Chip> : <span className="muted">{c.lastMessageAt ? ago(c.lastMessageAt) : '—'}</span>}</td>
                    <td style={{ textAlign: 'right' }}>
                      <a href={href.client(c.id)} onClick={(e) => e.stopPropagation()}><button className="icon-btn" aria-label={`Open ${c.name}`}><Icon name="open" size={18} /></button></a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};

/** Installations no client account has yet: link each to its client (a name match is suggested). */
const Unlinked: React.FC = () => {
  const control = useControl();
  const loose = control.installations.filter((i) => i.status !== 'ignored' && !i.client);
  if (loose.length === 0) return null;
  return (
    <Card title={<>Not linked to a client <span className="muted" style={{ marginLeft: 4, fontWeight: 600 }}>{loose.length}</span></>}>
      <p className="small muted">Link each installation to its client, so they see it on their page.</p>
      <ul className="list">
        {loose.map((i) => <LinkRow key={i.id} install={i} />)}
      </ul>
    </Card>
  );
};

const LinkRow: React.FC<{ install: Installation }> = ({ install: i }) => {
  const control = useControl();
  const guess = control.clients.find((c) => {
    const names = [i.customer, i.label].filter(Boolean).map((s) => s!.toLowerCase());
    return names.some((n) => n === c.name.toLowerCase() || (c.business && n === c.business.toLowerCase()));
  });
  const [pick, setPick] = useState(guess?.id ?? '');
  const link = async () => {
    await api('PATCH', `/owner/installations/${encodeURIComponent(i.id)}`, { clientId: pick });
    await control.reload();
  };
  return (
    <li>
      <div className="who">{i.product.name} · {clientNameOf(i)}</div>
      <div className="meta">{i.installationId ?? 'no ID yet'} · seen {ago(i.lastSeenAt)}</div>
      <div className="acts">
        {control.clients.length === 0 ? (
          <span className="small muted">Add a client first</span>
        ) : (
          <>
            <select value={pick} onChange={(e) => setPick(e.target.value)} aria-label={`Client for ${clientNameOf(i)}`}>
              <option value="">Choose a client…</option>
              {control.clients.map((c) => <option key={c.id} value={c.id}>{c.name}{c.business ? ` (${c.business})` : ''}</option>)}
            </select>
            {pick && <ActionButton className="small primary" onClick={link}>Link</ActionButton>}
          </>
        )}
      </div>
    </li>
  );
};
