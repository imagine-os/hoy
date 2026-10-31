// Hoy all-roles (lane D) — view-as, the rules without a browser. Run: node scripts/test-view-as.mjs
// A super admin may view the studio as any other signed-in role, read-only (decision log: view-as read-only):
// - which roles can be viewed and what sessionStorage may hold (`hoyos.viewAs`; a tampered value is refused);
// - the read-only rule: only GET and `POST /query` leave the browser while viewing as, in the Company OS transport and
//   in the auth screens' `cosJson` (`view_as_read_only`, with Spanish and English copy);
// - fail closed: a stored view-as blocks writes even before the session has checked who is signed in;
// - the sample person: chosen by membership role (an active coach for Teacher, never the viewer), never invented;
// - the data provider aliases the session user to the sample person, so "my" reads become theirs, and back on exit.
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const scratch = await mkdtemp(join(tmpdir(), 'hoy-view-as-'));
let failures = 0, passed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log(`ok   ${name}`); }
  catch (e) { failures++; console.log(`FAIL ${name}\n     ${e?.stack?.split('\n').slice(0, 3).join('\n     ') ?? e}`); }
}

// A sessionStorage for node, shared with the bundle (it reads globalThis.sessionStorage at call time).
class MemoryStorage {
  #m = new Map();
  get length() { return this.#m.size; }
  key(i) { return [...this.#m.keys()][i] ?? null; }
  getItem(k) { return this.#m.has(k) ? this.#m.get(k) : null; }
  setItem(k, v) { this.#m.set(k, String(v)); }
  removeItem(k) { this.#m.delete(k); }
  clear() { this.#m.clear(); }
}
globalThis.sessionStorage = new MemoryStorage();
globalThis.localStorage = new MemoryStorage();
globalThis.document = { baseURI: 'http://hoy.test/', addEventListener() {}, hidden: false };

try {
  const file = join(scratch, 'view-as.mjs');
  await build({
    stdin: {
      contents: `export * from './src/auth/viewAs.ts';
        export { cosJson } from './src/auth/cosRequest.ts';
        export { setSessionTokenSource } from './src/auth/sessionToken.ts';
        export { CompanyOSProvider } from './src/data/companyos/CompanyOSProvider.ts';
        export { Transport, CompanyOSError } from './src/data/companyos/transport.ts';
        export { refusalCopy, hasRefusalCopy } from './src/data/companyos/refusals.ts';`,
      resolveDir: process.cwd(), loader: 'ts',
    },
    bundle: true, platform: 'node', format: 'esm', outfile: file, logLevel: 'silent',
    loader: { '.jpg': 'empty', '.png': 'empty', '.webp': 'empty', '.svg': 'empty', '.md': 'text', '.css': 'empty' },
    define: { __HOY_BUILD__: '"production"', 'import.meta.env': '{"VITE_HOY_BUILD":"production"}' },
  });
  const m = await import(pathToFileURL(file));
  const { VIEW_AS_KEY, VIEW_AS_REFUSAL, VIEWABLE_ROLES, isViewableRole, readStoredViewAs, storeViewAs, publishViewAs, viewAsActive, viewAsPersonId, viewAsAllows, loadViewAsSample,
    cosJson, setSessionTokenSource, CompanyOSProvider, Transport, CompanyOSError, refusalCopy, hasRefusalCopy } = m;

  const reset = () => { publishViewAs(null); sessionStorage.clear(); };

  // ── the roles ───────────────────────────────────────────────────────────────────────────────────────────────────
  await test('the key lives under hoyos.* (wiped on sign-out with the other traces)', () => assert.equal(VIEW_AS_KEY, 'hoyos.viewAs'));
  await test('every signed-in role but super admin can be viewed (9 roles); public and super admin cannot', () => {
    assert.deepEqual([...VIEWABLE_ROLES].sort(), ['admin', 'coordinator', 'customer', 'developer', 'finance', 'front_desk', 'maintenance', 'marketing', 'teacher']);
    for (const r of VIEWABLE_ROLES) assert.equal(isViewableRole(r), true, r);
  });
  await test('hostile: super_admin, public, unknown, prototype keys, non-strings are not viewable', () => {
    for (const r of ['super_admin', 'public', 'root', '', '__proto__', 'toString', 'constructor', ' customer', 'Customer', null, undefined, 1, {}, ['customer']]) assert.equal(isViewableRole(r), false, String(r));
  });

  // ── sessionStorage ──────────────────────────────────────────────────────────────────────────────────────────────
  await test('storeViewAs keeps a viewable role in sessionStorage and readStoredViewAs reads it back', () => {
    reset(); storeViewAs('teacher');
    assert.equal(sessionStorage.getItem('hoyos.viewAs'), 'teacher');
    assert.equal(readStoredViewAs(), 'teacher');
    storeViewAs(null);
    assert.equal(sessionStorage.getItem('hoyos.viewAs'), null);
    assert.equal(readStoredViewAs(), null);
  });
  await test('hostile: a tampered stored value (super_admin, public, junk, JSON) is refused and removed', () => {
    for (const v of ['super_admin', 'public', 'admin<script>', '{"role":"admin"}', '__proto__', '']) {
      sessionStorage.setItem('hoyos.viewAs', v);
      assert.equal(readStoredViewAs(), null, v);
      assert.equal(sessionStorage.getItem('hoyos.viewAs'), null, `${v} removed`);
    }
  });
  await test('storeViewAs refuses a role that is not viewable (nothing stored)', () => {
    reset(); storeViewAs('super_admin'); storeViewAs('public');
    assert.equal(sessionStorage.getItem('hoyos.viewAs'), null);
  });
  await test('blocked storage does not throw (private mode): reads answer null', () => {
    const saved = globalThis.sessionStorage;
    globalThis.sessionStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
    try { assert.equal(readStoredViewAs(), null); storeViewAs('customer'); } finally { globalThis.sessionStorage = saved; }
  });

  // ── the read-only rule ──────────────────────────────────────────────────────────────────────────────────────────
  await test('viewAsAllows: GET anything and POST /query only', () => {
    assert.equal(viewAsAllows('GET', '/me'), true);
    assert.equal(viewAsAllows('GET', '/api/booking/1'), true);
    assert.equal(viewAsAllows('POST', '/query'), true);
    for (const [method, path] of [['POST', '/batch'], ['POST', '/api/booking'], ['PATCH', '/api/person/1'], ['DELETE', '/api/booking/1'], ['PUT', '/admin/roles/x/permissions'], ['POST', '/invitations'], ['POST', '/signup'], ['POST', '/admin/users']]) assert.equal(viewAsAllows(method, path), false, `${method} ${path}`);
  });
  await test('hostile: look-alike reads are writes (/query?x, /query/, /api/query, //query, lower-case get, HEAD)', () => {
    for (const [method, path] of [['POST', '/query?x=1'], ['POST', '/query/'], ['POST', '/api/query'], ['POST', '//query'], ['POST', '/query/../batch'], ['get', '/me'], ['post', '/query'], ['HEAD', '/me'], ['OPTIONS', '/me']]) assert.equal(viewAsAllows(method, path), false, `${method} ${path}`);
  });
  await test('the refusal has Spanish and English copy (code→copy table)', () => {
    assert.equal(VIEW_AS_REFUSAL, 'view_as_read_only');
    assert.equal(hasRefusalCopy('view_as_read_only'), true);
    assert.match(refusalCopy('view_as_read_only', 'es'), /solo lectura/i);
    assert.match(refusalCopy('view_as_read_only', 'en'), /read-only/i);
  });

  // ── the transport ───────────────────────────────────────────────────────────────────────────────────────────────
  const wire = () => {
    const calls = [];
    const fetch = async (url, init = {}) => { calls.push({ url, method: init.method ?? 'GET', body: init.body }); return new Response(JSON.stringify({ data: [] }), { status: 200, headers: { 'content-type': 'application/json' } }); };
    return { calls, transport: new Transport({ fetch, config: { tenant: 'hoy-test', apiBase: '/api/cos' }, getToken: async () => 'tok', retries: 0 }) };
  };
  await test('viewing as: every write the transport is asked for is refused before it leaves the browser', async () => {
    reset(); publishViewAs({ personId: 'per_sample' });
    const { calls, transport } = wire();
    for (const [method, path] of [['POST', '/batch'], ['POST', '/api/booking'], ['PATCH', '/api/person/p1'], ['DELETE', '/api/booking/b1'], ['POST', '/admin/users'], ['PUT', '/admin/roles/coach/policies']]) {
      await assert.rejects(transport.request(method, path, { body: { x: 1 }, idempotencyKey: 'key-12345678' }), (e) => e instanceof CompanyOSError && e.code === 'view_as_read_only' && e.ambiguous === false, `${method} ${path}`);
    }
    assert.equal(calls.length, 0, calls.map((c) => `${c.method} ${c.url}`).join(', '));
  });
  await test('viewing as: reads still go out (GET, POST /query)', async () => {
    reset(); publishViewAs({ personId: 'per_sample' });
    const { calls, transport } = wire();
    await transport.request('GET', '/me');
    await transport.request('POST', '/query', { body: { entity: 'person' } });
    assert.deepEqual(calls.map((c) => `${c.method} ${c.url}`), ['GET /api/cos/t/hoy-test/me', 'POST /api/cos/t/hoy-test/query']);
  });
  await test('viewing as: the file upload (raw PUT to the storage link) is refused too; a raw GET is not', async () => {
    reset(); publishViewAs({ personId: 'per_sample' });
    const { calls, transport } = wire();
    await assert.rejects(transport.raw('https://storage.example/upload', { method: 'PUT', body: 'x' }), (e) => e.code === 'view_as_read_only');
    await transport.raw('/files/1', { method: 'GET' });
    assert.equal(calls.length, 1);
  });
  await test('fail closed: a stored view-as blocks writes before the session has published anything', async () => {
    reset(); sessionStorage.setItem('hoyos.viewAs', 'customer');
    assert.equal(viewAsActive(), true);
    const { calls, transport } = wire();
    await assert.rejects(transport.request('POST', '/api/booking', { body: {} }), (e) => e.code === 'view_as_read_only');
    assert.equal(calls.length, 0);
  });
  await test('not viewing as (exit, sign-out): writes go out again', async () => {
    reset();
    assert.equal(viewAsActive(), false);
    const { calls, transport } = wire();
    await transport.request('POST', '/api/booking', { body: {}, idempotencyKey: 'key-12345678' });
    assert.equal(calls.length, 1);
  });

  // ── cosJson (sign-up and the other auth screens) ───────────────────────────────────────────────────────────────
  await test('cosJson: a write while viewing as answers view_as_read_only without calling the API; a GET goes out', async () => {
    reset(); publishViewAs({ personId: 'per_sample' });
    const calls = [];
    globalThis.fetch = async (url, init = {}) => {
      calls.push(`${init.method ?? 'GET'} ${url}`);
      if (String(url).endsWith('app-config.json')) return new Response(JSON.stringify({ tenant: 'hoy-test', apiBase: '/api/cos', clerkPublishableKey: 'pk_test_ZmFrZSQ=', environment: 'test' }), { status: 200 });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    };
    setSessionTokenSource(async () => 'tok');
    const w = await cosJson('/signup', { method: 'POST', body: { name: 'x' } });
    assert.equal(w.body?.error, 'view_as_read_only');
    assert.ok(w.status >= 400, String(w.status));
    assert.ok(!calls.some((c) => c.includes('/signup')), calls.join(', '));
    const r = await cosJson('/signup/config');
    assert.equal(r.status, 200);
    assert.ok(calls.some((c) => c.startsWith('GET ') && c.endsWith('/api/cos/t/hoy-test/signup/config')), calls.join(', '));
    reset();
    const ok = await cosJson('/signup', { method: 'POST', body: { name: 'x' } });
    assert.equal(ok.status, 200);
  });

  // ── the sample person ───────────────────────────────────────────────────────────────────────────────────────────
  const USERS = [
    { userId: 'u_super', email: 'super@hoy.test', name: 'Aaron Super', memberships: [{ membershipId: 'm1', roleKey: 'super_admin' }] },
    { userId: 'u_admin', email: 'admin@hoy.test', name: 'Mateo Admin', memberships: [{ membershipId: 'm2', roleKey: 'administrator' }, { membershipId: 'm3', roleKey: 'super_admin' }] },
    { userId: 'u_coach_b', email: 'b@hoy.test', name: 'Beatriz Coach', memberships: [{ membershipId: 'm4', roleKey: 'coach' }] },
    { userId: 'u_coach_c', email: 'c@hoy.test', name: 'Carlos Coach', memberships: [{ membershipId: 'm5', roleKey: 'coach' }] },
    { userId: 'u_cust_z', email: 'z@hoy.test', name: 'Zoe Cliente', memberships: [{ membershipId: 'm6', roleKey: 'member' }] },
    { userId: 'u_cust_a', email: 'a@hoy.test', name: 'Ana Cliente', memberships: [{ membershipId: 'm7', roleKey: 'member' }] },
    { userId: 'u_desk', email: 'desk@hoy.test', name: 'Camilo Desk', memberships: [{ membershipId: 'm8', roleKey: 'front_desk' }] },
    { userId: 'u_nobody', email: 'n@hoy.test', name: 'Sin Persona', memberships: [{ membershipId: 'm9', roleKey: 'maintenance' }] },
  ];
  const PERSONS = { u_super: 'per_super', u_admin: 'per_admin', u_coach_b: 'per_coach_b', u_coach_c: 'per_coach_c', u_cust_z: 'per_cust_z', u_cust_a: 'per_cust_a', u_desk: 'per_desk' };
  const COACHES = [{ id: 'co_b', data: { person: 'per_coach_b', active: false } }, { id: 'co_c', data: { person: 'per_coach_c', active: true } }];
  const fieldValues = (f, field) => !f ? [] : f.and ? f.and.flatMap((x) => fieldValues(x, field)) : f.field === field ? [].concat(f.value) : [];
  function directory({ users = USERS, coaches = COACHES, refuse = false } = {}) {
    const log = [];
    const request = async (method, path, body) => {
      log.push(`${method} ${path}`);
      if (refuse) { const e = new Error('forbidden'); e.status = 403; throw e; }
      if (method === 'GET' && path === '/admin/users') return { users };
      if (method === 'POST' && path === '/query' && body?.entity === 'person') {
        const want = fieldValues(body.filter, 'user');
        return { data: Object.entries(PERSONS).filter(([u]) => want.includes(u)).map(([u, id]) => ({ id, data: { user: u, name: users.find((x) => x.userId === u)?.name ?? '' } })) };
      }
      if (method === 'POST' && path === '/query' && body?.entity === 'coach') {
        const want = fieldValues(body.filter, 'person');
        const active = fieldValues(body.filter, 'active');
        return { data: coaches.filter((c) => want.includes(c.data.person) && (!active.length || active.includes(c.data.active))) };
      }
      throw new Error(`unexpected ${method} ${path}`);
    };
    return { log, request };
  }
  await test('customer: the first member by name (Ana before Zoe), with their person', async () => {
    const { request } = directory();
    assert.deepEqual(await loadViewAsSample('customer', request, 'u_super'), { userId: 'u_cust_a', personId: 'per_cust_a', name: 'Ana Cliente', email: 'a@hoy.test' });
  });
  await test('teacher: the first ACTIVE coach (Carlos), not the inactive one who sorts first (Beatriz)', async () => {
    const { request } = directory();
    assert.equal((await loadViewAsSample('teacher', request, 'u_super'))?.personId, 'per_coach_c');
  });
  await test('teacher: no active coach record → the first person holding the coach membership', async () => {
    const { request } = directory({ coaches: [] });
    assert.equal((await loadViewAsSample('teacher', request, 'u_super'))?.personId, 'per_coach_b');
  });
  await test('staff: the person holding that role key (admin → administrator, front_desk → front_desk)', async () => {
    const { request } = directory();
    assert.equal((await loadViewAsSample('admin', request, 'u_super'))?.personId, 'per_admin');
    assert.equal((await loadViewAsSample('front_desk', request, 'u_super'))?.personId, 'per_desk');
  });
  await test('never the viewer themself', async () => {
    const { request } = directory();
    assert.equal(await loadViewAsSample('admin', request, 'u_admin'), null);
  });
  await test('no one holds the role, or no one with a person → null (nobody is invented)', async () => {
    const { request } = directory();
    assert.equal(await loadViewAsSample('marketing', request, 'u_super'), null);
    assert.equal(await loadViewAsSample('maintenance', request, 'u_super'), null);
  });
  await test('hostile: a role that is not viewable is refused before any request', async () => {
    const { log, request } = directory();
    for (const r of ['super_admin', 'public', '__proto__', 'x']) assert.equal(await loadViewAsSample(r, request, 'u_super'), null, r);
    assert.equal(log.length, 0, log.join(', '));
  });
  await test('hostile: a malformed directory (no users array, odd memberships) → null, no crash', async () => {
    for (const users of [null, 'x', [{ userId: 1 }], [{ userId: 'u_cust_a', memberships: 'member' }], [{ userId: 'u_cust_a', memberships: [{ roleKey: '__proto__' }] }]]) {
      const { request } = directory({ users });
      assert.equal(await loadViewAsSample('customer', request, 'u_super'), null, JSON.stringify(users));
    }
  });
  await test('the directory refused (403) → null', async () => {
    const { request } = directory({ refuse: true });
    assert.equal(await loadViewAsSample('customer', request, 'u_super'), null);
  });
  await test('the sample reads are reads only (GET /admin/users, POST /query)', async () => {
    const { log, request } = directory();
    await loadViewAsSample('teacher', request, 'u_super');
    assert.ok(log.every((l) => l === 'GET /admin/users' || l === 'POST /query'), log.join(', '));
  });

  // ── the provider alias ──────────────────────────────────────────────────────────────────────────────────────────
  await test('provider: viewing as aliases the session user to the sample person, and back on exit', async () => {
    reset();
    const bodies = [];
    const fetch = async (url, init = {}) => {
      const path = new URL(url, 'http://x').pathname.replace('/api/cos/t/hoy-test', '');
      const body = init.body ? JSON.parse(init.body) : null;
      if (path === '/me') return Response.json({ user: { id: 'u_super' }, roleKeys: ['super_admin'], isSuperAdmin: true, caps: [] });
      if (path === '/query' && body?.entity === 'person') return Response.json({ data: [{ id: 'per_super', data: { name: 'Aaron', user: 'u_super' } }] });
      if (path === '/query') { bodies.push(body); return Response.json({ data: [{ id: 'bk1', data: { person: viewAsPersonId() ?? 'per_super', occurrence: 'oc1', status: 'booked' }, createdAt: '2026-10-01T10:00:00Z', updatedAt: '2026-10-01T10:00:00Z' }] }); }
      return Response.json({ data: [] });
    };
    const provider = new CompanyOSProvider({ fetch, config: { tenant: 'hoy-test', apiBase: '/api/cos' }, getToken: async () => 'tok', retries: 0 });
    let resets = 0;
    provider.subscribe('bookings', () => { resets++; });
    assert.deepEqual(await provider.self(), { userId: 'u_super', personId: 'per_super' });
    publishViewAs({ personId: 'per_cust_a' });
    assert.ok(resets > 0, 'screens are told to read again when the alias changes');
    assert.deepEqual(await provider.self(), { userId: 'u_super', personId: 'per_cust_a' });
    const rows = await provider.list('bookings', { where: { user_id: 'u_super' } });
    assert.ok(JSON.stringify(bodies.at(-1)).includes('per_cust_a') && !JSON.stringify(bodies.at(-1)).includes('u_super'), JSON.stringify(bodies.at(-1)));
    assert.equal(rows[0]?.user_id, 'u_super', 'the sample person\'s rows come back as the session user\'s');
    publishViewAs(null);
    assert.deepEqual(await provider.self(), { userId: 'u_super', personId: 'per_super' });
    await provider.list('bookings', { where: { user_id: 'u_super' } });
    assert.ok(JSON.stringify(bodies.at(-1)).includes('per_super'), JSON.stringify(bodies.at(-1)));
  });
  await test('provider: viewing as with no sample person keeps the real person (nothing invented)', async () => {
    reset(); publishViewAs({ personId: null });
    const fetch = async (url, init = {}) => {
      const path = new URL(url, 'http://x').pathname.replace('/api/cos/t/hoy-test', '');
      if (path === '/me') return Response.json({ user: { id: 'u_super' }, roleKeys: ['super_admin'], isSuperAdmin: true, caps: [] });
      return Response.json({ data: [{ id: 'per_super', data: { name: 'Aaron', user: 'u_super' } }] });
    };
    const provider = new CompanyOSProvider({ fetch, config: { tenant: 'hoy-test', apiBase: '/api/cos' }, getToken: async () => 'tok', retries: 0 });
    assert.deepEqual(await provider.self(), { userId: 'u_super', personId: 'per_super' });
    reset();
  });
} finally {
  await rm(scratch, { recursive: true, force: true });
}
console.log(failures ? `\n${failures} view-as check(s) failed, ${passed} passed` : `\nview-as passed (${passed})`);
process.exit(failures ? 1 : 0);
