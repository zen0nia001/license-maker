// A conversation between the owner and one client (C2/C3), used on both sides: "mine" is the side reading it.
// Plain text only, through React (no HTML from a message is ever rendered).
import React, { useEffect, useRef, useState } from 'react';
import type { Message } from '../lib/control/types';
import { ago } from '../lib/format';
import { Say } from './ui';

export const MESSAGE_MAX = 2000;

export const Thread: React.FC<{
  messages: Message[];
  mine: Message['from'];
  theirName: string;
  onSend: (body: string) => Promise<void>;
  empty: React.ReactNode;
}> = ({ messages, mine, theirName, onSend, empty }) => {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' });
  }, [messages.length]);

  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await onSend(text);
      setText('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="thread">
      <div className="thread-list" aria-live="polite">
        {messages.length === 0 ? (
          <p className="muted small" style={{ textAlign: 'center', margin: '18px 0' }}>{empty}</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`bubble${m.from === mine ? ' mine' : ''}`}>
              <div className="bubble-text">{m.body}</div>
              <div className="bubble-meta">
                {m.from === mine ? 'You' : theirName} · {ago(m.createdAt)}
                {m.from === mine && m.readAt ? ' · Seen' : ''}
              </div>
            </div>
          ))
        )}
        <div ref={end} />
      </div>
      <div className="thread-compose">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MESSAGE_MAX))}
          placeholder={`Write to ${theirName}…`}
          rows={2}
          aria-label={`Message to ${theirName}`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void send();
          }}
        />
        <button className="primary" disabled={busy || !text.trim()} onClick={() => void send()}>{busy ? 'Sending…' : 'Send'}</button>
      </div>
      <Say text={error} />
    </div>
  );
};
