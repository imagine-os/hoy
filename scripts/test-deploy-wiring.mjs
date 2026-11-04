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
// Review round 2 (r2hoy, L7): PUBLIC_DOCUMENTS is retired and no longer declared in the IaC, so a value left in Railway
// makes "Apply infra" fail on an undeclared variable. The summary says so, and a step before Apply infra warns.
const leftover = run(JSON.stringify({ SITE_LIVE: 'false', COMPANY_OS_READ_TOKEN: TOKEN, PUBLIC_DOCUMENTS: `ops-manual ${TOKEN}` }));
check('summary: a leftover PUBLIC_DOCUMENTS is flagged (retired: delete it in Railway), its value never printed', leftover.status === 0 && /PUBLIC_DOCUMENTS/.test(leftover.out) && /delete/i.test(leftover.out) && !leftover.out.includes('ops-manual') && !leftover.out.includes(TOKEN), leftover.out);
check('summary: an empty PUBLIC_DOCUMENTS is flagged too (any value, even empty, is undeclared)', /PUBLIC_DOCUMENTS/.test(run(JSON.stringify({ PUBLIC_DOCUMENTS: '' })).out));
check('summary: no PUBLIC_DOCUMENTS, no warning', !/PUBLIC_DOCUMENTS/.test(live.out), live.out);
const pre = spawnSync(process.execPath, [SCRIPT, '--leftovers'], { input: JSON.stringify({ PUBLIC_DOCUMENTS: 'x', SET_LIVE: 'true', SITE_LIVE: 'true' }), encoding: 'utf8' });
check('--leftovers prints only the leftover warnings as workflow annotations, exit 0', pre.status === 0 && /^::warning::.*PUBLIC_DOCUMENTS/m.test(pre.stdout) && /^::warning::.*SET_LIVE/m.test(pre.stdout) && !/Go-live switches|^- SITE_LIVE/m.test(pre.stdout), pre.stdout);
for (const stdin of ['unreadable', '', 'null']) {
  const r = spawnSync(process.execPath, [SCRIPT, '--leftovers'], { input: stdin, encoding: 'utf8' });
  check(`--leftovers that can't read the variables (${JSON.stringify(stdin)}) says so as a warning, exit 0 (lane review)`, r.status === 0 && /^::warning::.*could not read/im.test(r.stdout) && /PUBLIC_DOCUMENTS/.test(r.stdout), r.stdout);
}
check('--leftovers with none prints nothing', spawnSync(process.execPath, [SCRIPT, '--leftovers'], { input: JSON.stringify({ SITE_LIVE: 'true' }), encoding: 'utf8' }).stdout.trim() === '');
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
for (const wf of ['.github/workflows/deploy-test.yml', '.github/workflows/deploy-prod.yml']) {
  const text = readFileSync(wf, 'utf8');
  const at = text.indexOf('--leftovers'), apply = text.indexOf('- name: Apply infra');
  check(`${wf}: leftover variables are warned about before Apply infra (r2 L7)`, at > 0 && apply > 0 && at < apply);
}
const qa = readFileSync('.github/workflows/hoy-server-qa.yml', 'utf8');
check('hoy-server-qa runs this check', qa.includes('node scripts/test-deploy-wiring.mjs'));
check('the deploy gate (deploy-test checks job) runs this check', readFileSync('.github/workflows/deploy-test.yml', 'utf8').includes('node scripts/test-deploy-wiring.mjs'));

// ── The test site's passphrase gate (Company OS playbook rule D5, server/testGate.mjs) ────────────────────────
{
  const deployTest = readFileSync('.github/workflows/deploy-test.yml', 'utf8');
  const deployProd = readFileSync('.github/workflows/deploy-prod.yml', 'utf8');
  /** The workflow's commands and settings, without its comments. */
  const yamlCode = (text) => text.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
  const between = (text, from, to) => { const a = text.indexOf(from); const b = text.indexOf(to, a + from.length); return a < 0 || b < 0 ? '' : text.slice(a, b); };
  const job = deployTest.slice(deployTest.indexOf('\n  deploy:'));
  const beforeApply = job.slice(0, job.indexOf('- name: Apply infra'));
  const stepsWith = (name) => beforeApply.split('\n      - ').filter((s) => s.includes(name));

  check('railway.ts declares TEST_GATE_PASSPHRASE: preserve() on test only', /\bprod\s*\?\s*\{\s*\}\s*:\s*\{\s*TEST_GATE_PASSPHRASE:\s*preserve\(\)\s*\}/.test(iac) && (iac.match(/\bTEST_GATE_PASSPHRASE:/g) ?? []).length === 1);
  check('railway.ts declares COOKIE_SIGNING_SECRET: preserve() in both environments', /^\s*COOKIE_SIGNING_SECRET:\s*preserve\(\),\s*$/m.test(iac));
  check('railway.ts no longer says the workflow gives test a generated domain', !/Railway-generated|up\.railway\.app/.test(iac));
  check('the server reads the gate variables (the scan above covers them)', read.has('TEST_GATE_PASSPHRASE') && read.has('COOKIE_SIGNING_SECRET'));

  check('deploy-test: a missing or short passphrase fails with an error naming it, before Apply infra', stepsWith('secrets.TEST_GATE_PASSPHRASE').length > 0 && /\$\{#TEST_GATE_PASSPHRASE\}" -lt 12|\$\{#TEST_GATE_PASSPHRASE\} -lt 12/.test(beforeApply) && /::error::[^\n]*TEST_GATE_PASSPHRASE/.test(beforeApply));
  check('deploy-test: a missing or short signing secret fails with an error naming it, before Apply infra', stepsWith('secrets.COOKIE_SIGNING_SECRET').length > 0 && /\$\{#COOKIE_SIGNING_SECRET\}" -lt 32|\$\{#COOKIE_SIGNING_SECRET\} -lt 32/.test(beforeApply) && /::error::[^\n]*COOKIE_SIGNING_SECRET/.test(beforeApply));
  check('deploy-test: a missing APP_URL fails with an error naming it, before Apply infra', /APP_URL:\s*\$\{\{\s*vars\.APP_URL\s*\}\}/.test(beforeApply) && /::error::[^\n]*APP_URL/.test(beforeApply));
  check('deploy-test: those checks come before the infra plan too (nothing on Railway has been touched)', beforeApply.indexOf('::error::Set the test environment\'s secret TEST_GATE_PASSPHRASE') > 0 && beforeApply.indexOf('::error::Set the test environment\'s secret TEST_GATE_PASSPHRASE') < beforeApply.indexOf('- name: Infra plan'));
  check('deploy-test: the address has no fallback to the Railway domain', !/railway domain|up\.railway\.app/.test(yamlCode(deployTest)));

  const sync = between(job, '- name: Sync settings', '- uses: actions/download-artifact');
  for (const name of ['APP_URL', 'TEST_GATE_PASSPHRASE', 'COOKIE_SIGNING_SECRET']) {
    check('deploy-test: Sync settings writes ' + name + ' with set_var', sync.includes('set_var ' + name + ' "$' + name + '"'));
  }
  check('deploy-test: Sync settings takes APP_URL from the environment\'s variable and the gate values from its secrets', /APP_URL:\s*\$\{\{\s*vars\.APP_URL\s*\}\}/.test(sync) && /TEST_GATE_PASSPHRASE:\s*\$\{\{\s*secrets\.TEST_GATE_PASSPHRASE\s*\}\}/.test(sync) && /COOKIE_SIGNING_SECRET:\s*\$\{\{\s*secrets\.COOKIE_SIGNING_SECRET\s*\}\}/.test(sync));
  check('deploy-test: the Summary still has the site\'s address', /APP_URL:\s*\$\{\{\s*vars\.APP_URL\s*\}\}/.test(job.slice(job.indexOf('- name: Summary'))));
  const scan = between(job, '- name: No secret of this environment in the bundle', '- name: Deploy');
  check('deploy-test: the bundle scan gets both values', /TEST_GATE_PASSPHRASE:\s*\$\{\{\s*secrets\.TEST_GATE_PASSPHRASE\s*\}\}/.test(scan) && /COOKIE_SIGNING_SECRET:\s*\$\{\{\s*secrets\.COOKIE_SIGNING_SECRET\s*\}\}/.test(scan));
  const scanner = readFileSync('server/check-bundle.mjs', 'utf8');
  const scanned = /SECRET_VARIABLES = \[([^\]]*)\]/.exec(scanner)?.[1] ?? '';
  check('check-bundle scans for both values', scanned.includes("'TEST_GATE_PASSPHRASE'") && scanned.includes("'COOKIE_SIGNING_SECRET'"));
  for (const name of ['TEST_GATE_PASSPHRASE', 'COOKIE_SIGNING_SECRET', 'APP_URL']) check('deploy-test header comment lists ' + name, deployTest.slice(0, deployTest.indexOf('\nname:')).includes(name));

  const prodJob = deployProd.slice(deployProd.indexOf('\n  deploy:'));
  const prodBeforeApply = prodJob.slice(0, prodJob.indexOf('- name: Apply infra'));
  check('deploy-prod: refuses TEST_GATE_PASSPHRASE before Apply infra (D5: never on production)', /TEST_GATE_PASSPHRASE:\s*\$\{\{\s*secrets\.TEST_GATE_PASSPHRASE\s*\}\}/.test(prodBeforeApply) && /-n "\$TEST_GATE_PASSPHRASE"[^\n]*::error::[^\n]*exit 1/.test(prodBeforeApply));
  check('deploy-prod: never writes it to Railway', !prodJob.slice(prodJob.indexOf('- name: Apply infra')).includes('TEST_GATE_PASSPHRASE'));

  const handler = readFileSync('server/app.mjs', 'utf8');
  const gateAt = handler.indexOf('await testGate(req, res, rawPath)');
  check('the gate runs first in the handler, before /health, /app-config.json, the proxy and the static files', gateAt > 0 && gateAt < handler.indexOf("if (rawPath === '/health')"));
  check('the bundle takes every server/*.mjs, so testGate.mjs ships (make-bundle)', existsSync('server/testGate.mjs') && readFileSync('server/make-bundle.mjs', 'utf8').includes("name.endsWith('.mjs') && name !== 'make-bundle.mjs'"));
  for (const wf of ['hoy-server-qa', 'auth-checks', 'deploy-test', 'deploy-prod', 'release']) {
    check(wf + ' runs the gate\'s tests', readFileSync('.github/workflows/' + wf + '.yml', 'utf8').includes('node scripts/test-test-gate.mjs'));
  }
  // The gate's cookie has to travel with the app's own calls: 'omit' answers every signed-in call with the gate's 401.
  const omits = (function walk(dir) { return readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(dir + '/' + e.name) : /\.(ts|tsx)$/.test(e.name) && /credentials:\s*'omit'/.test(readFileSync(dir + '/' + e.name, 'utf8')) ? [dir + '/' + e.name] : []); })('src');
  check('the app\'s calls to its own server send same-origin cookies (no credentials: omit)', omits.length === 0, omits.join(', '));
}

done();
