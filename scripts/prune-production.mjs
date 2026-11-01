// Production build (H-2, PL-03): Vite copies public/ whole, so after `vite build` this keeps only what production
// serves (an allowlist: a new review-only folder in public/ stays out until it is listed here) and removes the rest,
// e.g. hub-map.json, actions.json, hub/ (the review hub's static page), delivery-room/ (the build tracker). source/ (the
// owner's source documents behind the operations manual) ships since lane Y3: the Hub's Construction & testing band
// opens them for the super admin (R-08 answered for these pages).
// Justin's Hub ships since lane Y3 (super admin only): it needs none of those files (its cards come from
// src/hub/hubMap.data.ts, its people from Company OS), and demo data still must not ship, so this also fails when a demo
// persona (the review build's default session `usr_super`, or the demo users of the hub map) is in the JavaScript.
// Then it fails when dist/ still holds in-app screenshots or a raw markdown file, or is larger than the upload budget
// (Railway uploads failed above roughly 90 MB; the review build is about 437 MB).
// Usage: last steps of npm run build:production. `node scripts/prune-production.mjs [distDir]`.
import { existsSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = process.argv[2] ?? 'dist';
/** What production serves: Vite's output (index.html, assets/) and the public files the website and app use. */
export const PRODUCTION_FILES = new Set(['index.html', 'assets', 'brand', 'images', 'social', 'video', 'website', 'favicon.svg', 'favicon.ico', 'robots.txt', 'manifest.webmanifest', 'release.json', 'source']);
export const BUDGET_BYTES = 60 * 1024 * 1024;
/** Demo personas that must never reach production JavaScript (src/auth/demoUsers.ts, src/hub/hubDemoUsers.ts). */
export const DEMO_MARKERS = ['usr_super', 'Sofía Arango', 'usr_coord', 'usr_mkt', 'usr_maint'];

if (!existsSync(join(DIST, 'index.html'))) { console.error(`prune-production: ${DIST}/index.html missing; run vite build first`); process.exit(1); }
const removed = readdirSync(DIST).filter((name) => !PRODUCTION_FILES.has(name));
for (const name of removed) rmSync(join(DIST, name), { recursive: true, force: true });

const problems = [];
let bytes = 0;
(function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) { walk(path); continue; }
    bytes += statSync(path).size;
    const rel = relative(DIST, path);
    // In-app screenshots are named <code>-<es|en>-<width>… (docs/screenshots/); thumbnails are thumb-*.
    if (/(^|\/)(thumb-[^/]*|[A-Z]+-\d+[a-z]?-(es|en)-[^/]*)\.(jpe?g|png|webp)$/i.test(rel)) problems.push(`${rel}: an in-app screenshot`);
    if (rel.startsWith('assets/') && rel.endsWith('.md')) problems.push(`${rel}: a bundled markdown document`);
    if (rel.startsWith('assets/') && rel.endsWith('.js')) {
      const text = readFileSync(path, 'utf8');
      for (const m of DEMO_MARKERS) if (text.includes(m)) problems.push(`${rel}: demo persona "${m}" in production JavaScript`);
    }
  }
})(DIST);
if (bytes > BUDGET_BYTES) problems.push(`dist is ${(bytes / 1048576).toFixed(1)} MB, over the ${BUDGET_BYTES / 1048576} MB budget`);
if (problems.length) { console.error(`prune-production: ${problems.length} problem(s):\n  ${problems.slice(0, 20).join('\n  ')}`); process.exit(1); }
console.log(`prune-production: dist ${(bytes / 1048576).toFixed(1)} MB (budget ${BUDGET_BYTES / 1048576} MB), removed: ${removed.join(', ') || 'nothing'}`);
