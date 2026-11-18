import React, { useState } from 'react';
import { codeOf } from '../../lib/apps';
import { api } from '../../lib/control/api';
import type { LicenseRequest } from '../../lib/control/types';
import { PLAN_LABELS } from '../../lib/license/core';
import { ago } from '../../lib/format';
import { href } from '../../router';
import { useControl } from '../../state/control';
import { useSigning } from '../../state/signing';
import { ActionButton, Card, Chip, Field, Msg, Tag } from '../../components/ui';
import type { TabProps } from './AppPage';

const WEEK = 7 * 24 * 3600e3;

/** Clients' license requests for this app: approve (the key is signed HERE, only the finished key goes to Control,
 *  which hands it to the app within a minute), or decline with a reason the client sees. */
export const Requests: React.FC<TabProps> = ({ product }) => {
  const control = useControl();
  const signing = useSigning();
  const shown = control.requests.filter(
    (r) => r.product.id === product.id && (r.status === 'pending' || r.status === 'approved' || Date.now() - Date.parse(r.decidedAt || r.createdAt) < WEEK),
  );
  return (
    <Card title="License requests" actions={<button className="small" onClick={() => void control.reload()}>Refresh</button>}>
      {shown.some((r) => r.status === 'pending') && !signing.unlocked && (
        <Msg tone="warn">Unlock the signing key (<a href={href.settings}>Settings</a>) to approve requests.</Msg>
      )}
      {shown.length === 0 ? (
        <p className="muted small">No requests in the last week. Clients send them from the app: I've paid, or Ask my provider for a free trial.</p>
      ) : (
        <ul className="list">{shown.map((r) => <Row key={r.id} request={r} />)}</ul>
      )}
    </Card>
  );
};

const Row: React.FC<{ request: LicenseRequest }> = ({ request: r }) => {
  const control = useControl();
  const signing = useSigning();
  const [customer, setCustomer] = useState(r.installation.customer || r.installation.label || '');
  const [note, setNote] = useState('');
  const product = control.products.find((p) => p.id === r.product.id);
  const code = product ? codeOf(product) : null;
  const name = r.installation.label || r.installation.customer || r.installation.installationId || r.installation.id;

  const approve = async () => {
    if (!code) throw new Error(`Keys for ${r.product.name} can't be made here yet.`);
    const licenseKey = await signing.makeForRequest({
      product: code,
      installationId: r.installation.installationId || '',
      customer,
      plan: r.plan,
      currentExpiresAt: r.currentLicense?.expiresAt || null,
    });
    await api('POST', `/owner/license-requests/${encodeURIComponent(r.id)}/approve`, { licenseKey });
    await control.reload();
  };
  const decline = async () => {
    await api('POST', `/owner/license-requests/${encodeURIComponent(r.id)}/decline`, { note });
    await control.reload();
  };

  return (
    <li className={r.status === 'pending' ? undefined : 'old'}>
      <div className="who"><Tag>{PLAN_LABELS[r.plan]}</Tag>{name}</div>
      <div className="meta">{[r.paymentReference && `ref ${r.paymentReference}`, `asked ${ago(r.createdAt)}`].filter(Boolean).join(' · ')}</div>
      <div className="chips wide">
        {r.status === 'approved' && <Chip tone="warn">Key sent: the app picks it up within a minute</Chip>}
        {r.status === 'delivered' && <Chip tone="ok">Delivered {ago(r.deliveredAt)}</Chip>}
        {r.status === 'declined' && <Chip tone="bad">Declined{r.note ? `: ${r.note}` : ''}</Chip>}
      </div>
      {r.status === 'pending' && (
        <div className="detail">
          {r.plan !== 'trial' && <p className="small muted">Check that payment {r.paymentReference} arrived before you send the key.</p>}
          <Field label="Licensed to (on the key)">
            <input value={customer} onChange={(e) => setCustomer(e.target.value)} maxLength={80} autoComplete="off" />
          </Field>
          <ActionButton className="primary" onClick={approve} busyLabel="Signing and sending…">
            {r.plan === 'trial' ? 'Approve trial & send key' : 'Payment received: send key'}
          </ActionButton>
          <Field label="Or decline (the client sees the reason)">
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} autoComplete="off" placeholder="Reason (optional)" />
          </Field>
          <ActionButton onClick={decline}>Decline</ActionButton>
        </div>
      )}
    </li>
  );
};
