// CI by area (Company OS tools/ci, playbook E14): scripts/ci/areas.json decides which of Auth checks' suites a change
// runs. This checks that no check was lost when the one long job became "fast steps + the affected areas":
// - every script the old auth-checks.yml ran (fake-clerk job, hardcoded below from main before the split) is either in
//   an area or run unconditionally by the new workflow's fast steps;
// - every area script is a file that exists (runner ["node"]: an area script is a file path, run as `node <file>`);
// - every glob matches at least one tracked file, and the shape is valid (validateConfig, the shared script's own);
// - a few paths land where they should (shared → all, agent files → none, CSS → fast, an area's file → that area);
// - no file in an area is imported from outside it (area-imports, the shared import guard).
// Run: node scripts/test-ci-areas.mjs
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { classify, configProblems, validateConfig } from './ci/affected-areas.mjs';
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

// Where some paths land. All TypeScript under src/ is shared: the router imports every module's index.ts eagerly
// (src/app/registry.ts, import.meta.glob), each index reaches its pages, and pages import across modules, so the
// import guard below leaves no module file to a single area. Areas are the browser checks' own files and assets.
const mode = (files) => { const r = classify(files, config); return r.mode === 'areas' ? `areas:${r.areas.join(',')}` : r.mode; };
const expect = (label, files, want) => { const got = mode(files); check(`${label} → ${want}`, got === want, got); };
expect('agent and playbook files only', ['AGENTS.md', 'CLAUDE.md', 'docs/playbook-inbox.md', '.claude/settings.json'], 'none');
expect('a harness only another QA workflow runs', ['scripts/h5-launch-harness.tsx'], 'none');
expect('a component stylesheet', ['src/components/atom/Button/Button.css'], 'fast');
expect('a module stylesheet', ['src/modules/admin/admin.css'], 'fast');
expect('the design tokens stylesheet', ['src/design/tokens.css'], 'fast');
expect('a changelog entry and the kanban', ['docs/changelog/_pending/x.md', 'docs/kanban.md'], 'fast');
expect('the calendar stylesheet (read by a node-level check, which the fast steps run)', ['src/components/organism/SessionCalendar/SessionCalendar.css'], 'fast');
expect('a node-level check', ['scripts/test-hoy-12nov-book.mjs'], 'fast');
expect('the comms templates (read by node-level checks only)', ['deploy/comms/hoy-templates.json'], 'fast');
expect('the global stylesheet', ['src/styles/global.css'], 'all');
expect('the Hub stylesheet (view-as checks pointer events)', ['src/modules/hub/hub.css'], 'all');
expect('sign-in code', ['src/auth/clerkFlows.ts'], 'all');
expect('package.json', ['package.json'], 'all');
expect('the lockfile', ['package-lock.json'], 'all');
expect('the Hoy server', ['server/app.mjs'], 'all');
expect('a shared component', ['src/components/atom/Button/Button.tsx'], 'all');
expect('a module strings file (browser checks assert copy: never fast)', ['src/modules/staff/desk/strings.ts'], 'all');
expect('a module page', ['src/modules/admin/ExpensesPage.tsx'], 'all');
expect('the CI config', ['scripts/ci/areas.json'], 'all');
expect('a workflow', ['.github/workflows/release.yml'], 'all');
expect('a shared QA helper', ['scripts/lib/launch-qa.mjs'], 'all');
expect('the browser checks\' fake Clerk', ['scripts/fixtures/fake-clerk.js'], 'all');
expect('an unknown root file', ['new-file.txt'], 'all');
expect('a browser check runs in its area', ['scripts/test-r1-ui.mjs'], 'areas:admin');
expect('a public image', ['public/images/x.jpg'], 'areas:website');
expect('the operations manual', ['docs/ops-manual/es/00-index.md'], 'areas:auth');
expect('two areas at once', ['scripts/test-r1-ui.mjs', 'public/images/x.jpg'], 'areas:admin,website');

// The import guard (Company OS tools/ci/area-imports.mjs): no file in an area is imported from outside it.
const imports = importProblems({ config, files: repoFiles, read: (f) => readFileSync(f, 'utf8'), aliases: { '@/': '' } });
check('area-imports: no area file is imported by a shared, unknown, fast or other-area file', imports.length === 0, imports.slice(0, 5).join('; '));

console.log(failed ? `\n${failed} ci areas check(s) failed` : '\nci areas passed');
process.exitCode = failed ? 1 : 0;
