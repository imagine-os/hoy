// Review round 1 (Hoy all-roles): what this branch needs to ship safely, checked from the repository.
// - M2: company-os.json asks for the Company OS release that carries what the branch uses (credits 1.2.0, the Hoy
//   recipe's public_site role and studio_private policies): >= 1.7.0, the first release after v1.6.0; the changelog
//   says the recipe and the public_site read token (COMPANY_OS_READ_TOKEN) must be in place before this frontend
//   deploys (playbook E9: `requires` cannot say that ordering), and names the pay-data move (M1) and its command.
// - L7: the checks the branch added or changed run in CI (auth-checks.yml, fake-clerk job), each after what it needs.
// - L1, L9: recorded as known limits in the changelog.
// Run: node scripts/test-release-wiring.mjs
import { readFileSync, existsSync } from 'node:fs';
import { reporter } from './lib/launch-qa.mjs';

const { check, done } = reporter('release wiring');
const semver = (v) => v.split('.').map(Number);
const atLeast = (a, b) => { const [x, y] = [semver(a), semver(b)]; for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]; return true; };

// ── M2 ────────────────────────────────────────────────────────────────────────────────────────────────────────────
const requires = JSON.parse(readFileSync('company-os.json', 'utf8')).requires ?? '';
const min = /^>=(\d+\.\d+\.\d+)$/.exec(requires)?.[1] ?? '0.0.0';
check('M2 company-os.json requires Company OS >= 1.7.0 (credits 1.2.0 and the recipe policies are unreleased in v1.6.0)', atLeast(min, '1.7.0'), requires);

const NOTE = 'docs/changelog/_pending/hoy-all-roles-r1.md';
const note = existsSync(NOTE) ? readFileSync(NOTE, 'utf8') : '';
check('M2 the changelog says the Hoy recipe must be applied before this frontend deploys', /recipe/i.test(note) && /before (this|the) frontend/i.test(note), NOTE);
check('M2 …and that the public_site identity and COMPANY_OS_READ_TOKEN must be set first', /public_site/.test(note) && /COMPANY_OS_READ_TOKEN/.test(note));
check('M2 the changelog names the bump (>=1.7.0)', note.includes('>=1.7.0'));
check('M1 the changelog gives the pay-data move command (dry run, then --apply)', /node scripts\/move-private-settings\.ts/.test(note) && /--apply/.test(note));
check('L1, L9 recorded as known limits (the signed-out strip\'s two shapes; the per-IP limit behind carrier NAT)', /known limit/i.test(note) && /\bL1\b/.test(note) && /\bL9\b/.test(note));

// ── L7 ────────────────────────────────────────────────────────────────────────────────────────────────────────────
const wf = readFileSync('.github/workflows/auth-checks.yml', 'utf8');
const job = wf.slice(wf.indexOf('  fake-clerk:'), wf.indexOf('\n  real-clerk:'));
const steps = job.split('\n      - ').map((s) => s.trim());
const at = (script) => steps.findIndex((s) => new RegExp(`node scripts/${script}\\.(mjs|ts)(\\s|$)`).test(s));
const stepText = (script) => steps[at(script)] ?? '';
const reviewBuild = steps.findIndex((s) => /run: npm run build$/m.test(s));
const prodBuild = steps.findIndex((s) => /npm run build:production/.test(s));
for (const s of ['test-companyos-provider', 'test-admin-activity', 'test-real-signup', 'test-move-private-settings', 'test-release-wiring']) {
  check(`L7 CI runs ${s} (fake-clerk job)`, at(s) >= 0);
}
for (const s of ['test-website-signed-out-live', 'test-admin-activity-ui']) {
  check(`L7 CI runs ${s} on the production build (QA_PROD_DIST)`, at(s) > prodBuild && /QA_PROD_DIST/.test(stepText(s)), stepText(s));
}
for (const s of ['test-launch-website-ui', 'test-launch-website-content']) {
  check(`L7 CI runs ${s} after the review build, with the production build as QA_PROD_DIST`, at(s) > reviewBuild && reviewBuild >= 0 && /QA_PROD_DIST/.test(stepText(s)), stepText(s));
}
check('L7 the signed-out website check has the Hoy server\'s own dependencies installed first (server/, @clerk/backend)', /npm ci --prefix server|cd server && npm ci|working-directory: server/.test(job) && job.indexOf('prefix server') < job.indexOf('test-website-signed-out-live'));
// Lane ci1: the docs gate looks for the private pack beside whatever dist it serves (`<dist>-private`, docsGate.mjs);
// the job copies the production build to $RUNNER_TEMP/prod, so the pack must go to $RUNNER_TEMP/prod-private with it.
check('ci1 the production build step copies the private docs pack beside the copied build (prod-private)', /cp -R dist-private "\$RUNNER_TEMP\/prod-private"/.test(steps[prodBuild] ?? ''), steps[prodBuild]);
check('L7 test-real-signup runs offline in CI (no COS_LOCAL_API: its live part says it skipped)', !/COS_LOCAL_API:/.test(stepText('test-real-signup')));
done();
