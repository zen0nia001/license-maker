// An app's installer (Apps → the app → Installer): upload it once; clients get it through a private download link
// (Send installer, on an inquiry or a client's page) or from their own page. Control: src/installers/routes.ts.
import React, { useRef, useState } from 'react';
import { api, apiUpload } from '../../lib/control/api';
import type { Installer } from '../../lib/control/types';
import { day } from '../../lib/format';
import { useControl } from '../../state/control';
import { ActionButton, Card, Facts, Msg, Say } from '../../components/ui';
import type { TabProps } from './AppPage';

export const fileSize = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** How each app's installer is made on the owner's laptop (shown as a reminder). */
const BUILD: Record<string, string> = {
  pos: 'In C:\\Dev\\POS: powershell -ExecutionPolicy Bypass -File .\\tools\\make-installer.ps1  →  dist\\POS-Setup.exe',
  spx: 'In C:\\Dev\\SPX: powershell -ExecutionPolicy Bypass -File .\\tools\\make-client-package.ps1  →  dist\\SPX-client.zip',
};

export const InstallerTab: React.FC<TabProps> = ({ product }) => {
  const control = useControl();
  const current = control.installers.find((i) => i.product === product.id);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const upload = async (file: File) => {
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      await apiUpload<Installer>(`/owner/installers/${encodeURIComponent(product.id)}?name=${encodeURIComponent(file.name)}`, file);
      await control.reload();
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };
  const remove = async () => {
    if (!window.confirm(`Remove ${product.name}'s installer? Download links for it stop working until you upload one again.`)) return;
    await api('DELETE', `/owner/installers/${encodeURIComponent(product.id)}`);
    await control.reload();
  };

  return (
    <Card title="Installer">
      <div className="stack">
        <p className="small muted">
          Upload {product.name}'s installer once. Then <b>Send installer</b> (on a store inquiry or a client's page) gives the client a
          private link to download it: 7 days, 3 downloads. Clients can also download it from their own page. It holds the apps'
          download key, so it is never on the public store.
        </p>
        {current ? (
          <Facts rows={[
            ['File', current.filename],
            ['Size', fileSize(current.size)],
            ['Uploaded', day(current.uploadedAt)],
            ['SHA-256', current.sha256, true],
          ]} />
        ) : (
          <Msg tone="info">No installer yet.</Msg>
        )}
        {BUILD[product.id] && <p className="small muted mono" style={{ overflowWrap: 'anywhere' }}>{BUILD[product.id]}</p>}
        <input ref={input} type="file" accept=".exe,.zip,.msi" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
        <div className="row">
          <button className="primary" style={{ flex: '0 0 auto' }} disabled={busy} onClick={() => input.current?.click()}>
            {busy ? 'Uploading…' : current ? 'Upload a new version' : 'Upload installer'}
          </button>
          {current && <div style={{ flex: '0 0 auto' }}><ActionButton onClick={remove}>Remove</ActionButton></div>}
        </div>
        {done && <Msg tone="ok">Uploaded. New download links give this file.</Msg>}
        <Say text={error} />
      </div>
    </Card>
  );
};
