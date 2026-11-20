import React, { useEffect, useState } from 'react';
import { CONTROL_URL, storeImageUrl } from '../../lib/control/api';
import type { Listing, StoreDetails, StoreImage } from '../../lib/control/types';
import { href } from '../../router';
import { AppIcon } from '../../components/AppIcon';
import { Msg } from '../../components/ui';
import { Icon, Logo } from '../../components/Icon';
import { InquiryForm } from './InquiryForm';
import { isAmount, peso } from '../../lib/price';

type StoreData = { store: StoreDetails; apps: Listing[] };

/** The store's name and line until the owner sets their own (Settings → Your store). "Negosyo": business. */
export const DEFAULT_STORE_NAME = 'Negosyo Apps';
const DEFAULT_ABOUT = 'Point of sale, records and payroll for small shops and hubs. Installed on your own computer, with help from a real person.';

/** The public store: no sign-in, no session sent (Control's /store is public and read only). */
export async function loadStore(): Promise<StoreData> {
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

/** The store's top bar: its mark and name, How it works, Client sign in. */
const StoreBar: React.FC<{ name: string }> = ({ name }) => (
  <div className="store-bar">
    <a className="store-brand" href={href.store()}><Logo size={32} /> <span>{name}</span></a>
    <span className="store-links">
      <a className="store-signin" href={href.guide}>How it works</a>
      <a className="store-signin" href={href.my()}><Icon name="user" size={16} /> Client sign in</a>
    </span>
  </div>
);

/** The store clients open (#/store, #/store/<app>): its own simple page, without the owner's menus. */
export const StorePage: React.FC<{ app: string | null }> = ({ app }) => {
  const [data, setData] = useState<StoreData | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    loadStore().then(setData, (e: Error) => setError(e.message));
  }, []);

  const name = data?.store.name || DEFAULT_STORE_NAME;
  const one = app && data ? data.apps.find((a) => a.id === app) : null;
  useEffect(() => {
    document.title = one ? `${one.name} · ${name}` : name;
  }, [name, one]);

  if (app) {
    return (
      <>
        <header className="store-top slim">
          <StoreBar name={name} />
        </header>
        <main className="store-main">
          <a href={href.store()} className="store-back"><Icon name="left" size={16} /> All apps</a>
          {error && <Msg tone="info">{error}</Msg>}
          {!data && !error && <div className="card"><p className="muted">Loading…</p></div>}
          {data && <div className="card">{one ? <StoreAppDetail app={one} store={data.store} /> : <Msg tone="info">This app isn't on the store.</Msg>}</div>}
        </main>
        {data && <StoreFoot name={name} store={data.store} />}
      </>
    );
  }

  return (
    <>
      <header className="store-top store-hero">
        <StoreBar name={name} />
        <div className="hero-copy">
          <span className="hero-eyebrow">Software for Filipino small businesses</span>
          <h1>Apps that run your negosyo</h1>
          <p>{data?.store.about || DEFAULT_ABOUT}</p>
          <ul className="hero-points">
            <li><Icon name="check" size={16} /> Free 3-day trial</li>
            <li><Icon name="check" size={16} /> Runs on your own computer</li>
            <li><Icon name="check" size={16} /> Pay monthly or yearly</li>
            <li><Icon name="check" size={16} /> Help from a real person</li>
          </ul>
        </div>
      </header>
      <main className="store-main">
        {error && <Msg tone="info">{error}</Msg>}
        {!data && !error && <div className="card"><p className="muted">Loading…</p></div>}
        {data && (
          <section aria-labelledby="our-apps">
            <div className="section-head">
              <h2 id="our-apps">Our apps</h2>
              <span className="small muted">{data.apps.length === 1 ? '1 app' : `${data.apps.length} apps`} · each starts with a free trial</span>
            </div>
            {data.apps.length === 0 ? (
              <div className="card"><p className="muted">No apps here yet.</p></div>
            ) : (
              <div className="apps store-apps">
                {data.apps.map((a) => <StoreCard key={a.id} app={a} />)}
              </div>
            )}
          </section>
        )}
        <section aria-labelledby="how" className="store-steps-wrap">
          <div className="section-head">
            <h2 id="how">How it works</h2>
            <a className="small" href={href.guide}>The full step-by-step guide <Icon name="right" size={14} /></a>
          </div>
          <ol className="store-steps">
            <li><b>Download and install</b><span>Fill in the short form on an app's page. Setup installs everything by itself in about 45 minutes.</span></li>
            <li><b>Try it free for 3 days</b><span>Tap Ask my provider for a free trial on the app's license screen: it starts within a minute.</span></li>
            <li><b>Pay monthly or yearly</b><span>Confirm your payment in the app or on your page, and the license turns on by itself.</span></li>
          </ol>
        </section>
      </main>
      {data && <StoreFoot name={name} store={data.store} />}
    </>
  );
};

/** An app on the store's list: its first preview image, what it is, three features, the price. */
const StoreCard: React.FC<{ app: Listing }> = ({ app }) => {
  const shot = app.images?.[0];
  return (
    <a className="app-card store-card" href={href.store(app.id)}>
      <div className="app-shot">
        {shot ? <img src={storeImageUrl(shot.id)} alt={shot.caption ?? `${app.name} screenshot`} loading="lazy" /> : <span className="app-shot-empty"><AppIcon app={app} size={64} /></span>}
      </div>
      <div className="store-card-body">
        <div className="store-card-head">
          <AppIcon app={app} size={44} />
          <div>
            <div className="app-name">{app.name}</div>
            {app.tagline && <div className="app-sub">{app.tagline}</div>}
          </div>
        </div>
        {app.features.length > 0 && (
          <ul className="store-card-feats">
            {app.features.slice(0, 3).map((f) => <li key={f}><Icon name="check" size={15} />{f}</li>)}
          </ul>
        )}
        <AppPrice app={app} />
        <span className="store-card-cta">See {app.name}{app.images && app.images.length > 1 ? ` · ${app.images.length} pictures` : ''} <Icon name="right" size={15} /></span>
      </div>
    </a>
  );
};

/** The store's foot: how to reach the owner, and the client's page. */
const StoreFoot: React.FC<{ name: string; store: StoreDetails }> = ({ name, store }) => (
  <footer className="store-foot">
    <div>
      <span className="store-brand"><Logo size={26} /> <span>{name}</span></span>
      <p className="small muted">{store.about || DEFAULT_ABOUT}</p>
    </div>
    <div className="store-foot-links">
      {store.messenger && <a className="button" href={`https://m.me/${encodeURIComponent(store.messenger)}`} target="_blank" rel="noopener noreferrer">Messenger</a>}
      {store.mobile && <a className="button" href={`sms:${store.mobile}`}>Text {store.mobile}</a>}
      <a className="button" href={href.guide}>How it works</a>
      <a className="button" href={href.my()}>Client sign in</a>
    </div>
  </footer>
);

/** An app's preview images: one large, the others to choose below. A tap opens it full size. */
const Gallery: React.FC<{ images: StoreImage[]; appName: string; imageUrl: (id: string) => string }> = ({ images, appName, imageUrl }) => {
  const [at, setAt] = useState(0);
  const shown = images[Math.min(at, images.length - 1)]!;
  const ratio = shown.width && shown.height ? `${shown.width} / ${shown.height}` : '16 / 10';
  return (
    <div className="gallery">
      <figure>
        <a href={imageUrl(shown.id)} target="_blank" rel="noopener noreferrer" className="gallery-main" style={{ aspectRatio: ratio }} title="Open it full size">
          <img src={imageUrl(shown.id)} alt={shown.caption ?? `${appName} screenshot ${at + 1}`} />
        </a>
        {shown.caption && <figcaption>{shown.caption}</figcaption>}
      </figure>
      {images.length > 1 && (
        <div className="gallery-thumbs" role="list">
          {images.map((img, i) => (
            <button key={img.id} type="button" role="listitem" aria-label={img.caption ?? `Picture ${i + 1}`} aria-current={i === at} onClick={() => setAt(i)}>
              <img src={imageUrl(img.id)} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/** One app as clients see it: its pictures, what it is and does, the prices, and how to ask for it. `imageUrl` gives a
 *  picture's address (the store's by default; the owner's listing preview passes its own). */
export const StoreAppDetail: React.FC<{ app: Listing; store: StoreDetails | null; imageUrl?: (id: string) => string }> = ({ app, store, imageUrl = storeImageUrl }) => {
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
      {app.images && app.images.length > 0 && <Gallery images={app.images} appName={app.name} imageUrl={imageUrl} />}
      {app.description && <p className="store-text">{app.description}</p>}
      {app.features.length > 0 && (
        <ul className="store-features">
          {app.features.map((f) => <li key={f}><Icon name="check" size={18} />{f}</li>)}
        </ul>
      )}
      <div className="store-prices">
        <div className="trial-box"><span className="small muted">Free trial</span><b>3 days</b><span className="small muted">Free, before you pay</span></div>
        {app.priceMonthly && <div><span className="small muted">Monthly</span><b>{peso(app.priceMonthly)}{isAmount(app.priceMonthly) && <small> / month</small>}</b></div>}
        {app.priceYearly && <div><span className="small muted">Yearly</span><b>{peso(app.priceYearly)}{isAmount(app.priceYearly) && <small> / year</small>}</b></div>}
      </div>
      <p className="small muted">Every app starts with a free trial: install it, then tap Ask my provider for a free trial on its license screen. <a href={href.guide}>How it works, step by step</a></p>
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

/** A store card's price: the monthly price (or the yearly), the yearly under it, and the Free trial label. */
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
      <span className="trial">3-day free trial</span>
    </div>
  );
};
