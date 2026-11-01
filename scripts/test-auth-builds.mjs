// H-2 / PL-03 at bundle level: what each build ships. Reads the built files only (no browser).
// - Review build (dist/, `npm run build`): unchanged — demo sign-in and hub are there, Clerk is not.
// - Production build (`npm run build:production`; QA_PROD_DIST=<dir>, else built here into a temp dir): Clerk is a
//   separate chunk; Justin's Hub ships for super admins (lane D, then Hoy test-fixes lane Y3: its look, live
//   read-only previews, the session bar, the wireframe toggle) with real people and never a demo persona; the manual,
//   the source documents, the docs and the kanban ship for the super admin (Y3, R-08 answered for these pages); no
//   demo sign-in panel, persona switcher or agent manifest; no in-app screenshots or hub-map files; under the budget.
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
  check('review: the review Hub is the full one (session bar, live previews), not the production page', has(review, 'hub-sessionbar').length > 0 && has(review, 'hub-card-preview').length > 0);
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
// The entry is the script index.html loads (a lazy chunk can also be named index-*, after the package file it starts with).
const entryJs = readFileSync(join(prodDir, 'index.html'), 'utf8').match(/assets\/([^"']+\.js)/)?.[1];
check('production: Clerk loads in its own chunk, not the entry', !!entryJs && has(prod, 'clerk-js').length > 0 && !has(prod, 'clerk-js').includes(entryJs), `${entryJs} / ${has(prod, 'clerk-js').join(', ')}`);
check('production: no in-app screenshots or thumbnails', !all.some((f) => /\/(thumb-[^/]*|[A-Z]+-\d+[a-z]?-(es|en)-[^/]*)\.(jpe?g|png|webp)$/i.test(f)));
check('production: no hub map, actions registry or delivery tracker', ['hub-map.json', 'actions.json', 'hub-map', 'hub', 'delivery-room'].every((p) => !existsSync(join(prodDir, p))));
check('production: the source documents behind the manual ship (lane Y3: the Construction & testing band)', existsSync(join(prodDir, 'source')) && readdirSync(join(prodDir, 'source')).some((f) => f.endsWith('.pdf')));
// Route-level absence (hub, dev, docs, manual) is checked in the browser: test-auth-production-ui.mjs (PL-03).
// The demo sign-in screen calls t('customer.signin.demo') (its user list); the key alone stays in the shared string table.
check('production: no persona switcher, spec chip or demo sign-in screen', has(prod, 'rs-user').length === 0 && has(prod, 'specchip').length === 0 && has(prod, demoSignIn).length === 0, [...has(prod, 'rs-user'), ...has(prod, demoSignIn)].join(', '));
// The manifest is the assignment (`window.__hoyos = …`, src/app/manifest.ts); the dev inspector's help text only names it
// (the developer's home `/dev` ships since Hoy all-roles). test-auth-production-ui.mjs checks `window.__hoyos` is unset.
check('production: no agent manifest (window.__hoyos)', has(prod, /(\.__hoyos|\[\s*["'`]__hoyos["'`]\s*\])\s*=[^=]/).length === 0, has(prod, /(\.__hoyos|\[\s*["'`]__hoyos["'`]\s*\])\s*=[^=]/).join(', '));
// The review build's frame session (demo users by `hoyos.session`) never ships; production frames shadow view-as instead.
check('production: no review preview-frame session (hoyos.session)', has(prod, 'hoyos.session').length === 0);
// Lane Y3: Justin's Hub ships (super admin only): its markup, live previews, the session bar and the wireframe toggle,
// the production frame mode and the problem_report form; lane D's simplified page is gone.
check('production: Justin\'s Hub ships (route /hub, session bar, live previews, brand band)', has(prod, '"/hub"').length > 0 && ['hub-sessionbar', 'hub-card-preview', 'hub-brandband', 'data-hub-persona'].every((m) => has(prod, m).length > 0), ['hub-sessionbar', 'hub-card-preview', 'hub-brandband', 'data-hub-persona'].filter((m) => !has(prod, m).length).join(', '));
check('production: the frame mode, view-as and the problem report ship', has(prod, 'hoyos.viewAs').length > 0 && has(prod, 'hoyos.skin').length > 0 && has(prod, '/forms/problem_report/submissions').length > 0);
check('production: lane D\'s simplified Hub is gone', has(prod, 'data-production-hub').length === 0);
// The manual and docs text ship since lane Y3 (super admin only): a manual sentence, the docs README and a changelog entry.
const sample = (file) => readFileSync(file, 'utf8').split('\n').find((l) => l.length > 60 && !/^[-#>|`{]/.test(l.trim()))?.trim().slice(0, 50);
const docsDir = 'docs/changelog';
const changelog = readdirSync(docsDir).filter((f) => f.endsWith('.md')).sort().pop();
for (const file of ['docs/ops-manual/es/00-index.md', 'docs/README.md', join(docsDir, changelog)]) {
  const line = sample(file);
  check(`production: the docs text ships (${relative('.', file)})`, !!line && has(prod, line).length > 0, String(line));
}
check('production: the docs markdown index ships (docmeta)', has(prod, 'ops-manual/es/').length > 0);
if (process.env.QA_STRICT_DEMO_DATA === '1') {
  check('production (strict): no demo persona', has(prod, 'Sofía Arango').length === 0 && has(prod, 'usr_super').length === 0, has(prod, 'usr_super').join(', '));
  check('production (strict): no MockProvider seed', has(prod, 'Juliana Ospina').length === 0);
} else {
  console.log(`note demo personas/seed in production: ${has(prod, 'usr_super').length ? 'present (MockProvider, until H-3 swaps the provider)' : 'absent'} — set QA_STRICT_DEMO_DATA=1 to require absence`);
}
done();
