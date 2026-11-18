import React, { useState } from 'react';
import { api } from '../../lib/control/api';
import type { Product } from '../../lib/control/types';
import { href } from '../../router';
import { useControl } from '../../state/control';
import { AppIcon } from '../../components/AppIcon';
import { Card, Chip, Field, Msg, Say } from '../../components/ui';
import { StoreAppDetail } from '../store/Store';
import type { TabProps } from './AppPage';

type Draft = {
  name: string; tagline: string; description: string; icon: string;
  priceMonthly: string; priceYearly: string; features: string; published: boolean;
};

const draftOf = (p: Product): Draft => ({
  name: p.name, tagline: p.tagline ?? '', description: p.description ?? '', icon: p.icon ?? '',
  priceMonthly: p.priceMonthly ?? '', priceYearly: p.priceYearly ?? '', features: p.features.join('\n'), published: p.published,
});

/** What clients see of this app on the public store: write it, preview it, publish it. Saved in Control. */
export const Listing: React.FC<TabProps> = ({ product }) => {
  const control = useControl();
  const [draft, setDraft] = useState<Draft>(() => draftOf(product));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => { setDraft((d) => ({ ...d, [k]: v })); setSaved(false); };
  const features = draft.features.split('\n').map((l) => l.trim()).filter(Boolean);
  const preview: Product = { ...product, ...draft, tagline: draft.tagline || null, description: draft.description || null, icon: draft.icon || null, priceMonthly: draft.priceMonthly || null, priceYearly: draft.priceYearly || null, features };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await api('PATCH', `/owner/products/${encodeURIComponent(product.id)}`, {
        name: draft.name, tagline: draft.tagline, description: draft.description, icon: draft.icon,
        priceMonthly: draft.priceMonthly, priceYearly: draft.priceYearly, features, published: draft.published,
      });
      await control.reload();
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cols two">
      <Card title="Store listing" actions={<Chip tone={product.published ? 'ok' : 'info'}>{product.published ? 'On the store' : 'Not published'}</Chip>}>
        <div className="row">
          <Field label="Name"><input value={draft.name} maxLength={40} onChange={(e) => set('name', e.target.value)} /></Field>
          <Field label="Icon (an emoji)"><input value={draft.icon} maxLength={8} onChange={(e) => set('icon', e.target.value)} placeholder="🧾" /></Field>
        </div>
        <Field label="One line about it"><input value={draft.tagline} maxLength={80} onChange={(e) => set('tagline', e.target.value)} placeholder="e.g. Point of sale for shops" /></Field>
        <Field label="Description" hint="What it does and who it's for. Plain text; line breaks are kept.">
          <textarea value={draft.description} maxLength={2000} onChange={(e) => set('description', e.target.value)} style={{ fontFamily: 'var(--sans)', fontSize: 15, minHeight: 120 }} />
        </Field>
        <Field label="Features" hint="One per line, at most 12.">
          <textarea value={draft.features} onChange={(e) => set('features', e.target.value)} style={{ fontFamily: 'var(--sans)', fontSize: 15 }} placeholder={'Receipts and cash drawer\nInventory with low-stock alerts'} />
        </Field>
        <div className="row">
          <Field label="Monthly price"><input value={draft.priceMonthly} maxLength={40} onChange={(e) => set('priceMonthly', e.target.value)} placeholder="₱499 / month" /></Field>
          <Field label="Yearly price"><input value={draft.priceYearly} maxLength={40} onChange={(e) => set('priceYearly', e.target.value)} placeholder="₱4,990 / year" /></Field>
        </div>
        <label className="row" style={{ alignItems: 'center', fontWeight: 600 }}>
          <input type="checkbox" checked={draft.published} onChange={(e) => set('published', e.target.checked)} style={{ width: 'auto', flex: 'none' }} />
          Show it on the public store
        </label>
        <Say text={error} />
        {saved && <Msg tone="ok">Saved.{draft.published ? <> It's on <a href={href.store(product.id)}>the store</a>.</> : ''}</Msg>}
        <button className="primary" disabled={busy} onClick={() => void save()}>{busy ? 'Saving…' : 'Save listing'}</button>
      </Card>
      <div className="stack" style={{ gap: 10 }}>
        <p className="small muted">Preview: how clients see it</p>
        <div className="store-preview">
          <div className="row" style={{ alignItems: 'center', marginBottom: 12 }}>
            <AppIcon app={preview} size={40} />
            <span className="small muted">On the store's list: {preview.name}{preview.tagline ? ` · ${preview.tagline}` : ''}</span>
          </div>
          <StoreAppDetail app={preview} store={null} />
        </div>
      </div>
    </div>
  );
};
