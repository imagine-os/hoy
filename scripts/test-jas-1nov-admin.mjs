// Hoy, Jas's 1 Nov acceptance walkthrough, lane A (administration and front desk): the named rules behind the screens,
// on the production build's code (esbuild, `__HOY_BUILD__ = production`) and, where a write is involved, the real
// CompanyOSProvider against a small fake Company OS. Fictional data only; no network, no browser.
// The rows are the real Company OS `/query` shape `{ id, data: {…fields}, orgUnitId, createdAt, updatedAt }`
// (Company OS integration guide §1), never flat.
// The screens themselves are checked in the browser by scripts/test-jas-1nov-admin-ui.mjs.
// Run: node scripts/test-jas-1nov-admin.mjs
import { build } from 'esbuild';
import assert from 'node:assert/strict';
import { cosFilter } from './lib/cos-filter.mjs';

let failures = 0, passed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log(`ok   ${name}`); }
  catch (e) { failures++; console.log(`FAIL ${name}\n     ${String(e?.stack ?? e).split('\n').slice(0, 3).join('\n     ')}`); }
}

const values = new Map();
globalThis.localStorage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, String(v)), removeItem: (k) => values.delete(k) };
globalThis.sessionStorage = globalThis.localStorage;

/** `src/app/registry.ts` uses Vite's `import.meta.glob`; the shell test needs only its route list, so it gets a stub. */
const stubRegistry = {
  name: 'stub-registry',
  setup(b) {
    b.onResolve({ filter: /\/registry$/ }, (args) => (args.importer.includes('/src/app/') ? { path: 'registry-stub', namespace: 'stub' } : undefined));
    b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export const getRoutes = () => []; export const getStrings = () => []; export const getRedirects = () => [];', loader: 'js' }));
  },
};
const ENTRIES = {
  CompanyOSProvider: "export { CompanyOSProvider } from './src/data/companyos/CompanyOSProvider';",
  refusals: "export { refusalCopy, hasRefusalCopy } from './src/data/companyos/refusals';",
  cosRows: "export * from './src/modules/staff/desk/useCos';",
  deskSale: "export * from './src/modules/staff/desk/deskSale'; export { deskStrings } from './src/modules/staff/desk/strings'; export { assessLiveTrial } from './src/data/trialEligibility';",
  // settings.ts sits in an import cycle that the app enters through the data layer: load that first, as the app does.
  instructions: "import './src/data/MockProvider'; export * from './src/modules/admin/paymentInstructions'; export { mergeSettings } from './src/modules/admin/settings';",
  expenses: "import './src/data/MockProvider'; export { runExpenseCommand } from './src/modules/admin/expenseLedger';",
  launchCos: "export { KNOWN_CODES, refusalKey } from './src/modules/transfers/launch/cos'; export { payLaunchStrings } from './src/modules/transfers/launch/strings';",
  products: "export * from './src/modules/products/launch/productMaster';",
  schedule: "export { liveScheduleStrings } from './src/modules/classSchedule/live/strings';",
  staffStrings: "export { strings } from './src/modules/staff/strings';",
  core: "export { coreStrings } from './src/i18n/core';",
  shell: "export { withShell } from './src/app/shells'; export { RouteErrorBoundary, RouteBoundary, routeBoundaryElement, isChunkLoadError, retryKind, homeKind } from './src/components/organism/RouteErrorBoundary/RouteErrorBoundary';",
};
/** Each module bundled on its own (production build), so one missing piece fails only its own tests. */
async function load(contents) {
  try {
    const out = await build({
      stdin: { contents, resolveDir: process.cwd(), loader: 'ts' },
      bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent', jsx: 'automatic', plugins: [stubRegistry],
      loader: { '.jpg': 'empty', '.png': 'empty', '.webp': 'empty', '.svg': 'empty', '.css': 'empty', '.md': 'text' },
      define: { 'import.meta.env': '{"VITE_HOY_BUILD":"production","DEV":false,"PROD":true}', __HOY_BUILD__: '"production"' },
    });
    return await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
  } catch (e) { return { __error: String(e.message).split('\n').slice(0, 3).join(' ') }; }
}
const m = Object.fromEntries(await Promise.all(Object.entries(ENTRIES).map(async ([k, c]) => [k, await load(c)])));
/** The review build (MockProvider), for what must stay as it was there. */
async function loadReview(contents) {
  try {
    const out = await build({
      stdin: { contents, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent', jsx: 'automatic',
      loader: { '.jpg': 'empty', '.png': 'empty', '.webp': 'empty', '.svg': 'empty', '.css': 'empty', '.md': 'text' },
      define: { 'import.meta.env': '{"VITE_HOY_BUILD":"review","DEV":false,"PROD":true}', __HOY_BUILD__: '"review"' },
    });
    return await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
  } catch (e) { return { __error: String(e.message).split('\n').slice(0, 3).join(' ') }; }
}
m.review = await loadReview("export { MockProvider } from './src/data/MockProvider'; export { runExpenseCommand } from './src/modules/admin/expenseLedger'; export { dateKey } from './src/i18n/format';");
const need = (k) => { if (m[k].__error) throw new Error(`does not build (${k}): ${m[k].__error}`); return m[k]; };

/** A `/query` row exactly as Company OS returns it. */
const rec = (id, data, at = '2026-10-20T15:00:00.000Z') => ({ id, data, orgUnitId: null, createdAt: at, updatedAt: at });
const studioToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const shiftDay = (day, n) => { const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const has = (code) => (e) => e?.code === code || String(e?.message ?? e).includes(code);

// ── a small fake Company OS: /me, /query, /batch and POST /api/expense, with ADR 0040 key replay ─────────────────────
const json = (status, body) => new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
function fakeCos({ userId, roleKeys, isSuperAdmin = false, people = [], refuseBatch = null }) {
  const db = { person: new Map(people.map((p) => [p.id, p])), setting: new Map(), expense: new Map() };
  const calls = [], keys = new Map();
  let seq = 0;
  const put = (entity, data) => { const id = `${entity}_${++seq}`; db[entity].set(id, rec(id, { ...data })); return db[entity].get(id); };
  // Company OS filters, strictly: an unknown operator is a 400, never "every row" (scripts/lib/cos-filter.mjs).
  const match = (r, f) => cosFilter(r, f, userId);
  async function fetch(url, init = {}) {
    const u = new URL(url, 'http://hoy.test/'), method = init.method ?? 'GET', body = init.body ? JSON.parse(init.body) : undefined;
    const key = init.headers?.['idempotency-key'] ?? init.headers?.['Idempotency-Key'];
    if (u.pathname.endsWith('app-config.json')) return json(200, { tenant: 'hoy', apiBase: '/api/cos' });
    const path = u.pathname.replace('/api/cos/t/hoy', '');
    calls.push({ method, path, body: structuredClone(body), key });
    if (key && method !== 'GET' && keys.has(key)) { const prior = keys.get(key); return JSON.stringify(prior.body) === JSON.stringify(body) ? json(prior.status, prior.response) : json(409, { error: 'idempotency_conflict' }); }
    const answer = (status, response) => { if (key && status < 300) keys.set(key, { body, status, response }); return json(status, response); };
    if (path === '/me') return json(200, { user: { id: userId, name: '', email: `${userId}@example.test` }, roleKeys, caps: [], isSuperAdmin });
    if (path === '/query') {
      try { return json(200, { data: [...(db[body.entity]?.values() ?? [])].filter((r) => match(r, body.filter)).slice(0, body.limit ?? 100) }); }
      catch (e) { return json(e.status ?? 400, { error: e.code ?? 'invalid_query', message: e.message }); }
    }
    if (path === '/batch') {
      if (refuseBatch) return json(refuseBatch.status, { error: refuseBatch.code });
      const ids = body.ops.map((op) => {
        if (op.op === 'create') return put(op.entity, op.data).id;
        Object.assign(db[op.entity].get(op.id).data, op.data); return op.id;
      });
      return answer(200, { ids });
    }
    if (path === '/api/expense' && method === 'POST') {
      // Company OS expenses rules (checkExpense): `paid_on`, when set, is a date no later than today in the tenant's timezone.
      if (body.paid_on && body.paid_on > studioToday()) return json(422, { error: 'invalid_date', message: "paid_on can't be after today" });
      return answer(201, { data: put('expense', body) });
    }
    return json(404, { error: 'not_found' });
  }
  return { db, calls, fetch };
}
const provider = (api) => new (need('CompanyOSProvider').CompanyOSProvider)({ fetch: api.fetch, config: { tenant: 'hoy', apiBase: '/api/cos' }, getToken: async () => 'tok', retryDelayMs: 1, sleep: async () => {} });

// ── ADM-01 / ADM-02: Class schedule reads `/query` rows, whose fields sit under `data` ───────────────────────────────
await test('ADM-01 a wrapped /query row reads as its fields (schedule: title, weekday, time, capacity, active)', () => {
  const { flatRows } = need('cosRows');
  const [s] = flatRows([rec('sch_1', { title: 'Pulso mañana', weekday: 1, start_time: '07:00', capacity: 16, active: true, resource: 'res_1', coach: 'co_1' })]);
  assert.equal(s.id, 'sch_1'); assert.equal(s.title, 'Pulso mañana'); assert.equal(s.weekday, 1); assert.equal(s.start_time, '07:00');
  assert.equal(s.capacity, 16); assert.equal(s.active, true); assert.equal(s.resource, 'res_1'); assert.equal(s.coach, 'co_1');
  assert.equal(s.created_at, '2026-10-20T15:00:00.000Z');
});
await test('ADM-01 a coach row keeps its included person ({ id, name }) after unwrapping', () => {
  const [c] = need('cosRows').flatRows([rec('co_1', { person: { id: 'per_1', name: 'Ana Fictional' }, kind: 'teacher', active: true })]);
  assert.deepEqual(c.person, { id: 'per_1', name: 'Ana Fictional' }); assert.equal(c.active, true);
});
await test('ADM-02 an occurrence row keeps status, starts_at, booked_count and capacity after unwrapping', () => {
  const [o] = need('cosRows').flatRows([rec('oc_1', { title: 'Pulso', starts_at: '2026-11-03T12:00:00.000Z', status: 'cancelled', booked_count: 3, capacity: 16 })]);
  assert.equal(o.status, 'cancelled'); assert.equal(o.starts_at, '2026-11-03T12:00:00.000Z'); assert.equal(o.booked_count, 3); assert.equal(o.capacity, 16);
});
await test('ADM-01 hostile: a field named id inside data never replaces the row id; an aggregate (flat) row is unchanged', () => {
  const { flatRows, fieldsOf } = need('cosRows');
  assert.equal(flatRows([rec('sch_1', { id: 'other', title: 'X' })])[0].id, 'sch_1');
  assert.deepEqual(fieldsOf({ lot: 'lot_1', left: 3 }), { lot: 'lot_1', left: 3 });
});
await test('ADM-01 copy: a separately paid class is returned to the balance when the studio cancels (no "contact them")', () => {
  const s = need('schedule').liveScheduleStrings;
  for (const k of ['live.cancel.body', 'live.cancel.done']) {
    assert.match(s[k].es, /saldo/, `${k} es`); assert.match(s[k].en, /balance/, `${k} en`);
    assert.doesNotMatch(s[k].es, /reprogramar|escríbele|Escribe a quien/i, `${k} es`); assert.doesNotMatch(s[k].en, /reschedule|contact/i, `${k} en`);
  }
});

// ── route-level error boundary ───────────────────────────────────────────────────────────────────────────────────
await test('error boundary: every shell wraps the page in RouteErrorBoundary, inside the shell (the menu stays)', () => {
  const { withShell, RouteErrorBoundary } = need('shell');
  const page = { type: 'p', props: { children: 'page' } };
  for (const route of [{ surface: 'admin', layout: 'desktop' }, { surface: 'staff' }, { surface: 'customer', layout: 'mobile' }]) {
    const el = withShell({ path: '/x', roles: ['admin'], spec: {}, element: null, ...route }, page);
    assert.notEqual(el.type, RouteErrorBoundary, `${route.surface}: the boundary is not around the shell`);
    assert.equal(el.props.children.type, RouteErrorBoundary, `${route.surface}: the page sits in the boundary`);
  }
});
await test('error boundary: its card copy exists in es and en', () => {
  const c = need('core').coreStrings;
  for (const k of ['core.routeError.title', 'core.routeError.body', 'core.routeError.home']) { assert.ok(c[k]?.es, `${k} es`); assert.ok(c[k]?.en, `${k} en`); }
});

await test('error boundary: Retry reloads the page after a failed page download (the lazy chunk cache keeps the failure), else remounts', () => {
  const { isChunkLoadError, retryKind } = need('shell');
  for (const e of [new TypeError('Failed to fetch dynamically imported module: http://127.0.0.1/assets/pages-abc.js'), new TypeError('error loading dynamically imported module'), new TypeError('Importing a module script failed.'), new Error('Unable to preload CSS for /assets/pages-abc.css'), Object.assign(new Error('Loading chunk 12 failed.'), { name: 'ChunkLoadError' })]) {
    assert.equal(isChunkLoadError(e), true, e.message); assert.equal(retryKind(e), 'reload', e.message);
  }
  for (const e of [new RangeError('Invalid time value'), new TypeError("Cannot read properties of null (reading 'split')"), null, 'oops']) {
    assert.equal(isChunkLoadError(e), false, String(e)); assert.equal(retryKind(e), 'remount', String(e));
  }
});
await test('error boundary: Home remounts the page when the crashed page is the role\'s home, else it navigates', () => {
  const { homeKind } = need('shell');
  assert.equal(homeKind('/admin', '/admin'), 'remount');
  assert.equal(homeKind('/staff', '/staff'), 'remount');
  assert.equal(homeKind('/admin/class-schedule', '/admin'), 'navigate');
});

// Review round 1: the boundary used to be keyed by the path, so every path change remounted the page and dropped its
// state (BookedPage's notice after /app/booking/:id/change → /app/booking/:id, the Settings tabs, the schedule views).
// React keeps a component's instance while its type and key stay the same; the boundary resets only after a failure.
/** A RouteBoundary instance driven the way React drives it: new props → componentDidUpdate(prevProps, prevState). */
function boundary(resetKey, children = { type: 'p', props: {} }) {
  const { RouteBoundary } = need('shell');
  assert.equal(typeof RouteBoundary, 'function', 'RouteBoundary is exported');
  const b = new RouteBoundary({ resetKey, children, fallback: (error, remount) => { b.remountFn = remount; return 'card'; } });
  b.updates = 0;
  b.setState = (s) => { b.updates++; b.state = { ...b.state, ...(typeof s === 'function' ? s(b.state, b.props) : s) }; };
  b.fail = (e) => { b.state = { ...b.state, ...RouteBoundary.getDerivedStateFromError(e) }; };
  /** A re-render with a new path; `throws` = the page throws during that very render. */
  b.next = (key, throws = null) => {
    const prevProps = b.props, prevState = { ...b.state };
    b.props = { ...b.props, resetKey: key };
    if (throws) b.fail(throws);
    b.componentDidUpdate?.(prevProps, prevState);
  };
  return b;
}
await test('error boundary r1: the boundary carries the path as resetKey, never as its key (same type on every path)', () => {
  const { RouteBoundary, routeBoundaryElement } = need('shell');
  assert.equal(typeof routeBoundaryElement, 'function', 'routeBoundaryElement is exported');
  const page = { type: 'p', props: {} };
  const a = routeBoundaryElement('/app/booking/bk_1/change', '/app', page), b = routeBoundaryElement('/app/booking/bk_1', '/app', page);
  assert.equal(a.type, RouteBoundary); assert.equal(b.type, a.type);
  assert.equal(a.key, null, 'no key from the path: React keeps the page instance'); assert.equal(b.key, null);
  assert.equal(a.props.resetKey, '/app/booking/bk_1/change'); assert.equal(b.props.resetKey, '/app/booking/bk_1');
  // The page loads under its own Suspense inside the boundary (a failed download is caught there): an unkeyed wrapper
  // that hands the same page through.
  assert.equal(b.props.children.key, null, 'the Suspense wrapper has no key');
  assert.equal(String(b.props.children.type), 'Symbol(react.suspense)', 'the wrapper is a Suspense');
  assert.equal(b.props.children.props.children, page, 'the page is passed through as it is');
});
await test('error boundary r1: a working page is not reset or re-wrapped on a path change (no state update at all)', () => {
  const page = { type: 'p', props: {} };
  const b = boundary('/admin/settings/studio', page);
  assert.equal(b.render(), page);
  for (const key of ['/admin/settings/payments', '/admin/settings/hours', '/app/schedule', '/app/schedule/week']) b.next(key);
  assert.equal(b.updates, 0, 'no setState'); assert.equal(b.state.failed, false);
  assert.equal(b.render(), page, 'the same children, unwrapped');
});
await test('error boundary r1: after a failure, a path change starts clean (the new page renders)', () => {
  const page = { type: 'p', props: {} };
  const b = boundary('/admin/class-schedule', page);
  b.fail(new RangeError('Invalid time value'));
  assert.equal(b.render(), 'card');
  b.next('/admin');
  assert.equal(b.state.failed, false); assert.equal(b.state.error, null);
  assert.equal(b.render(), page);
});
await test('error boundary r1: a failure stays on its own path; a page that throws on arrival is not retried in a loop', () => {
  const b = boundary('/admin/class-schedule');
  b.fail(new RangeError('Invalid time value'));
  b.next('/admin/class-schedule');
  assert.equal(b.state.failed, true, 'same path: the card stays');
  const c = boundary('/admin');
  c.next('/admin/class-schedule', new RangeError('Invalid time value'));
  assert.equal(c.state.failed, true, 'failed in the render that changed the path: the card shows, no reset');
  assert.equal(c.render(), 'card');
});
await test('error boundary r1: Retry and Home still render the page again (the remount the card is given)', () => {
  const page = { type: 'p', props: {} };
  const b = boundary('/admin', page);
  b.fail(new TypeError("Cannot read properties of null (reading 'split')"));
  assert.equal(b.render(), 'card');
  assert.equal(typeof b.remountFn, 'function');
  b.remountFn();
  assert.equal(b.state.failed, false); assert.equal(b.render(), page);
});

// ── ADM-04: the payment settings save is authorised from the session's /me roles ───────────────────────────────────
const before = () => need('instructions').mergeSettings({}).payments;
await test('ADM-04 a super_admin login with no person record saves the payment settings (one keyed /batch)', async () => {
  const api = fakeCos({ userId: 'usr_sa', roleKeys: ['super_admin'], isSuperAdmin: true }), p = provider(api);
  const b = before(), after = { ...b, bankName: 'FICTIONAL BANK', accountNumber: 'TEST-0001', accountHolder: 'FICTIONAL HOLDER', breBKey: '@TEST' };
  const res = await need('instructions').savePaymentSettings(p, { actorId: 'usr_sa', role: 'super_admin', roles: ['super_admin'], requestId: 'req-sa-1', before: b, after }, { isCurrent: () => true });
  assert.deepEqual(res, after);
  const batches = api.calls.filter((c) => c.path === '/batch');
  assert.equal(batches.length, 1); assert.ok(batches[0].key, 'keyed');
  assert.equal([...api.db.setting.values()].find((r) => r.data.key === 'studio_settings')?.data.value.payments.bankName, 'FICTIONAL BANK');
});
await test('ADM-04 an Administration login (roles from /me) saves without a person record too', async () => {
  const api = fakeCos({ userId: 'usr_adm', roleKeys: ['administrator', 'super_admin'], isSuperAdmin: true }), p = provider(api);
  const b = before();
  await need('instructions').savePaymentSettings(p, { actorId: 'usr_adm', role: 'admin', roles: ['admin'], requestId: 'req-adm-1', before: b, after: { ...b, bankName: 'FICTIONAL BANK 2' } }, { isCurrent: () => true });
  assert.equal(api.calls.filter((c) => c.path === '/batch').length, 1);
});
await test('ADM-04 a front_desk login is refused with payment_settings_denied before anything is sent, and the code has copy', async () => {
  const api = fakeCos({ userId: 'usr_desk', roleKeys: ['front_desk'] }), p = provider(api);
  const b = before();
  await assert.rejects(need('instructions').savePaymentSettings(p, { actorId: 'usr_desk', role: 'front_desk', roles: ['front_desk'], requestId: 'req-d-1', before: b, after: { ...b, bankName: 'X' } }, { isCurrent: () => true }), has('payment_settings_denied'));
  assert.equal(api.calls.filter((c) => c.method !== 'GET' && c.path !== '/query').length, 0);
  const { hasRefusalCopy, refusalCopy } = need('refusals');
  assert.ok(hasRefusalCopy('payment_settings_denied'));
  assert.match(refusalCopy('payment_settings_denied', 'es'), /Administración/); assert.match(refusalCopy('payment_settings_denied', 'en'), /Administration/);
});
await test('ADM-04 hostile: a view-as session (roles = the viewed role only) cannot save as the real super admin', async () => {
  const api = fakeCos({ userId: 'usr_sa', roleKeys: ['super_admin'], isSuperAdmin: true }), p = provider(api);
  const b = before();
  await assert.rejects(need('instructions').savePaymentSettings(p, { actorId: 'usr_sa', role: 'super_admin', roles: ['front_desk'], requestId: 'req-va-1', before: b, after: { ...b, bankName: 'X' } }, { isCurrent: () => true }), has('payment_settings_denied'));
  assert.equal(api.calls.filter((c) => c.path === '/batch').length, 0);
});
await test('ADM-04 a refused save keeps its code: Company OS forbidden → its copy, an app code → its copy, else the generic line', async () => {
  const { saveFailureCode } = need('instructions');
  assert.equal(saveFailureCode(Object.assign(new Error('x'), { code: 'forbidden' })), 'forbidden');
  assert.equal(saveFailureCode(new Error('payment_settings_denied')), 'payment_settings_denied');
  assert.equal(saveFailureCode(new Error('fictional network blip')), '');
  for (const c of ['payment_settings_denied', 'payment_settings_stale', 'payment_settings_invalid', 'payment_settings_disconnected']) assert.ok(need('refusals').hasRefusalCopy(c), c);
  // A batch Company OS refuses reaches the screen with its code.
  const api = fakeCos({ userId: 'usr_sa', roleKeys: ['super_admin'], isSuperAdmin: true, refuseBatch: { status: 403, code: 'forbidden' } }), p = provider(api);
  const b = before();
  const e = await need('instructions').savePaymentSettings(p, { actorId: 'usr_sa', role: 'super_admin', roles: ['super_admin'], requestId: 'req-f-1', before: b, after: { ...b, bankName: 'X' } }, { isCurrent: () => true }).then(() => null, (x) => x);
  assert.equal(saveFailureCode(e), 'forbidden');
});

// ── PRO-04 desk part: the trial is greyed out, with the reason, for someone who already used it ─────────────────────
const plans = [{ id: 'prod_trial', slug: 'trial', kind: 'trial' }, { id: 'prod_pack', slug: 'pack_8', kind: 'pack' }];
const lot = (source, plan_id = null) => ({ id: `l_${source}`, tenant_id: 't', created_at: '', updated_at: '', user_id: 'p1', delta: 1, reason: 'purchase', expires_at: null, purchase_ledger_id: null, plan_id, lot_source: source });
const pay = (status, plan_id = 'prod_trial') => ({ id: `pay_${status}`, tenant_id: 't', created_at: '', updated_at: '', user_id: 'p1', plan_id, amount: 30000, amount_paid: null, currency: 'COP', method: 'cash', provider: 'manual', status, paid_at: null, note: null });
await test('PRO-04 desk: the trial is unavailable (trial_used) after a trial lot, a pending trial payment or an approved one', () => {
  const { deskTrialBlock, assessLiveTrial } = need('deskSale');
  for (const [label, input] of [['lot', { ledger: [lot('trial')], payments: [] }], ['pending', { ledger: [], payments: [pay('pending')] }], ['approved', { ledger: [], payments: [pay('approved')] }]]) {
    const a = assessLiveTrial({ ...input, plans });
    assert.equal(deskTrialBlock(plans[0], a), 'trial_used', label);
    assert.equal(deskTrialBlock(plans[1], a), null, `${label}: a pack stays on sale`);
  }
});
await test('PRO-04 desk: still offered to a new customer, a declined trial payment, a walk-in (no person) and while the check is unknown', () => {
  const { deskTrialBlock, assessLiveTrial } = need('deskSale');
  assert.equal(deskTrialBlock(plans[0], assessLiveTrial({ ledger: [], payments: [], plans })), null);
  assert.equal(deskTrialBlock(plans[0], assessLiveTrial({ ledger: [lot('purchase', 'prod_pack')], payments: [pay('declined')], plans })), null);
  assert.equal(deskTrialBlock(plans[0], null), null, 'no assessment: the server decides (trial_used)');
  assert.equal(deskTrialBlock({ id: 'x', slug: 'trial' }, { status: 'trial_used', reasons: [] }), 'trial_used', 'by key too');
  const s = need('deskSale').deskStrings;
  assert.ok(s['desk.sale.trialUsed']?.es && s['desk.sale.trialUsed']?.en, 'the reason has es and en copy');
});

// ── REC-06: "Sell and check in" lists only today's classes that haven't started ─────────────────────────────────────
await test('REC-06 sell and check in: a class that has started (or starts this minute) is not listed; a later one is', () => {
  const { notStarted } = need('deskSale');
  const now = Date.parse('2026-11-02T14:30:00Z');
  const s = (id, starts_at) => ({ session: { id, starts_at } });
  const list = [s('past', '2026-11-02T12:00:00Z'), s('running', '2026-11-02T14:00:00Z'), s('now', '2026-11-02T14:30:00Z'), s('later', '2026-11-02T16:00:00Z')];
  assert.deepEqual(notStarted(list, now).map((x) => x.session.id), ['later']);
  assert.deepEqual(notStarted([s('bad', 'not-a-date')], now), [], 'hostile: an unreadable start is not offered');
});

await test('REC-06 evening in Bogotá (UTC already tomorrow): at 20:30 a 19:00 class is gone and a 21:00 one is offered', () => {
  const { notStarted } = need('deskSale');
  const now = Date.parse('2026-11-03T01:30:00Z'); // 2 Nov, 20:30 in Bogotá
  const list = [{ session: { id: 'c19', starts_at: '2026-11-03T00:00:00Z' } }, { session: { id: 'c21', starts_at: '2026-11-03T02:00:00Z' } }];
  assert.deepEqual(notStarted(list, now).map((x) => x.session.id), ['c21']);
});
await test('REC-06 a class chosen for check-in that has since started is no longer the choice (nothing is sent for it)', () => {
  const { chosenSession, notStarted } = need('deskSale');
  const list = [{ session: { id: 'c19', starts_at: '2026-11-02T19:00:00Z' } }, { session: { id: 'c21', starts_at: '2026-11-02T21:00:00Z' } }];
  assert.equal(chosenSession(notStarted(list, Date.parse('2026-11-02T18:00:00Z')), 'c19'), 'c19', 'still to come: kept');
  assert.equal(chosenSession(notStarted(list, Date.parse('2026-11-02T19:05:00Z')), 'c19'), '', 'started while the form was open: dropped');
  assert.equal(chosenSession(list, ''), '');
  assert.equal(chosenSession(list, 'not_today'), '', 'hostile: a ?session= for another class is not chosen');
});

await test('REC-06 r1: a chosen class that has started is named on screen (es and en note); none, a later class or another day\'s is not', () => {
  const { startedChoice, notStarted, deskStrings } = need('deskSale');
  assert.equal(typeof startedChoice, 'function', 'startedChoice is exported');
  const all = [{ session: { id: 'c19', starts_at: '2026-11-02T19:00:00Z' } }, { session: { id: 'c21', starts_at: '2026-11-02T21:00:00Z' } }];
  const offered = notStarted(all, Date.parse('2026-11-02T19:05:00Z'));
  assert.equal(startedChoice(all, offered, 'c19'), true, 'chosen, then started: the note shows');
  assert.equal(startedChoice(all, offered, 'c21'), false, 'still offered: no note');
  assert.equal(startedChoice(all, offered, ''), false, 'no class chosen (sell without check-in): no note');
  assert.equal(startedChoice(all, offered, 'not_today'), false, 'hostile: a ?session= for another day is not "started"');
  const s = deskStrings['desk.sale.sessionStarted'];
  assert.ok(s?.es && s?.en, 'es and en copy');
  assert.match(s.es, /empezó/); assert.match(s.es, /sin check-in/); assert.match(s.en, /started/); assert.match(s.en, /without check-in/);
});

// ── FIN-01: the desk expense keeps the chosen paid-on date; the server's rule (not after today) is the only limit ──────
const deskDraft = (paid_on) => ({ kind: 'variable', category: 'supplies', concept: 'Jabón ficticio', amount: 20000, incurred_on: paid_on, paid_on, method: 'cash', vendor: null, note: null });
await test('FIN-01 a front desk expense paid on an earlier day is sent with that day', async () => {
  const api = fakeCos({ userId: 'usr_desk', roleKeys: ['front_desk'] }), p = provider(api);
  const day = shiftDay(studioToday(), -3);
  await need('expenses').runExpenseCommand(p, { type: 'create', requestId: 'req-exp-1', id: 'exp_desk_1', actorId: 'usr_desk', role: 'front_desk', draft: deskDraft(day) });
  const post = api.calls.find((c) => c.path === '/api/expense' && c.method === 'POST');
  assert.ok(post, 'POST /api/expense'); assert.equal(post.body.paid_on, day); assert.equal(post.body.incurred_on, day);
});
await test('FIN-01 a future paid-on date is refused by Company OS (invalid_date), and the code has copy', async () => {
  const api = fakeCos({ userId: 'usr_desk', roleKeys: ['front_desk'] }), p = provider(api);
  const day = shiftDay(studioToday(), 2);
  await assert.rejects(need('expenses').runExpenseCommand(p, { type: 'create', requestId: 'req-exp-2', id: 'exp_desk_2', actorId: 'usr_desk', role: 'front_desk', draft: deskDraft(day) }), has('invalid_date'));
  assert.equal(api.calls.filter((c) => c.path === '/api/expense').length, 1, 'the app sent it: the server decides');
  assert.ok(need('refusals').hasRefusalCopy('invalid_date'));
});
await test('FIN-01 the desk expense copy names the paid-on date (no "paid today")', () => {
  const s = need('staffStrings').strings;
  assert.ok(s['staff.expense.paidOn']?.es && s['staff.expense.paidOn']?.en);
  for (const k of ['staff.expense.body', 'staff.expense.hint']) { assert.doesNotMatch(s[k].es, /\bhoy\b/i, k); assert.doesNotMatch(s[k].en, /\btoday\b/i, k); }
});

await test('FIN-01 review build (MockProvider): a future paid-on date is refused (invalid_date), as before', async () => {
  const r = m.review; if (r.__error) throw new Error(`does not build (review): ${r.__error}`);
  values.clear();
  const day = shiftDay(r.dateKey(new Date()), 1);
  await assert.rejects(r.runExpenseCommand(new r.MockProvider(), { type: 'create', requestId: 'req-mock-f', id: 'exp_mock_f', actorId: 'usr_desk', role: 'front_desk', draft: deskDraft(day) }), /invalid_date/);
});
await test('FIN-01 review build (MockProvider): today and an earlier paid-on date are recorded', async () => {
  const r = m.review; if (r.__error) throw new Error(`does not build (review): ${r.__error}`);
  for (const [i, day] of [r.dateKey(new Date()), shiftDay(r.dateKey(new Date()), -2)].entries()) {
    values.clear();
    const d = new r.MockProvider();
    const out = await r.runExpenseCommand(d, { type: 'create', requestId: `req-mock-${i}`, id: `exp_mock_${i}`, actorId: 'usr_desk', role: 'front_desk', draft: deskDraft(day) });
    assert.equal(out.created, 1); assert.equal(d.peek('expenses').find((e) => e.id === `exp_mock_${i}`)?.paid_on, day);
  }
});
await test('FIN-01 evening in Bogotá: the studio day, not the UTC one, is today (the default paid-on date)', () => {
  const r = m.review; if (r.__error) throw new Error(`does not build (review): ${r.__error}`);
  assert.equal(r.dateKey(new Date('2026-11-03T01:30:00Z')), '2026-11-02');
  assert.equal(r.dateKey(new Date('2026-11-03T04:59:00Z')), '2026-11-02');
  assert.equal(r.dateKey(new Date('2026-11-03T05:00:00Z')), '2026-11-03');
});
await test('test fakes: an unknown filter operator is refused (400), never "every row"; `in` takes one value and compares as strings', () => {
  const r = rec('x', { n: 5, s: 'a', e: '' });
  assert.throws(() => cosFilter(r, { field: 's', op: 'like', value: 'a' }), /unknown filter operator/);
  assert.equal(cosFilter(r, { field: 'n', op: 'in', value: ['5'] }), true);
  assert.equal(cosFilter(r, { field: 's', op: 'in', value: 'a' }), true);
  assert.equal(cosFilter(r, { field: 'e', op: 'in', value: [''] }), false);
  assert.equal(cosFilter(r, { field: 'missing', op: 'in', value: ['undefined'] }), false);
});

// ── PRO-02: product master refusal codes ─────────────────────────────────────────────────────────────────────────
await test('PRO-02 product_period_overlap and invalid_date are known codes with es and en copy (not the generic line)', () => {
  const { KNOWN_CODES, refusalKey, payLaunchStrings } = need('launchCos');
  for (const c of ['product_period_overlap', 'invalid_date']) {
    assert.ok(KNOWN_CODES.includes(c), c);
    assert.equal(refusalKey(c), `payLaunch.code.${c}`);
    assert.ok(payLaunchStrings[`payLaunch.code.${c}`]?.es && payLaunchStrings[`payLaunch.code.${c}`]?.en, c);
  }
});
await test('PRO-02 a product created today with a price starting today is in force today (regression pin)', () => {
  const { inForce } = need('products');
  const today = studioToday();
  const row = rec('prod_1', { key: 'pack_qa', name: 'Pack QA', kind: 'pack', price: 100000, credits: 4, active: true, valid_from: today, valid_until: null });
  assert.deepEqual(inForce([row], today).map((r) => r.id), ['prod_1']);
  assert.deepEqual(inForce([{ ...row, data: { ...row.data, valid_until: today } }], today).map((r) => r.id), ['prod_1'], 'ends today: still today');
});

// ── PAG-10: the payments report column ───────────────────────────────────────────────────────────────────────────
await test('PAG-10 the report column reads "Receipt no." / "N.º de nota"', () => {
  const s = need('launchCos').payLaunchStrings['payLaunch.report.col.number'];
  assert.deepEqual(s, { es: 'N.º de nota', en: 'Receipt no.' });
});

console.log(`\n${passed} passed, ${failures} failed`);
process.exitCode = failures ? 1 : 0;
