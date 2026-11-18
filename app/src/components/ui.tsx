// The few building blocks every screen uses. Text only through React (no innerHTML anywhere).
import React, { useState } from 'react';

export const Card: React.FC<{ title?: React.ReactNode; actions?: React.ReactNode; className?: string; children: React.ReactNode }> = ({ title, actions, className, children }) => (
  <section className={`card${className ? ` ${className}` : ''}`}>
    {(title || actions) && (
      <div className="card-head">
        {title && <h2>{title}</h2>}
        {actions && <div className="card-actions">{actions}</div>}
      </div>
    )}
    {children}
  </section>
);

export type Tone = 'ok' | 'bad' | 'warn' | 'info';

export const Msg: React.FC<{ tone?: Tone; children: React.ReactNode }> = ({ tone = 'bad', children }) => <div className={`msg ${tone}`}>{children}</div>;

/** A message that may be empty (nothing shown). */
export const Say: React.FC<{ text: string | null | undefined; tone?: Tone }> = ({ text, tone }) => (text ? <Msg tone={tone}>{text}</Msg> : null);

export const Tag: React.FC<{ children: React.ReactNode }> = ({ children }) => <span className="tag">{children}</span>;

export const Chip: React.FC<{ tone: Tone; children: React.ReactNode }> = ({ tone, children }) => <span className={`chip ${tone}`}>{children}</span>;

export const Field: React.FC<{ label: string; hint?: React.ReactNode; children: React.ReactNode }> = ({ label, hint, children }) => (
  <label className="field">
    <span className="field-label">{label}</span>
    {children}
    {hint && <span className="field-hint">{hint}</span>}
  </label>
);

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: React.ReactNode }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label} style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const Facts: React.FC<{ rows: [string, React.ReactNode, boolean?][] }> = ({ rows }) => (
  <dl className="facts">
    {rows.map(([k, v, mono]) => (
      <React.Fragment key={k}>
        <dt>{k}</dt>
        <dd className={mono ? 'mono' : undefined}>{v ?? '—'}</dd>
      </React.Fragment>
    ))}
  </dl>
);

export const CopyButton: React.FC<{ text: string; label?: string; className?: string }> = ({ text, label = 'Copy', className = 'small' }) => {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      window.setTimeout(() => setDone(false), 1500);
    } catch {
      window.prompt('Copy it from here:', text);
    }
  };
  return (
    <button type="button" className={className} onClick={() => void copy()}>
      {done ? 'Copied ✓' : label}
    </button>
  );
};

/** A button that runs an async action, disabled while it runs; the action's error is shown under it. */
export const ActionButton: React.FC<{ onClick: () => Promise<void>; className?: string; children: React.ReactNode; busyLabel?: string }> = ({ onClick, className, children, busyLabel }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      await onClick();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <button type="button" className={className} disabled={busy} onClick={() => void run()}>
        {busy && busyLabel ? busyLabel : children}
      </button>
      <Say text={error} />
    </>
  );
};
