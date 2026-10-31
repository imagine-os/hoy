// The real-API mode of the real-Clerk sign-up check (Hoy all-roles lane E), proven without Clerk:
// 1. its options (the `--real-api` argument and the environment it reads), and the safety checks on the site;
// 2. with COS_LOCAL_API set: the Company OS clean-up against a REAL local Company OS (dev auth, the Hoy recipe applied
//    with --go-live so self sign-up is open): a QA user signs up, lands as `member`, and the clean-up removes its
//    membership, person and member through the API; a non-QA address is refused; a failed step is logged, not hidden.
// Fictional addresses only. Without COS_LOCAL_API the second part says it skipped.
// Run: node scripts/test-real-signup.mjs
//      COS_LOCAL_API=http://localhost:4105 COS_LOCAL_TENANT=hoy-e COS_LOCAL_ADMIN_EMAIL=admin-e@example.test node scripts/test-real-signup.mjs
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { QA_EMAIL, checkTestSite, cosOver, findSignup, realApiOptions, removeSignup, removeStaleSignups, timeOf } from './lib/real-signup.mjs';

let passed = 0, failed = 0, skipped = 0;
const row = async (name, fn) => {
  try { await fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { failed++; console.log(`FAIL ${name}\n     ${String(e?.message ?? e).split('\n').slice(0, 4).join('\n     ')}`); }
};
const throwsWith = (fn, re) => assert.throws(fn, (e) => re.test(e.message), String(re));

// ── 1. options ───────────────────────────────────────────────────────────────────────────────────────────────────
const ENV = { HOY_TEST_URL: 'https://test-hoy.example.com', HOY_CLEANUP_ADMIN_EMAIL: 'Admin@Example.com' };
await row('RS-01 no argument keeps the fake Company OS (today\'s check unchanged)', () => {
  assert.deepEqual(realApiOptions([], {}), { mode: 'fake' });
  assert.deepEqual(realApiOptions([], ENV), { mode: 'fake' }, 'the variables alone do not switch modes');
});
await row('RS-02 --real-api reads the site and the clean-up admin from the environment', () => {
  assert.deepEqual(realApiOptions(['--real-api'], ENV), { mode: 'real-api', baseUrl: 'https://test-hoy.example.com', adminEmail: 'admin@example.com' });
  assert.equal(realApiOptions(['--real-api'], { ...ENV, HOY_TEST_URL: 'https://test-hoy.example.com/' }).baseUrl, 'https://test-hoy.example.com');
  assert.equal(realApiOptions(['--real-api'], { ...ENV, HOY_TEST_URL: 'http://localhost:8080' }).baseUrl, 'http://localhost:8080');
});
await row('RS-03 --real-api without its variables says which are missing', () => {
  throwsWith(() => realApiOptions(['--real-api'], {}), /HOY_TEST_URL and HOY_CLEANUP_ADMIN_EMAIL/);
  throwsWith(() => realApiOptions(['--real-api'], { HOY_TEST_URL: 'https://x.example.com' }), /HOY_CLEANUP_ADMIN_EMAIL/);
  throwsWith(() => realApiOptions(['--real-api'], { ...ENV, HOY_TEST_URL: '  ' }), /HOY_TEST_URL/);
});
await row('RS-04 hostile or wrong values are refused', () => {
  throwsWith(() => realApiOptions(['--real-api', '--prod'], ENV), /unknown argument/);
  throwsWith(() => realApiOptions(['--realapi'], ENV), /unknown argument/);
  throwsWith(() => realApiOptions(['--real-api'], { ...ENV, HOY_TEST_URL: 'http://test-hoy.example.com' }), /https/);
  throwsWith(() => realApiOptions(['--real-api'], { ...ENV, HOY_TEST_URL: 'javascript:alert(1)' }), /https/);
  throwsWith(() => realApiOptions(['--real-api'], { ...ENV, HOY_TEST_URL: 'https://u:p@test-hoy.example.com' }), /credentials/);
  throwsWith(() => realApiOptions(['--real-api'], { ...ENV, HOY_TEST_URL: 'https://test-hoy.example.com/#/app' }), /origin only/);
  throwsWith(() => realApiOptions(['--real-api'], { ...ENV, HOY_TEST_URL: 'not a url' }), /not a URL/);
  throwsWith(() => realApiOptions(['--real-api'], { ...ENV, HOY_CLEANUP_ADMIN_EMAIL: 'admin' }), /not an email/);
  throwsWith(() => realApiOptions(['--real-api'], { ...ENV, HOY_CLEANUP_ADMIN_EMAIL: 'qa-abc+clerk_test@example.com' }), /not a QA address/);
});
await row('RS-05 the site must be a test environment on the same Clerk instance', () => {
  const pk = 'pk_test_abc';
  assert.deepEqual(checkTestSite({ tenant: 'hoy', environment: 'test', clerkPublishableKey: pk, launch: { siteLive: true } }, pk), { tenant: 'hoy', siteLive: true });
  assert.deepEqual(checkTestSite({ tenant: 'hoy', environment: 'test', clerkPublishableKey: pk }, pk), { tenant: 'hoy', siteLive: false });
  throwsWith(() => checkTestSite({ tenant: 'hoy', environment: 'production', clerkPublishableKey: pk }, pk), /production/);
  throwsWith(() => checkTestSite({ tenant: 'hoy', environment: 'test', clerkPublishableKey: 'pk_test_other' }, pk), /another Clerk instance/);
  throwsWith(() => checkTestSite({ environment: 'test', clerkPublishableKey: pk }, pk), /no tenant/);
  throwsWith(() => checkTestSite(null, pk), /no tenant/);
});
await row('RS-06 only QA addresses are ever removed', async () => {
  assert.ok(QA_EMAIL.test('qa-mh2k3x9a+clerk_test@example.com'));
  for (const e of ['ana@example.com', 'qa-x+clerk_test@example.com.evil.test', 'QA-ABC+clerk_test@example.com ', 'x-qa-a+clerk_test@example.com']) assert.ok(!QA_EMAIL.test(e), e);
  const calls = [];
  const lines = [];
  const out = await removeSignup(async (...a) => { calls.push(a); return { status: 200, body: {} }; }, 'ana@example.com', { log: (l) => lines.push(l) });
  assert.deepEqual(out, { removed: [], left: [], refused: true });
  assert.equal(calls.length, 0, 'not even a read');
  assert.match(lines.join('\n'), /REFUSED/);
});
await row('RS-07 timestamps from /query (Postgres style) and ISO both read', () => {
  assert.equal(timeOf('2026-10-31 18:17:21.271895+00'), Date.parse('2026-10-31T18:17:21.271Z'));
  assert.equal(timeOf('2026-10-31T18:17:21.271Z'), Date.parse('2026-10-31T18:17:21.271Z'));
  assert.ok(Number.isNaN(timeOf(undefined)));
});

// ── 2. the clean-up against a real local Company OS ──────────────────────────────────────────────────────────────
const API = process.env.COS_LOCAL_API ?? '';
if (!API) {
  skipped++;
  console.log('SKIP RS-10…RS-14 (no COS_LOCAL_API: a local Company OS with the Hoy recipe applied --go-live)');
} else {
  const apiUrl = new URL(API);
  assert.ok(['localhost', '127.0.0.1'].includes(apiUrl.hostname), 'COS_LOCAL_API must be on this machine');
  const TENANT = process.env.COS_LOCAL_TENANT ?? 'hoy-e';
  const ROOT = `${apiUrl.origin}/t/${TENANT}`;
  // The local API's dev auth (AUTH_PROVIDER=dev): a sign-up token is an HS256 JWT `{ sub, email }` with the dev secret.
  const SECRET = process.env.COS_LOCAL_JWT_SECRET ?? 'dev-secret-change-me';
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const devToken = (payload) => { const h = b64({ alg: 'HS256', typ: 'JWT' }), b = b64({ ...payload, iat: Math.floor(Date.now() / 1000) }); return `${h}.${b}.${createHmac('sha256', SECRET).update(`${h}.${b}`).digest('base64url')}`; };
  const adminLogin = await fetch(`${ROOT}/auth/dev-login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: process.env.COS_LOCAL_ADMIN_EMAIL ?? 'admin-e@example.test' }) }).then((r) => r.json());
  const admin = cosOver({ apiRoot: ROOT, token: async () => adminLogin.token });
  async function signUp(email) {
    const token = devToken({ sub: randomUUID(), email });
    const self = cosOver({ apiRoot: ROOT, token: async () => token });
    const cfg = (await self('GET', '/signup')).body;
    assert.equal(cfg.enabled, true, 'self sign-up is open on the local tenant (recipe applied with --go-live)');
    await self('POST', '/signup', { person: { name: 'QA Prueba (ficticia)', phone: '3005550199' }, facet: { emergency_contact_name: 'QA Contacto', emergency_contact_phone: '3005550198' }, consents: cfg.consents });
    return self;
  }
  const run = () => `qa-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}+clerk_test@example.com`;

  await row('RS-10 a QA sign-up lands as a customer (`member`) with a self_signup member record', async () => {
    const email = run();
    const self = await signUp(email);
    const me = (await self('GET', '/me')).body;
    assert.deepEqual(me.roleKeys, ['member']);
    const found = await findSignup(admin, email);
    assert.deepEqual(found.roleKeys, ['member']);
    assert.equal(found.personIds.length, 1);
    assert.deepEqual(found.members.map((m) => m.source), ['self_signup']);
    const r = await removeSignup(admin, email, { log: () => {} });
    assert.deepEqual(r.left, []);
  });

  await row('RS-11 the clean-up removes the membership, the person and the member through the API', async () => {
    const email = run();
    const self = await signUp(email);
    const lines = [];
    const out = await removeSignup(admin, email, { log: (l) => lines.push(l) });
    assert.deepEqual(out.left, [], lines.join('\n'));
    assert.equal(out.removed.length, 3, out.removed.join(', '));
    const after = await findSignup(admin, email);
    assert.deepEqual({ ...after, userIds: [] }, { userIds: [], membershipIds: [], roleKeys: [], personIds: [], members: [] });
    await assert.rejects(self('GET', '/me'), (e) => e.status === 403, 'the login opens nothing afterwards');
    assert.match(lines.join('\n'), /removed 3 record/);
  });

  await row('RS-12 a non-QA sign-up is never removed by the clean-up', async () => {
    const email = `ana.${Date.now().toString(36)}@example.test`;
    await signUp(email);
    const out = await removeSignup(admin, email, { log: () => {} });
    assert.equal(out.refused, true);
    assert.equal((await findSignup(admin, email)).personIds.length, 1, 'still there');
    // The test's own tidy-up (not the code under test): remove it directly.
    const f = await findSignup(admin, email);
    for (const m of f.members) await admin('DELETE', `/api/member/${m.id}`);
    for (const id of f.personIds) await admin('DELETE', `/api/person/${id}`);
    for (const id of f.membershipIds) await admin('DELETE', `/admin/memberships/${id}`);
  });

  await row('RS-13 a failed step is logged with what was left behind, and the rest still runs', async () => {
    const email = run();
    await signUp(email);
    const lines = [];
    const flaky = async (method, path, body) => {
      if (method === 'DELETE' && path.startsWith('/api/person/')) throw Object.assign(new Error(`${method} /api/person → 503 upstream_unavailable`), { code: 'upstream_unavailable', status: 503 });
      return admin(method, path, body);
    };
    const out = await removeSignup(flaky, email, { log: (l) => lines.push(l) });
    const log = lines.join('\n');
    assert.ok(out.left.some((l) => l.startsWith('person ')), out.left.join(', '));
    assert.ok(out.removed.some((l) => l.startsWith('membership ')), 'the membership was still removed');
    assert.match(log, /clean-up FAILED/);
    assert.match(log, /LEFT BEHIND in Company OS: person /);
    // Retry without the fault: everything goes.
    assert.deepEqual((await removeSignup(admin, email, { log: () => {} })).left, []);
  });

  await row('RS-14 a crashed run\'s QA sign-ups (older than 30 minutes) are removed at the start; fresh ones stay', async () => {
    const email = run();
    await signUp(email);
    assert.equal(await removeStaleSignups(admin, { log: () => {} }), 0, 'a fresh one is not stale');
    assert.equal((await findSignup(admin, email)).personIds.length, 1);
    assert.ok(await removeStaleSignups(admin, { now: Date.now() + 31 * 60_000, log: () => {} }) >= 1);
    assert.equal((await findSignup(admin, email)).personIds.length, 0);
  });
}

console.log(`\n${passed} passed, ${failed} failed${skipped ? `, ${skipped} part skipped` : ''}`);
process.exitCode = failed ? 1 : 0;
