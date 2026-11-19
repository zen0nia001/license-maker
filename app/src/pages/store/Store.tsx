import React, { useEffect, useState } from 'react';
import { CONTROL_URL } from '../../lib/control/api';
import type { Listing, StoreDetails } from '../../lib/control/types';
import { href } from '../../router';
import { AppIcon } from '../../components/AppIcon';
import { Msg } from '../../components/ui';
import { Icon, Logo } from '../../components/Icon';
import { InquiryForm } from './InquiryForm';
import { isAmount, peso } from '../../lib/price';

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
      <header className="store-top">
        <div className="store-bar">
          <a className="store-brand" href={href.store()}><Logo size={30} /> {name}</a>
          <a className="store-signin" href={href.my()}><Icon name="user" size={16} /> Client sign in</a>
        </div>
        <h1>{app ? one?.name ?? name : name}</h1>
        {!app && data?.store.about && <p>{data.store.about}</p>}
        {app && one?.tagline && <p>{one.tagline}</p>}
      </header>
      <main className="store-main">
        {error && <Msg tone="info">{error}</Msg>}
        {!data && !error && <div className="card"><p className="muted">Loading…</p></div>}
        {data && !app && (
          <>
            {data.apps.length === 0 ? (
              <div className="card"><p className="muted">No apps here yet.</p></div>
            ) : (
              <div className="apps">
                {data.apps.map((a) => (
                  <a key={a.id} className="app-card" href={href.store(a.id)}>
                    <AppIcon app={a} />
                    <div>
                      <div className="app-name">{a.name}</div>
                      {a.tagline && <div className="app-sub">{a.tagline}</div>}
                    </div>
                    <AppPrice app={a} />
                  </a>
                ))}
              </div>
            )}
          </>
        )}
        {data && app && (
          <>
            <div className="card">
              {one ? <StoreAppDetail app={one} store={data.store} /> : <Msg tone="info">This app isn't on the store.</Msg>}
            </div>
            <a href={href.store()} className="small"><Icon name="left" size={16} /> All apps</a>
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
          {app.features.map((f) => <li key={f}><Icon name="check" size={18} />{f}</li>)}
        </ul>
      )}
      <div className="store-prices">
        <div className="trial-box"><span className="small muted">Free trial</span><b>Try it first</b><span className="small muted">Free, before you pay</span></div>
        {app.priceMonthly && <div><span className="small muted">Monthly</span><b>{peso(app.priceMonthly)}{isAmount(app.priceMonthly) && <small> / month</small>}</b></div>}
        {app.priceYearly && <div><span className="small muted">Yearly</span><b>{peso(app.priceYearly)}{isAmount(app.priceYearly) && <small> / year</small>}</b></div>}
      </div>
      <p className="small muted">Every app starts with a free trial: install it, then tap Ask my provider for a free trial on its license screen.</p>
      {/* On the public store only (not in the owner's listing preview). */}
      {store && (
        <div className="inquiry">
          <InquiryForm product={app.id} appName={app.name} download={app.download === true} />
          {(store.messenger || store.mobile) && (
            <div className="row" style={{ alignItems: 'center' }}>
              <span className="small muted" style={{ flex: '0 0 auto' }}>Or reach us directly:</span>
              {store.messenger && (
                <a className="button" href={`https://m.me/${encodeURIComponent(store.messenger)}?text=${encodeURIComponent(ask)}`} target="_blank" rel="noopener noreferrer">Messenger</a>
              )}
              {store.mobile && <a className="button" href={`sms:${store.mobile}?&body=${encodeURIComponent(ask)}`}>Text</a>}
            </div>
          )}
        </div>
      )}
    </article>
  );
};

/** A store card's foot: the monthly price (or the yearly), the yearly under it, and the Free trial label. */
const AppPrice: React.FC<{ app: Listing }> = ({ app }) => {
  const main = app.priceMonthly ? { raw: app.priceMonthly, per: 'month' } : app.priceYearly ? { raw: app.priceYearly, per: 'year' } : null;
  return (
    <div className="app-foot">
      <div>
        {main && (
          <div className="app-price">
            {peso(main.raw)}
            {isAmount(main.raw) && <span className="per"> / {main.per}</span>}
          </div>
        )}
        {app.priceMonthly && app.priceYearly && (
          <div className="app-sub">or {peso(app.priceYearly)}{isAmount(app.priceYearly) ? ' / year' : ''}</div>
        )}
      </div>
      <span className="trial">Free trial</span>
    </div>
  );
};
