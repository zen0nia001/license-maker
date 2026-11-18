import React, { useState } from 'react';
import { api } from '../lib/control/api';
import type { Product } from '../lib/control/types';
import { go, href } from '../router';
import { useControl } from '../state/control';
import { NeedsControl } from './app/AppPage';
import { Card, Field, Msg, Say } from '../components/ui';

/** "Add app": a new app Control knows, so it gets a page, a store listing, and (once its app has the provider
 *  connection and its key prefix built in) installations, requests and keys. */
export const AddApp: React.FC = () => (
  <>
    <h1>Add an app</h1>
    <NeedsControl><AddAppForm /></NeedsControl>
  </>
);

const AddAppForm: React.FC = () => {
  const control = useControl();
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [prefix, setPrefix] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const slug = id || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 20);
  const code = prefix || `${name.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3)}1`;

  const add = async () => {
    setBusy(true);
    setError(null);
    try {
      const created = await api<Product>('POST', '/owner/products', { id: slug, name: name.trim(), licensePrefix: code });
      await control.reload();
      go(href.app(created.id, 'listing'));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <Field label="Name" hint="As clients see it, e.g. Salon Book."><input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} /></Field>
      <div className="row">
        <Field label="Short name" hint="In addresses and the app's settings; can't change later."><input value={slug} maxLength={20} onChange={(e) => setId(e.target.value.toLowerCase())} placeholder="salon-book" /></Field>
        <Field label="License prefix" hint="Starts its keys, like POS1 / SPX1; can't change later."><input value={code} maxLength={7} onChange={(e) => setPrefix(e.target.value.toUpperCase())} placeholder="SAL1" /></Field>
      </div>
      <Msg tone="info">
        The app itself also needs the provider connection and this license prefix built in (as POS and SPX have) before it can check in and take keys.
        Its store listing works right away.
      </Msg>
      <Say text={error} />
      <button className="primary" disabled={busy || !name.trim()} onClick={() => void add()}>{busy ? 'Adding…' : 'Add app'}</button>
    </Card>
  );
};
