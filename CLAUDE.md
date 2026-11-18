# CLAUDE.md

Control Center (was License Maker): the owner's app-grid home for every app, and where license keys are signed.
React 18 + Vite + TypeScript in `app/`; **the build goes into the repo root**, which GitHub Pages serves as the live
app (https://zen0nia001.github.io/license-maker/). Talks to Control (`C:\Dev\Control`, a Cloudflare Worker). Read
README.md first.

## Commands

```bash
npm run dev        # http://localhost:3060
npm test           # license core parity with the deployed main:index.html: must pass
npm run typecheck
npm run build      # into the repo root; commit the built files with the source
npm run preview    # the built app (service worker, CSP) on 3060
```

## Rules

- **The root is the live app.** Every change: `npm run build` and commit the root files (index.html, assets/, sw.js,
  manifest, icons) with the source. `app/scripts/clean.mjs` lists what a build owns.
- **Phones' saved data**: the `licenseMaker.*` names in `app/src/lib/storage.ts` must never change; the app must stay
  at this address (localStorage is per origin).
- **Signing** happens only in `app/src/state/signing.tsx` with `app/src/lib/license/core.ts`; nothing else touches
  the private key, and it never goes to the network (only finished keys do). Keep `core.ts` interchangeable with the
  deployed format; `npm test` checks it against `main:index.html` with a throwaway key. Never test with the real key.
- **Addresses**: the only extra address the app may call is Control's, per host in `app/control.config.json`; the
  build writes it into the CSP. No wildcards. Text only through React (no `dangerouslySetInnerHTML`).
- **Control's API** is mirrored by hand in `app/src/lib/control/types.ts` (Control: `src/routes/*.ts`).
- Pages by the hash (`app/src/router.ts`): GitHub Pages can't rewrite paths. `#/store` is the PUBLIC store
  (`pages/store/Store.tsx`): its own layout without the owner's menus, it reads Control's public `GET /store`
  with no session (CORS * doesn't allow an Authorization header), and must never show owner data.
