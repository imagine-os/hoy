// Hoy test-fixes (lane Y3) — Justin's Hub in production, the rules without a browser. Run: node scripts/test-hub-production.mjs
// - a preview frame (src/app/productionFrame.ts) runs under its own `?as=` / `lang` / `theme`, shadowed per frame: what
//   the frame reads and writes never reaches the parent's storage (its view-as, its drafts), hostile values are refused;
// - every framed document is read-only: the frame keeps a view-as value (the role, or a sentinel for the super admin and
//   public cards) so the transport's own refusal applies, and a same-origin write through fetch is refused unsent;
// - the Hub's real people (src/modules/hub/hubPeople.ts): per role, the same person view-as samples (by membership,
//   never the viewer, an active coach for Teacher), the directory read once; a failure is a failure, nobody is nobody;
// - Report a problem (src/modules/hub/problemReport.ts): the forms module's `problem_report` submission, in its shape.
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const scratch = await mkdtemp(join(tmpdir(), 'hoy-hub-prod-'));
let failures = 0, passed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log(`ok   ${name}`); }
  catch (e) { failures++; console.log(`FAIL ${name}\n     ${e?.stack?.split('\n').slice(0, 3).join('\n     ') ?? e}`); }
}

// A Storage for node whose methods live on the prototype, like the browser's (the frame shadows the prototype).
class FakeStorage {
  constructor() { this.m = new Map(); }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
}
const nativeProto = { getItem: FakeStorage.prototype.getItem, setItem: FakeStorage.prototype.setItem, removeItem: FakeStorage.prototype.removeItem };
const restore = () => Object.assign(FakeStorage.prototype, nativeProto);
globalThis.sessionStorage = new FakeStorage();
globalThis.localStorage = new FakeStorage();
globalThis.document = { baseURI: 'http://hoy.test/', addEventListener() {}, hidden: false };

try {
  const file = join(scratch, 'hub-prod.mjs');
  await build({
    stdin: {
      contents: `export * from './src/app/productionFrame.ts';
        export * from './src/modules/hub/hubPeople.ts';
        export * from './src/modules/hub/problemReport.ts';
        export { viewAsActive, readStoredViewAs, VIEW_AS_KEY, VIEW_AS_REFUSAL, VIEWABLE_ROLES, loadViewAsSample } from './src/auth/viewAs.ts';`,
      resolveDir: process.cwd(), loader: 'ts',
    },
    bundle: true, platform: 'node', format: 'esm', outfile: file, logLevel: 'silent',
    define: { __HOY_BUILD__: '"production"', 'import.meta.env': '{"VITE_HOY_BUILD":"production","DEV":false,"PROD":true}' },
    loader: { '.css': 'empty' },
  });
  const m = await import(pathToFileURL(file).href);

  // ── the frame's shadow ────────────────────────────────────────────────────────────────────────────────────────
  const q = (s) => new URLSearchParams(s);
  await test('frame: ?as=<viewable role> keeps that role as the frame\'s view-as; lang, theme and the styled skin are its own', () => {
    const s = m.productionFrameShadow(q('as=customer&lang=en&theme=dark&dev=0&live=0'));
    assert.equal(s['hoyos.viewAs'], 'customer');
    assert.equal(s['hoyos.lang'], 'en');
    assert.equal(JSON.parse(s['hoyos.theme']).theme, 'dark');
    assert.equal(s['hoyos.skin'], 'styled');
  });
  await test('frame: the super admin and public cards (and no as) still keep a read-only sentinel, never a role', () => {
    for (const as of ['as=super_admin', 'as=public', '']) {
      const s = m.productionFrameShadow(q(`${as}&dev=0&live=0`));
      assert.equal(s['hoyos.viewAs'], m.FRAME_READ_ONLY, as);
      assert.ok(!m.VIEWABLE_ROLES.includes(s['hoyos.viewAs']));
    }
  });
  await test('frame: hostile values are refused (an unknown role, a prototype key, markup, a bad lang or theme)', () => {
    for (const bad of ['customer<script>', '__proto__', 'constructor', 'ADMIN', 'customer ']) {
      assert.equal(m.productionFrameShadow(q(`as=${encodeURIComponent(bad)}`))['hoyos.viewAs'], m.FRAME_READ_ONLY, bad);
    }
    const s = m.productionFrameShadow(q('lang=fr&theme=%7B%22x%22%3A1%7D'));
    assert.equal(s['hoyos.lang'], undefined);
    assert.equal(s['hoyos.theme'], undefined);
  });

  await test('frame: what the frame writes never reaches the parent (view-as, drafts), and the parent\'s values stay', () => {
    restore();
    const parentSession = new FakeStorage(), parentLocal = new FakeStorage();
    parentLocal.setItem('hoyos.lang', 'es');
    parentSession.setItem('hoyos.draft', 'parent');
    m.shadowStorage(FakeStorage.prototype, m.productionFrameShadow(q('as=teacher&lang=en')));
    // reads: the frame's fixed values, else the parent's
    assert.equal(parentSession.getItem('hoyos.viewAs'), 'teacher');
    assert.equal(parentLocal.getItem('hoyos.lang'), 'en');
    assert.equal(parentSession.getItem('hoyos.draft'), 'parent');
    // writes: fixed keys ignored, other hoyos.* keys kept in the frame only
    parentSession.setItem('hoyos.viewAs', 'admin');
    parentSession.removeItem('hoyos.viewAs');
    parentSession.setItem('hoyos.draft', 'frame');
    parentSession.removeItem('hoyos.other');
    parentLocal.setItem('hoyos.lang', 'es');
    assert.equal(parentSession.getItem('hoyos.viewAs'), 'teacher', 'the frame\'s view-as is fixed');
    assert.equal(parentSession.getItem('hoyos.draft'), 'frame', 'the frame reads its own write');
    // the parent's real storage is untouched
    assert.equal(parentSession.m.get('hoyos.viewAs'), undefined);
    assert.equal(parentSession.m.get('hoyos.draft'), 'parent');
    assert.equal(parentLocal.m.get('hoyos.lang'), 'es');
    // a removal inside the frame reads as gone there, the parent keeps it
    parentSession.removeItem('hoyos.draft');
    assert.equal(parentSession.getItem('hoyos.draft'), null);
    assert.equal(parentSession.m.get('hoyos.draft'), 'parent');
    // other keys (Clerk's, the browser's) pass through
    parentSession.setItem('clerk-x', '1');
    assert.equal(parentSession.m.get('clerk-x'), '1');
    // prototype member names are not shadow hits
    assert.equal(parentSession.getItem('constructor'), null);
    assert.equal(parentSession.getItem('toString'), null);
    restore();
  });
  await test('frame: two storages keep separate frame copies (sessionStorage and localStorage)', () => {
    restore();
    const a = new FakeStorage(), b = new FakeStorage();
    m.shadowStorage(FakeStorage.prototype, m.productionFrameShadow(q('as=customer')));
    a.setItem('hoyos.x', 'a');
    assert.equal(b.getItem('hoyos.x'), null);
    restore();
  });

  await test('frame: read-only for every frame: the transport\'s fail-closed check sees a view-as (role or sentinel), the session ignores the sentinel', () => {
    restore();
    globalThis.sessionStorage = new FakeStorage();
    m.shadowStorage(FakeStorage.prototype, m.productionFrameShadow(q('as=super_admin')));
    assert.equal(m.viewAsActive(), true);
    assert.equal(m.readStoredViewAs(), null, 'a super admin frame does not view as anyone');
    assert.equal(m.viewAsActive(), true, 'the session\'s removal of the sentinel is ignored: still read-only');
    restore();
    globalThis.sessionStorage = new FakeStorage();
    m.shadowStorage(FakeStorage.prototype, m.productionFrameShadow(q('as=front_desk')));
    assert.equal(m.readStoredViewAs(), 'front_desk');
    assert.equal(m.viewAsActive(), true);
    restore();
    globalThis.sessionStorage = new FakeStorage();
  });

  await test('frame: a same-origin write through fetch is refused unsent (view_as_read_only); reads, /query and other hosts pass', async () => {
    const sent = [];
    const target = { fetch: async (input, init) => { sent.push(`${init?.method ?? 'GET'} ${typeof input === 'string' ? input : input.url}`); return new Response('{}', { status: 200 }); } };
    m.guardFrameFetch(target, 'http://hoy.test');
    for (const [url, method] of [['/api/cos/t/hoy/batch', 'POST'], ['http://hoy.test/api/cos/t/hoy/api/booking/1', 'PATCH'], ['/api/cos/t/hoy/api/booking/1', 'DELETE'], ['/api/cos/t/hoy/forms/problem_report/submissions', 'POST'], ['/api/cos/t/hoy/files', 'PUT'], ['/api/cos/t/hoy/query/../batch', 'POST']]) {
      const res = await target.fetch(url, { method });
      assert.equal(res.status, 403, `${method} ${url}`);
      assert.equal((await res.json()).error, m.VIEW_AS_REFUSAL);
    }
    const req = new Request('http://hoy.test/api/cos/t/hoy/batch', { method: 'POST', body: '{}' });
    assert.equal((await target.fetch(req)).status, 403, 'a Request object is judged by its own method');
    assert.equal(sent.length, 0, 'nothing was sent');
    await target.fetch('/api/cos/t/hoy/me');
    await target.fetch('/api/cos/t/hoy/query', { method: 'POST', body: '{}' });
    await target.fetch('https://fake.clerk.accounts.dev/v1/client/sessions/x/tokens', { method: 'POST' });
    assert.equal(sent.length, 3, sent.join(' | '));
  });

  await test('frame: outside a frame nothing is installed (node has no window: not framed)', () => {
    assert.equal(m.installProductionFrame(), false);
  });

  // ── the Hub's real people ─────────────────────────────────────────────────────────────────────────────────────
  const DIRECTORY = { users: [
    { userId: 'u_super', email: 'super@x.test', name: 'Aaron Super', memberships: [{ roleKey: 'super_admin' }] },
    { userId: 'u_cz', email: 'z@x.test', name: 'Zoe Cliente', memberships: [{ roleKey: 'member' }] },
    { userId: 'u_ca', email: 'a@x.test', name: 'Ana Cliente', memberships: [{ roleKey: 'member' }] },
    { userId: 'u_cb', email: 'b@x.test', name: 'Beatriz Coach', memberships: [{ roleKey: 'coach' }] },
    { userId: 'u_cc', email: 'c@x.test', name: 'Carlos Coach', memberships: [{ roleKey: 'coach' }] },
    { userId: 'u_desk', email: 'd@x.test', name: 'Camilo Desk', memberships: [{ roleKey: 'front_desk' }] },
    { userId: 'u_adm', email: 'adm@x.test', name: 'Mateo Admin', memberships: [{ roleKey: 'administrator' }, { roleKey: 'super_admin' }] },
  ] };
  const PERSON = { u_super: 'p_super', u_cz: 'p_cz', u_ca: 'p_ca', u_cb: 'p_cb', u_cc: 'p_cc', u_desk: 'p_desk', u_adm: 'p_adm' };
  const NAME = Object.fromEntries(DIRECTORY.users.map((u) => [u.userId, u.name]));
  const fakeRead = (calls, { failDirectory = false } = {}) => async (method, path, body) => {
    calls.push(`${method} ${path}${body ? ` ${body.entity}` : ''}`);
    if (method !== 'GET' && !(method === 'POST' && path === '/query')) throw new Error('a write');
    if (path === '/admin/users') { if (failDirectory) throw Object.assign(new Error('x'), { code: 'forbidden' }); return DIRECTORY; }
    const values = (f) => !f ? [] : [...(f.and ?? [])].flatMap(values).concat(f.value !== undefined && f.field !== 'active' ? [].concat(f.value) : []);
    if (body.entity === 'person') return { data: values(body.filter).filter((u) => PERSON[u]).map((u) => ({ id: PERSON[u], data: { name: NAME[u], user: u } })) };
    if (body.entity === 'coach') return { data: [{ id: 'co_c', data: { person: 'p_cc', active: true } }].filter((c) => values(body.filter).includes(c.data.person)) };
    return { data: [] };
  };
  await test('people: per role, the same person view-as samples; the directory is read once', async () => {
    const calls = [];
    const people = await m.loadHubPeople(fakeRead(calls), 'u_super');
    assert.equal(people.customer?.name, 'Ana Cliente', 'first member by name');
    assert.equal(people.teacher?.name, 'Carlos Coach', 'the active coach before the inactive one who sorts first');
    assert.equal(people.front_desk?.name, 'Camilo Desk');
    assert.equal(people.admin?.name, 'Mateo Admin');
    assert.equal(people.maintenance, null, 'nobody holds it: null, nobody invented');
    assert.equal(calls.filter((c) => c.startsWith('GET /admin/users')).length, 1, calls.join(' | '));
    assert.ok(calls.every((c) => c.startsWith('GET ') || c.startsWith('POST /query')), 'reads only');
    for (const role of m.VIEWABLE_ROLES) {
      const alone = await m.loadViewAsSample(role, fakeRead([]), 'u_super');
      assert.deepEqual(people[role], alone, role);
    }
  });
  await test('people: the viewer is never their own sample, and super admin and public are not listed', async () => {
    const people = await m.loadHubPeople(fakeRead([]), 'u_adm');
    assert.equal(people.admin, null);
    assert.ok(!('super_admin' in people) && !('public' in people));
  });
  await test('people: a failed directory read is a failure per role, not "nobody"', async () => {
    const people = await m.loadHubPeople(fakeRead([], { failDirectory: true }), 'u_super');
    assert.deepEqual(people.customer, { error: 'forbidden' });
  });
  await test('people: first names for "Entrar como {name}"', () => {
    assert.equal(m.firstName('Ana Cliente'), 'Ana');
    assert.equal(m.firstName('  Carlos  '), 'Carlos');
    assert.equal(m.firstName(''), '');
  });

  // ── Report a problem ──────────────────────────────────────────────────────────────────────────────────────────
  await test('report: the forms module\'s problem_report submission, in its shape (keys summary, details, route, viewing_as)', () => {
    assert.equal(m.PROBLEM_REPORT_PATH, '/forms/problem_report/submissions');
    const body = m.problemReportBody({ email: 'super@x.test', summary: '  El botón no responde ', details: 'Paso 1\nPaso 2', route: '#/hub', viewingAs: null });
    assert.deepEqual(body, { email: 'super@x.test', answers: { summary: 'El botón no responde', details: 'Paso 1\nPaso 2', route: '#/hub' }, placement: 'hub' });
    const viewing = m.problemReportBody({ email: 'super@x.test', summary: 'Resumen ok', details: '', route: '#/app', viewingAs: 'customer' });
    assert.deepEqual(viewing.answers, { summary: 'Resumen ok', route: '#/app', viewing_as: 'customer' }, 'empty values are not sent');
    assert.deepEqual(Object.keys(body).sort(), ['answers', 'email', 'placement'], 'no other key (the route answers 400 otherwise)');
  });
  await test('report: validation (summary 3 to 120 characters, one line; details at most 2000) and control characters', () => {
    assert.deepEqual(m.problemReportErrors('ab', ''), { summary: true, details: false });
    assert.deepEqual(m.problemReportErrors('x'.repeat(121), ''), { summary: true, details: false });
    assert.deepEqual(m.problemReportErrors('Un resumen', 'x'.repeat(2001)), { summary: false, details: true });
    assert.deepEqual(m.problemReportErrors('Un resumen', ''), { summary: false, details: false });
    assert.deepEqual(m.problemReportErrors('Un\nresumen', ''), { summary: true, details: false }, 'the summary is one line');
    const body = m.problemReportBody({ email: 'a@x.test', summary: 'Hola\u0000 mundo', details: 'a\u0007b\tc\nd', route: '#/hub', viewingAs: null });
    assert.equal(body.answers.summary, 'Hola mundo');
    assert.equal(body.answers.details, 'ab\tc\nd', 'tabs and line breaks stay, other control characters go (the module refuses them)');
  });
} finally {
  await rm(scratch, { recursive: true, force: true });
}
console.log(`\nhub production: ${passed} passed, ${failures} failed`);
if (failures) { console.error(`hub production failed (${failures})`); process.exit(1); }
console.log(`hub production passed (${passed})`);
