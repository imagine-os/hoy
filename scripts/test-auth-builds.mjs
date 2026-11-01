// H-2 / PL-03 at bundle level: what each build ships. Reads the built files only (no browser).
// - Review build (dist/, `npm run build`): unchanged — demo sign-in and hub are there, Clerk is not.
// - Production build (`npm run build:production`; QA_PROD_DIST=<dir>, else built here into a temp dir): Clerk is a
//   separate chunk; Justin's Hub ships for super admins (lane D, then Hoy test-fixes lane Y3: its look, live
//   read-only previews, the session bar, the wireframe toggle) with real people and never a demo persona; the manual,
//   the source documents, the docs and the kanban are NOT in the public bundle (lane Y6: no docs text, docmeta, source
//   summary, docs image or PDF in dist) but in the private pack beside it (`<dist>-private`, redacted), which only the
//   server's gate serves to a signed-in super admin; no
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
// Lane Y6: the source documents (PDFs, covers) are not public files any more; they are in the private pack the Hoy
// server gates (server/docsGate.mjs: a signed-in super admin only).
const privDir = `${prodDir.replace(/\/+$/, '')}-private`;
check('production: no source document is a public file (no source/, no PDF anywhere in dist)', !existsSync(join(prodDir, 'source')) && !all.some((f) => f.endsWith('.pdf')), all.filter((f) => f.endsWith('.pdf')).join(', '));
check('production: the source documents are in the private pack beside dist (served only through the gate)', existsSync(join(privDir, 'source')) && readdirSync(join(privDir, 'source')).filter((f) => f.endsWith('.pdf')).length === readdirSync('public/source').filter((f) => f.endsWith('.pdf')).length);
// Route-level absence (hub, dev, docs, manual) is checked in the browser: test-auth-production-ui.mjs (PL-03).
// The demo sign-in screen calls t('customer.signin.demo') (its user list); the key alone stays in the shared string table.
check('production: no persona switcher, spec chip or demo sign-in screen', has(prod, 'rs-user').length === 0 && has(prod, 'specchip').length === 0 && has(prod, demoSignIn).length === 0, [...has(prod, 'rs-user'), ...has(prod, demoSignIn)].join(', '));
// The manifest is the assignment (`window.__hoyos = …`, src/app/manifest.ts); the dev inspector's help text only names it
// (the developer's home `/dev` ships since Hoy all-roles). test-auth-production-ui.mjs checks `window.__hoyos` is unset.
check('production: no agent manifest (window.__hoyos)', has(prod, /(\.__hoyos|\[\s*["'`]__hoyos["'`]\s*\])\s*=[^=]/).length === 0, has(prod, /(\.__hoyos|\[\s*["'`]__hoyos["'`]\s*\])\s*=[^=]/).join(', '));
// The review build's frame session (demo users by `hoyos.session`) never ships; production frames shadow view-as instead.
// The docs (shipped since lane Y3) mention the key in prose; the code's string literal is what must be absent.
check('production: no review preview-frame session (the "hoyos.session" key in code)', has(prod, /(^|[^\\])"hoyos\.session"/).length === 0, has(prod, /(^|[^\\])"hoyos\.session"/).join(', '));
// Lane Y3: Justin's Hub ships (super admin only): its markup, live previews, the session bar and the wireframe toggle,
// the production frame mode and the problem_report form; lane D's simplified page is gone.
check('production: Justin\'s Hub ships (route /hub, session bar, live previews, brand band)', has(prod, '"/hub"').length > 0 && ['hub-sessionbar', 'hub-card-preview', 'hub-brandband', 'data-hub-persona'].every((m) => has(prod, m).length > 0), ['hub-sessionbar', 'hub-card-preview', 'hub-brandband', 'data-hub-persona'].filter((m) => !has(prod, m).length).join(', '));
check('production: the frame mode, view-as and the problem report ship', has(prod, 'hoyos.viewAs').length > 0 && has(prod, 'hoyos.skin').length > 0 && has(prod, 'problem_report').length > 0);
check('production: lane D\'s simplified Hub is gone', has(prod, 'data-production-hub').length === 0);
// Lane Y6 (owner 2026-11-01, "Gate on the server first"): the manual, docs, kanban and changelog text are NOT in the
// public bundle; they are in `<dist>-private/docs.json`, which only the gated /private-docs/ endpoint serves.
const sample = (file) => readFileSync(file, 'utf8').split('\n').find((l) => l.length > 60 && !/^[-#>|`{]/.test(l.trim()))?.trim().slice(0, 50);
const docsDir = 'docs/changelog';
const changelog = readdirSync(docsDir).filter((f) => f.endsWith('.md')).sort().pop();
const publicText = all.filter((f) => /\.(js|css|html|json|map|md|txt|svg|xml|webmanifest)$/.test(f)).map((f) => ({ f, text: readFileSync(f, 'utf8') }));
const pack = existsSync(join(privDir, 'docs.json')) ? readFileSync(join(privDir, 'docs.json'), 'utf8') : '';
for (const file of ['docs/ops-manual/es/00-index.md', 'docs/ops-manual/en/04-recepcion-y-check-in.md', 'docs/README.md', 'docs/kanban.md', join(docsDir, changelog)]) {
  const line = sample(file);
  check(`production: the docs text is not in any public file (${relative('.', file)})`, !!line && has(publicText, line).length === 0, `${line} in ${has(publicText, String(line)).join(', ')}`);
  check(`production: the docs text is in the private pack (${relative('.', file)})`, !!line && pack.includes(JSON.stringify(line).slice(1, -1)), String(line));
}
// docmeta's shape ({ title, meta, words, figures, … }, scripts/lib/docmeta.mjs), as JSON or minified; code that only
// names a manual path or the `DECISIÓN PENDIENTE` marker (the viewer, the specs) is not docs content.
const DOCMETA = /\bwords"?:\d+,"?figures"?:\d+/;
check('production: no docs markdown index (docmeta) in the public bundle', has(publicText, DOCMETA).length === 0, has(publicText, DOCMETA).join(', '));
const sourceIndex = JSON.parse(readFileSync('docs/source/index.json', 'utf8'));
check('production: no source document summary in the public bundle', sourceIndex.every((s) => has(publicText, s.summary.es.slice(0, 60)).length === 0));
check('production: no docs image in the public bundle (docs/ images ship only inside the private pack)', !all.some((f) => /frontend-completion|evidence/.test(relative(prodDir, f))));
if (process.env.QA_STRICT_DEMO_DATA === '1') {
  check('production (strict): no demo persona', has(prod, 'Sofía Arango').length === 0 && has(prod, 'usr_super').length === 0, has(prod, 'usr_super').join(', '));
  // Lane Y3 ships the docs, which name the demo users: every demo full name and id must be redacted, accented or not.
  const demoSrc = readFileSync('src/auth/demoUsers.ts', 'utf8');
  const demoNames = [...demoSrc.matchAll(/\bname:\s*'([^']+ [^']+)'/g)].map((x) => x[1]).flatMap((n) => [n, n.normalize('NFD').replace(/[\u0300-\u036f]/g, '')]);
  const demoIds = [...demoSrc.matchAll(/\bid:\s*'(usr_[a-z0-9_]+)'/g)].map((x) => x[1]);
  // Names and ids that production code itself carries on purpose (the visitor id, a teacher of the launch seed who shares a
  // demo name, spec examples) are the H-10 markers' business, not the docs': only the rest is checked here.
  const REVIEW_ONLY = /^src\/(hub\/(?!hubMap\.data\.ts$)|auth\/demoUsers|app\/frameSession|data\/MockProvider|data\/seed\/(?!(catalog|timetable|content|legal|media|studioPolicies)\.ts$))/;
  const productionSrc = files('src').filter((f) => /\.(tsx?|json)$/.test(f) && !REVIEW_ONLY.test(relative('.', f))).map((f) => readFileSync(f, 'utf8')).join('\n');
  const fromDocs = [...new Set([...demoNames, ...demoIds])].filter((n) => !productionSrc.includes(n));
  const leaked = fromDocs.filter((n) => has(prod, n).length);
  check(`production (strict): the docs carry no demo user (${fromDocs.length} names and ids checked, accented or not)`, fromDocs.length >= 10 && leaked.length === 0, leaked.join(', '));
  check('production (strict): no MockProvider seed', has(prod, 'Juliana Ospina').length === 0);
  // Lane Y6: the private pack is served to the super admin only, but it still describes the review build: redacted too.
  const packLeaks = [...new Set([...demoNames, ...demoIds])].filter((n) => pack.includes(n) && !productionSrc.includes(n));
  check('production (strict): the private docs pack carries no demo user', pack.length > 0 && packLeaks.length === 0, packLeaks.join(', '));
} else {
  console.log(`note demo personas/seed in production: ${has(prod, 'usr_super').length ? 'present (MockProvider, until H-3 swaps the provider)' : 'absent'} — set QA_STRICT_DEMO_DATA=1 to require absence`);
}
done();
