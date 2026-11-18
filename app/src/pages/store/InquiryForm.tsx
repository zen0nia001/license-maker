import React, { useRef, useState } from 'react';
import { CONTROL_URL } from '../../lib/control/api';
import { Field, Msg, Say, Segmented } from '../../components/ui';
import { Icon } from '../../components/Icon';

type Kind = 'messenger' | 'mobile' | 'email';

const PLACEHOLDER: Record<Kind, string> = { messenger: 'm.me/your.name', mobile: '0917 000 0000', email: 'you@example.com' };

/** "I'm interested": a client asks about an app (or the store) and leaves how to reach them. Control guards it
 *  (a hidden field bots fill in, a minimum time, rate limits); no third-party script is loaded here. */
export const InquiryForm: React.FC<{ product: string | null; appName: string }> = ({ product, appName }) => {
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
      const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!res.ok) throw new Error(json?.error?.message || 'That didn\'t go through. Please try again.');
      setSent(true);
    } catch (err) {
      setError(err instanceof TypeError ? "The store can't be reached. Check the internet connection." : (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

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
      <p className="small muted">Leave your details and we'll get back to you, usually within a day.</p>
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
      <button className="primary" type="submit" disabled={busy || !name.trim() || !contact.trim()}>{busy ? 'Sending…' : 'Send'}</button>
      <Msg tone="info">We only use these details to answer you.</Msg>
    </form>
  );
};
