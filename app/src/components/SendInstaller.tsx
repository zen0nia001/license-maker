// "Send installer": a private download link for one app's installer (7 days, 3 downloads), with a ready message to
// paste into Messenger or a text. Used on a store inquiry (Inbox) and on a client's page.
import React, { useState } from 'react';
import { api } from '../lib/control/api';
import { day } from '../lib/format';
import { href } from '../router';
import { useControl } from '../state/control';
import { ActionButton, CopyButton, Say } from './ui';

type Made = { id: string; link: string; expiresAt: string; maxDownloads: number; filename: string };

export const SendInstaller: React.FC<{
  /** The app to send, if known (an inquiry about POS); else the owner picks. */
  productId?: string | null;
  clientId?: string;
  inquiryId?: string;
  name: string;
  contactKind?: 'messenger' | 'mobile' | 'email' | null;
  contact?: string | null;
  onMade?: () => void;
}> = ({ productId, clientId, inquiryId, name, contactKind, contact, onMade }) => {
  const control = useControl();
  const ready = control.products.filter((p) => control.installers.some((i) => i.product === p.id));
  const [pick, setPick] = useState(productId && ready.some((p) => p.id === productId) ? productId : ready[0]?.id ?? '');
  const [made, setMade] = useState<Made | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (ready.length === 0) {
    return <p className="small muted">Upload an installer first: <a href={href.apps}>Apps</a> → the app → <b>Installer</b>.</p>;
  }
  const app = control.products.find((p) => p.id === pick);
  const first = name.split(' ')[0] || name;
  const message = made && app
    ? `Hi ${first}! Here's the ${app.name} installer: ${made.link}\n\nOpen it on the computer where ${app.name} will run and tap Download (the link works until ${day(made.expiresAt)}, up to ${made.maxDownloads} downloads). Double-click the file to install. When ${app.name} opens, tap "Ask my provider for a free trial" on its license screen and I'll turn it on.`
    : '';

  const make = async () => {
    setError(null);
    try {
      setMade(await api<Made>('POST', '/owner/download-links', { product: pick, clientId, inquiryId }));
      onMade?.();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="stack" style={{ gap: 8 }}>
      {!made ? (
        <div className="row" style={{ alignItems: 'center' }}>
          {ready.length > 1 && (
            <select value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Which app">
              {ready.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <div style={{ flex: '0 0 auto' }}><ActionButton className="primary small" onClick={make}>{`Make ${app?.name ?? ''} download link`}</ActionButton></div>
        </div>
      ) : (
        <>
          <p className="small">Send this to {first}. The link is shown only now; it works until {day(made.expiresAt)}, {made.maxDownloads} downloads.</p>
          {clientId && <p className="small muted">It also shows on {first}'s own page (Ready to install) until then: if they can sign in, they'll find it there without the link.</p>}
          <div className="mono small" style={{ overflowWrap: 'anywhere' }}>{made.link}</div>
          <div className="row" style={{ alignItems: 'center' }}>
            <div style={{ flex: '0 0 auto' }}><CopyButton text={message} label="Copy message" className="primary small" /></div>
            {contactKind === 'messenger' && contact && (
              <a className="button small" style={{ flex: '0 0 auto' }} href={`https://m.me/${encodeURIComponent(contact)}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">Send on Messenger</a>
            )}
            {contactKind === 'mobile' && contact && (
              <a className="button small" style={{ flex: '0 0 auto' }} href={`sms:${contact}?&body=${encodeURIComponent(message)}`}>Send by text</a>
            )}
            {contactKind === 'email' && contact && app && (
              <a className="button small" style={{ flex: '0 0 auto' }} href={`mailto:${contact}?subject=${encodeURIComponent(`${app.name} installer`)}&body=${encodeURIComponent(message)}`}>Send by email</a>
            )}
            <button className="small" style={{ flex: '0 0 auto' }} onClick={() => setMade(null)}>Done</button>
          </div>
        </>
      )}
      <Say text={error} />
    </div>
  );
};
