import React, { useEffect, useState } from 'react';
import { CONTROL_URL } from '../../lib/control/api';
import type { Listing, StoreDetails } from '../../lib/control/types';
import { href } from '../../router';
import { AppIcon } from '../../components/AppIcon';
import { Msg } from '../../components/ui';

type StoreData = { store: StoreDetails; apps: Listing[] };

/** The public store: no sign-in, no session sent (Control's /store is public and read only). */
async function loadStore(): Promise<StoreData> {
  if (!CONTROL_URL) throw new Error("The store isn't open yet.");
  let res: Response;
  try {
    res = await fetch(`${CONTROL_URL}/store`);
  } catch {
    throw new Error("The store can't be reached. Check the internet connection.");
  }
  if (!res.ok) throw new Error("The store isn't available right now. Try again later.");
  return (await res.json()) as StoreData;
}

/** The store clients open (#/store, #/store/<app>): its own simple page, without the owner's menus. */
export const StorePage: React.FC<{ app: string | null }> = ({ app }) => {
  const [data, setData] = useState<StoreData | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    loadStore().then(setData, (e: Error) => setError(e.message));
  }, []);

  const name = data?.store.name || 'Apps';
  useEffect(() => {
    document.title = name;
  }, [name]);

  const one = app && data ? data.apps.find((a) => a.id === app) : null;
  return (
    <>
      <header className="topbar">
        <div className="topbar-in">
          <a className="brand" href={href.store()}><span className="brand-name" style={{ display: 'inline' }}>{name}</span></a>
        </div>
      </header>
      <main className="main">
        {error && <Msg tone="info">{error}</Msg>}
        {!data && !error && <p className="muted">Loading…</p>}
        {data && !app && (
          <>
            <div>
              <h1>{name}</h1>
              {data.store.about && <p className="muted">{data.store.about}</p>}
            </div>
            {data.apps.length === 0 ? (
              <p className="muted">No apps here yet.</p>
            ) : (
              <div className="apps">
                {data.apps.map((a) => (
                  <a key={a.id} className="app-card" href={href.store(a.id)}>
                    <AppIcon app={a} />
                    <div>
                      <div className="app-name">{a.name}</div>
                      {a.tagline && <div className="app-sub">{a.tagline}</div>}
                    </div>
                    {(a.priceMonthly || a.priceYearly) && <div className="app-price">{a.priceMonthly || a.priceYearly}</div>}
                  </a>
                ))}
              </div>
            )}
          </>
        )}
        {data && app && (
          <>
            <a href={href.store()} className="small">← All apps</a>
            {one ? <StoreAppDetail app={one} store={data.store} /> : <Msg tone="info">This app isn't on the store.</Msg>}
          </>
        )}
      </main>
    </>
  );
};

/** One app as clients see it: what it is, what it does, the prices, and how to reach the provider. */
export const StoreAppDetail: React.FC<{ app: Listing; store: StoreDetails | null }> = ({ app, store }) => {
  const ask = `Hi! I'm interested in ${app.name}.`;
  return (
    <article className="store-app">
      <div className="app-head">
        <AppIcon app={app} size={72} />
        <div>
          <h1>{app.name}</h1>
          {app.tagline && <p className="muted">{app.tagline}</p>}
        </div>
      </div>
      {app.description && <p className="store-text">{app.description}</p>}
      {app.features.length > 0 && (
        <ul className="store-features">
          {app.features.map((f) => <li key={f}>{f}</li>)}
        </ul>
      )}
      {(app.priceMonthly || app.priceYearly) && (
        <div className="store-prices">
          {app.priceMonthly && <div><span className="small muted">Monthly</span><b>{app.priceMonthly}</b></div>}
          {app.priceYearly && <div><span className="small muted">Yearly</span><b>{app.priceYearly}</b></div>}
        </div>
      )}
      {store && (store.messenger || store.mobile) && (
        <div className="row">
          {store.messenger && (
            <a className="button primary" href={`https://m.me/${encodeURIComponent(store.messenger)}?text=${encodeURIComponent(ask)}`} target="_blank" rel="noopener noreferrer">Message us on Messenger</a>
          )}
          {store.mobile && <a className="button" href={`sms:${store.mobile}?&body=${encodeURIComponent(ask)}`}>Send a text</a>}
        </div>
      )}
      <p className="small muted">Every app starts with a free trial: install it, then tap Ask my provider for a free trial on its license screen.</p>
    </article>
  );
};
