// npm test — the new license core (app/src/lib/license/core.ts) must stay interchangeable with the License
// Maker the phones run today (the CORE section of index.html on the `main` branch): keys made by either verify
// with the other, and a key locked by either (the saved key, the backup code) opens with the other. Uses a
// throwaway key pair, never the owner's. Runs core.ts directly (Node 22.18+/24 strips the types).
import { execSync } from 'node:child_process';
import { generateKeyPairSync } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const now = await import(pathToFileURL(join(repo, 'app', 'src', 'lib', 'license', 'core.ts')).href);

// The old CORE, exactly as deployed to phones before Control Center: the last single-file License Maker
// (fd5c5c2:index.html, between CORE-START and CORE-END). Keys made then must keep working, so it never changes.
const oldHtml = execSync('git show fd5c5c2:index.html', { cwd: repo, encoding: 'utf8' });
const oldCore = oldHtml.slice(oldHtml.indexOf('// CORE-START'), oldHtml.indexOf('// CORE-END'));
if (!oldCore) throw new Error('No CORE section in fd5c5c2:index.html');
const old = new Function(`${oldCore}
  return { importPrivateKey, verifyLicense, makeLicense, sealText, openText, backupCodeOf, boxOfBackupCode };`)();

let failures = 0;
const check = (name, ok, extra) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || extra === undefined ? '' : `  → ${JSON.stringify(extra)}`}`);
  if (!ok) failures++;
};
const fails = async (fn) => { try { await fn(); return false; } catch { return true; } };

const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const pem = privateKey.export({ format: 'pem', type: 'pkcs8' });
const spki = publicKey.export({ format: 'der', type: 'spki' }).toString('base64');
const pub = await now.importPublicKey(spki);
const keyNew = await now.importPrivateKey(pem);
const keyOld = await old.importPrivateKey(pem);
const input = { product: 'SPX', installationId: 'k7qx-2m9d-ht4p-w8rb', customer: " Juan's Hardware ", lastDay: '2099-12-31', plan: 'yearly', pay: 'GCash: 0917 000 0000\n\n BDO: 1234 ', messenger: 'https://m.me/juan.delacruz/', mobile: '0917 000 0000' };

// Keys
const madeNew = await now.makeLicense(keyNew, pub, input);
const madeOld = await old.makeLicense(keyOld, pub, input);
const oldReadsNew = await old.verifyLicense(pub, madeNew.license);
const newReadsOld = await now.verifyLicense(pub, madeOld.license);
check('a key made by the new core verifies with the old one', oldReadsNew.ok && oldReadsNew.product === 'SPX', oldReadsNew);
check('a key made by the old core verifies with the new one', newReadsOld.ok && newReadsOld.product === 'SPX', newReadsOld);
const strip = (p) => ({ ...p, lid: '', iat: '' });
check('both write the same payload (same fields, same cleaning)', JSON.stringify(strip(madeNew.payload)) === JSON.stringify(strip(madeOld.payload)), { new: madeNew.payload, old: madeOld.payload });
check('a changed key is refused', !(await now.verifyLicense(pub, madeNew.license.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A')).replace(/\.(.)/, '.Z'))).ok);
check('the real public key is the one in the deployed app', oldCore.includes(now.PUBLIC_KEY_SPKI));
check('a trial longer than 3 days is refused', await fails(() => now.makeLicense(keyNew, pub, { ...input, plan: 'trial', lastDay: '2099-12-31' })));
check('a malformed Installation ID is refused', await fails(() => now.makeLicense(keyNew, pub, { ...input, installationId: 'K7QX-2M9D' })));

// The locked key and the backup code
const boxOld = await old.sealText(pem, 'correct horse battery');
const boxNew = await now.sealText(pem, 'correct horse battery');
check('a key locked by the old app opens with the new one', (await now.openText(boxOld, 'correct horse battery')) === pem);
check('a key locked by the new app opens with the old one', (await old.openText(boxNew, 'correct horse battery')) === pem);
check('a wrong password is refused', await fails(() => now.openText(boxOld, 'wrong password')));
check('the old backup code reads in the new app', (await now.openText(now.boxOfBackupCode(old.backupCodeOf(boxOld)), 'correct horse battery')) === pem);
check('the new backup code reads in the old app', (await old.openText(old.boxOfBackupCode(now.backupCodeOf(boxNew)), 'correct horse battery')) === pem);

// Dates (store time)
check('trial from Nov 14 ends Nov 16', now.planEnd('trial', '2026-11-14') === '2026-11-16');
check('monthly from Nov 14 ends Dec 13', now.planEnd('monthly', '2026-11-14') === '2026-12-13');
check('yearly from Nov 14 ends Nov 13 next year', now.planEnd('yearly', '2026-11-14') === '2027-11-13');
check('Jan 31 + 1 month is Feb 28', now.addMonths('2026-01-31', 1) === '2026-02-28');
check('a key through Nov 16 ends at midnight Manila time', now.expiresAt('2026-11-16').toISOString() === '2026-11-16T16:00:00.000Z');
check('and its last day reads back as Nov 16', now.lastDayOf('2026-11-16T16:00:00+00:00') === '2026-11-16');

console.log(failures ? `\n${failures} check(s) failed.` : '\nAll checks passed.');
process.exit(failures ? 1 : 0);
