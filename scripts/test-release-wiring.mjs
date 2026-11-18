// Review round 1 (Hoy all-roles): what this branch needs to ship safely, checked from the repository.
// - M2: company-os.json asks for the Company OS release that carries what the branch uses (credits 1.2.0, the Hoy
//   recipe's public_site role and studio_private policies): >= 1.7.0, the first release after v1.6.0; the changelog
//   says the recipe and the public_site read token (COMPANY_OS_READ_TOKEN) must be in place before this frontend
//   deploys (playbook E9: `requires` cannot say that ordering), and names the pay-data move (M1) and its command.
// - L7: the checks the branch added or changed run in CI (auth-checks.yml checks job: fast steps or area scripts).
// - CI by area: SHA pins, no credentials kept, no ${{ }} in run:, the release marker, the tag as the version.
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

// ── L7, CI by area ────────────────────────────────────────────────────────────────────────────────────────────────
// The checks the branch added or changed still run: in auth-checks.yml's checks job, either as a fast step (always)
// or as an area script (scripts/ci/areas.json, run by scripts/ci/run-areas.mjs after the fast steps).
const wf = readFileSync('.github/workflows/auth-checks.yml', 'utf8');
const job = wf.slice(wf.indexOf('\n  checks:\n'), wf.indexOf('\n  real-clerk:'));
const steps = job.split('\n      - ').map((s) => s.trim());
const stepIndex = (re) => steps.findIndex((s) => re.test(s));
const areas = existsSync('scripts/ci/areas.json') ? JSON.parse(readFileSync('scripts/ci/areas.json', 'utf8')) : { areas: {} };
const areaScripts = new Set(Object.values(areas.areas).flatMap((a) => a.scripts.map((s) => (typeof s === 'string' ? s : s.name))));
const fast = (script) => stepIndex(new RegExp(`^(name: [^\\n]*\\n\\s*)?run: node scripts/${script}\\.mjs$`, 'm'));
const runAreas = stepIndex(/run: node scripts\/ci\/run-areas\.mjs/);
const plan = stepIndex(/run: node scripts\/ci\/affected-areas\.mjs/);
const reviewBuild = stepIndex(/run: npm run build$/m);
const prodBuild = stepIndex(/npm run build:production/);
const serverDeps = stepIndex(/npm ci --prefix server/);
for (const s of ['test-companyos-provider', 'test-admin-activity', 'test-real-signup', 'test-move-private-settings', 'test-test-gate', 'test-seo', 'test-release-wiring',
  'test-website-signed-out-live', 'test-admin-activity-ui', 'test-test-gate-ui', 'test-launch-website-ui', 'test-launch-website-content']) {
  check(`L7 CI runs ${s} (a fast step or an area script)`, fast(s) >= 0 || areaScripts.has(`scripts/${s}.mjs`));
}
check('L7 the area scripts run after the plan, both builds and the Hoy server\'s own dependencies', plan >= 0 && runAreas > Math.max(plan, prodBuild, reviewBuild, serverDeps) && Math.min(prodBuild, reviewBuild, serverDeps) >= 0, `${plan} ${prodBuild} ${reviewBuild} ${serverDeps} ${runAreas}`);
check('L7 the area scripts get the production build as QA_PROD_DIST (browser checks, website rows and content)', /QA_PROD_DIST: \$\{\{ runner\.temp \}\}\/prod$/m.test(steps[runAreas] ?? ''), steps[runAreas]);
check('ci1 the production build step copies the private docs pack beside the copied build (prod-private)', /cp -R dist-private "\$RUNNER_TEMP\/prod-private"/.test(steps[prodBuild] ?? ''), steps[prodBuild]);
check('L7 test-real-signup runs offline in CI (no COS_LOCAL_API: its live part says it skipped)', !/COS_LOCAL_API/.test(job) && !/COS_LOCAL_API/.test(JSON.stringify(areas)));
check('ci-areas the fast steps run before the area scripts and skip only when nothing a check reads changed', /if: steps\.plan\.outputs\.mode != 'none'/.test(steps[prodBuild] ?? '') && /if: steps\.plan\.outputs\.mode == 'areas' \|\| steps\.plan\.outputs\.mode == 'all'/.test(steps[runAreas] ?? ''));
check('ci-areas run-areas gets the mode and areas through env, never interpolated', /run: node scripts\/ci\/run-areas\.mjs --mode "\$MODE" --areas "\$AREAS"/.test(steps[runAreas] ?? '') && /MODE: \$\{\{ steps\.plan\.outputs\.mode \}\}/.test(steps[runAreas] ?? ''));
check('ci-areas the plan compares the pull request\'s base and head commits, passed through env', /BASE_SHA: \$\{\{ github\.event\.pull_request\.base\.sha \}\}/.test(steps[plan] ?? '') && /HEAD_SHA: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/.test(steps[plan] ?? '') && /--base "\$BASE_SHA" --head "\$HEAD_SHA"/.test(steps[plan] ?? ''), steps[plan]);
check('ci-areas the fast steps run the areas test and the reuse test', fast('test-ci-areas') >= 0 && fast('test-release-check-reuse') >= 0);

// ── Release path (CI by area; owner Q1 2026-11-18: the tag is the version) ───────────────────────────────────────
const read = (f) => readFileSync(`.github/workflows/${f}`, 'utf8');
const flows = Object.fromEntries(['auth-checks.yml', 'release.yml', 'deploy-test.yml', 'deploy-prod.yml'].map((f) => [f, read(f)]));
// The run: blocks of a workflow: the single line, or the indented block under `run: |`.
const runBlocks = (text) => {
  const lines = text.split('\n'); const out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = /^(\s*)(- )?run: ?(.*)$/.exec(lines[i]); if (!m) continue;
    const indent = m[1].length + (m[2] ? 2 : 0);
    if (m[3] !== '|' && m[3] !== '>') { out.push(m[3]); continue; }
    const body = []; while (i + 1 < lines.length && (lines[i + 1].trim() === '' || lines[i + 1].search(/\S/) > indent)) body.push(lines[++i]);
    out.push(body.join('\n'));
  }
  return out;
};
for (const [f, text] of Object.entries(flows)) {
  const uses = [...text.matchAll(/uses: (\S+)/g)].map((m) => m[1]);
  check(`${f}: every action is pinned to a commit SHA`, uses.length > 0 && uses.every((u) => /@[0-9a-f]{40}$/.test(u)), uses.filter((u) => !/@[0-9a-f]{40}$/.test(u)).join(', '));
  const checkouts = text.split('\n      - ').filter((s) => /uses: actions\/checkout@/.test(s));
  check(`${f}: every checkout sets persist-credentials: false`, checkouts.length > 0 && checkouts.every((s) => /persist-credentials: false/.test(s)));
  const interpolated = runBlocks(text).filter((r) => r.includes('${{'));
  check(`${f}: no \${{ }} inside a run: (events, inputs, refs and names go through env)`, interpolated.length === 0, interpolated.join(' | ').slice(0, 200));
  check(`${f}: top-level permissions are minimal`, /^permissions:( \{\}|\n  contents: read)$/m.test(text));
}
check('auth-checks: the checkout has the history the plan diffs (fetch-depth \'0\')', /fetch-depth: '0'/.test(flows['auth-checks.yml']));
const rel = flows['release.yml'];
check('release: no package.json version guard (the tag is the version)', !/package\.json says version|jq -er '\.version' package\.json/.test(rel));
check('release: still refuses a version not higher than the last release', /is not higher than the last release/.test(rel) && /already exists/.test(rel));
check('release: the plan runs affected-areas in release mode (base: the last verified release)', /node scripts\/ci\/affected-areas\.mjs --release/.test(rel));
check('release: a release always runs at least the fast checks (mode none counts as fast)', /none\) mode=fast/.test(rel));
check('release: the area scripts run in the checks job', /\n  checks:\n[\s\S]*node scripts\/ci\/run-areas\.mjs --mode "\$MODE" --areas "\$AREAS"[\s\S]*\n  tag:\n/.test(rel));
check('release: the tag message carries the marker line, written only by the tag job after the checks', /\n  tag:\n\s+needs: \[guard, checks\]/.test(rel) && /\n  tag:\n[\s\S]*printf '\\nchecks: areas-v1\\n'/.test(rel));
for (const f of ['release.yml', 'deploy-test.yml', 'deploy-prod.yml']) {
  const build = flows[f].split('\n      - ').find((s) => /run: npm run build:production$/m.test(s)) ?? '';
  check(`${f}: the production build stamps the version from the tag (RELEASE_TAG)`, /RELEASE_TAG: /.test(build), build.slice(0, 160));
}
for (const f of ['deploy-test.yml', 'deploy-prod.yml']) {
  check(`${f}: reuses the Cut release pass on the exact commit`, /run: node scripts\/release-check-reuse\.mjs/.test(flows[f]));
}
const { releaseVersion } = await import('./lib/release-version.mjs').catch(() => ({}));
check('version: a release tag gives its version', releaseVersion?.({ RELEASE_TAG: 'v1.7.0' }, '1.6.3') === '1.7.0');
check('version: no tag (dev, a pull request, a branch deploy) falls back to package.json', releaseVersion?.({}, '1.6.3') === '1.6.3' && releaseVersion?.({ RELEASE_TAG: '' }, '1.6.3') === '1.6.3');
for (const bad of ['main', '1.7.0', 'v1.7', 'v1.7.0-rc1', 'v1.7.0\n']) {
  let threw = false; try { releaseVersion(bad === undefined ? {} : { RELEASE_TAG: bad }, '1.6.3'); } catch { threw = true; }
  check(`version: a malformed RELEASE_TAG ${JSON.stringify(bad)} stops the build`, threw);
}
check('version: write-release.mjs and the Hub read the stamped version', /releaseVersion/.test(readFileSync('scripts/write-release.mjs', 'utf8')) && /__HOY_VERSION__/.test(readFileSync('src/modules/hub/HubPage.tsx', 'utf8')) && /__HOY_VERSION__/.test(readFileSync('vite.config.ts', 'utf8')));
done();
