# License Maker

A small offline web app that makes POS and SPX license keys on a phone.

**This repository holds no secrets.** The app contains only the *public* key the POS and SPX use to
check licenses. The private signing key is entered on the owner's own phone, kept only in that
phone's browser storage, locked with a password (PBKDF2-SHA256, 600,000 rounds + AES-GCM), and never
sent anywhere. Without it, this app can't make a single license.

- Signing: ECDSA P-256 / SHA-256 with the browser's built-in Web Crypto, in the same format as the
  desktop license tool (`POS1.` / `SPX1.` + payload + signature). Every key it makes is checked
  against the public key before it is shown.
- Plans: Free trial (3 days at most), Monthly or Yearly, signed into the key (`"plan"`), with the end
  date filled in (the first day counts; a renewal can start on a later "Starts on" day), or a
  custom end date (no plan, like older keys). Same rules as the desktop tool's `--plan`.
- Payment details: "How the client pays you" (kept on the phone) goes into every key (`"pay"`),
  and the apps show it on the last-5-days banner, the license screen and Settings → License.
- "I've paid": your Messenger username and mobile number (kept on the phone) go into every key
  (`"msgr"`, `"tel"`), so the client's "I've paid" button can send you their payment reference.
- Offline: a service worker keeps the app's files on the phone; it makes no other network requests
  (see the Content-Security-Policy in `index.html`).

## Install on a phone

1. Open https://zen0nia001.github.io/license-maker/ in **Safari** (iPhone) or **Chrome** (Android).
2. iPhone: **Share → Add to Home Screen**. Android: **⋮ → Add to Home screen / Install app**.
3. Open it from the home screen and set it up with your **locked backup code** and its password.

Make the locked backup code on your laptop once: open the same address there, choose **Key file**,
pick `private-key.pem` and a password, then open **Locked backup code** and copy it. It's useless
without the password, so it's safe to send to your phone or keep in Notes.

## Installs (Control)

The **Installs** card (`control.js`) shows every POS and SPX that checks in with the owner's Control service
(`C:\Dev\Control`): version, license, backups, disk, and what needs a look. **Make a key for it** fills in the
license form with that installation's app, Installation ID and customer.

- Sign-in is a **passkey** on this device (the first one with Control's one-time setup code). The session is
  a token in this tab only; the signing key is never sent anywhere, Control or otherwise.
- The Control address is fixed in `control.js`, and the Content-Security-Policy allows exactly that address
  besides the app's own (`connect-src`). Without an address for this host the card is hidden: today only
  `localhost` (for testing at `http://localhost:3060`). Add the production address to **both** places
  when Control is deployed.

### License requests and notifications

- **License requests** at the top of Installs: a client's I've paid (with the payment reference) or free-trial
  request, sent from their app. Check the payment, then **Payment received: send key** (or **Approve trial**):
  this app signs the key here with your unlocked key (`window.issueForControl` in `index.html`: the same rules
  and payment details as Make a license, recorded under Made on this device; a renewal starts the day after the
  current key ends) and sends only the finished key to Control, which hands it to the app within a minute.
  Or **Decline** with a reason the client sees.
- **Turn on notifications** (bottom of Installs): this device is told when a request comes in. The push carries
  no content (the service worker shows a fixed notice), so Google or Apple learn nothing. On iPhone it needs the
  app opened from the Home Screen.
