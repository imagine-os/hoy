// Test-hoy fixes, lane Y2 (2026-11-01): the frontend deploy failed at "Apply infra" because `.railway/railway.ts`
// did not declare COMPANY_OS_READ_TOKEN, a variable set by hand in Railway; and nothing in the deploy said whether the
// go-live switch was on (it had been typed as SET_LIVE). Checked from the repository:
// - every variable the Hoy server reads is declared in the IaC, or is listed below with why it needn't be;
// - the read token is `preserve()` (a secret written in Railway, never in git);
// - both deploy summaries print SITE_LIVE and whether the read token is present, through scripts/deploy-switches.mjs,
//   which never prints the token's value (fed hostile and malformed variable lists here).
// Run: node scripts/test-deploy-wiring.mjs
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { reporter } from './lib/launch-qa.mjs';

const { check, done } = reporter('deploy wiring');
const iac = readFileSync('.railway/railway.ts', 'utf8');

// ── IaC declares every runtime variable ───────────────────────────────────────────────────────────────────────
check('railway.ts declares COMPANY_OS_READ_TOKEN: preserve()', /\bCOMPANY_OS_READ_TOKEN:\s*preserve\(\)/.test(iac));
// Owner 2026-11-01 (answer to y6-public-documents, "Retire it"): the PUBLIC_DOCUMENTS switch is gone everywhere, so nothing
// pretends to open the manual or docs to visitors (making documents public later is its own change, with its own gate rule).
check('PUBLIC_DOCUMENTS is retired: not in railway.ts', !/PUBLIC_DOCUMENTS/.test(iac));
/** Source without comments (a "retired" note may name the variable; code may not). */
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
check('PUBLIC_DOCUMENTS is retired: no server code names it (read, destructured or handed out)', readdirSync('server').filter((n) => n.endsWith('.mjs')).every((f) => !/\bPUBLIC_DOCUMENTS\b|publicDocuments/.test(code(readFileSync(`server/${f}`, 'utf8')))));
check('PUBLIC_DOCUMENTS is retired: the app reads no publicDocuments / isPublicDocument', (function walk(dir) { return readdirSync(dir, { withFileTypes: true }).every((e) => e.isDirectory() ? walk(`${dir}/${e.name}`) : !/\.(ts|tsx)$/.test(e.name) || !/publicDocuments|isPublicDocument|PUBLIC_DOCUMENTS/.test(readFileSync(`${dir}/${e.name}`, 'utf8'))); })('src'));
check('PUBLIC_DOCUMENTS is retired: server/README.md no longer lists it as a variable', !/^\|[^\n]*`PUBLIC_DOCUMENTS`/m.test(readFileSync('server/README.md', 'utf8')));
/** Read by the server but deliberately not in the IaC: set by Railway itself, local-only, or a tuning knob with a safe default nobody sets by hand. */
const NOT_IN_IAC = new Map([
  ['PORT', 'Railway sets it'], ['RAILWAY_ENVIRONMENT_NAME', 'Railway sets it'], ['HOY_ENV', 'local and tests only'],
  ['CLERK_JWT_KEY', 'optional networkless Clerk key; the secret key is used when unset'],
  ['CLERK_AUTHORIZED_PARTIES', 'optional extra origins next to APP_URL'],
  ['PROXY_BODY_LIMIT_BYTES', 'tuning, safe default'], ['WEBHOOK_BODY_LIMIT_BYTES', 'tuning, safe default'], ['UPSTREAM_TIMEOUT_MS', 'tuning, safe default'],
  ['FILE_SIZE_LIMIT_BYTES', 'tuning, safe default'], ['FILE_TIMEOUT_MS', 'tuning, safe default'],
  ['PUBLIC_READ_RATE_PER_SECOND', 'tuning, safe default'], ['PUBLIC_READ_BURST', 'tuning, safe default'],
]);
const read = new Set();
for (const f of readdirSync('server').filter((n) => n.endsWith('.mjs'))) {
  for (const m of readFileSync(`server/${f}`, 'utf8').matchAll(/\benv\.([A-Z][A-Z0-9_]+)/g)) read.add(m[1]);
}
check('the server reads COMPANY_OS_READ_TOKEN and SITE_LIVE (the scan sees them)', read.has('COMPANY_OS_READ_TOKEN') && read.has('SITE_LIVE'));
const declared = (name) => new RegExp(`\\b${name}:`).test(iac);
const missing = [...read].filter((n) => !declared(n) && !NOT_IN_IAC.has(n));
check('every variable the server reads is declared in railway.ts (or listed as not needing it)', missing.length === 0, missing.join(', '));

// ── The switches summary ──────────────────────────────────────────────────────────────────────────────────────
const SCRIPT = 'scripts/deploy-switches.mjs';
check('scripts/deploy-switches.mjs exists', existsSync(SCRIPT));
const TOKEN = `cos_svc_0b0f6e1c-3c6a-4c0e-9a51-6f3f2c1d9e02_${'S'.repeat(43)}`;
const run = (stdin) => {
  if (!existsSync(SCRIPT)) return { status: -1, out: '' };
  const r = spawnSync(process.execPath, [SCRIPT], { input: stdin, encoding: 'utf8' });
  return { status: r.status, out: `${r.stdout}${r.stderr}` };
};
const live = run(JSON.stringify({ SITE_LIVE: 'true', COMPANY_OS_READ_TOKEN: TOKEN, CLERK_SECRET_KEY: 'sk_test_x' }));
check('summary: SITE_LIVE=true is printed as on', live.status === 0 && /SITE_LIVE[^\n]*\btrue\b/.test(live.out), live.out);
check('summary: the read token is "present", its value never printed', /COMPANY_OS_READ_TOKEN[^\n]*present/.test(live.out) && !live.out.includes(TOKEN) && !live.out.includes('S'.repeat(20)), live.out);
check('summary: no other variable value is printed', !live.out.includes('sk_test_x'));
const off = run(JSON.stringify({ SET_LIVE: 'true' }));
check('summary: SITE_LIVE unset reads as Coming Soon', off.status === 0 && /SITE_LIVE[^\n]*not set/i.test(off.out), off.out);
check('summary: a missing read token is said, with what it breaks', /COMPANY_OS_READ_TOKEN[^\n]*missing/i.test(off.out), off.out);
check('summary: a SET_LIVE variable is flagged as the wrong name', /SET_LIVE/.test(off.out) && /rename/i.test(off.out), off.out);
const arr = run(JSON.stringify([{ name: 'SITE_LIVE', value: 'false' }, { name: 'COMPANY_OS_READ_TOKEN', value: TOKEN }]));
check('summary: the list shape (name/value pairs) works too', arr.status === 0 && /SITE_LIVE[^\n]*\bfalse\b/.test(arr.out) && /present/.test(arr.out) && !arr.out.includes(TOKEN), arr.out);
const weird = run(JSON.stringify({ SITE_LIVE: `yes ${TOKEN}`, COMPANY_OS_READ_TOKEN: '   ' }));
check('summary: an invalid SITE_LIVE is flagged without echoing it; a blank token is missing', weird.status === 0 && /invalid/i.test(weird.out) && !weird.out.includes(TOKEN) && /missing/i.test(weird.out), weird.out);
for (const [what, stdin] of [['empty input', ''], ['not JSON', `oops ${TOKEN}`], ['null', 'null'], ['a number', '7']]) {
  const r = run(stdin);
  check(`summary: ${what} says the variables could not be read, exit 0, no echo`, r.status === 0 && /could not read/i.test(r.out) && !r.out.includes(TOKEN), r.out);
}

// ── Both deploy workflows print it ────────────────────────────────────────────────────────────────────────────
for (const wf of ['.github/workflows/deploy-test.yml', '.github/workflows/deploy-prod.yml']) {
  const text = readFileSync(wf, 'utf8');
  const summary = text.slice(text.indexOf('- name: Summary'));
  check(`${wf}: the Summary step prints the go-live switches through ${SCRIPT}`, summary.includes(SCRIPT) && summary.includes('GITHUB_STEP_SUMMARY'));
  check(`${wf}: the read token's value is never expanded in the workflow`, !/\$\{?COMPANY_OS_READ_TOKEN\b/.test(text) && !/secrets\.COMPANY_OS_READ_TOKEN/.test(text));
}
const qa = readFileSync('.github/workflows/hoy-server-qa.yml', 'utf8');
check('hoy-server-qa runs this check', qa.includes('node scripts/test-deploy-wiring.mjs'));
check('the deploy gate (deploy-test checks job) runs this check', readFileSync('.github/workflows/deploy-test.yml', 'utf8').includes('node scripts/test-deploy-wiring.mjs'));

done();
