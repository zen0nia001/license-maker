import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import config from './control.config.json';

// The built app goes into the REPO ROOT (outDir '..'): GitHub Pages serves this repo's root, so the live app
// always stays a working build, with no Pages setting to change. scripts/clean.mjs removes the previous build
// first (vite can't empty a folder that also holds the source).

/** The Content-Security-Policy, only in the build (the dev server needs inline scripts for hot reload). Nothing
 *  loads from anywhere else; the one other address the app may call is Control (control.config.json). */
const csp = (): Plugin => ({
  name: 'csp',
  apply: 'build',
  transformIndexHtml(html) {
    const control = Object.values(config.controlUrls).join(' ');
    const policy = [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'", // React's style={…} attributes
      "img-src 'self' data:",
      `connect-src 'self' ${control}`,
      "manifest-src 'self'",
      "worker-src 'self'",
      "base-uri 'none'",
      "form-action 'none'",
    ].join('; ');
    return html.replace('<meta charset="utf-8">', `<meta charset="utf-8">\n<meta http-equiv="Content-Security-Policy" content="${policy}">`);
  },
});

/** sw.js from sw-template.js: the list of this build's files (stored on the device at install, for offline use)
 *  and a version made from them, so every deploy is a new service worker that replaces the old files. */
const serviceWorker = (): Plugin => ({
  name: 'service-worker',
  apply: 'build',
  generateBundle(_options, bundle) {
    const publicFiles = readdirSync(join(__dirname, 'public'));
    const files = ['./', './index.html', ...Object.keys(bundle).filter((f) => f !== 'index.html').map((f) => `./${f}`), ...publicFiles.map((f) => `./${f}`)];
    const version = createHash('sha256').update(files.join('\n')).digest('hex').slice(0, 12);
    const template = readFileSync(join(__dirname, 'sw-template.js'), 'utf8');
    const cacheLine = "const CACHE = 'control-center-__VERSION__';";
    const filesLine = 'const FILES = __FILES__;';
    if (!template.includes(cacheLine) || !template.includes(filesLine)) throw new Error('sw-template.js: the CACHE / FILES lines changed; update vite.config.ts.');
    const source = template
      .replace(cacheLine, `const CACHE = 'control-center-${version}';`)
      .replace(filesLine, `const FILES = ${JSON.stringify([...new Set(files)], null, 2)};`);
    this.emitFile({ type: 'asset', fileName: 'sw.js', source });
  },
});

export default defineConfig({
  root: __dirname,
  base: './',
  plugins: [react(), csp(), serviceWorker()],
  // 3060: the origin Control's passkeys are made for while developing (Control's ALLOWED_ORIGINS / RP_ID).
  server: { port: 3060, strictPort: true },
  // npm run preview: the BUILT app (service worker, notifications, the CSP) on the same origin.
  preview: { port: 3060, strictPort: true },
  build: {
    outDir: '..',
    emptyOutDir: false,
    assetsDir: 'assets',
    target: 'es2022',
  },
});
