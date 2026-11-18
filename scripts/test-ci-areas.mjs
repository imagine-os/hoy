// CI by area (Company OS tools/ci, playbook E14): scripts/ci/areas.json decides which of Auth checks' suites a change
// runs. This checks that no check was lost when the one long job became "fast steps + the affected areas":
// - every script the old auth-checks.yml ran (fake-clerk job, hardcoded below from main before the split) is either in
//   an area or run unconditionally by the new workflow's fast steps;
// - every area script is a file that exists (runner ["node"]: an area script is a file path, run as `node <file>`);
// - every glob matches at least one tracked file, and the shape is valid (validateConfig, the shared script's own);
// - a few paths land where they should (shared → all, agent files → none, CSS → fast, an area's file → that area);
// - no file in an area is imported from outside it (area-imports, the shared import guard);
// - v2: src/ is classified by its importers (graph in areas.json): graphProblems finds no import the walk cannot see,
//   and pinned files land where they should (a module page → its areas, the app shell → all).
// Run: node scripts/test-ci-areas.mjs
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { buildGraph, classify, configProblems, graphProblems, validateConfig } from './ci/affected-areas.mjs';
import { importProblems } from './ci/area-imports.mjs';

let failed = 0;
const check = (label, ok, detail = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail && !ok ? ` — ${detail}` : ''}`); if (!ok) failed++; };

// The fake-clerk job of auth-checks.yml on main before CI by area (b449e7dc). test-auth-real-clerk.mjs is not here: it
// runs only in the by-hand real-clerk and real-signup jobs, which stay as they were.
const OLD = [
  'test-auth-production-ui', 'test-auth-identity', 'test-jas-1nov-customer', 'test-jas-1nov-customer-ui', 'test-view-as',
  'test-hub-production', 'test-view-as-ui', 'test-pay-page-frame', 'test-launch-routes', 'test-launch-config',
  'test-pack-reads', 'test-golive-h3', 'test-payment-paid-at', 'test-companyos-studio-data', 'test-route-connectivity',
  'test-teacher-codes', 'test-h1-connected-flows', 'test-companyos-provider', 'test-jas-1nov-admin',
  'test-staff-walkin-window', 'test-void-payment', 'test-admin-activity', 'test-golive-images', 'test-class-images',
  'test-hoy-server', 'test-real-signup', 'test-move-private-settings', 'test-test-gate', 'test-seo', 'test-hoy-12nov-book',
  'test-hoy-12nov-fix', 'test-hoy-12nov-r1', 'test-hoy-12nov-r2', 'test-any-start-time', 'test-release-wiring',
  'test-website-signed-out-live', 'test-test-gate-ui', 'test-admin-activity-ui', 'test-r1-ui', 'test-void-payment-ui',
  'test-golive-images-ui', 'test-jas-1nov-admin-ui', 'test-golive-h3-ui', 'test-seo-ui', 'test-launch-website-ui',
  'test-launch-website-content', 'test-auth-builds', 'test-launch-roles-ui',
].map((s) => `scripts/${s}.mjs`);
check('the old list has the 48 scripts of the old fake-clerk job', OLD.length === 48 && new Set(OLD).size === 48, String(OLD.length));

const CONFIG = 'scripts/ci/areas.json';
const config = existsSync(CONFIG) ? JSON.parse(readFileSync(CONFIG, 'utf8')) : null;
check('scripts/ci/areas.json exists and has a valid shape', config && configProblems(config).length === 0, config ? configProblems(config).join('; ') : 'missing');
if (!config) { console.log('\nci areas: stopped'); process.exit(1); }

// The scripts the new workflow runs unconditionally (its fast steps, outside run-areas), in the job that runs the areas.
const wf = readFileSync('.github/workflows/auth-checks.yml', 'utf8');
const jobStart = wf.indexOf('\n  fake-clerk:\n');
const job = jobStart >= 0 ? wf.slice(jobStart, wf.indexOf('\n  real-clerk:')) : '';
const fastScripts = [...job.matchAll(/^\s+run: node (scripts\/test-[a-z0-9.-]+\.mjs)\s*$/gm)].map((m) => m[1]);
check('the fake-clerk job has fast steps and run-areas', job.includes('node scripts/ci/run-areas.mjs') && fastScripts.length > 0, String(fastScripts.length));
check('the by-hand real-clerk and real-signup jobs still run test-auth-real-clerk', /\n  real-clerk:[\s\S]*node scripts\/test-auth-real-clerk\.mjs\n[\s\S]*\n  real-signup:[\s\S]*node scripts\/test-auth-real-clerk\.mjs --real-api/.test(wf));

const repoFiles = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const read = (f) => readFileSync(f, 'utf8');
const graph = buildGraph({ config, files: repoFiles.filter((f) => existsSync(f)), read });
const scriptFiles = repoFiles.filter((f) => /^scripts\/test-[a-z0-9.-]+\.mjs$/.test(f));
const problems = validateConfig(config, { workflowScripts: OLD.filter((s) => !fastScripts.includes(s)), packageScripts: scriptFiles, repoFiles });
check('validateConfig: no check lost, every area script exists, every glob matches a file', problems.length === 0, problems.join('; '));
check('runner is node (an area script is the test file itself, exactly as the old workflow ran it)', JSON.stringify(config.runner) === '["node"]', JSON.stringify(config.runner));

// Every old test file is the path of at least one area that runs it: changing a test reruns it, never only fast.
const owners = (file) => Object.entries(config.areas).filter(([, a]) => classify([file], { ...config, areas: { x: a } }).mode === 'areas').map(([n]) => n);
for (const s of OLD.filter((x) => !fastScripts.includes(x))) {
  const running = Object.entries(config.areas).filter(([, a]) => a.scripts.includes(s)).map(([n]) => n);
  const r = classify([s], config);
  check(`${s}: a change to it runs it`, r.mode === 'all' || (r.mode === 'areas' && r.areas.some((n) => running.includes(n))), `${r.mode} ${r.areas.join(',')} (runs in ${running.join(',')}; path in ${owners(s).join(',')})`);
}

// Where some paths land. v2: TypeScript under src/ is decided by its importers (the reverse import closure, graph in
// areas.json). The registry's eager glob of every module index and each index's lazy page imports are seams, so a
// module file reaches only its module (entries: modules by the surfaces their routes declare); anything the shell
// (src/app/**, src/main.tsx) or sign-in (src/auth/**) imports reaches a root and runs everything.
const mode = (files) => { const r = classify(files, config, { graph }); return r.mode === 'areas' ? `areas:${r.areas.join(',')}` : r.mode; };
const expect = (label, files, want) => { const got = mode(files); check(`${label} → ${want}`, got === want, got); };
expect('agent and playbook files only', ['AGENTS.md', 'CLAUDE.md', 'docs/playbook-inbox.md', '.claude/settings.json'], 'none');
expect('a harness only another QA workflow runs', ['scripts/h5-launch-harness.tsx'], 'none');
expect('a component stylesheet no layout check reads', ['src/components/atom/Avatar/Avatar.css'], 'fast');
expect('a module stylesheet no check reads (docs viewer)', ['src/modules/docs/docs.css'], 'fast');
// Layout checks read these: phone-width overflow on the activity log (admin/table CSS), the calendar cells inside
// .calendar-window (customer), overflow on sign-in. Fast beats areas, so they are shared.
expect('the admin stylesheet (activity log has no horizontal scroll at phone width)', ['src/modules/admin/admin.css'], 'all');
expect('the table stylesheets (activity log at phone width)', ['src/modules/admin/tables.css', 'src/components/organism/DataTable/DataTable.css'], 'all');
expect('the customer stylesheet (calendar cells)', ['src/modules/customer/customer.css'], 'all');
expect('the identity stylesheet (sign-in overflow)', ['src/modules/identity/identity.css'], 'all');
expect('the design tokens stylesheet', ['src/design/tokens.css'], 'all');
expect('a pending changelog note and the kanban', ['docs/changelog/_pending/x.md', 'docs/kanban.md'], 'fast');
expect('the calendar stylesheet (cells inside .calendar-window are measured)', ['src/components/organism/SessionCalendar/SessionCalendar.css'], 'all');
expect('a node-level check', ['scripts/test-hoy-12nov-book.mjs'], 'fast');
expect('the comms templates (read by node-level checks only)', ['deploy/comms/hoy-templates.json'], 'fast');
expect('the global stylesheet', ['src/styles/global.css'], 'all');
expect('the Hub stylesheet (view-as checks pointer events)', ['src/modules/hub/hub.css'], 'all');
expect('sign-in code', ['src/auth/clerkFlows.ts'], 'all');
expect('package.json', ['package.json'], 'all');
expect('the lockfile', ['package-lock.json'], 'all');
expect('the Hoy server', ['server/app.mjs'], 'all');
expect('a shared component sign-in uses (reaches src/auth)', ['src/components/atom/Button/Button.tsx'], 'all');
expect('a module strings file (browser checks assert copy: never fast; v2: its module\'s areas)', ['src/modules/staff/desk/strings.ts'], 'areas:admin');
expect('a module page', ['src/modules/admin/ExpensesPage.tsx'], 'areas:admin');
expect('the website strings', ['src/modules/website/strings.ts'], 'areas:website');
expect('a voucher redeem page (customer and admin routes share the module)', ['src/modules/vouchers/production/pages.tsx'], 'areas:admin,customer');
expect('the teacher pages (staff side: admin)', ['src/modules/teacher/pages.ts'], 'areas:admin');
expect('the app shell', ['src/app/App.tsx'], 'all');
expect('the module registry', ['src/app/registry.ts'], 'all');
expect('the data provider the shell mounts', ['src/data/DataContext.tsx'], 'all');
expect('an ambient type file', ['src/vite-env.d.ts'], 'fast');
expect('a build generator that reads src', ['scripts/gen-tokens.mjs'], 'all');
expect('a harness no area script uses', ['scripts/booking-launch-harness.tsx'], 'fast');
expect('the CI config', ['scripts/ci/areas.json'], 'all');
expect('a workflow', ['.github/workflows/release.yml'], 'all');
expect('a shared QA helper', ['scripts/lib/launch-qa.mjs'], 'all');
expect('the browser checks\' fake Clerk', ['scripts/fixtures/fake-clerk.js'], 'all');
expect('an unknown root file', ['new-file.txt'], 'all');
expect('a browser check runs in its area', ['scripts/test-r1-ui.mjs'], 'areas:admin');
expect('a public image', ['public/images/x.jpg'], 'areas:website');
expect('the operations manual (view-as reads it through the docs gate; the website check opens /manual)', ['docs/ops-manual/es/00-index.md'], 'areas:auth,website');
expect('a numbered changelog entry (rendered at /docs/changelog)', ['docs/changelog/0004-docs-content-canvas.md'], 'areas:auth,website');
expect('a pending changelog note stays fast', ['docs/changelog/_pending/x.md'], 'fast');
expect('the docs overview (/docs)', ['docs/README.md'], 'areas:auth,website');
expect('the source documents index (imported by the manual module: shared)', ['docs/source/index.json'], 'all');
expect('the source documents readme', ['docs/source/README.md'], 'areas:auth,website');
expect('a source PDF behind the docs gate', ['public/source/manual-de-marca.pdf'], 'areas:auth,website');
expect('two areas at once', ['scripts/test-r1-ui.mjs', 'public/images/x.jpg'], 'areas:admin,website');

// The import guard (Company OS tools/ci/area-imports.mjs): no file in an area is imported from outside it.
const imports = importProblems({ config, files: repoFiles, read, aliases: { '@/': '' } });
check('area-imports: no area file is imported by a shared, unknown, fast or other-area file', imports.length === 0, imports.slice(0, 5).join('; '));

// The walk fails closed only if it sees every import: no non-literal import(), no specifier that resolves to nothing,
// no seam that cuts an edge to a file that is no entry, no dead glob (graphProblems, the shared script's own).
const gp = graphProblems({ config, files: repoFiles, read });
check('graphProblems: the import graph has no blind spot', gp.length === 0, gp.slice(0, 5).join('; '));

console.log(failed ? `\n${failed} ci areas check(s) failed` : '\nci areas passed');
process.exitCode = failed ? 1 : 0;
