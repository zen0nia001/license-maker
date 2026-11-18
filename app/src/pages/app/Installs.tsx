import React, { useState } from 'react';
import { api } from '../../lib/control/api';
import type { Alert, Installation } from '../../lib/control/types';
import { ago, day, gb, mb } from '../../lib/format';
import { go, href } from '../../router';
import { useControl } from '../../state/control';
import { ActionButton, Card, Chip, Facts, Field, Tag } from '../../components/ui';
import type { TabProps } from './AppPage';

export const ALERT_TEXT: Record<Alert, string> = {
  silent: 'No check-in for 2+ days',
  license_locked: 'Locked: no valid license',
  license_ending: 'License ending',
  backup_old: 'No backup in 2+ days',
  disk_low: 'Disk almost full',
  moved: 'Moved to another computer',
  clone_suspected: 'Running on 2 computers?',
};

export const nameOf = (i: Installation) => i.label || i.customer || i.installationId || i.id;

const alertText = (a: Alert, i: Installation) =>
  a === 'license_ending' && i.license?.daysLeft != null ? `License ends in ${i.license.daysLeft} day${i.license.daysLeft === 1 ? '' : 's'}` : ALERT_TEXT[a];

/** Every installation of this app that checks in with Control (ignored ones last, faded). */
export const Installs: React.FC<TabProps> = ({ product, query }) => {
  const control = useControl();
  const [open, setOpen] = useState<string | null>(query.get('open'));
  const all = control.installations.filter((i) => i.product.id === product.id);

  return (
    <Card title="Installations" actions={<button className="small" onClick={() => void control.reload()}>Refresh</button>}>
      {all.length === 0 ? (
        <p className="muted small">No {product.name} installation has checked in yet. They appear once their Provider connection is on and has an address.</p>
      ) : (
        <ul className="list">
          {all.map((i) => (
            <li key={i.id} className={i.status === 'ignored' ? 'old' : undefined}>
              <div className="who">
                {i.status === 'new' && <Tag>NEW</Tag>}
                {i.status === 'ignored' && <Tag>IGNORED</Tag>}
                {nameOf(i)}
              </div>
              <div className="acts">
                <button className="small" onClick={() => setOpen(open === i.id ? null : i.id)}>{open === i.id ? 'Close' : 'Open'}</button>
              </div>
              <div className="meta">{i.version ?? '?'} · {i.kind ?? '?'} · seen {ago(i.lastSeenAt)}</div>
              {i.alerts.length > 0 && i.status !== 'ignored' && (
                <div className="chips wide">
                  {i.alerts.map((a) => <Chip key={a} tone={a === 'license_ending' || a === 'backup_old' ? 'warn' : 'bad'}>{alertText(a, i)}</Chip>)}
                </div>
              )}
              {open === i.id && <Detail installation={i} productId={product.id} />}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

const Detail: React.FC<{ installation: Installation; productId: string }> = ({ installation: i, productId }) => {
  const control = useControl();
  const [label, setLabel] = useState(i.label ?? '');
  const save = async (body: Record<string, unknown>) => {
    await api('PATCH', `/owner/installations/${encodeURIComponent(i.id)}`, body);
    await control.reload();
  };
  return (
    <div className="detail">
      <Facts
        rows={[
          ['Installation ID', i.installationId, true],
          ...(i.movedFrom ? ([['Before that', `${i.movedFrom} (${day(i.movedAt)})`, true]] as [string, string, boolean][]) : []),
          ['Licensed to', i.customer],
          ['License', i.license ? `${i.license.state}${i.license.plan ? ` · ${i.license.plan}` : ''}${i.license.expiresAt ? ` · ends ${day(i.license.expiresAt)}` : ''}` : null],
          ['Newest backup', i.backup ? (i.backup.lastAt ? `${ago(i.backup.lastAt)} (${i.backup.count} kept${i.backup.encrypted ? ', encrypted' : ''})` : 'none') : 'handled outside the app'],
          ['Free disk', i.disk ? `${gb(i.disk.freeBytes)} of ${gb(i.disk.totalBytes)}` : null],
          ['Database', mb(i.databaseBytes)],
          ['Enrolled', day(i.enrolledAt)],
        ]}
      />
      <Field label="Your name for it">
        <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} autoComplete="off" placeholder="e.g. Juan's Hardware" />
      </Field>
      <div className="row">
        <ActionButton onClick={() => save({ label, ...(i.status === 'new' ? { status: 'active' } : {}) })}>
          {i.status === 'new' ? 'Save and accept' : 'Save name'}
        </ActionButton>
        {i.status === 'ignored'
          ? <ActionButton onClick={() => save({ status: 'active' })}>Stop ignoring</ActionButton>
          : <ActionButton onClick={() => save({ status: 'ignored' })}>Ignore</ActionButton>}
      </div>
      {i.installationId && (
        <button onClick={() => go(href.app(productId, 'keys', { iid: i.installationId!, cust: i.customer || i.label || '' }))}>Make a key for it</button>
      )}
    </div>
  );
};
