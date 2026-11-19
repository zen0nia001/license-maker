// #/add-device/<link>: put the owner's passkey on this device with a one-time link made on a signed-in device
// (Settings → Add another device). Control: POST /owner/device-invites, then register with { deviceInvite }.
import React, { useState } from 'react';
import { addPasskey, passkeyError } from '../lib/control/passkey';
import { go, href } from '../router';
import { useControl } from '../state/control';
import { Card, Field, Msg, PageHead, Say } from '../components/ui';

export const AddDevice: React.FC<{ token: string }> = ({ token }) => {
  const control = useControl();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const add = async () => {
    setBusy(true);
    setError(null);
    try {
      await addPasskey(name.trim() || 'Device', undefined, token);
      control.signedInNow();
      go(href.home);
    } catch (e) {
      setError(passkeyError(e, 'Adding the passkey'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHead eyebrow="Owner" title="Add this device" />
      <Card>
        {!control.available ? (
          <Msg tone="info">Control isn't connected on this address.</Msg>
        ) : (
          <div className="stack">
            <p>This puts your owner passkey on this phone or computer, so you can sign in here with your fingerprint, face or screen lock. The link works once, for an hour.</p>
            <Field label="This device"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Laptop" autoComplete="off" /></Field>
            <div><button className="primary" disabled={busy} onClick={() => void add()}>{busy ? 'Adding…' : 'Add my passkey here'}</button></div>
            <Say text={error} />
          </div>
        )}
      </Card>
    </>
  );
};
