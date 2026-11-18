# Control Center

The owner's home for every app (POS, SPX Hub and the ones to come), and where license keys are signed. It grew
out of **License Maker** and lives at the same address, https://zen0nia001.github.io/license-maker/, so a phone that
already has License Maker keeps its locked key, payment details and key history.

- **Home**: what **needs you** (license requests, new or troubled installations) as swipeable cards, **your apps**
  with their numbers, and the big picture (apps, installations, clients).
- **Dashboard**: apps, clients, installations, licenses ending in 30 days, locked installations and requests
  waiting; installations per app, license health (a ring chart), licenses ending soon (Renew), versions running.
- **Clients**: everyone running your apps (from their installations), searchable, with each license's state.
- **Apps**: every app as a tile (on the store or not), and **Add app**. **Inbox**: every app's license requests.
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
  published app, its page, and Message us on Messenger / Send a text (Settings → Your store sets the name and contacts).
- **Check a key**: is a key genuine, for whom, until when.
- **Settings**: the signing key (set up from the locked backup code or the key file, unlock, locked backup code,
  remove), the payment details written into every key, and Control (passkeys, notifications, sign out).

Without Control (an address with no Control set up, like GitHub Pages until Control is deployed) the apps,
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

1. Open https://zen0nia001.github.io/license-maker/ in **Safari** (iPhone) or **Chrome** (Android).
2. iPhone: **Share → Add to Home Screen**. Android: **⋮ → Add to Home screen / Install app**.
3. Open it from the home screen; **Settings → Set up** with your **locked backup code** and its password.

## Develop

Source in `app/` (React 18 + Vite + TypeScript); the build goes into the **repo root**, which GitHub Pages serves.

```bash
npm install
npm run dev        # http://localhost:3060 (Control's passkeys are made for this origin locally)
npm test           # the license core against the deployed main:index.html (keys and locked keys interchangeable)
npm run typecheck
npm run build      # into the repo root: index.html, assets/, sw.js, manifest, icons. Commit them.
npm run preview    # the BUILT app on 3060: service worker, notifications and the CSP as deployed
```

Rules: build and commit the root files with every change (the live app is whatever the root holds); never rename
the `licenseMaker.*` storage names (`app/src/lib/storage.ts`); keep `app/src/lib/license/core.ts` interchangeable
with the deployed format (`npm test`). `npm audit` reports picomatch in Vite's dev tooling only (no fixed release
yet); nothing of it is in the built app.
