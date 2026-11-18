// E9: Deploy test and Deploy prod reuse the Cut release pass only for the exact commit, and only when that run and its
// guard, checks and tag jobs all succeeded. Ported from Between Gigs' scripts/release-check-reuse.test.ts.
// Run: node scripts/test-release-check-reuse.mjs
import { readFileSync } from 'node:fs';
import { findReleaseEvidence } from './release-check-reuse.mjs';

let failed = 0;
const check = (label, ok, detail = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail && !ok ? ` — ${detail}` : ''}`); if (!ok) failed++; };

const sha = 'a'.repeat(40), repository = 'imagine-os/hoy';
const run = { id: 123, run_attempt: 1, head_sha: sha, head_branch: 'main', path: '.github/workflows/release.yml', event: 'workflow_dispatch', status: 'completed', conclusion: 'success', repository: { full_name: repository }, head_repository: { full_name: repository } };
const jobs = { total_count: 3, jobs: ['guard', 'checks', 'tag'].map((name) => ({ name, run_id: 123, head_sha: sha, status: 'completed', conclusion: 'success' })) };
const lookup = (responses) => { let calls = 0; return { get: async () => { calls++; const r = responses.shift(); if (r instanceof Error) throw r; return r; }, count: () => calls }; };
const opts = { sha, repository, ref: 'refs/tags/v1.7.0' };
const reuse = async (responses, extra = {}) => (await findReleaseEvidence({ ...opts, ...extra, get: lookup(responses).get })).reuse;

const ok = await findReleaseEvidence({ ...opts, get: lookup([{ workflow_runs: [run] }, run, jobs, run]).get });
check('reuses a successful exact-commit release whose guard, checks and tag jobs succeeded', JSON.stringify(ok) === JSON.stringify({ reuse: true, runId: 123, url: `https://github.com/${repository}/actions/runs/123` }), JSON.stringify(ok));
const qualified = { ...run, path: '.github/workflows/release.yml@main' };
check('accepts the main-qualified workflow path', await reuse([{ workflow_runs: [qualified] }, qualified, jobs, qualified]));
for (const path of ['.github/workflows/release.yml@evil', '.github/workflows/release.yml@refs/heads/evil', '.github/workflows/deploy-test.yml']) {
  check(`refuses workflow path ${path}`, !(await reuse([{ workflow_runs: [{ ...run, path }] }])));
}
check('refuses a rerun started while the evidence is read', !(await reuse([{ workflow_runs: [run] }, run, jobs, { ...run, run_attempt: 2 }])));
for (const key of ['run_id', 'head_sha']) {
  check(`refuses jobs from a different ${key}`, !(await reuse([{ workflow_runs: [run] }, run, { ...jobs, jobs: jobs.jobs.map((j) => ({ ...j, [key]: 'wrong' })) }, run])));
}
const paths = [];
const responses = [{ workflow_runs: [run] }, run, jobs, run];
await findReleaseEvidence({ ...opts, get: async (p) => { paths.push(p); return responses.shift(); } });
check('pins the jobs to the verified release attempt', paths[2] === `/repos/${repository}/actions/runs/123/attempts/1/jobs?per_page=100`, paths[2]);
check('lists only Cut release runs of this commit on main', paths[0] === `/repos/${repository}/actions/workflows/release.yml/runs?head_sha=${sha}&branch=main&event=workflow_dispatch&per_page=1`, paths[0]);
for (const key of ['head_sha', 'head_branch', 'path', 'event', 'status', 'conclusion', 'run_attempt']) {
  check(`refuses a mismatching ${key}`, !(await reuse([{ workflow_runs: [{ ...run, [key]: 'wrong' }] }])));
}
for (const key of ['repository', 'head_repository']) {
  check(`refuses another ${key}`, !(await reuse([{ workflow_runs: [{ ...run, [key]: { full_name: 'attacker/fork' } }] }])));
}
check('a different commit: never reused', !(await reuse([{ workflow_runs: [{ ...run, head_sha: 'b'.repeat(40) }] }])));
check('does not fall back to an older success when the latest run failed', !(await reuse([{ workflow_runs: [{ ...run, conclusion: 'failure' }, run] }])));
check('revalidates the run after listing', !(await reuse([{ workflow_runs: [run] }, { ...run, status: 'in_progress' }])));
for (const name of ['guard', 'checks', 'tag']) {
  for (const conclusion of ['failure', 'skipped', 'cancelled', null]) {
    check(`refuses ${name} job conclusion ${conclusion}`, !(await reuse([{ workflow_runs: [run] }, run, { ...jobs, jobs: jobs.jobs.map((j) => (j.name === name ? { ...j, conclusion } : j)) }, run])));
  }
}
check('refuses a partial run (no tag job)', !(await reuse([{ workflow_runs: [run] }, run, { total_count: 2, jobs: jobs.jobs.slice(0, 2) }, run])));
for (const [label, response] of [['missing', undefined], ['empty', {}], ['no jobs', { total_count: 3, jobs: [] }], ['over 100', { ...jobs, total_count: 101 }], ['a duplicate job', { ...jobs, total_count: 4, jobs: [...jobs.jobs, jobs.jobs[1]] }]]) {
  check(`refuses incomplete or ambiguous jobs (${label})`, !(await reuse([{ workflow_runs: [run] }, run, response])));
}
for (const ref of ['refs/heads/main', 'refs/heads/feature', 'refs/tags/not-semver', '']) {
  const api = lookup([]);
  const r = await findReleaseEvidence({ ...opts, ref, get: api.get });
  check(`keeps the full checks for ref ${JSON.stringify(ref)} without asking GitHub`, !r.reuse && api.count() === 0);
}
for (const bad of [{ sha: 'A'.repeat(40) }, { sha: 'a'.repeat(39) }, { repository: 'no-slash' }, { repository: 'a/b/c' }]) {
  check(`refuses malformed input ${JSON.stringify(bad)}`, !(await reuse([{ workflow_runs: [run] }, run, jobs, run], bad)));
}
for (const [label, response] of [['API unavailable', new Error('API unavailable')], ['empty', {}], ['no runs', { workflow_runs: [] }]]) {
  check(`falls back to the full checks when provenance cannot be read (${label})`, !(await reuse([response])));
}

// Both deploy workflows: the reuse step gates only the generic checks; the build, bundle, secret scans and smoke checks
// always run, and only the checks job may read Actions.
for (const env of ['test', 'prod']) {
  const text = readFileSync(`.github/workflows/deploy-${env}.yml`, 'utf8');
  const checksJob = text.slice(text.indexOf('\n  checks:\n'), text.indexOf('\n  deploy:\n'));
  const deployJob = text.slice(text.indexOf('\n  deploy:\n'));
  check(`${env}: the checks job runs the reuse step with the commit through env`, /- name: Check exact-commit release evidence\n\s+id: release-checks\n\s+env:\n\s+GITHUB_TOKEN: \$\{\{ github\.token \}\}\n\s+CHECKED_SHA: \$\{\{ [a-z.]+ \}\}\n\s+run: node scripts\/release-check-reuse\.mjs/.test(checksJob));
  check(`${env}: actions: read only on the checks job`, /permissions:\n\s+contents: read\n\s+actions: read/.test(checksJob) && (text.match(/actions: read/g) ?? []).length === 1);
  for (const script of ['scripts/check-company-os.mjs', 'scripts/test-hoy-server.mjs', 'scripts/test-test-gate.mjs', 'scripts/test-docs-gate.mjs', 'scripts/test-deploy-wiring.mjs']) {
    const step = checksJob.split('\n      - ').find((s) => s.includes(`node ${script}`)) ?? '';
    check(`${env}: ${script} is skipped only with proven release evidence`, /if: steps\.release-checks\.outputs\.reuse != 'true'/.test(step), step.slice(0, 120));
  }
  for (const always of ['npm run build:production', 'node server/make-bundle.mjs', 'actions/upload-artifact']) {
    const step = checksJob.split('\n      - ').find((s) => s.includes(always)) ?? '';
    check(`${env}: ${always} always runs`, step !== '' && !step.includes('outputs.reuse'), step.slice(0, 120));
  }
  check(`${env}: the deploy job never reads the reuse output; its secret scan always runs`, !deployJob.includes('outputs.reuse') && deployJob.includes('node server/check-bundle.mjs'));
}

console.log(failed ? `\n${failed} release check reuse check(s) failed` : '\nrelease check reuse passed');
process.exitCode = failed ? 1 : 0;
