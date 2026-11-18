import React, { useState } from 'react';
import { addPasskey, passkeyError, signIn } from '../lib/control/passkey';
import { useControl } from '../state/control';
import { Card, Field, Say } from './ui';

/** Sign in to Control with this device's passkey; the very first time, set one up with Control's setup code. */
export const ControlSignIn: React.FC = () => {
  const control = useControl();
  const [code, setCode] = useState('');
  const [device, setDevice] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (what: string, fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      control.signedInNow();
    } catch (e) {
      setError(passkeyError(e, what));
    } finally {
      setBusy(false);
    }
  };

  if (!control.available) return null;
  return (
    <Card title="Sign in to Control">
      <p className="small muted">Your installations and license requests, from every app. Sign in with this device's passkey.</p>
      {control.hasPasskey === false ? (
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
      ) : (
        <button className="primary" disabled={busy || control.hasPasskey === null} onClick={() => void run('Sign-in', signIn)}>
          Sign in with passkey
        </button>
      )}
      <Say text={error ?? (control.hasPasskey === null ? control.error : null)} />
    </Card>
  );
};
