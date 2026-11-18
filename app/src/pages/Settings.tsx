import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/control/api';
import { addPasskey, passkeyError } from '../lib/control/passkey';
import { pushState, turnPushOff, turnPushOn, type PushState } from '../lib/control/push';
import type { Passkey, StoreDetails } from '../lib/control/types';
import { day } from '../lib/format';
import { href } from '../router';
import { useControl } from '../state/control';
import { useSigning } from '../state/signing';
import { ControlSignIn } from '../components/ControlSignIn';
import { ActionButton, Card, CopyButton, Field, Msg, PageHead, Say, Segmented } from '../components/ui';
import { UnlockInline } from './app/Keys';

export const Settings: React.FC = () => (
  <>
    <PageHead eyebrow="Your key, your store, your devices" title="Settings" />
    <div className="cols two">
      <div className="stack" style={{ gap: 16 }}>
        <SigningKeyCard />
        <PaymentCard />
      </div>
      <div className="stack" style={{ gap: 16 }}>
        <ControlCard />
        <StoreCard />
      </div>
    </div>
  </>
);

/** The signing key on this device: set it up once, unlock it to make keys, its locked backup code, remove it. */
const SigningKeyCard: React.FC = () => {
  const signing = useSigning();
  const [mode, setMode] = useState<'code' | 'file'>('code');
  const [code, setCode] = useState('');
  const [codePass, setCodePass] = useState('');
  const [pem, setPem] = useState('');
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [msg, setMsg] = useState<{ text: string; tone: 'bad' | 'warn' } | null>(null);
  const [busy, setBusy] = useState(false);
  const [sure, setSure] = useState(false);

  if (signing.unsupported) return <Card title="Signing key"><Msg>This browser can't make licenses. Use Safari on iPhone or Chrome on Android.</Msg></Card>;

  const setUp = async () => {
    setBusy(true);
    setMsg({ text: 'Checking…', tone: 'warn' });
    try {
      const warning = mode === 'code' ? await signing.saveFromBackupCode(code, codePass) : await signing.saveFromKeyFile(pem, p1, p2);
      setMsg(warning ? { text: warning, tone: 'warn' } : null);
      setCode(''); setCodePass(''); setPem(''); setP1(''); setP2('');
    } catch (e) {
      setMsg({ text: (e as Error).message, tone: 'bad' });
    } finally {
      setBusy(false);
    }
  };

  if (!signing.hasKey) {
    return (
      <Card title="Set up the signing key (once)">
        <Segmented label="How to set up" value={mode} onChange={(m) => { setMode(m); setMsg(null); }} options={[{ value: 'code', label: 'Locked backup code' }, { value: 'file', label: 'Key file' }]} />
        {mode === 'code' ? (
          <>
            <p className="small muted">Paste the locked backup code (it starts with <b>LMK1.</b>) and its password. Make the code on your laptop with this same app: set it up there with the key file, then copy its <b>Locked backup code</b>.</p>
            <Field label="Locked backup code"><textarea value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} autoComplete="off" placeholder="LMK1.…" /></Field>
            <Field label="Its password"><input type="password" value={codePass} onChange={(e) => setCodePass(e.target.value)} autoComplete="current-password" /></Field>
          </>
        ) : (
          <>
            <p className="small muted">Use your <b>private-key.pem</b> (in <b>.pos-license</b> on your laptop). It is saved only on this device, locked with a password you choose, and never sent anywhere.</p>
            <Field label="Key file"><input type="file" accept=".pem,.txt,text/plain" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setPem(await f.text()); }} /></Field>
            <Field label="Or paste it"><textarea value={pem} onChange={(e) => setPem(e.target.value)} spellCheck={false} autoComplete="off" placeholder={'-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----'} /></Field>
            <div className="row">
              <Field label="Password"><input type="password" value={p1} onChange={(e) => setP1(e.target.value)} autoComplete="new-password" /></Field>
              <Field label="Same password again"><input type="password" value={p2} onChange={(e) => setP2(e.target.value)} autoComplete="new-password" /></Field>
            </div>
            <p className="small muted">At least 10 characters; a few words together is good. Without it the saved key can't be used.</p>
          </>
        )}
        {msg && <Msg tone={msg.tone}>{msg.text}</Msg>}
        <button className="primary" disabled={busy} onClick={() => void setUp()}>Set up</button>
      </Card>
    );
  }

  return (
    <Card title="Signing key" actions={signing.unlocked && <button className="small" onClick={signing.lock}>Lock</button>}>
      {msg && <Msg tone={msg.tone}>{msg.text}</Msg>}
      {signing.unlocked ? (
        <Msg tone="ok">Unlocked on this device. It locks again after 10 minutes in the background.</Msg>
      ) : (
        <UnlockInline />
      )}
      {signing.backupCode && (
        <details>
          <summary>Locked backup code</summary>
          <div className="stack" style={{ marginTop: 10 }}>
            <p className="small muted">Your key, locked with your password, as one line of text. Without the password it is useless, so you can keep it in Notes or a password manager, or send it to your phone. Paste it under <b>Set up</b> to put the key on another device.</p>
            <div className="keytext">{signing.backupCode}</div>
            <CopyButton text={signing.backupCode} label="Copy locked backup code" className="" />
          </div>
        </details>
      )}
      <details>
        <summary>Remove the key from this device</summary>
        <div className="stack" style={{ marginTop: 10 }}>
          <p className="small muted">Deletes the saved key here. Licenses you already made keep working. Make sure you have the locked backup code or the key file first.</p>
          <label className="row" style={{ alignItems: 'center', fontWeight: 500 }}>
            <input type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} style={{ width: 'auto', flex: 'none' }} /> Yes, remove it
          </label>
          <button disabled={!sure} onClick={() => { signing.forget(); setSure(false); }}>Remove the key</button>
        </div>
      </details>
    </Card>
  );
};

/** How clients pay you, and where "I've paid" reaches you: written into every key made here. */
const PaymentCard: React.FC = () => {
  const signing = useSigning();
  const p = signing.payment;
  return (
    <Card title="Payment details on every key">
      <p className="small muted">Shown in the apps on the trial and renewal notices and the license screen. Kept on this device.</p>
      <Field label="How the client pays you" hint="One item per line, e.g. GCash: 0917 000 0000 (Juan D.)">
        <textarea value={p.pay} maxLength={500} spellCheck={false} onChange={(e) => signing.setPayment({ ...p, pay: e.target.value })} placeholder={'GCash: 0917 000 0000 (Juan D.)\nBDO: 0000 0000 0000'} />
      </Field>
      <div className="row">
        <Field label="Your Messenger username"><input value={p.msgr} onChange={(e) => signing.setPayment({ ...p, msgr: e.target.value })} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="m.me/juan.delacruz" /></Field>
        <Field label="Your mobile (SMS)"><input value={p.tel} inputMode="tel" onChange={(e) => signing.setPayment({ ...p, tel: e.target.value })} autoComplete="off" placeholder="0917 000 0000" /></Field>
      </div>
    </Card>
  );
};

/** Control: this device's passkey and notifications, the other devices, signing out. */
const ControlCard: React.FC = () => {
  const control = useControl();
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [push, setPush] = useState<PushState | null>(null);
  const [device, setDevice] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!control.signedIn) return;
    try {
      setPasskeys(await api<Passkey[]>('GET', '/owner/passkeys'));
    } catch (e) {
      setError((e as Error).message);
    }
    setPush(await pushState());
  }, [control.signedIn]);
  useEffect(() => {
    void load();
  }, [load]);

  if (!control.available) return <Card title="Control"><Msg tone="info">Control isn't connected on this address yet.</Msg></Card>;
  if (!control.signedIn) return <ControlSignIn />;

  return (
    <Card title="Control" actions={<button className="small" onClick={() => void control.signOut()}>Sign out</button>}>
      <div>
        <h3 className="small" style={{ marginBottom: 6 }}>Notifications on this device</h3>
        {push && !push.supported ? (
          <p className="small muted">{push.hint}</p>
        ) : (
          <div className="row" style={{ alignItems: 'center' }}>
            <p className="small muted" style={{ flex: '3 1 200px' }}>{push?.on ? 'This device is told when a client sends a license request.' : 'Get told on this device when a client sends a license request.'}</p>
            <div style={{ flex: '0 0 auto' }}>
              <ActionButton className="small" onClick={async () => { await (push?.on ? turnPushOff() : turnPushOn()); setPush(await pushState()); }}>
                {push?.on ? 'Turn off' : 'Turn on'}
              </ActionButton>
            </div>
          </div>
        )}
      </div>
      <div>
        <h3 className="small" style={{ marginBottom: 6 }}>Passkeys (devices that can sign in)</h3>
        <ul className="list">
          {passkeys.map((k) => (
            <li key={k.id}>
              <div className="who">{k.name}{k.current ? ' (this one)' : ''}</div>
              <div className="acts">
                {!k.current && passkeys.length > 1 && (
                  <ActionButton className="small" onClick={async () => { await api('DELETE', `/owner/passkeys/${encodeURIComponent(k.id)}`); await load(); }}>Remove</ActionButton>
                )}
              </div>
              <div className="meta">added {day(k.createdAt)} · last used {day(k.lastUsedAt)}</div>
            </li>
          ))}
        </ul>
      </div>
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <Field label="Add another device's passkey"><input value={device} onChange={(e) => setDevice(e.target.value)} placeholder="e.g. Laptop" autoComplete="off" /></Field>
        <button style={{ flex: '0 0 auto' }} onClick={async () => {
          setError(null);
          try { await addPasskey(device.trim() || 'Device'); setDevice(''); await load(); } catch (e) { setError(passkeyError(e, 'Adding the passkey')); }
        }}>Add passkey</button>
      </div>
      <p className="small muted">Do this on the device that should get the passkey, while signed in there.</p>
      <Say text={error} />
    </Card>
  );
};

/** The public store's own details: its name, a line about it, and how clients reach you (Messenger, a text). */
const StoreCard: React.FC = () => {
  const control = useControl();
  const [store, setStore] = useState<StoreDetails | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (control.signedIn) api<StoreDetails>('GET', '/owner/store').then(setStore, () => setStore(null));
  }, [control.signedIn]);
  if (!control.signedIn || !store) return null;
  const set = (k: keyof StoreDetails, v: string) => { setStore({ ...store, [k]: v }); setSaved(false); };
  return (
    <Card title="Your store" actions={<a href={href.store()} className="small">Open it</a>}>
      <p className="small muted">The public page clients open: every app you publish (an app's <b>Store listing</b> tab). Give them this address: <span className="mono">{location.origin + location.pathname}#/store</span></p>
      <Field label="Store name"><input value={store.name ?? ''} maxLength={60} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Apps by Sherwin" /></Field>
      <Field label="About (one line)"><input value={store.about ?? ''} maxLength={300} onChange={(e) => set('about', e.target.value)} placeholder="Software for small businesses." /></Field>
      <div className="row">
        <Field label="Messenger username"><input value={store.messenger ?? ''} onChange={(e) => set('messenger', e.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="m.me/juan.delacruz" /></Field>
        <Field label="Mobile (for texts)"><input value={store.mobile ?? ''} inputMode="tel" onChange={(e) => set('mobile', e.target.value)} autoComplete="off" placeholder="0917 000 0000" /></Field>
      </div>
      <p className="small muted">Shown on the store, so clients can message you about an app.</p>
      {saved && <Msg tone="ok">Saved.</Msg>}
      <ActionButton className="primary" onClick={async () => { setStore(await api<StoreDetails>('PUT', '/owner/store', store)); setSaved(true); }}>Save store details</ActionButton>
    </Card>
  );
};
