// The Inbox: one list of everything clients sent, focused on what waits for you. Filters on top (To do first);
// each row says who, what and when, and opens in place to act on it: reply to a message, answer an inquiry,
// approve a license request.
import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/control/api';
import type { Client, Inquiry, LicenseRequest, Message } from '../lib/control/types';
import { PLAN_LABELS } from '../lib/license/core';
import { ago } from '../lib/format';
import { go, href } from '../router';
import { useControl } from '../state/control';
import { Icon } from '../components/Icon';
import { Thread } from '../components/Thread';
import { SendInstaller } from '../components/SendInstaller';
import { ActionButton, Empty, PageHead } from '../components/ui';
import { NeedsControl } from './app/AppPage';
import { RequestDetail, requestName } from './app/Requests';

const WEEK = 7 * 24 * 3600e3;

type Kind = 'message' | 'inquiry' | 'request';
type Item = {
  key: string;
  kind: Kind;
  /** Waits for you (an unread message, a new inquiry, a request to approve). */
  todo: boolean;
  at: string;
  label: string;
  title: string;
  sub: string;
  open: () => React.ReactNode;
};

const FILTERS = [
  { id: 'todo', label: 'To do' },
  { id: 'message', label: 'Messages' },
  { id: 'inquiry', label: 'Inquiries' },
  { id: 'request', label: 'Requests' },
  { id: 'done', label: 'Done' },
] as const;
type Filter = (typeof FILTERS)[number]['id'];

export const Inbox: React.FC = () => (
  <NeedsControl>
    <InboxView />
  </NeedsControl>
);

const InboxView: React.FC = () => {
  const control = useControl();
  const [filter, setFilter] = useState<Filter>('todo');
  const [openKey, setOpenKey] = useState<string | null>(null);

  const items: Item[] = [
    ...control.clients
      .filter((c) => c.lastMessageAt)
      .map((c) => ({
        key: `m:${c.id}`,
        kind: 'message' as const,
        todo: c.unreadMessages > 0,
        at: c.lastMessageAt!,
        label: 'Message',
        title: c.business ? `${c.name}, ${c.business}` : c.name,
        sub: c.unreadMessages > 0 ? `${c.unreadMessages} new message${c.unreadMessages === 1 ? '' : 's'}` : 'Conversation',
        open: () => <MessageDetail client={c} />,
      })),
    ...control.inquiries.map((q) => ({
      key: `i:${q.id}`,
      kind: 'inquiry' as const,
      todo: q.status === 'new',
      at: q.createdAt,
      label: `Inquiry · ${q.product?.name ?? 'Store'}`,
      title: q.business ? `${q.name}, ${q.business}` : q.name,
      sub: q.message ? oneLine(q.message) : `Wants to hear about ${q.product?.name ?? 'your apps'}`,
      open: () => <InquiryDetail inquiry={q} />,
    })),
    ...control.requests
      .filter((r) => r.status === 'pending' || r.status === 'approved' || Date.now() - Date.parse(r.decidedAt || r.createdAt) < WEEK)
      .map((r) => ({
        key: `r:${r.id}`,
        kind: 'request' as const,
        todo: r.status === 'pending',
        at: r.createdAt,
        label: `Request · ${r.product.name}`,
        title: requestName(r),
        sub: requestSub(r),
        open: () => <RequestDetail request={r} />,
      })),
  ];
  // The row you opened stays where it is until you close it, even once it's done (reading a message marks it read).
  const inPlace = (i: Item) => i.todo || i.key === openKey;
  items.sort((a, b) => Number(inPlace(b)) - Number(inPlace(a)) || Date.parse(b.at) - Date.parse(a.at));

  const shown = items.filter((i) => (filter === 'todo' ? inPlace(i) : filter === 'done' ? !i.todo || i.key === openKey : i.kind === filter));
  const count = (f: Filter) => items.filter((i) => (f === 'todo' ? i.todo : f === 'done' ? false : i.kind === f && i.todo)).length;
  const waiting = count('todo');

  return (
    <>
      <PageHead
        eyebrow={waiting ? `${waiting} waiting for you` : 'All caught up'}
        title="Inbox"
        actions={<button className="small" onClick={() => void control.reload()}>Refresh</button>}
      />
      <nav className="inbox-filters" aria-label="Show">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => { setFilter(f.id); setOpenKey(null); }}>
            {f.label}
            {count(f.id) > 0 && <em>{count(f.id)}</em>}
          </button>
        ))}
      </nav>
      <section className="card inbox">
        {shown.length === 0 ? (
          <Empty icon={<Icon name="check" size={30} />}>{EMPTY[filter]}</Empty>
        ) : (
          <ul className="inbox-list">
            {shown.map((i) => {
              const open = openKey === i.key;
              return (
                <li key={i.key} className={`${i.todo ? 'todo' : ''}${open ? ' open' : ''}`}>
                  <button type="button" className="inbox-row" aria-expanded={open} aria-label={`${i.todo ? 'Waiting: ' : ''}${i.label}, ${i.title}. ${i.sub}. ${ago(i.at)}`} onClick={() => setOpenKey(open ? null : i.key)}>
                    <span className="inbox-dot" aria-label={i.todo ? 'Waiting for you' : undefined} />
                    <span className="inbox-main">
                      <span className="inbox-label">{i.label}</span>
                      <span className="inbox-title">{i.title}</span>
                      <span className="inbox-sub">{i.sub}</span>
                    </span>
                    <span className="inbox-when">{ago(i.at)}</span>
                  </button>
                  {open && <div className="inbox-open">{i.open()}</div>}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
};

const EMPTY: Record<Filter, React.ReactNode> = {
  todo: 'All caught up. Nothing is waiting for you.',
  message: 'No messages yet. Clients write to you from their own page.',
  inquiry: <>No inquiries yet. Clients send them from <a href={href.store()} target="_blank" rel="noopener">your store</a>.</>,
  request: 'No license requests this week. Clients send them from their app or their page.',
  done: 'Nothing here yet.',
};

const oneLine = (text: string) => {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > 90 ? `${t.slice(0, 90)}…` : t;
};

function requestSub(r: LicenseRequest): string {
  const plan = PLAN_LABELS[r.plan];
  if (r.status === 'pending') return r.plan === 'trial' ? 'Asks for a free trial' : `${plan}${r.paymentReference ? ` · paid, ref ${r.paymentReference}` : ''}`;
  if (r.status === 'approved') return `${plan} · key sent, the app picks it up`;
  if (r.status === 'delivered') return `${plan} · delivered`;
  return `${plan} · declined${r.note ? `: ${r.note}` : ''}`;
}

/** A client's conversation, right here: reading it marks it read. */
const MessageDetail: React.FC<{ client: Client }> = ({ client }) => {
  const control = useControl();
  const [messages, setMessages] = useState<Message[] | null>(null);
  const base = `/owner/clients/${encodeURIComponent(client.id)}/messages`;
  const load = useCallback(async () => setMessages(await api<Message[]>('GET', base)), [base]);
  useEffect(() => {
    void load().then(() => control.reload());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);
  if (!messages) return <p className="muted small">Loading…</p>;
  return (
    <div className="stack" style={{ gap: 10 }}>
      <Thread
        messages={messages}
        mine="owner"
        theirName={client.name.split(' ')[0] || client.name}
        empty="No messages yet."
        onSend={async (body) => {
          await api('POST', base, { body });
          await load();
        }}
      />
      <a className="small" href={href.client(client.id)}>Open {client.name}'s page</a>
    </div>
  );
};

/** How to answer an inquiry, from the contact they left. */
const replyLink = (q: Inquiry): { href: string; label: string; external?: boolean } => {
  const hello = `Hi ${q.name.split(' ')[0]}! Thanks for asking about ${q.product?.name ?? 'our apps'}.`;
  if (q.contactKind === 'messenger') return { href: `https://m.me/${encodeURIComponent(q.contact)}?text=${encodeURIComponent(hello)}`, label: 'Reply on Messenger', external: true };
  if (q.contactKind === 'mobile') return { href: `sms:${q.contact}?&body=${encodeURIComponent(hello)}`, label: 'Reply by text' };
  return { href: `mailto:${q.contact}?subject=${encodeURIComponent(`About ${q.product?.name ?? 'our apps'}`)}&body=${encodeURIComponent(hello)}`, label: 'Reply by email' };
};

/** A store inquiry: what they said and how to reach them; reply, make them a client, send the installer. */
const InquiryDetail: React.FC<{ inquiry: Inquiry }> = ({ inquiry: q }) => {
  const control = useControl();
  const reply = replyLink(q);
  const [sending, setSending] = useState(false);
  const setStatus = async (status: 'new' | 'done') => {
    await api('PATCH', `/owner/inquiries/${encodeURIComponent(q.id)}`, { status });
    await control.reload();
  };
  // Already a client? (same contact) Then open them; otherwise make one from this inquiry, ready to invite.
  const existing = control.clients.find((c) => c.contactKind === q.contactKind && c.contact === q.contact);
  const makeClient = async () => {
    const note = [`From the store, ${new Date(q.createdAt).toLocaleDateString()}${q.product ? ` (about ${q.product.name})` : ''}.`, q.message].filter(Boolean).join(' ').slice(0, 1000);
    const made = await api<Client>('POST', '/owner/clients', { name: q.name, business: q.business, contactKind: q.contactKind, contact: q.contact, note });
    if (q.status === 'new') await api('PATCH', `/owner/inquiries/${encodeURIComponent(q.id)}`, { status: 'done' });
    await control.reload();
    go(href.client(made.id));
  };
  const remove = async () => {
    if (!window.confirm(`Delete ${q.name}'s inquiry? Their details are gone for good.`)) return;
    await api('DELETE', `/owner/inquiries/${encodeURIComponent(q.id)}`);
    await control.reload();
  };
  return (
    <div className="stack" style={{ gap: 12 }}>
      {q.message ? <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{q.message}</p> : <p className="muted small" style={{ margin: 0 }}>No message: they'd like to hear about {q.product?.name ?? 'your apps'}.</p>}
      <p className="small muted mono" style={{ margin: 0 }}>{q.contactKind} · {q.contact}</p>
      <div className="row" style={{ alignItems: 'center' }}>
        <a className="button primary" style={{ flex: '0 0 auto' }} href={reply.href} {...(reply.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{reply.label}</a>
        {q.contactKind === 'mobile' && <a className="button" style={{ flex: '0 0 auto' }} href={`tel:${q.contact}`}>Call</a>}
        {existing
          ? <a className="button" style={{ flex: '0 0 auto' }} href={href.client(existing.id)}>Open client</a>
          : <div style={{ flex: '0 0 auto' }}><ActionButton onClick={makeClient}>Make a client</ActionButton></div>}
        <button style={{ flex: '0 0 auto' }} aria-expanded={sending} onClick={() => setSending(!sending)}>Send installer</button>
      </div>
      {sending && <SendInstaller productId={q.product?.id} inquiryId={q.id} name={q.name} contactKind={q.contactKind} contact={q.contact} />}
      <div className="row inbox-quiet">
        {q.status === 'new'
          ? <div style={{ flex: '0 0 auto' }}><ActionButton className="small" onClick={() => setStatus('done')}>Mark done</ActionButton></div>
          : <div style={{ flex: '0 0 auto' }}><ActionButton className="small" onClick={() => setStatus('new')}>Back to To do</ActionButton></div>}
        <div style={{ flex: '0 0 auto' }}><ActionButton className="small" onClick={remove}>Delete</ActionButton></div>
      </div>
    </div>
  );
};
