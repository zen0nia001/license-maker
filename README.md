# License Maker

A small offline web app that makes POS and SPX license keys on a phone.

**This repository holds no secrets.** The app contains only the *public* key the POS and SPX use to
check licenses. The private signing key is entered on the owner's own phone, kept only in that
phone's browser storage, locked with a password (PBKDF2-SHA256, 600,000 rounds + AES-GCM), and never
sent anywhere. Without it, this app can't make a single license.

- Signing: ECDSA P-256 / SHA-256 with the browser's built-in Web Crypto, in the same format as the
  desktop license tool (`POS1.` / `SPX1.` + payload + signature). Every key it makes is checked
  against the public key before it is shown.
- Offline: a service worker keeps the app's files on the phone; it makes no other network requests
  (see the Content-Security-Policy in `index.html`).

## Install on a phone

1. Open https://zen0nia001.github.io/license-maker/ in **Safari** (iPhone) or **Chrome** (Android).
2. iPhone: **Share → Add to Home Screen**. Android: **⋮ → Add to Home screen / Install app**.
3. Open it from the home screen and set it up with your **locked backup code** and its password.

Make the locked backup code on your laptop once: open the same address there, choose **Key file**,
pick `private-key.pem` and a password, then open **Locked backup code** and copy it. It's useless
without the password, so it's safe to send to your phone or keep in Notes.
