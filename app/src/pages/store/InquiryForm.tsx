import React, { useRef, useState } from 'react';
import { CONTROL_URL } from '../../lib/control/api';
import { Field, Msg, Say, Segmented } from '../../components/ui';
import { Icon } from '../../components/Icon';

type Kind = 'messenger' | 'mobile' | 'email';

const PLACEHOLDER: Record<Kind, string> = { messenger: 'm.me/your.name', mobile: '0917 000 0000', email: 'you@example.com' };

type Download = { link: string; filename: string; size: number; expiresAt: string };

const mb = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** "I'm interested": a client asks about an app (or the store) and leaves how to reach them. Control guards it
 *  (a hidden field bots fill in, a minimum time, rate limits); no third-party script is loaded here. With
 *  `download` (the owner's Instant download), sending it gives the installer at once, through a private link. */
export const InquiryForm: React.FC<{ product: string | null; appName: string; download?: boolean }> = ({ product, appName, download: offersDownload = false }) => {
  const opened = useRef(Date.now());
  const [name, setName] = useState('');
  const [business, setBusiness] = useState('');
  const [kind, setKind] = useState<Kind>('messenger');
  const [contact, setContact] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // the hidden field
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [download, setDownload] = useState<Download | null>(null);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!CONTROL_URL) return setError("The store can't take messages right now.");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${CONTROL_URL}/store/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product, name, business, contactKind: kind, contact, message, website, elapsedMs: Date.now() - opened.current }),
      });
      const json = (await res.json().catch(() => null)) as { error?: { message?: string }; download?: Download } | null;
      if (!res.ok) throw new Error(json?.error?.message || 'That didn\'t go through. Please try again.');
      // Only a link to Control's own download page (the address the form was sent to) is shown.
      const d = json?.download;
      if (d && typeof d.link === 'string' && d.link.startsWith(`${CONTROL_URL}/download/`)) setDownload(d);
      setSent(true);
    } catch (err) {
      setError(err instanceof TypeError ? "The store can't be reached. Check the internet connection." : (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (sent && download) {
    return (
      <div className="stack">
        <div className="inquiry-done">
          <Icon name="check" size={28} />
          <div>
            <b>Thanks, {name.split(' ')[0]}! Your {appName} installer is ready.</b>
            <p className="muted">Download it on the computer where {appName} will run.</p>
          </div>
        </div>
        <a className="button primary" href={`${download.link}/file`} rel="noopener noreferrer">Download {download.filename} ({mb(download.size)})</a>
        <ol className="small muted" style={{ margin: 0, paddingLeft: 20 }}>
          <li>Double-click {download.filename}. If Windows says "Windows protected your PC", click <b>More info</b>, then <b>Run anyway</b>.</li>
          <li>It installs everything by itself, then opens {appName}.</li>
          <li>On its license screen, tap <b>Ask my provider for a free trial</b>: it starts within a minute.</li>
        </ol>
        <p className="small muted">This link is yours: it works for 7 days, a few downloads. <a href={download.link} rel="noopener noreferrer">Keep the download page</a>.</p>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="inquiry-done">
        <Icon name="check" size={28} />
        <div>
          <b>Thanks, {name.split(' ')[0]}!</b>
          <p className="muted">We got your message about {appName} and will reach you by {kind === 'email' ? 'email' : kind === 'mobile' ? 'text' : 'Messenger'} soon.</p>
        </div>
      </div>
    );
  }

  return (
    <form className="stack" onSubmit={(e) => void send(e)}>
      <h2>Interested in {appName}?</h2>
      <p className="small muted">{offersDownload ? `Leave your details and download ${appName} right away. We'll reach you too.` : "Leave your details and we'll get back to you, usually within a day."}</p>
      <div className="row">
        <Field label="Your name"><input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" required /></Field>
        <Field label="Business (optional)"><input value={business} onChange={(e) => setBusiness(e.target.value)} maxLength={80} autoComplete="organization" /></Field>
      </div>
      <Segmented<Kind> label="How we reach you" value={kind} onChange={(k) => { setKind(k); setContact(''); }}
        options={[{ value: 'messenger', label: 'Messenger' }, { value: 'mobile', label: 'Mobile' }, { value: 'email', label: 'Email' }]} />
      <Field label={kind === 'messenger' ? 'Messenger username' : kind === 'mobile' ? 'Mobile number' : 'Email'}>
        <input value={contact} onChange={(e) => setContact(e.target.value)} maxLength={120} placeholder={PLACEHOLDER[kind]} required
          inputMode={kind === 'mobile' ? 'tel' : kind === 'email' ? 'email' : 'text'} autoComplete={kind === 'mobile' ? 'tel' : kind === 'email' ? 'email' : 'off'} autoCapitalize="none" />
      </Field>
      <Field label="Message (optional)">
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} placeholder="e.g. How many branches can it handle?" style={{ fontFamily: 'var(--sans)', fontSize: 15, minHeight: 80 }} />
      </Field>
      {/* Bots fill in every field; people never see this one. */}
      <div className="hp" aria-hidden="true">
        <label>Website <input value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" /></label>
      </div>
      <Say text={error} />
      <button className="primary" type="submit" disabled={busy || !name.trim() || !contact.trim()}>{busy ? 'Sending…' : offersDownload ? 'Send and download' : 'Send'}</button>
      <Msg tone="info">We only use these details to answer you.</Msg>
    </form>
  );
};
