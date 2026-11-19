import React, { useState } from 'react';
import { addPasskey, passkeyError, signIn } from '../lib/control/passkey';
import { PASSWORD_MIN, passwordSignIn, setPassword } from '../lib/control/password';
import { useControl } from '../state/control';
import { Card, Field, Msg, Say, Segmented } from './ui';

/** Sign in to Control: with this device's passkey, or the password (the fallback when no passkey is here). The very
 *  first time, with Control's setup code, this device gets the first passkey. */
export const ControlSignIn: React.FC = () => {
  const control = useControl();
  const [way, setWay] = useState<'passkey' | 'password'>('passkey');
  const [code, setCode] = useState('');
  const [device, setDevice] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (what: string, fn: () => Promise<boolean | void>) => {
    setBusy(true);
    setError(null);
    try {
      const mustChange = await fn();
      control.signedInNow(mustChange === true);
    } catch (e) {
      setError(passkeyError(e, what));
    } finally {
      setBusy(false);
    }
  };

  if (!control.available) return null;
  const firstTime = control.hasPasskey === false && !control.hasPassword;
  return (
    <Card title="Sign in to Control">
      <p className="small muted">Your clients, installations and license requests, from every app.</p>
      {!firstTime && (
        <Segmented label="How to sign in" value={way} onChange={setWay} options={[{ value: 'passkey', label: 'Passkey' }, { value: 'password', label: 'Password' }]} />
      )}
      {firstTime ? (
        <div className="stack">
          <p className="small muted">First time: type the setup code Control printed, and this device gets the passkey.</p>
          <Field label="Setup code">
            <input value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX" />
          </Field>
          <Field label="This device">
            <input value={device} onChange={(e) => setDevice(e.target.value)} autoComplete="off" placeholder="e.g. iPhone" />
          </Field>
          <button className="primary" disabled={busy || !code.trim()} onClick={() => void run('Setting up the passkey', () => addPasskey(device.trim() || 'Phone', code.trim()))}>
            Set up passkey
          </button>
        </div>
      ) : way === 'passkey' ? (
        <div className="stack">
          <button className="primary" disabled={busy || control.hasPasskey === null} onClick={() => void run('Sign-in', signIn)}>
            Sign in with passkey
          </button>
          <p className="small muted">No passkey on this device? Use your password, or open an add-device link made on a signed-in device (Settings).</p>
        </div>
      ) : (
        <form className="stack" onSubmit={(e) => { e.preventDefault(); void run('Sign-in', () => passwordSignIn(username, password)); }}>
          <Field label="Username"><input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} /></Field>
          <Field label="Password"><input type="password" value={password} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" /></Field>
          <button className="primary" type="submit" disabled={busy || !username.trim() || !password}>{busy ? 'Checking…' : 'Sign in'}</button>
        </form>
      )}
      <Say text={error ?? (control.hasPasskey === null ? control.error : null)} />
    </Card>
  );
};

/** After signing in with a seeded password: choose your own before anything else (Control allows nothing else yet). */
export const ChooseOwnPassword: React.FC = () => {
  const control = useControl();
  const [pw, setPw] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      if (pw !== again) throw new Error("The two passwords aren't the same.");
      await setPassword(pw);
      control.signedInNow(false);
      await control.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card title="Choose your own password">
      <form className="stack" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <Msg tone="info">You signed in with the starting password. Choose your own now: the starting one stops working.</Msg>
        <Field label="New password" hint={`At least ${PASSWORD_MIN} characters. A short sentence is easy to remember and hard to guess.`}>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
        </Field>
        <Field label="Once more"><input type="password" value={again} onChange={(e) => setAgain(e.target.value)} autoComplete="new-password" /></Field>
        <div className="row">
          <button className="primary" type="submit" disabled={busy || pw.length < PASSWORD_MIN || !again} style={{ flex: '0 0 auto' }}>{busy ? 'Saving…' : 'Save my password'}</button>
          <button type="button" style={{ flex: '0 0 auto' }} onClick={() => void control.signOut()}>Sign out</button>
        </div>
        <Say text={error} />
      </form>
    </Card>
  );
};
