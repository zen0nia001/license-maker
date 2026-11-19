// #/guide: how it works, for clients. Public like the store (no sign-in, nothing of the owner's): getting the app,
// installing it, the free trial, their own page, paying and renewing, help, and uninstalling. Linked from the store
// and the client's own pages. The store's contact details come from Control's public /store.
import React, { useEffect, useState } from 'react';
import type { StoreDetails } from '../../lib/control/types';
import { href } from '../../router';
import { Icon, Logo } from '../../components/Icon';
import { loadStore } from '../store/Store';

type Step = { title: string; lead: React.ReactNode; points?: React.ReactNode[]; note?: React.ReactNode };

const STEPS: Step[] = [
  {
    title: 'Choose your app and download it',
    lead: <>Open the store, choose the app you need, and fill in the short form on its page.</>,
    points: [
      <>You get a private download link: right after the form, or from us by Messenger or text.</>,
      <>Open the link <b>on the computer where the app will run</b> and tap <b>Download</b>.</>,
      <>That computer needs <b>Windows 10 or 11</b>, <b>8 GB memory</b> or more, about <b>10 GB free space</b>, and internet.</>,
    ],
    note: <>The download link is for you only: please don't share it.</>,
  },
  {
    title: 'Install it (about 45 minutes)',
    lead: <>Double-click the Setup file you downloaded. It installs everything by itself.</>,
    points: [
      <>If a blue box says <b>"Windows protected your PC"</b>, click <b>More info</b>, then <b>Run anyway</b>.</>,
      <>When Windows asks <b>"Do you want to allow this app to make changes?"</b>, click <b>Yes</b>.</>,
      <>Wait while a window shows the steps. Don't close it. If it asks to <b>restart</b>, press Enter, sign in to Windows as usual, and setup carries on by itself.</>,
      <>If a <b>Docker</b> window asks you to sign in, click <b>Skip</b> or close it: you don't need an account.</>,
      <>At the end it shows your <b>Installation ID</b> (like 6CD3-CXM2-7HV8-9BCB). Your first username and password are saved on the Desktop in the app's "Installation ID" file.</>,
    ],
  },
  {
    title: 'Start your free trial',
    lead: <>When the app opens, its license screen has a button: <b>Ask my provider for a free trial</b>. Tap it.</>,
    points: [
      <>The trial usually starts by itself <b>within a minute</b>, and runs for <b>3 days</b>.</>,
      <>Sign in with the username and password from the Desktop file, then change the password in <b>My profile</b>.</>,
      <>Each business gets one free trial.</>,
    ],
  },
  {
    title: 'Set up your own page',
    lead: <>We send you a one-time invite link. Your page shows your installations, licenses and our messages.</>,
    points: [
      <>Open the invite on your phone and tap <b>Set up</b>. Your phone uses your <b>fingerprint or face</b> to sign you in: no password to remember.</>,
      <>Next time, open the store and tap <b>Client sign in</b>.</>,
      <>On a laptop, choose <b>Sign in</b> and pick your phone when the browser asks: your phone confirms it.</>,
    ],
  },
  {
    title: 'Pay and get your license',
    lead: <>Before the trial ends, choose <b>Monthly</b> or <b>Yearly</b> and pay us using the payment details shown in the app (GCash, bank…).</>,
    points: [
      <>In the app, tap <b>Confirm payment</b> (older versions: <b>I've paid</b>), choose the plan you paid for, type the <b>reference number</b> from the receipt, and tap <b>Send to my provider</b>.</>,
      <>Or on your page: <b>Renew or get a license</b>, choose the plan, type the reference, and add a <b>screenshot of the receipt</b> if you like.</>,
      <>We check the payment, and the license turns on <b>by itself within a minute</b>. Nothing to type or paste.</>,
    ],
    note: <>Paying before your trial or license ends? You lose no days: the new one starts when the current one ends.</>,
  },
  {
    title: 'Renew on time',
    lead: <>In the last 5 days of a trial or license, a banner in the app tells you, with how to pay.</>,
    points: [
      <>Renew the same way as above: Confirm payment in the app, or Renew on your page.</>,
      <>If the license ends, the app pauses, but <b>your data is safe</b>: it opens again as soon as you renew.</>,
      <>Your page always shows your licenses, and your license key to copy if the app ever asks for it.</>,
    ],
  },
  {
    title: 'Moving to another computer, or reinstalling',
    lead: <>Message us first. A new computer gets a new Installation ID, so its license is made again.</>,
    points: [
      <>Your page has your installer under <b>Ready to install</b>, so you can download it again any time.</>,
      <>If the app doesn't open after a restart or a power cut, wait 2 minutes. Still not? Double-click the app's <b>Start or Repair</b> icon on the Desktop.</>,
    ],
  },
  {
    title: 'Uninstalling',
    lead: <>Open <b>Windows Settings → Apps</b>, find the app, and click <b>Uninstall</b>. Or run the Uninstall file we send you.</>,
    points: [
      <><b>Keep the data</b> (the default): the app goes, but your records stay, and installing again brings everything back.</>,
      <><b>Delete all data too</b>: everything is removed. A backup copy is saved on your Desktop first.</>,
      <>You may also remove <b>Docker Desktop</b>: only offered when nothing else on the computer uses it.</>,
    ],
  },
];

/** The guide page: its own simple layout, like the store. */
export const GuidePage: React.FC = () => {
  const [store, setStore] = useState<StoreDetails | null>(null);
  useEffect(() => {
    loadStore().then((d) => setStore(d.store), () => setStore(null));
  }, []);
  const name = store?.name || 'Apps';
  useEffect(() => {
    document.title = `How it works · ${name}`;
  }, [name]);

  return (
    <>
      <header className="store-top">
        <div className="store-bar">
          <a className="store-brand" href={href.store()}><Logo size={30} /> {name}</a>
          <a className="store-signin" href={href.my()}><Icon name="user" size={16} /> Client sign in</a>
        </div>
        <h1>How it works</h1>
        <p>From download to your license, step by step. It takes about an hour the first time, and then the app runs by itself.</p>
      </header>
      <main className="store-main">
        <ol className="guide">
          {STEPS.map((s, i) => (
            <li key={s.title} className="card guide-step">
              <span className="guide-num" aria-hidden="true">{i + 1}</span>
              <div>
                <h2>{s.title}</h2>
                <p>{s.lead}</p>
                {s.points && <ul>{s.points.map((p, j) => <li key={j}>{p}</li>)}</ul>}
                {s.note && <p className="guide-note">{s.note}</p>}
              </div>
            </li>
          ))}
        </ol>
        <section className="card guide-help">
          <h2>Need help?</h2>
          <p>Something doesn't look right? Take a clear photo of the screen and send it to us.</p>
          <div className="row" style={{ alignItems: 'center' }}>
            <a className="button primary" style={{ flex: '0 0 auto' }} href={href.my('messages')}>Message us from your page</a>
            {store?.messenger && <a className="button" style={{ flex: '0 0 auto' }} href={`https://m.me/${encodeURIComponent(store.messenger)}`} target="_blank" rel="noopener noreferrer">Messenger</a>}
            {store?.mobile && <a className="button" style={{ flex: '0 0 auto' }} href={`sms:${store.mobile}`}>Text {store.mobile}</a>}
          </div>
        </section>
        <a href={href.store()} className="small"><Icon name="left" size={16} /> Back to the store</a>
      </main>
    </>
  );
};
