# Control Center

The owner's home for every app (POS, SPX Hub and the ones to come), and where license keys are signed. It grew
out of **License Maker**. It lives on Cloudflare at https://control-center.smcontrolcenter.workers.dev/ (the old
GitHub Pages address forwards there; a phone set up there needs **Settings → Set up** once more on the new address).

- **Home**: what **needs you** (license requests, new or troubled installations) as swipeable cards, **your apps**
  with their numbers, and the big picture (apps, installations, clients).
- **Dashboard**: apps, clients, installations, licenses ending in 30 days, locked installations and requests
  waiting; installations per app, license health (a ring chart), licenses ending soon (Renew), versions running.
- **Clients**: your client accounts (C1–C3): add a client, link their installations (a name match is suggested),
  send a **one-time invite link** (copy, Messenger, text or email), see their sign-in, turn them off, and talk to
  them in **Messages** (unread ones in Needs you and Inbox). Installations no client has yet are listed to link.
- **Apps**: every app as a tile (on the store or not), and **Add app**. **Inbox**: store inquiries (reply on
  Messenger, by text, call or email; mark done; delete) and every app's license requests.
- **An app's page**: Overview · Installations · Requests · Keys · Store listing.
  - *Installations*: every installation that checks in with Control (version, license, backups, disk, alerts);
    name it, accept or ignore it, **Make a key for it**.
  - *Requests*: clients' I've paid / free-trial requests from their app; **send key** signs it here and sends only the
    finished key to Control, which hands it to the app within a minute; or decline with a reason.
  - *Keys*: Make a license (free trial, monthly, yearly or a custom end date) and the keys made on this device
    (Renew, Copy, Delete).
  - *Store listing*: what clients see on the public store (description, features, prices, icon, colour), with a
    live preview; **Show it on the public store** publishes it.
- **Add app**: a new app you sell (name, short name, license prefix); its listing works at once.
- **The store** (`#/store`): the public page clients open, with no sign-in and none of the owner's menus: every
  published app, its page, and **Interested in …?**: an inquiry form (name, business, how to reach them, a message)
  that lands in your Inbox, plus Messenger / Text links (Settings → Your store sets the name and contacts).
- **The client's own page** (`#/join/<invite>` once, then `#/my`, also linked from the store as **Client sign in**):
  they set up a passkey from your invite, then see their installations (license, backups, problems), **renew or ask**
  for a license (it reaches your Inbox like Send to my provider), their licenses with the key to copy, and messages
  with you. Its own page like the store: none of your menus, your session or your signing key.
- **The address itself** is a front door: on your device (signed in as owner once, or with the signing key) it
  opens your Home; on a client's device, their own page; for anyone else, the store. Your pages are **private**: on
  other devices every owner page opens the store instead, and nothing links to your sign-in. Keep your private
  address, `…/#/owner` (bookmark it), for a new device; or use an add-device link.
- **Inbox → Make a client**: turns a store inquiry into a client (name, business, contact, their message as your
  note), ready to invite; if one with that contact exists, **Open client** instead.
- **Owner sign-in**: your passkey, or your **password** (the fallback; a seeded one must be changed at once). On a
  new phone or laptop: **Settings → Add another device → Make link**, open the link there (`#/add-device/…`).
- **Check a key**: is a key genuine, for whom, until when.
- **Settings**: the signing key (set up from the locked backup code or the key file, unlock, locked backup code,
  remove), the payment details written into every key, and Control (passkeys, notifications, sign out).

Without Control (an address with no Control set up in `app/control.config.json`) the apps,
Keys, Check and Settings work as License Maker did; installations and requests say Control isn't connected.

## Design

Control Center's own design: simple and monochrome. Black, white and greys, crisp borders and plenty of space; a
side rail (folds to icons; a drawer on phones), light and dark. Colour only where it means something: a small
status dot, and red for errors. App icons are the listing's emoji on a neutral tile. The icons are drawn for this
app (`app/src/components/Icon.tsx`); the type is Manrope (SIL Open Font License, Latin only, bundled). The portal
idea (a needs-you area, connected apps, a dashboard, clients) was inspired by BizBox Accounts; no look, code,
icons or assets were taken from it.

## Security

**This repository holds no secrets.** The app contains only the *public* key the POS and SPX use to check licenses.
The private signing key is entered on the owner's own device, kept only in that browser's storage, locked with a
password (PBKDF2-SHA256, 600,000 rounds + AES-GCM), unlocked only in memory, locked again after 10 minutes in the
background, and never sent anywhere. Only finished keys go to Control (a key works only on its installation).

- Signing: ECDSA P-256 / SHA-256 with the browser's Web Crypto, in the same format as the desktop license tool
  (`POS1.` / `SPX1.` + payload + signature); every key is checked against the public key before it is shown.
- Control sign-in is a **passkey** on the device; the session is a token in that tab only.
- Content-Security-Policy (added by the build): scripts only from this site, and the only other address the app may
  call is Control's, listed in `app/control.config.json` (never a wildcard).
- Notifications carry no content: the service worker shows a fixed notice.

## Install on a phone

1. Open https://control-center.smcontrolcenter.workers.dev/ in **Safari** (iPhone) or **Chrome** (Android).
2. iPhone: **Share → Add to Home Screen**. Android: **⋮ → Add to Home screen / Install app**.
3. Open it from the home screen; **Settings → Set up** with your **locked backup code** and its password.

## Develop

Source in `app/` (React 18 + Vite + TypeScript); the build goes into `dist/`, which `npm run deploy` publishes to
Cloudflare (`wrangler.jsonc`: a Worker with static files only, free and separate from Control).

```bash
npm install
npm run dev        # http://localhost:3060 (Control's passkeys are made for this origin locally)
npm test           # the license core against the last single-file License Maker, fd5c5c2 (keys interchangeable)
npm run typecheck
npm run build      # into dist/ (git-ignored)
npm run deploy     # test, build and publish to Cloudflare (once: npx wrangler login)
npm run preview    # the BUILT app on 3060: service worker, notifications and the CSP as deployed
```

Rules: the live app is what `npm run deploy` last published (the repo root only holds the GitHub Pages "moved"
page); never rename
the `licenseMaker.*` storage names (`app/src/lib/storage.ts`); keep `app/src/lib/license/core.ts` interchangeable
with the deployed format (`npm test`). `npm audit` reports picomatch in Vite's dev tooling only (no fixed release
yet); nothing of it is in the built app.
