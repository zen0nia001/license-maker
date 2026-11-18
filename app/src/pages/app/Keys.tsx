import React, { useState } from 'react';
import { codeOf } from '../../lib/apps';
import { addDays, fmtDay, PLAN_LABELS, planEnd, storeToday, type LicensePayload, type Plan } from '../../lib/license/core';
import type { IssuedKey } from '../../lib/storage';
import { href } from '../../router';
import { useSigning } from '../../state/signing';
import { Card, CopyButton, Facts, Field, Msg, Say, Segmented } from '../../components/ui';
import type { TabProps } from './AppPage';

type PlanChoice = Plan | 'custom';

/** Make a license for this app (as License Maker did), and the keys made for it on this device. */
export const Keys: React.FC<TabProps> = ({ product, query }) => {
  const signing = useSigning();
  const code = codeOf(product);
  const [iid, setIid] = useState(query.get('iid') ?? '');
  const [customer, setCustomer] = useState(query.get('cust') ?? '');
  const [plan, setPlan] = useState<PlanChoice>('trial');
  const [startDay, setStartDay] = useState(storeToday());
  const [customDay, setCustomDay] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [made, setMade] = useState<{ license: string; payload: LicensePayload; lastDay: string } | null>(null);

  if (!code) return <Msg tone="info">Keys for {product.name} can't be made here yet: its key format isn't known to this app.</Msg>;

  const lastDay = plan === 'custom' ? customDay : planEnd(plan, plan === 'trial' ? storeToday() : startDay);
  const keys = signing.issued.filter((k) => k.product === code);

  const make = async () => {
    setBusy(true);
    setError(null);
    try {
      setMade(await signing.make({ product: code, installationId: iid, customer, lastDay, plan: plan === 'custom' ? null : plan }));
      setNote(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  /** Fills the form for this client's next key: same installation and customer, the same paid plan (a trial
   *  becomes Monthly), starting the day after the current key ends (or today). */
  const renew = (k: IssuedKey) => {
    setIid(k.iid);
    setCustomer(k.customer);
    const dayAfter = addDays(k.lastDay, 1);
    setStartDay(dayAfter > storeToday() ? dayAfter : storeToday());
    setPlan(k.plan === 'yearly' ? 'yearly' : 'monthly');
    setMade(null);
    setNote(`Renewing ${k.customer}: check the plan and "Starts on", then tap Make license.`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = (k: IssuedKey) => {
    if (window.confirm(`Delete ${k.customer} (${k.iid}, through ${fmtDay(k.lastDay)}) from this list?\n\nThis only removes it from this device. If the key was put into an app, it keeps working there until its last day.`)) {
      signing.removeIssued(k);
    }
  };

  // Newest first: the first key seen for an installation is its current one; older ones were replaced.
  const seen = new Set<string>();

  return (
    <div className="cols two">
      <div className="stack" style={{ gap: 16 }}>
        <Card title={`Make a ${product.name} license`}>
          {!signing.hasKey ? (
            <Msg tone="warn">Set up the signing key in <a href={href.settings}>Settings</a> first.</Msg>
          ) : !signing.unlocked ? (
            <UnlockInline />
          ) : (
            <>
              <Field label="Installation ID">
                <input
                  className="iid" value={iid} inputMode="text" autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="K7QX-2M9D-HT4P-W8RB" maxLength={24}
                  onChange={(e) => {
                    const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
                    setIid((raw.match(/.{1,4}/g) || []).join('-'));
                  }}
                />
              </Field>
              <Field label="Customer">
                <input value={customer} onChange={(e) => setCustomer(e.target.value)} autoComplete="off" placeholder="e.g. Juan's Hardware" />
              </Field>
              <Segmented<PlanChoice>
                label="Plan" value={plan} onChange={setPlan}
                options={[
                  { value: 'trial', label: 'Free trial' },
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'yearly', label: 'Yearly' },
                  { value: 'custom', label: 'Custom' },
                ]}
              />
              {(plan === 'monthly' || plan === 'yearly') && (
                <Field label="Starts on" hint="A renewal can start the day after the current key ends, so no paid days are lost.">
                  <input type="date" value={startDay} min={storeToday()} onChange={(e) => setStartDay(e.target.value < storeToday() ? storeToday() : e.target.value)} />
                </Field>
              )}
              {plan === 'custom' ? (
                <Field label="Last day it works">
                  <input type="date" value={customDay} min={storeToday()} onChange={(e) => setCustomDay(e.target.value)} />
                </Field>
              ) : (
                <p className="small muted">Works through {fmtDay(lastDay)}, until midnight Philippine time.</p>
              )}
              <p className="small muted">
                Payment details on the key: {signing.payment.pay.trim() ? signing.payment.pay.trim().split('\n')[0] : 'none'} (<a href={href.settings}>change</a>)
              </p>
              <Say text={note} tone="ok" />
              <Say text={error} />
              <button className="primary" disabled={busy} onClick={() => void make()}>Make license</button>
            </>
          )}
        </Card>

        {made && (
          <Card title={`${product.name} ${made.payload.plan === 'trial' ? 'trial' : 'license'} ready`} className="result">
            <div className="keytext">{made.license}</div>
            <CopyButton text={made.license} label="Copy license key" className="primary" />
            <Facts
              rows={[
                ['Plan', made.payload.plan ? PLAN_LABELS[made.payload.plan] : 'Custom'],
                ['Customer', made.payload.cust],
                ['Installation', made.payload.iid, true],
                ['Works through', fmtDay(made.lastDay)],
                ['How to pay', made.payload.pay ? made.payload.pay.replace(/\n/g, ' · ') : 'Not included'],
                ['License no.', made.payload.lid, true],
              ]}
            />
            <Msg tone="ok">Checked: the app will accept this key.</Msg>
          </Card>
        )}
      </div>

      <Card title="Made on this device">
        {keys.length === 0 ? (
          <p className="muted small">No {product.name} keys made on this device yet.</p>
        ) : (
          <ul className="list">
            {keys.slice(0, 50).map((k) => {
              const current = !seen.has(k.iid);
              seen.add(k.iid);
              return (
                <li key={`${k.lid}-${k.at}`} className={current ? undefined : 'old'}>
                  <div className="who">{k.customer}</div>
                  <div className="acts">
                    {current && signing.unlocked && <button className="small" onClick={() => renew(k)}>Renew</button>}
                    <CopyButton text={k.license} />
                    <button className="small" aria-label={`Delete ${k.customer} from this list`} title="Delete from this list" onClick={() => remove(k)}>✕</button>
                  </div>
                  <div className="meta">
                    {k.plan ? `${PLAN_LABELS[k.plan]} · ` : ''}{k.iid} · through {fmtDay(k.lastDay)}{current ? '' : ' · replaced'}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
};

/** Unlock the signing key right where it's needed. */
export const UnlockInline: React.FC = () => {
  const signing = useSigning();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signing.unlock(password);
      setPassword('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="stack" onSubmit={(e) => void submit(e)}>
      <Field label="Password of the signing key">
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
      </Field>
      <Say text={error} />
      <button className="primary" type="submit" disabled={busy || !password}>{busy ? 'Unlocking…' : 'Unlock'}</button>
    </form>
  );
};
