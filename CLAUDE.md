# CLAUDE.md

Control Center (was License Maker): the owner's app-grid home for every app, and where license keys are signed.
React 18 + Vite + TypeScript in `app/`; the build goes into `dist/` (git-ignored) and `npm run deploy` publishes it to
Cloudflare as a static-only Worker (`wrangler.jsonc`): https://control-center.smcontrolcenter.workers.dev/. Talks to Control (`C:\Dev\Control`, a Cloudflare Worker). Read
README.md first.

## Commands

```bash
npm run dev        # http://localhost:3060
npm test           # license core parity with the last single-file License Maker (fd5c5c2): must pass
npm run typecheck
npm run build      # into dist/ (not committed)
npm run deploy     # test + build + publish to Cloudflare (needs `npx wrangler login`)
npm run preview    # the built app (service worker, CSP) on 3060
```

## Rules

- **The live app is what `npm run deploy` last published**, not the repo. The repo root's `index.html` and `sw.js` are
  the old GitHub Pages address's "moved" page (hand-written: it forwards with the hash, and the service worker
  clears what phones stored there). Don't put a build there.
- **Phones' saved data**: the `licenseMaker.*` names in `app/src/lib/storage.ts` must never change; the app must stay
  at its address (localStorage is per origin; Control's passkeys are made for that host, `RP_ID`).
- **Signing** happens only in `app/src/state/signing.tsx` with `app/src/lib/license/core.ts`; nothing else touches
  the private key, and it never goes to the network (only finished keys do). Keep `core.ts` interchangeable with the
  deployed format; `npm test` checks it against `fd5c5c2:index.html` with a throwaway key. Never test with the real key.
- **Addresses**: the only extra address the app may call is Control's, per host in `app/control.config.json`; the
  build writes it into the CSP. No wildcards. Text only through React (no `dangerouslySetInnerHTML`).
- **Control's API** is mirrored by hand in `app/src/lib/control/types.ts` (Control: `src/routes/*.ts`).
- Pages by the hash (`app/src/router.ts`), one static file. `#/store` is the PUBLIC store
  (`pages/store/Store.tsx`): its own layout without the owner's menus, it reads Control's public `GET /store`
  with no session (CORS * doesn't allow an Authorization header), and must never show owner data.
- **The client's side** (`#/join/…`, `#/my…`, `pages/client/Portal.tsx`): its own layout like the store; only
  `clientApi` (client session in localStorage `control.clientSession`, never the owner's sessionStorage token), never
  the signing key or owner data. The owner's client pages are `pages/Clients.tsx` and `pages/ClientPage.tsx`;
  conversations use `components/Thread.tsx` on both sides.
- **Design is our own and monochrome** (README "Design"): greys only; colour just for status dots and error text. the shell is `App.tsx` (rail, drawer), tokens and components in
  `app/src/styles.css`, icons drawn in `components/Icon.tsx`. Don't copy another product's look, icons or assets.
  Font: Manrope, Latin file only (`styles.css` @font-face), so the offline cache stays small.
