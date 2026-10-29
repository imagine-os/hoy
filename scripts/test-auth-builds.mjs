// H-2 / PL-03 at bundle level: what each build ships. Reads the built files only (no browser).
// - Review build (dist/, `npm run build`): unchanged — demo sign-in and hub are there, Clerk is not.
// - Production build (`npm run build:production`; QA_PROD_DIST=<dir>, else built here into a temp dir): Clerk is a
//   separate chunk; no hub, dev tools, demo sign-in panel or agent manifest; no manual or docs text; no in-app
//   screenshots or hub-map files; under the upload budget.
// QA_STRICT_DEMO_DATA=1 also requires that no demo persona or seed (MockProvider) ships in production: that holds once
// lane H-3's CompanyOSProvider replaces MockProvider in the production build. The deploy workflows run it strict, so a
// production deploy is refused while the demo data layer would ship.
// QA_PROD_ONLY=1 skips the review half (CI: dist/ is the production build).
// Run: npm run build && node scripts/test-auth-builds.mjs
//      CI: npm run build:production && QA_PROD_ONLY=1 QA_PROD_DIST=dist QA_STRICT_DEMO_DATA=1 node scripts/test-auth-builds.mjs
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { reporter } from './lib/launch-qa.mjs';

const { check, done } = reporter('H-2 builds');
const files = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]);
const js = (dir) => files(join(dir, 'assets')).filter((f) => f.endsWith('.js')).map((f) => ({ f, text: readFileSync(f, 'utf8') }));
const has = (chunks, needle) => chunks.filter((c) => (needle instanceof RegExp ? needle.test(c.text) : c.text.includes(needle))).map((c) => c.f.split('/').pop());

// ── review build ──────────────────────────────────────────────────────────────────────────────────────────────
const demoSignIn = /["']customer\.signin\.demo["']\)/;
if (process.env.QA_PROD_ONLY !== '1') {
  if (!existsSync('dist/index.html')) { console.error('dist/ missing: run npm run build first'); process.exit(1); }
  const review = js('dist');
  check('review: Clerk is not in the review build', has(review, 'clerk-js').length === 0 && has(review, 'heroic-gnu').length === 0, has(review, 'clerk-js').join(', '));
  check('review: the demo sign-in and persona switcher are still there', has(review, 'usr_super').length > 0 && has(review, 'rs-user').length > 0);
  check('review: the hub and its map are still there', existsSync('dist/hub-map.json') && has(review, '"/hub"').length > 0);
  check('review: the demo sign-in screen is there (marker check)', has(review, demoSignIn).length > 0);
}

// ── production build ──────────────────────────────────────────────────────────────────────────────────────────
let prodDir = process.env.QA_PROD_DIST;
if (!prodDir) {
  prodDir = mkdtempSync(join(tmpdir(), 'hoy-prod-'));
  execFileSync('npx', ['vite', 'build', '--outDir', prodDir, '--emptyOutDir', '--logLevel', 'error'], { env: { ...process.env, VITE_HOY_BUILD: 'production' }, stdio: 'inherit' });
  execFileSync('node', ['scripts/prune-production.mjs', prodDir], { stdio: 'inherit' });
}
const prod = js(prodDir);
const all = files(prodDir);
const bytes = all.reduce((n, f) => n + statSync(f).size, 0);
check(`production: under the 60 MB upload budget (${(bytes / 1048576).toFixed(1)} MB)`, bytes < 60 * 1048576);
check('production: Clerk loads in its own chunk, not the entry', has(prod, 'clerk-js').length > 0 && !has(prod, 'clerk-js').some((f) => /^index-/.test(f)));
check('production: no in-app screenshots or thumbnails', !all.some((f) => /\/(thumb-[^/]*|[A-Z]+-\d+[a-z]?-(es|en)-[^/]*)\.(jpe?g|png|webp)$/i.test(f)));
check('production: no hub map, actions registry, delivery tracker or source documents', ['hub-map.json', 'actions.json', 'hub-map', 'hub', 'delivery-room', 'source'].every((p) => !existsSync(join(prodDir, p))));
// Route-level absence (hub, dev, docs, manual) is checked in the browser: test-auth-production-ui.mjs (PL-03).
// The demo sign-in screen calls t('customer.signin.demo') (its user list); the key alone stays in the shared string table.
check('production: no persona switcher, spec chip or demo sign-in screen', has(prod, 'rs-user').length === 0 && has(prod, 'specchip').length === 0 && has(prod, demoSignIn).length === 0, [...has(prod, 'rs-user'), ...has(prod, demoSignIn)].join(', '));
check('production: no agent manifest (window.__hoyos)', has(prod, '__hoyos').length === 0);
check('production: no preview-frame session (hub DeviceFrame)', has(prod, 'hoyos.session').length === 0);
// The manual and docs text: a sentence from the manual, the docs README and a changelog entry must not be anywhere.
const sample = (file) => readFileSync(file, 'utf8').split('\n').find((l) => l.length > 60 && !/^[-#>|`{]/.test(l.trim()))?.trim().slice(0, 50);
const docsDir = 'docs/changelog';
const changelog = readdirSync(docsDir).filter((f) => f.endsWith('.md')).sort().pop();
for (const file of ['docs/ops-manual/es/00-index.md', 'docs/README.md', join(docsDir, changelog)]) {
  const line = sample(file);
  check(`production: no docs text (${relative('.', file)})`, !!line && has(prod, line).length === 0, `${line} in ${has(prod, line ?? '').join(', ')}`);
}
check('production: no docs markdown index (docmeta)', has(prod, 'ops-manual/es/').length === 0);
if (process.env.QA_STRICT_DEMO_DATA === '1') {
  check('production (strict): no demo persona', has(prod, 'Sofía Arango').length === 0 && has(prod, 'usr_super').length === 0, has(prod, 'usr_super').join(', '));
  check('production (strict): no MockProvider seed', has(prod, 'Juliana Ospina').length === 0);
} else {
  console.log(`note demo personas/seed in production: ${has(prod, 'usr_super').length ? 'present (MockProvider, until H-3 swaps the provider)' : 'absent'} — set QA_STRICT_DEMO_DATA=1 to require absence`);
}
done();
