// The client's side (C3): their invite link (#/join/<token>), their sign-in, and their own area (#/my): installations,
// licenses and keys, renewals, and messages with their provider. Its own simple page, like the store: none of the
// owner's menus, nothing of the owner's session, and never the signing key.
import React, { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { clientApi, CONTROL_URL, currentClientSession, onClientSession } from '../../lib/control/api';
import { clientSignIn, clientSignOut, joinWithInvite, passkeyError, readInvite, type InviteInfo } from '../../lib/control/passkey';
import type { Message, MyInstallation, MyRequest } from '../../lib/control/types';
import { ago, day, gb, plural } from '../../lib/format';
import { go, href, type MyTab } from '../../router';
import { Icon, Logo } from '../../components/Icon';
import { Thread } from '../../components/Thread';
import { ActionButton, Card, Chip, CopyButton, Empty, Field, Msg, Say, Segmented, type Tone } from '../../components/ui';

const useClientSession = () => useSyncExternalStore(onClientSession, currentClientSession);

/** The frame every client page shares: a plain header with their name, and the page. */
const Frame: React.FC<{ name?: string; tab?: MyTab; unread?: number; children: React.ReactNode }> = ({ name, tab, unread = 0, children }) => {
  useEffect(() => {
    document.title = name ? `${name} · Your apps` : 'Your apps';
  }, [name]);
  return (
    <>
      <header className="store-top">
        <span className="store-brand"><Logo size={30} /> Your apps</span>
        <h1>{name ? `Hi, ${name.split(' ')[0]}` : 'Your apps'}</h1>
        {name && (
          <nav className="my-tabs" aria-label="Your pages">
            <a href={href.my()} aria-current={tab === 'home' ? 'page' : undefined}>Installations</a>
            <a href={href.my('licenses')} aria-current={tab === 'licenses' ? 'page' : undefined}>Licenses</a>
            <a href={href.my('messages')} aria-current={tab === 'messages' ? 'page' : undefined}>
              Messages{unread > 0 && <em className="count" aria-label={`${unread} new`}>{unread}</em>}
            </a>
          </nav>
        )}
      </header>
      <main className="store-main">{children}</main>
    </>
  );
};

// ---------- #/join/<token>: the invite link ----------

export const JoinPage: React.FC<{ token: string }> = ({ token }) => {
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [device, setDevice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!CONTROL_URL) {
      setError("This page isn't open on this address.");
      return;
    }
    readInvite(token).then(setInfo, (e: Error) => setError(e.message));
  }, [token]);

  const join = async () => {
    setBusy(true);
    setError(null);
    try {
      await joinWithInvite(token, device.trim() || 'Phone');
      go(href.my());
    } catch (e) {
      setError(passkeyError(e, 'Setting up the passkey'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Frame>
      <Card title={info ? `Welcome, ${info.client.name}` : 'Your invite'}>
        {!info && !error && <p className="muted">Checking your invite…</p>}
        {info && (
          <div className="stack">
            <p>Your provider made you a page for your apps{info.client.business ? ` at ${info.client.business}` : ''}: your installations, licenses, renewals, and messages with them.</p>
            <p className="small muted">Set up a <b>passkey</b> on this phone: you'll sign in with your fingerprint, face or screen lock. No password to remember. This link works once.</p>
            <Field label="This phone (optional)"><input value={device} onChange={(e) => setDevice(e.target.value)} placeholder="e.g. My phone" autoComplete="off" /></Field>
            <button className="primary" disabled={busy} onClick={() => void join()}>{busy ? 'Setting up…' : 'Set up my passkey'}</button>
          </div>
        )}
        <Say text={error} />
        {error && !info && <p className="small muted">Ask your provider for a new link. Already set up? <a href={href.my()}>Sign in</a>.</p>}
      </Card>
    </Frame>
  );
};

// ---------- #/my: sign in, then their area ----------

export const MyPage: React.FC<{ tab: MyTab }> = ({ tab }) => {
  const signed = useClientSession();
  if (!CONTROL_URL) return <Frame><Msg tone="info">This page isn't open on this address.</Msg></Frame>;
  if (!signed) return <SignIn />;
  return <MyArea tab={tab} name={signed.name} />;
};

const SignIn: React.FC = () => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      await clientSignIn();
    } catch (e) {
      setError(passkeyError(e, 'Sign-in'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Frame>
      <Card title="Sign in">
        <div className="stack">
          <p>Your installations, licenses and messages with your provider.</p>
          <button className="primary" disabled={busy} onClick={() => void run()}>{busy ? 'Signing in…' : 'Sign in with passkey'}</button>
          <Say text={error} />
          <p className="small muted">First time? Open the invite link your provider sent you, on your phone.</p>
          <a className="small" href={href.store()}><Icon name="left" size={14} /> The store</a>
        </div>
      </Card>
    </Frame>
  );
};

type Data = { installs: MyInstallation[]; requests: MyRequest[]; messages: Message[]; unread: number };

const MyArea: React.FC<{ tab: MyTab; name: string }> = ({ tab, name }) => {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      // Messages are fetched (and so marked read) only on the Messages page.
      const [me, installs, requests, messages] = await Promise.all([
        clientApi<{ unreadMessages: number }>('GET', '/client/me'),
        clientApi<MyInstallation[]>('GET', '/client/installations'),
        clientApi<MyRequest[]>('GET', '/client/license-requests'),
        tab === 'messages' ? clientApi<Message[]>('GET', '/client/messages') : Promise.resolve(null),
      ]);
      setData((d) => ({ installs, requests, messages: messages ?? d?.messages ?? [], unread: tab === 'messages' ? 0 : me.unreadMessages }));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [tab]);

  useEffect(() => {
    void load();
    const onVisible = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener('visibilitychange', onVisible);
    // While on the messages page, look for a reply every 20 s.
    const timer = tab === 'messages' ? window.setInterval(() => void load(), 20_000) : undefined;
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      if (timer) window.clearInterval(timer);
    };
  }, [load, tab]);

  return (
    <Frame name={name} tab={tab} unread={data?.unread}>
      <Say text={error} />
      {!data && !error && <div className="card"><p className="muted">Loading…</p></div>}
      {data && tab === 'home' && <MyInstalls installs={data.installs} onChange={load} />}
      {data && tab === 'licenses' && <MyLicenses requests={data.requests} />}
      {data && tab === 'messages' && (
        <Card title="Messages with your provider">
          <Thread
            messages={data.messages}
            mine="client"
            theirName="Your provider"
            empty="Write to your provider: a question, a problem, or anything about your apps."
            onSend={async (body) => {
              await clientApi('POST', '/client/messages', { body });
              await load();
            }}
          />
        </Card>
      )}
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <a className="small" href={href.store()} style={{ flex: '0 0 auto' }}>The store</a>
        <div style={{ flex: '0 0 auto' }}><ActionButton className="small" onClick={clientSignOut}>Sign out</ActionButton></div>
      </div>
    </Frame>
  );
};

const ALERTS: Record<string, string> = {
  silent: "Hasn't been in touch for 2 days",
  license_locked: 'Needs a license',
  license_ending: 'License ends soon',
  backup_old: 'No recent backup',
  disk_low: 'Low on disk space',
};

function stateChip(i: MyInstallation): { tone: Tone; text: string } {
  const l = i.license;
  if (!l) return { tone: 'info', text: 'Not reported yet' };
  if (l.state !== 'Valid') return { tone: 'bad', text: l.state === 'Missing' ? 'No license' : l.state === 'Expired' ? 'Ended' : 'Needs a license' };
  const plan = l.plan === 'trial' ? 'Trial' : l.plan === 'yearly' ? 'Yearly' : l.plan === 'monthly' ? 'Monthly' : 'Licensed';
  if (l.daysLeft != null && l.daysLeft <= 7) return { tone: 'warn', text: `${plan} · ${plural(Math.max(l.daysLeft, 0), 'day')} left` };
  return { tone: 'ok', text: `${plan} · until ${day(l.expiresAt)}` };
}

const REQUEST_TEXT: Record<string, string> = {
  pending: 'Waiting for your provider',
  approved: 'Approved: it turns on by itself within a minute',
  declined: 'Declined',
  delivered: 'Done',
};

const MyInstalls: React.FC<{ installs: MyInstallation[]; onChange: () => Promise<void> }> = ({ installs, onChange }) => {
  if (installs.length === 0) {
    return <Card><Empty icon={<Icon name="apps" size={30} />}>Nothing here yet. Your provider links your installations to your page.</Empty></Card>;
  }
  return <>{installs.map((i) => <MyInstall key={i.id} install={i} onChange={onChange} />)}</>;
};

const MyInstall: React.FC<{ install: MyInstallation; onChange: () => Promise<void> }> = ({ install: i, onChange }) => {
  const [renewing, setRenewing] = useState(false);
  const chip = stateChip(i);
  const waiting = i.request?.status === 'pending' || i.request?.status === 'approved';
  return (
    <Card title={<>{i.product.name}{i.label && <span className="muted" style={{ fontWeight: 600 }}> · {i.label}</span>}</>} actions={<Chip tone={chip.tone}>{chip.text}</Chip>}>
      <div className="stack">
        {i.alerts.length > 0 && <Msg tone="warn">{i.alerts.map((a) => ALERTS[a] ?? a).join(' · ')}</Msg>}
        <dl className="facts">
          <dt>Installation ID</dt><dd className="mono">{i.installationId ?? '—'}</dd>
          <dt>Version</dt><dd>{i.version ?? '—'}</dd>
          <dt>Last in touch</dt><dd>{ago(i.lastSeenAt)}</dd>
          <dt>Last backup</dt><dd>{i.backup ? (i.backup.lastAt ? ago(i.backup.lastAt) : 'none yet') : '—'}</dd>
          {i.disk && <><dt>Free disk</dt><dd>{gb(i.disk.freeBytes)} of {gb(i.disk.totalBytes)}</dd></>}
        </dl>
        {i.request && (i.request.status !== 'delivered' || Date.now() - Date.parse(i.request.createdAt) < 7 * 864e5) && (
          <p className="small"><b>Your {i.request.plan === 'trial' ? 'trial' : i.request.plan} request</b> ({ago(i.request.createdAt)}): {REQUEST_TEXT[i.request.status] ?? i.request.status}.{i.request.status === 'declined' && <> See <a href={href.my('licenses')}>Licenses</a> for why.</>}</p>
        )}
        {renewing ? (
          <RenewForm install={i} onDone={async () => { setRenewing(false); await onChange(); }} onCancel={() => setRenewing(false)} />
        ) : (
          !waiting || i.request?.status === 'pending' ? (
            <div><button className={i.alerts.includes('license_ending') || i.alerts.includes('license_locked') ? 'primary' : undefined} onClick={() => setRenewing(true)}>{i.request?.status === 'pending' ? 'Change my request' : 'Renew or get a license'}</button></div>
          ) : null
        )}
      </div>
    </Card>
  );
};

const RenewForm: React.FC<{ install: MyInstallation; onDone: () => Promise<void>; onCancel: () => void }> = ({ install, onDone, onCancel }) => {
  const [plan, setPlan] = useState<'monthly' | 'yearly' | 'trial'>('monthly');
  const [ref, setRef] = useState('');
  const send = async () => {
    await clientApi('POST', '/client/license-requests', { installation: install.id, plan, paymentReference: plan === 'trial' ? undefined : ref });
    await onDone();
  };
  return (
    <div className="detail">
      <Segmented label="Plan" value={plan} onChange={setPlan} options={[{ value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly' }, { value: 'trial', label: 'Free trial' }]} />
      {plan === 'trial' ? (
        <p className="small muted">Ask your provider for a free trial. They'll approve it, and it turns on by itself.</p>
      ) : (
        <Field label="Payment reference" hint="Pay your provider first (GCash, bank…), then type the reference number from the receipt.">
          <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. 1234 567 890" autoComplete="off" />
        </Field>
      )}
      <div className="row">
        <div style={{ flex: '0 0 auto' }}><ActionButton className="primary" onClick={send}>Send to my provider</ActionButton></div>
        <button style={{ flex: '0 0 auto' }} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
};

const MyLicenses: React.FC<{ requests: MyRequest[] }> = ({ requests }) => {
  const tone = (s: MyRequest['status']): Tone => (s === 'declined' ? 'bad' : s === 'pending' ? 'warn' : 'ok');
  return (
    <Card title="Licenses and requests">
      {requests.length === 0 ? (
        <Empty icon={<Icon name="key" size={30} />}>No licenses through this page yet. Renew from Installations, or from your app's license screen.</Empty>
      ) : (
        <ul className="list">
          {requests.map((r) => (
            <li key={r.id}>
              <div className="who">{r.product.name} · {r.plan === 'trial' ? 'Free trial' : r.plan === 'yearly' ? 'Yearly' : 'Monthly'}</div>
              <div className="meta">{r.installation.installationId ?? ''} · asked {day(r.createdAt)}{r.expiresAt ? ` · until ${day(r.expiresAt)}` : ''}</div>
              <div className="acts"><Chip tone={tone(r.status)}>{r.status === 'delivered' ? 'Active' : r.status === 'approved' ? 'Approved' : r.status === 'pending' ? 'Waiting' : 'Declined'}</Chip></div>
              {r.status === 'declined' && r.note && <div className="wide small">Your provider: “{r.note}”</div>}
              {r.licenseKey && (
                <div className="wide row" style={{ alignItems: 'center' }}>
                  <span className="small muted" style={{ flex: '1 1 auto' }}>It turns on by itself. If your app ever asks for the key, copy it from here.</span>
                  <div style={{ flex: '0 0 auto' }}><CopyButton text={r.licenseKey} label="Copy key" /></div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};
