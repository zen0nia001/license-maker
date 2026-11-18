import React, { useState } from 'react';
import { api } from '../lib/control/api';
import type { Inquiry } from '../lib/control/types';
import { ago } from '../lib/format';
import { href } from '../router';
import { useControl } from '../state/control';
import { useSigning } from '../state/signing';
import { Icon } from '../components/Icon';
import { ActionButton, Card, Chip, Empty, Msg, PageHead, Tag } from '../components/ui';
import { NeedsControl } from './app/AppPage';
import { RequestRow } from './app/Requests';

const WEEK = 7 * 24 * 3600e3;

/** Everything clients sent you: inquiries from the store, and license requests from every app. */
export const Inbox: React.FC = () => (
  <>
    <PageHead eyebrow="From your clients" title="Inbox" />
    <NeedsControl>
      <Messages />
      <Inquiries />
      <Requests />
    </NeedsControl>
  </>
);

/** How to answer an inquiry, from the contact they left. */
const replyLink = (q: Inquiry): { href: string; label: string; external?: boolean } => {
  const hello = `Hi ${q.name.split(' ')[0]}! Thanks for asking about ${q.product?.name ?? 'our apps'}.`;
  if (q.contactKind === 'messenger') return { href: `https://m.me/${encodeURIComponent(q.contact)}?text=${encodeURIComponent(hello)}`, label: 'Reply on Messenger', external: true };
  if (q.contactKind === 'mobile') return { href: `sms:${q.contact}?&body=${encodeURIComponent(hello)}`, label: 'Reply by text' };
  return { href: `mailto:${q.contact}?subject=${encodeURIComponent(`About ${q.product?.name ?? 'our apps'}`)}&body=${encodeURIComponent(hello)}`, label: 'Reply by email' };
};

const Inquiries: React.FC = () => {
  const control = useControl();
  const [showDone, setShowDone] = useState(false);
  const all = control.inquiries;
  const fresh = all.filter((q) => q.status === 'new').length;
  const shown = showDone ? all : all.filter((q) => q.status === 'new');
  return (
    <Card
      title={<>Store inquiries{fresh > 0 && <span className="muted" style={{ marginLeft: 6, fontWeight: 600 }}>{fresh} new</span>}</>}
      actions={all.length > fresh && <button className="small" onClick={() => setShowDone(!showDone)}>{showDone ? 'Hide done' : 'Show done'}</button>}
    >
      {shown.length === 0 ? (
        <Empty icon={<Icon name="check" size={30} />}>
          {all.length === 0 ? <>No inquiries yet. Clients send them from <a href={href.store()} target="_blank" rel="noopener">your store</a>.</> : 'All answered.'}
        </Empty>
      ) : (
        <ul className="list">{shown.map((q) => <InquiryRow key={q.id} inquiry={q} />)}</ul>
      )}
    </Card>
  );
};

const InquiryRow: React.FC<{ inquiry: Inquiry }> = ({ inquiry: q }) => {
  const control = useControl();
  const reply = replyLink(q);
  const setStatus = async (status: 'new' | 'done') => {
    await api('PATCH', `/owner/inquiries/${encodeURIComponent(q.id)}`, { status });
    await control.reload();
  };
  const remove = async () => {
    if (!window.confirm(`Delete ${q.name}'s inquiry? Their details are gone for good.`)) return;
    await api('DELETE', `/owner/inquiries/${encodeURIComponent(q.id)}`);
    await control.reload();
  };
  return (
    <li className={q.status === 'done' ? 'old' : undefined}>
      <div className="who">{q.product ? <Tag>{q.product.name}</Tag> : <Tag>Store</Tag>}{q.name}{q.business ? <span className="muted">, {q.business}</span> : null}</div>
      <div className="meta">{q.contactKind} · {q.contact} · {ago(q.createdAt)}</div>
      <div className="detail">
        {q.message ? <p style={{ whiteSpace: 'pre-wrap' }}>{q.message}</p> : <p className="muted small">No message: they'd like to hear about {q.product?.name ?? 'your apps'}.</p>}
        <div className="row" style={{ alignItems: 'center' }}>
          <a className="button primary" style={{ flex: '0 0 auto' }} href={reply.href} {...(reply.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{reply.label}</a>
          {q.contactKind === 'mobile' && <a className="button" style={{ flex: '0 0 auto' }} href={`tel:${q.contact}`}>Call</a>}
          <span style={{ flex: '1 1 auto' }} />
          {q.status === 'new'
            ? <div style={{ flex: '0 0 auto' }}><ActionButton className="small" onClick={() => setStatus('done')}>Mark done</ActionButton></div>
            : <div style={{ flex: '0 0 auto' }}><Chip tone="ok">Done {ago(q.handledAt)}</Chip> <ActionButton className="small" onClick={() => setStatus('new')}>Reopen</ActionButton></div>}
          <div style={{ flex: '0 0 auto' }}><ActionButton className="small" onClick={remove}>Delete</ActionButton></div>
        </div>
      </div>
    </li>
  );
};

/** Clients who wrote to you: the newest conversations first, unread ones on top. */
const Messages: React.FC = () => {
  const control = useControl();
  const talking = control.clients
    .filter((c) => c.lastMessageAt)
    .sort((a, b) => (b.unreadMessages > 0 ? 1 : 0) - (a.unreadMessages > 0 ? 1 : 0) || Date.parse(b.lastMessageAt!) - Date.parse(a.lastMessageAt!))
    .slice(0, 10);
  if (talking.length === 0) return null;
  return (
    <Card title={<>Messages{control.unreadMessages > 0 && <span className="muted" style={{ marginLeft: 6, fontWeight: 600 }}>{control.unreadMessages} new</span>}</>}>
      <ul className="list">
        {talking.map((c) => (
          <li key={c.id}>
            <div className="who"><a href={href.client(c.id)}>{c.name}</a>{c.business && <span className="muted">, {c.business}</span>}</div>
            <div className="meta">last message {ago(c.lastMessageAt)}</div>
            <div className="acts">
              {c.unreadMessages > 0 && <Chip tone="warn">{c.unreadMessages} new</Chip>}
              <a className="button small" href={href.client(c.id)}>Open</a>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
};

const Requests: React.FC = () => {
  const control = useControl();
  const signing = useSigning();
  const shown = control.requests.filter((r) => r.status === 'pending' || r.status === 'approved' || Date.now() - Date.parse(r.decidedAt || r.createdAt) < WEEK);
  const pending = shown.filter((r) => r.status === 'pending').length;
  return (
    <Card title="License requests" actions={<button className="small" onClick={() => void control.reload()}>Refresh</button>}>
      {pending > 0 && !signing.unlocked && <Msg tone="warn">Unlock the signing key (<a href={href.settings}>Settings</a>, or the key button) to approve requests.</Msg>}
      {shown.length === 0 ? (
        <Empty icon={<Icon name="check" size={30} />}>No requests this week. Clients send them from their app: I've paid, or Ask my provider for a free trial.</Empty>
      ) : (
        <ul className="list">{shown.map((r) => <RequestRow key={r.id} request={r} showApp />)}</ul>
      )}
    </Card>
  );
};
