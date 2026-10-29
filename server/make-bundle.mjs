// Assembles what `railway up` uploads for the `web` service: the server's files at the root (Railway runs
// `npm ci` there and starts `node index.mjs`) and the built frontend under site/ (DIST_DIR in .railway/railway.ts).
// Refuses a bundle whose frontend carries a secret (check-bundle.mjs). Run after `npm run build`:
//   node server/make-bundle.mjs <out-dir>     (outside the checkout: the repo's .gitignore ignores dist-like paths)
import { cp, mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { join, relative, resolve, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findSecrets } from './check-bundle.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));
const dist = resolve(here, '../dist');
const MARKER = '.hoy-web-bundle';
const checkout = resolve(here, '..');
const out = resolve(process.argv[2] ?? '');
// The folder is wiped first, so it must be neither the checkout, inside it, nor any folder holding it,
// and if it already has files they must be a previous bundle (its marker file).
const fromOut = relative(out, checkout);
const fromCheckout = relative(checkout, out);
const holdsCheckout = fromOut === '' || (!fromOut.startsWith('..') && !isAbsolute(fromOut));
const insideCheckout = !fromCheckout.startsWith('..') && !isAbsolute(fromCheckout);
if (!process.argv[2] || holdsCheckout || insideCheckout) {
  console.error('make-bundle: give an output folder outside the checkout (and not one that contains it)');
  process.exit(1);
}
const existing = await readdir(out).catch(() => []);
if (existing.length && !existing.includes(MARKER)) {
  console.error(`make-bundle: ${out} is not empty and is not a previous bundle; refusing to replace it`);
  process.exit(1);
}

await stat(join(dist, 'index.html')).catch(() => {
  console.error('make-bundle: dist/index.html missing — run npm run build first');
  process.exit(1);
});
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await writeFile(join(out, MARKER), 'Built by server/make-bundle.mjs; safe to replace.\n');
for (const name of await readdir(here)) {
  if (name === 'package.json' || name === 'package-lock.json' || (name.endsWith('.mjs') && name !== 'make-bundle.mjs')) await cp(join(here, name), join(out, name));
}
await cp(dist, join(out, 'site'), { recursive: true });

const findings = await findSecrets(join(out, 'site'));
if (findings.length) {
  console.error(`❌ make-bundle: secrets in the built frontend:\n  - ${findings.join('\n  - ')}`);
  process.exit(1);
}
let bytes = 0;
for (const entry of await readdir(out, { recursive: true, withFileTypes: true })) if (entry.isFile()) bytes += (await stat(join(entry.parentPath, entry.name))).size;
console.log(`✅ make-bundle: ${out} (${(bytes / 1048576).toFixed(1)} MB), no secret in site/`);
