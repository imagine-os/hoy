// Review round 1 (Hoy all-roles): what this branch needs to ship safely, checked from the repository.
// - M2: company-os.json asks for the Company OS release that carries what the branch uses (credits 1.2.0, the Hoy
//   recipe's public_site role and studio_private policies): >= 1.7.0, the first release after v1.6.0; the changelog
//   says the recipe and the public_site read token (COMPANY_OS_READ_TOKEN) must be in place before this frontend
//   deploys (playbook E9: `requires` cannot say that ordering), and names the pay-data move (M1) and its command.
// - L7: the checks the branch added or changed run in CI (auth-checks.yml fake-clerk job: fast steps or area scripts).
// - CI by area: SHA pins, no credentials kept, no ${{ }} in run:, the release marker, the tag as the version.
// - L1, L9: recorded as known limits in the changelog.
// Run: node scripts/test-release-wiring.mjs
import { readFileSync, existsSync, readdirSync } from 'node:fs';
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
// The checks the branch added or changed still run: in auth-checks.yml's fake-clerk job, either as a fast step (always)
// or as an area script (scripts/ci/areas.json, run by scripts/ci/run-areas.mjs after the fast steps).
const wf = readFileSync('.github/workflows/auth-checks.yml', 'utf8');
const job = wf.slice(wf.indexOf('\n  fake-clerk:\n'), wf.indexOf('\n  real-clerk:'));
const steps = job.split('\n      - ').map((s) => s.trim());
const stepIndex = (re) => steps.findIndex((s) => re.test(s));
const areas = existsSync('scripts/ci/areas.json') ? JSON.parse(readFileSync('scripts/ci/areas.json', 'utf8')) : { areas: {} };
const areaScripts = new Set(Object.values(areas.areas).flatMap((a) => a.scripts.map((s) => (typeof s === 'string' ? s : s.name))));
const fast = (script) => stepIndex(new RegExp(`^\\s*run: node scripts/${script}\\.mjs$`, 'm'));
const runAreas = stepIndex(/run: node scripts\/ci\/run-areas\.mjs/);
const plan = stepIndex(/node scripts\/ci\/affected-areas\.mjs/);
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
check('L7 test-real-signup runs offline in CI (no COS_LOCAL_API: its live part says it skipped)', !/COS_LOCAL_API:/.test(job) && !/COS_LOCAL_API/.test(JSON.stringify(areas)));
check('ci-areas the fast steps run before the area scripts and skip only when nothing a check reads changed', /if: steps\.plan\.outputs\.mode != 'none'/.test(steps[prodBuild] ?? '') && /if: steps\.plan\.outputs\.mode == 'areas' \|\| steps\.plan\.outputs\.mode == 'all'/.test(steps[runAreas] ?? ''));
check('ci-areas run-areas gets the mode and areas through env, never interpolated', /run: node scripts\/ci\/run-areas\.mjs --mode "\$MODE" --areas "\$AREAS"/.test(steps[runAreas] ?? '') && /MODE: \$\{\{ steps\.plan\.outputs\.mode \}\}/.test(steps[runAreas] ?? ''));
check('ci-areas the plan compares the pull request\'s base and head commits, passed through env', /BASE_SHA: \$\{\{ github\.event\.pull_request\.base\.sha \}\}/.test(steps[plan] ?? '') && /HEAD_SHA: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/.test(steps[plan] ?? '') && /--base "\$BASE_SHA" --head "\$HEAD_SHA"/.test(steps[plan] ?? ''), steps[plan]);
check('ci-areas the fast steps run the areas test and the reuse test', fast('test-ci-areas') >= 0 && fast('test-release-check-reuse') >= 0);

// Push to main: fast checks only (no area or browser checks), the same paths-ignore as pull requests.
const onBlock = (t) => t.slice(t.indexOf('\non:\n'), t.indexOf('\npermissions:'));
const trig = onBlock(wf);
const ignoreOf = (t, ev) => { const m = new RegExp(`\\n  ${ev}:\\n(?:    branches: \\[main\\]\\n)?    paths-ignore:\\n((?:      .*\\n)+)`).exec(t); return m ? m[1].split('\n').filter((l) => /^\s+- /.test(l)).map((l) => l.trim()) : null; };
check('ci-push auth-checks triggers on push to main', /\n  push:\n    branches: \[main\]\n/.test(trig), trig.slice(0, 200));
check('ci-push the push trigger has the same paths-ignore as pull_request', ignoreOf(trig, 'push') !== null && ignoreOf(trig, 'push').length > 3 && JSON.stringify(ignoreOf(trig, 'push')) === JSON.stringify(ignoreOf(trig, 'pull_request')), JSON.stringify([ignoreOf(trig, 'push'), ignoreOf(trig, 'pull_request')]));
check('ci-push the plan step reads the event name through env, not interpolated', /EVENT_NAME: \$\{\{ github\.event_name \}\}/.test(steps[plan] ?? '') && /"\$EVENT_NAME" = push/.test(steps[plan] ?? '') && /mode=fast/.test(steps[plan] ?? ''), steps[plan]);
check('ci-push on push the plan gives mode fast without diffing', /if \[ "\$EVENT_NAME" = push \]; then[\s\S]*echo "mode=fast" >> "\$GITHUB_OUTPUT"[\s\S]*else[\s\S]*affected-areas\.mjs --base "\$BASE_SHA" --head "\$HEAD_SHA"/.test(steps[plan] ?? ''), steps[plan]);
check('ci-push the area step needs mode areas or all, so on push (fast) no area check runs', /if: steps\.plan\.outputs\.mode == 'areas' \|\| steps\.plan\.outputs\.mode == 'all'/.test(steps[runAreas] ?? ''));
check('ci-push the production-build artifact stays workflow_dispatch only (unchanged on push)', /uses: actions\/upload-artifact@[0-9a-f]{40} # v\d+\n\s+if: github\.event_name == 'workflow_dispatch'/.test(job));

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
check('release: the tag message carries the marker line, written only by the tag job after the checks', /\n  tag:\n\s+needs: \[guard, checks\]/.test(rel) && /\n  tag:\n[\s\S]*printf '\\nchecks: areas-v2\\n'/.test(rel));
// Finding 1: actions/checkout rewrites an annotated tag as lightweight; the guard must re-fetch it (forced) before it reads the type.
const prodGuard = flows['deploy-prod.yml'];
const refetch = prodGuard.search(/git (?:-c [^\n]*)?fetch [^\n]*--force[^\n]*"refs\/tags\/\$TAG:refs\/tags\/\$TAG"/);
const catFile = prodGuard.search(/git cat-file -t "refs\/tags\/\$TAG"/);
check('deploy-prod: the guard force re-fetches the tag before the annotated check (checkout makes it lightweight)', refetch >= 0 && catFile > refetch, `${refetch} ${catFile}`);
check('deploy-prod: the tag re-fetch authenticates with a one-shot extraheader from env, masked', /GH_TOKEN: \$\{\{ github\.token \}\}/.test(prodGuard) && /::add-mask::/.test(prodGuard) && /http\.https:\/\/github\.com\/\.extraheader/.test(prodGuard));
// Finding 2: Cut release runs every fast node script that pull requests run; derived from auth-checks.yml so the two cannot drift.
const prJob = flows['auth-checks.yml'].slice(flows['auth-checks.yml'].indexOf('\n  fake-clerk:\n'), flows['auth-checks.yml'].indexOf('\n  real-clerk:'));
const prFast = [...prJob.matchAll(/^\s+run: node (scripts\/test-[a-z0-9.-]+\.mjs)\s*$/gm)].map((m) => m[1]);
const relChecks = rel.slice(rel.indexOf('\n  checks:\n'), rel.indexOf('\n  tag:\n'));
check('release: the checks job runs every fast node script that auth-checks.yml runs on a pull request', prFast.length > 20 && prFast.every((x) => relChecks.includes(`node ${x}`)), prFast.filter((x) => !relChecks.includes(`node ${x}`)).join(', '));
check('release: the fast node scripts run in every mode (no mode condition on that step)', !/Node-level checks[^\n]*\n\s+if:/.test(relChecks) && /- name: Node-level checks/.test(relChecks));
const nodeOf = (t) => [...t.matchAll(/node-version: (\d+)/g)].map((m) => m[1]);
check('release: the reused checks run on the production runtime (release checks node equals deploy-prod node)', nodeOf(relChecks).length > 0 && nodeOf(flows['deploy-prod.yml']).length > 0 && nodeOf(relChecks).every((v) => nodeOf(flows['deploy-prod.yml']).every((p) => p === v)), `${nodeOf(relChecks)} vs ${nodeOf(flows['deploy-prod.yml'])}`);
// Review fix: every job that pushes or fetches with an extraheader builds it correctly, scoped, and masked.
for (const wf of readdirSync('.github/workflows').filter((n) => /\.ya?ml$/.test(n))) {
  const text = readFileSync(`.github/workflows/${wf}`, 'utf8');
  const jobs = text.split(/\n(?=  [A-Za-z0-9_-]+:\n)/);
  for (const job of jobs.filter((j) => /extraheader/.test(j))) {
    const name = /^\s*([A-Za-z0-9_-]+):/.exec(job)?.[1] ?? '?';
    check(`${wf} ${name}: extraheader credential uses printf 'x-access-token:%s' (never %%s)`, /printf 'x-access-token:%s'/.test(job) && !/%%s/.test(job));
    check(`${wf} ${name}: extraheader is scoped to http.https://github.com/.extraheader`, /-c "http\.https:\/\/github\.com\/\.extraheader=/.test(job) && !/-c "http\.extraheader/.test(job));
    check(`${wf} ${name}: the encoded credential is masked with ::add-mask::`, /echo "::add-mask::\$auth"/.test(job));
  }
}
for (const f of ['release.yml', 'deploy-prod.yml']) {
  const build = flows[f].split('\n      - ').find((s) => /run: npm run build:production$/m.test(s)) ?? '';
  check(`${f}: the production build stamps the version from the tag (RELEASE_TAG)`, /RELEASE_TAG: /.test(build), build.slice(0, 160));
}
// deploy-test: RELEASE_TAG is set (to $GITHUB_ENV) only for a ref named exactly vMAJOR.MINOR.PATCH; v0.26.0-rc1 leaves it unset.
{
  const dt = flows['deploy-test.yml'];
  const stampStep = dt.split('\n      - ').find((s) => />> "\$GITHUB_ENV"/.test(s) && /RELEASE_TAG/.test(s)) ?? '';
  const build = dt.split('\n      - ').find((s) => /run: npm run build:production$/m.test(s)) ?? '';
  check('deploy-test: the build no longer sets RELEASE_TAG for any refs/tags/v* (an -rc tag would stop the build)', !/startsWith\(github\.ref/.test(dt) && !/RELEASE_TAG: /.test(build), build.slice(0, 160));
  check('deploy-test: a shell step sets RELEASE_TAG only for ^v[0-9]+\\.[0-9]+\\.[0-9]+$, through env', /\^v\[0-9\]\+\\\.\[0-9\]\+\\\.\[0-9\]\+\$/.test(stampStep) && /REF_TYPE: \$\{\{ github\.ref_type \}\}/.test(stampStep) && /REF_NAME: \$\{\{ github\.ref_name \}\}/.test(stampStep), stampStep);
  check('deploy-test: the stamp step runs before the build', stampStep !== '' && dt.indexOf(stampStep.slice(0, 60)) >= 0 && dt.indexOf(stampStep.slice(0, 60)) < dt.indexOf('npm run build:production'));
  const body = /run: \|\n((?:\s{10,}.*\n?)+)/.exec(stampStep)?.[1] ?? '';
  const { execFileSync } = await import('node:child_process');
  const { mkdtempSync, readFileSync: rf } = await import('node:fs');
  const { tmpdir } = await import('node:os'); const { join } = await import('node:path');
  for (const [type, name, want] of [['tag', 'v0.26.0', 'RELEASE_TAG=v0.26.0'], ['tag', 'v0.26.0-rc1', ''], ['tag', 'v1.7', ''], ['branch', 'v1.2.3', ''], ['branch', 'main', ''], ['tag', 'v1.2.3\nX=1', '']]) {
    const f = join(mkdtempSync(join(tmpdir(), 'ghenv-')), 'env'); execFileSync('bash', ['-c', 'touch "$GITHUB_ENV"; ' + body], { env: { PATH: process.env.PATH, GITHUB_ENV: f, REF_TYPE: type, REF_NAME: name } });
    check(`deploy-test: ref ${type} ${JSON.stringify(name)} gives ${want || 'no RELEASE_TAG'}`, rf(f, 'utf8').trim() === want, rf(f, 'utf8'));
  }
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
