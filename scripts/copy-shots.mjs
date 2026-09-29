// Copies the captures public/hub-map.json points at from docs/screenshots/<code>/ into
// dist/hub-map/shots/<code>/, so every shot URL in the published map resolves on GitHub Pages.
// The file list is read from the map itself (scripts/lib/hubShots.mjs shotUrls), so the two can
// never disagree; gen-hub-map.mjs already applied the size budget when it chose them.
// Usage: last step of npm run build (after vite build). dist/ is not committed.
import { copyFileSync, mkdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SHOTS_BUDGET_BYTES, SHOTS_DIR, shotUrls } from './lib/hubShots.mjs';

const ROOT = new URL('../', import.meta.url);
const map = JSON.parse(readFileSync(new URL('public/hub-map.json', ROOT), 'utf8'));
if (!existsSync(new URL('dist/', ROOT))) { console.error('copy-shots: dist/ missing — run vite build first'); process.exit(1); }

let bytes = 0, files = 0;
const missing = [];
for (const url of shotUrls(map)) {
  if (!url.startsWith(`${SHOTS_DIR}/`)) { missing.push(`${url} (outside ${SHOTS_DIR}/)`); continue; }
  const src = new URL(`docs/screenshots/${url.slice(SHOTS_DIR.length + 1)}`, ROOT);
  if (!existsSync(src)) { missing.push(url); continue; }
  const dest = fileURLToPath(new URL(`dist/${url}`, ROOT));
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  bytes += statSync(src).size; files += 1;
}
if (missing.length) { console.error(`copy-shots: ${missing.length} shot(s) in the map have no file:\n  ${missing.join('\n  ')}`); process.exit(1); }
const mb = (n) => `${(n / 1048576).toFixed(1)} MB`;
console.log(`copy-shots: ${files} files · ${mb(bytes)} → dist/${SHOTS_DIR}/ (budget ${mb(SHOTS_BUDGET_BYTES)})`);
