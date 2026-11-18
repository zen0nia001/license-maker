// npm run build, step 1: removes the previous build from the repo root, so old hashed files don't pile up.
// Only what a build makes is removed (the list below); the source in app/ and the repo's own files stay.
import { rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
for (const built of ['assets', 'index.html', 'sw.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'control.js']) {
  rmSync(join(root, built), { recursive: true, force: true });
}
console.log('Removed the previous build from the repo root.');
