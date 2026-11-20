// The app's preview images on the store (Control: src/store/images.ts): screenshots so clients see what they get.
// Pictures are made small here before upload (lib/image.ts); the first one is on the store card.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api, apiBlob, apiUpload } from '../../lib/control/api';
import type { StoreImage } from '../../lib/control/types';
import { shrinkPreview } from '../../lib/image';
import { Card, Msg } from '../../components/ui';

const MAX = 8;

/** The pictures and their (owner-only) addresses on this device, for the listing preview too. */
export type Shots = { images: StoreImage[]; urls: Record<string, string> };

export const PreviewImages: React.FC<{ productId: string; appName: string; onChange: (shots: Shots) => void }> = ({ productId, appName, onChange }) => {
  const [images, setImages] = useState<StoreImage[] | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const base = `/owner/products/${encodeURIComponent(productId)}/images`;

  // Each picture is loaded once, as the owner (it may not be published yet).
  const show = useCallback(async (list: StoreImage[]) => {
    setImages(list);
    const next: Record<string, string> = {};
    for (const img of list) {
      next[img.id] = urls[img.id] ?? URL.createObjectURL(await apiBlob(`${base}/${encodeURIComponent(img.id)}/file`));
    }
    Object.entries(urls).forEach(([id, url]) => { if (!next[id]) URL.revokeObjectURL(url); });
    setUrls(next);
    onChange({ images: list, urls: next });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, urls]);

  useEffect(() => {
    api<StoreImage[]>('GET', base).then(show, (e: Error) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base]);

  const run = async (what: string, fn: () => Promise<StoreImage[]>) => {
    setBusy(what);
    setError(null);
    try {
      await show(await fn());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const add = async (files: FileList | null) => {
    const list = [...(files ?? [])].slice(0, MAX - (images?.length ?? 0));
    if (input.current) input.current.value = '';
    for (const file of list) {
      await run('adding', async () => {
        const { blob, width, height } = await shrinkPreview(file);
        const caption = file.name.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').replace(/^(screenshot|screen shot|img|image)\s*/i, '').slice(0, 120);
        const q = new URLSearchParams({ w: String(width), h: String(height), ...(caption && !/^\d[\d\s]*$/.test(caption) ? { caption } : {}) });
        return apiUpload<StoreImage[]>(`${base}?${q}`, blob, 'POST');
      });
    }
  };
  const patch = (img: StoreImage, body: { caption?: string; position?: number }) =>
    run(img.id, () => api<StoreImage[]>('PATCH', `${base}/${encodeURIComponent(img.id)}`, body));
  const remove = (img: StoreImage) => {
    if (!window.confirm('Remove this picture from the store?')) return;
    void run(img.id, () => api<StoreImage[]>('DELETE', `${base}/${encodeURIComponent(img.id)}`));
  };

  const count = images?.length ?? 0;
  return (
    <Card title="Preview images" actions={<span className="small muted">{count} of {MAX}</span>}>
      <p className="small muted">
        Screenshots of {appName}, so clients see what they get. The first one is on the store card. They're made smaller on
        this device before upload, and shown only while the app is published.
      </p>
      {images === null && !error && <p className="small muted">Loading…</p>}
      {images && images.length > 0 && (
        <ul className="shots-edit">
          {images.map((img, i) => (
            <li key={img.id}>
              <div className="shot-frame">{urls[img.id] && <img src={urls[img.id]} alt={img.caption ?? `Picture ${i + 1}`} />}</div>
              <input
                defaultValue={img.caption ?? ''} maxLength={120} placeholder="Caption (optional)" aria-label={`Caption of picture ${i + 1}`}
                onBlur={(e) => { if (e.target.value.trim() !== (img.caption ?? '')) void patch(img, { caption: e.target.value }); }}
              />
              <div className="row shot-acts">
                {i === 0 ? <span className="small muted">On the card</span>
                  : <button type="button" className="small" disabled={!!busy} onClick={() => void patch(img, { position: 0 })}>Make first</button>}
                <button type="button" className="small" disabled={!!busy || i === 0} aria-label="Move left" onClick={() => void patch(img, { position: i - 1 })}>←</button>
                <button type="button" className="small" disabled={!!busy || i === images.length - 1} aria-label="Move right" onClick={() => void patch(img, { position: i + 1 })}>→</button>
                <button type="button" className="small" disabled={!!busy} onClick={() => remove(img)}>Remove</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {error && <Msg>{error}</Msg>}
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => void add(e.target.files)} />
      <button type="button" className={count === 0 ? 'primary' : undefined} disabled={!!busy || count >= MAX} onClick={() => input.current?.click()}>
        {busy === 'adding' ? 'Adding…' : count >= MAX ? `${MAX} pictures: remove one to add another` : 'Add pictures'}
      </button>
    </Card>
  );
};
