// One client, for the owner (C3): their details, sign-in (invite link, passkeys, on/off), installations and messages.
import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/control/api';
import type { ClientDetail, Message } from '../lib/control/types';
import { ago, day, plural } from '../lib/format';
import { go, href } from '../router';
import { useControl } from '../state/control';
import { Icon } from '../components/Icon';
import { Thread } from '../components/Thread';
import { ActionButton, Card, Chip, CopyButton, Empty, Field, Msg, PageHead, Say, Segmented } from '../components/ui';
import { NeedsControl } from './app/AppPage';
import { accessChip, clientNameOf, CONTACT_KINDS, licenseChip, type ContactKind } from './Clients';

export const ClientPage: React.FC<{ id: string }> = ({ id }) => (
  <NeedsControl>
    <ClientView id={id} />
  </NeedsControl>
);

const ClientView: React.FC<{ id: string }> = ({ id }) => {
  const control = useControl();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const base = `/owner/clients/${encodeURIComponent(id)}`;

  const load = useCallback(async () => {
    try {
      const [c, m] = await Promise.all([api<ClientDetail>('GET', base), api<Message[]>('GET', `${base}/messages`)]);
      setClient(c);
      setMessages(m);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [base]);

  useEffect(() => {
    void load().then(() => control.reload()); // reading the messages marked them read: refresh the counts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  if (error && !client) return <><PageHead title="Client" /><Msg>{error}</Msg><a href={href.clients}>Back to clients</a></>;
  if (!client) return <PageHead title="Client" eyebrow="Loading…" />;

  const chip = accessChip(client);
  const refresh = async () => {
    await load();
    await control.reload();
  };
  const setStatus = async (status: 'active' | 'disabled') => {
    if (status === 'disabled' && !window.confirm(`Turn ${client.name} off? They are signed out and can't sign in until you turn them on again.`)) return;
    await api('PATCH', base, { status });
    await refresh();
  };
  const remove = async () => {
    if (!window.confirm(`Delete ${client.name}? Their passkeys, invite and messages are deleted; their installations stay, unlinked.`)) return;
    await api('DELETE', base);
    await control.reload();
    go(href.clients);
  };

  return (
    <>
      <PageHead
        eyebrow={<a href={href.clients}><Icon name="left" size={14} /> Clients</a>}
        title={<>{client.name}{client.business && <span className="muted" style={{ fontWeight: 600 }}> · {client.business}</span>}</>}
        actions={
          <>
            <Chip tone={chip.tone}>{chip.text}</Chip>
            {client.status === 'active'
              ? <ActionButton className="small" onClick={() => setStatus('disabled')}>Turn off</ActionButton>
              : <ActionButton className="small" onClick={() => setStatus('active')}>Turn on</ActionButton>}
            <ActionButton className="small" onClick={remove}>Delete</ActionButton>
          </>
        }
      />
      <Say text={error} />
      <div className="grid-2">
        <Card title={<>Messages{client.unreadMessages > 0 && <span className="muted" style={{ marginLeft: 6, fontWeight: 600 }}>new</span>}</>}>
          <Thread
            messages={messages}
            mine="owner"
            theirName={client.name.split(' ')[0] || client.name}
            empty={client.passkeys > 0 ? 'No messages yet.' : 'No messages yet. Once they sign in, they can write to you here.'}
            onSend={async (body) => {
              await api('POST', `${base}/messages`, { body });
              await load();
            }}
          />
        </Card>
        <div className="stack">
          <Access client={client} base={base} onChange={refresh} />
          <Installs client={client} onChange={refresh} />
          <Details client={client} base={base} onChange={refresh} />
        </div>
      </div>
    </>
  );
};

/** The invite link that lets the client set up a passkey, and the passkeys they have. */
const Access: React.FC<{ client: ClientDetail; base: string; onChange: () => Promise<void> }> = ({ client, base, onChange }) => {
  const [link, setLink] = useState<{ link: string; expiresAt: string } | null>(null);
  const invite = async () => {
    setLink(await api<{ link: string; expiresAt: string }>('POST', `${base}/invites`));
    await onChange();
  };
  const cancel = async () => {
    await api('DELETE', `${base}/invites`);
    setLink(null);
    await onChange();
  };
  const removeKey = async (k: ClientDetail['passkeyList'][number]) => {
    if (!window.confirm(`Remove "${k.name}"? That device is signed out and can't sign in again without a new invite.`)) return;
    await api('DELETE', `${base}/passkeys/${encodeURIComponent(k.id)}`);
    await onChange();
  };
  const hello = link ? `Hi ${client.name.split(' ')[0]}! Here's your own page for your apps: licenses, renewals and messages. Open this link on your phone to set it up (it works once, until ${day(link.expiresAt)}): ${link.link}` : '';

  return (
    <Card title="Their sign-in">
      <div className="stack">
        {client.status === 'disabled' && <Msg tone="warn">Turned off: they can't sign in. Turn them on to invite them.</Msg>}
        {link ? (
          <div className="stack">
            <p className="small">Send them this link. It works once, until {day(link.expiresAt)}; it's shown only now.</p>
            <div className="mono small" style={{ overflowWrap: 'anywhere' }}>{link.link}</div>
            <div className="row" style={{ alignItems: 'center' }}>
              <div style={{ flex: '0 0 auto' }}><CopyButton text={hello} label="Copy message" className="primary small" /></div>
              {client.contactKind === 'messenger' && client.contact && (
                <a className="button small" style={{ flex: '0 0 auto' }} href={`https://m.me/${encodeURIComponent(client.contact)}?text=${encodeURIComponent(hello)}`} target="_blank" rel="noopener noreferrer">Send on Messenger</a>
              )}
              {client.contactKind === 'mobile' && client.contact && (
                <a className="button small" style={{ flex: '0 0 auto' }} href={`sms:${client.contact}?&body=${encodeURIComponent(hello)}`}>Send by text</a>
              )}
              {client.contactKind === 'email' && client.contact && (
                <a className="button small" style={{ flex: '0 0 auto' }} href={`mailto:${client.contact}?subject=${encodeURIComponent('Your page for your apps')}&body=${encodeURIComponent(hello)}`}>Send by email</a>
              )}
            </div>
          </div>
        ) : client.inviteExpiresAt ? (
          <p className="small muted">An invite is waiting, until {day(client.inviteExpiresAt)}. Make a new link if they lost it (the old one stops working).</p>
        ) : (
          <p className="small muted">{client.passkeys ? 'To add another phone, send them a new invite link.' : 'Send them an invite link: they open it on their phone and set up a passkey (fingerprint or face, no password).'}</p>
        )}
        {client.status === 'active' && (
          <div className="row">
            <div style={{ flex: '0 0 auto' }}><ActionButton className={link ? 'small' : 'primary small'} onClick={invite}>{client.inviteExpiresAt || link ? 'Make a new link' : 'Make invite link'}</ActionButton></div>
            {(client.inviteExpiresAt || link) && <div style={{ flex: '0 0 auto' }}><ActionButton className="small" onClick={cancel}>Cancel the link</ActionButton></div>}
          </div>
        )}
        {client.passkeyList.length > 0 && (
          <ul className="list">
            {client.passkeyList.map((k) => (
              <li key={k.id}>
                <div className="who">{k.name}</div>
                <div className="meta">added {day(k.createdAt)}{k.lastUsedAt ? ` · used ${ago(k.lastUsedAt)}` : ''}</div>
                <div className="acts"><ActionButton className="small" onClick={() => removeKey(k)}>Remove</ActionButton></div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
};

/** Their installations: unlink one, or link one that has no client yet. */
const Installs: React.FC<{ client: ClientDetail; onChange: () => Promise<void> }> = ({ client, onChange }) => {
  const control = useControl();
  const loose = control.installations.filter((i) => i.status !== 'ignored' && !i.client);
  const [pick, setPick] = useState('');
  const setClient = async (installId: string, clientId: string | null) => {
    await api('PATCH', `/owner/installations/${encodeURIComponent(installId)}`, { clientId });
    setPick('');
    await onChange();
  };
  return (
    <Card title={plural(client.installationList.length, 'installation')}>
      {client.installationList.length === 0 ? (
        <Empty icon={<Icon name="apps" size={26} />}>None linked yet.</Empty>
      ) : (
        <ul className="list">
          {client.installationList.map((i) => {
            const full = control.installations.find((x) => x.id === i.id);
            const chip = full ? licenseChip(full) : null;
            return (
              <li key={i.id}>
                <div className="who"><a href={href.app(i.product.id, 'installs', { open: i.id })}>{i.product.name} · {i.label || i.installationId || 'Unnamed'}</a></div>
                <div className="meta">{i.installationId ?? 'no ID yet'} · seen {ago(i.lastSeenAt)}{i.status === 'ignored' ? ' · ignored' : ''}</div>
                <div className="acts"><ActionButton className="small" onClick={() => setClient(i.id, null)}>Unlink</ActionButton></div>
                {chip && <div className="wide"><Chip tone={chip.tone}>{chip.text}</Chip></div>}
              </li>
            );
          })}
        </ul>
      )}
      {loose.length > 0 && (
        <div className="row" style={{ marginTop: 10, alignItems: 'center' }}>
          <select value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Link an installation">
            <option value="">Link an installation…</option>
            {loose.map((i) => <option key={i.id} value={i.id}>{i.product.name} · {clientNameOf(i)}{i.installationId ? ` (${i.installationId})` : ''}</option>)}
          </select>
          {pick && <div style={{ flex: '0 0 auto' }}><ActionButton className="small primary" onClick={() => setClient(pick, client.id)}>Link</ActionButton></div>}
        </div>
      )}
    </Card>
  );
};

/** Name, business, how to reach them, and a note only the owner sees. */
const Details: React.FC<{ client: ClientDetail; base: string; onChange: () => Promise<void> }> = ({ client, base, onChange }) => {
  const [name, setName] = useState(client.name);
  const [business, setBusiness] = useState(client.business ?? '');
  const [kind, setKind] = useState<ContactKind>(client.contactKind ?? 'messenger');
  const [contact, setContact] = useState(client.contact ?? '');
  const [note, setNote] = useState(client.note ?? '');
  const [saved, setSaved] = useState(false);
  const save = async () => {
    await api('PATCH', base, { name, business, contactKind: contact.trim() ? kind : null, contact, note });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
    await onChange();
  };
  return (
    <Card title="Details">
      <div className="stack">
        <div className="row">
          <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Business"><input value={business} onChange={(e) => setBusiness(e.target.value)} /></Field>
        </div>
        <Segmented label="How to reach them" value={kind} options={[...CONTACT_KINDS]} onChange={setKind} />
        <Field label="Contact"><input value={contact} onChange={(e) => setContact(e.target.value)} /></Field>
        <Field label="Your note" hint="Only you see this."><textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <div className="row" style={{ alignItems: 'center' }}>
          <div style={{ flex: '0 0 auto' }}><ActionButton className="primary small" onClick={save}>Save</ActionButton></div>
          {saved && <span className="small muted">Saved ✓</span>}
          <span className="small muted" style={{ textAlign: 'right' }}>Client since {day(client.createdAt)}</span>
        </div>
      </div>
    </Card>
  );
};
