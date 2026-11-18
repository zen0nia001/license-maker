import React, { useEffect, useState } from 'react';
import { fmtDay, importPublicKey, lastDayOf, PLAN_LABELS, verifyLicense } from '../lib/license/core';
import { Card, Msg, PageHead } from '../components/ui';

/** Check a license key someone sends: is it genuine, for whom, until when. Works offline. */
export const Check: React.FC = () => {
  const [publicKey, setPublicKey] = useState<CryptoKey | null>(null);
  const [text, setText] = useState('');
  const [result, setResult] = useState<{ tone: 'ok' | 'warn' | 'bad'; text: string } | null>(null);
  useEffect(() => {
    importPublicKey().then(setPublicKey, () => setResult({ tone: 'bad', text: "This browser can't check keys." }));
  }, []);

  const check = async () => {
    if (!publicKey) return;
    const r = await verifyLicense(publicKey, text);
    if (!r.ok) return setResult({ tone: 'bad', text: r.error });
    const p = r.payload;
    const expired = new Date(p.exp) <= new Date();
    setResult({
      tone: expired ? 'warn' : 'ok',
      text: `Genuine ${r.product} ${p.plan ? PLAN_LABELS[p.plan].toLowerCase() + ' ' : ''}license for ${p.cust}, installation ${p.iid}. Works through ${fmtDay(lastDayOf(p.exp))}${expired ? ' (expired)' : ''}. License no. ${p.lid}.`,
    });
  };

  return (
    <>
      <PageHead eyebrow="Is it genuine, for whom, until when" title="Check a key" />
      <Card>
        <textarea value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} placeholder="POS1.… or SPX1.…" />
        <button className="primary" disabled={!text.trim() || !publicKey} onClick={() => void check()}>Check</button>
        {result && <Msg tone={result.tone}>{result.text}</Msg>}
      </Card>
    </>
  );
};
