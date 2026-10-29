// F3 · Q-13 / M-09c on Company OS: the expense commands (desk entry and admin ledger) through the real CompanyOSProvider
// against a fake API that models the `expense` / `expense_template` entities (lane F5's fields): unknown fields and
// missing required fields are refused like the API (400), creates are idempotent by key (ADR 0040).
// Run: node scripts/test-expense-companyos.mjs
import { build } from 'esbuild';
import assert from 'node:assert/strict';

let failures = 0, passed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log(`ok   ${name}`); }
  catch (e) { failures++; console.log(`FAIL ${name}\n     ${e?.stack ?? e}`); }
}

const out = await build({
  stdin: { contents: "export * from './src/modules/admin/expenseLedger'; export { CompanyOSProvider } from './src/data/companyos/CompanyOSProvider'; export { dateKey } from './src/i18n/format';", resolveDir: process.cwd(), loader: 'ts' },
  bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent',
  loader: { '.jpg': 'empty', '.png': 'empty', '.webp': 'empty', '.svg': 'empty', '.md': 'text' },
  define: { 'import.meta.env': '{"VITE_HOY_BUILD":"production"}' },
});
const m = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));

/** The entity fields the app needs (the list handed to lane F5). `req`: required on create. */
const SCHEMA = {
  expense: {
    kind: { enum: ['fixed', 'variable'], req: true }, category: { enum: ['rent', 'utilities', 'internet', 'cleaning', 'software', 'insurance', 'supplies', 'maintenance', 'marketing', 'fees', 'other'], req: true },
    concept: { type: 'string', req: true }, amount: { type: 'integer', req: true }, incurred_on: { type: 'date', req: true }, paid_on: { type: 'date' },
    method: { enum: ['cash', 'transfer', 'card'], req: true }, vendor: { type: 'string' }, note: { type: 'string' }, template_id: { type: 'ref' },
  },
  expense_template: {
    concept: { type: 'string', req: true }, category: { enum: ['rent', 'utilities', 'internet', 'cleaning', 'software', 'insurance', 'supplies', 'maintenance', 'marketing', 'fees', 'other'], req: true },
    amount: { type: 'integer', req: true }, cadence: { enum: ['monthly', 'biweekly'], req: true }, day_of_month: { type: 'integer', req: true },
    vendor: { type: 'string' }, active: { type: 'boolean' }, note: { type: 'string' },
  },
};
function invalid(entity, data, create) {
  const s = SCHEMA[entity];
  if (!s) return null;
  for (const [k, v] of Object.entries(data)) {
    const f = s[k];
    if (!f) return `unknown field ${k}`;
    if (v === null || v === undefined) { if (f.req) return `${k} required`; continue; }
    if (f.enum && !f.enum.includes(v)) return `${k} not in enum`;
    if (f.type === 'integer' && !Number.isInteger(v)) return `${k} not integer`;
    if (f.type === 'string' && typeof v !== 'string') return `${k} not string`;
    if (f.type === 'boolean' && typeof v !== 'boolean') return `${k} not boolean`;
    if (f.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return `${k} not a date`;
  }
  if (create) for (const [k, f] of Object.entries(s)) if (f.req && data[k] == null) return `${k} required`;
  return null;
}

function fakeApi() {
  const db = new Map(), calls = [], keys = new Map();
  let lose = null, losses = 0;
  const table = (e) => { if (!db.has(e)) db.set(e, new Map()); return db.get(e); };
  const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  const put = (entity, data) => { const id = crypto.randomUUID(), at = new Date().toISOString(); const rec = { id, data: { ...data }, createdBy: 'user-desk', createdAt: at, updatedAt: at }; table(entity).set(id, rec); return rec; };
  async function handle(url, init = {}) {
    const u = new URL(url, 'http://hoy.test/'), method = init.method ?? 'GET', body = init.body ? JSON.parse(init.body) : undefined, key = init.headers?.['idempotency-key'];
    if (u.pathname === '/app-config.json') return json(200, { tenant: 'hoy', apiBase: '/api/cos' });
    const path = u.pathname.replace('/api/cos/t/hoy', '');
    calls.push({ method, path, body, key });
    if (path === '/me') return json(200, { user: { id: 'user-desk' }, roleKeys: ['front_desk'], caps: [] });
    if (path === '/query') {
      if (body.entity === 'person') return json(200, { data: [] });
      const rows = [...table(body.entity).values()].slice(body.offset ?? 0, (body.offset ?? 0) + (body.limit ?? 100));
      return json(200, { data: rows });
    }
    const run = () => {
      if (path === '/batch') {
        const ids = [];
        for (const [i, op] of body.ops.entries()) { const why = invalid(op.entity, op.data, true); if (why) return json(400, { error: 'validation', message: why, opIndex: i }); }
        for (const op of body.ops) ids.push(put(op.entity, op.data).id);
        return json(200, { ids });
      }
      const one = path.match(/^\/api\/([a-z_]+)(?:\/([^/]+))?$/);
      if (!one) return json(404, { error: 'not found' });
      const [, entity, id] = one;
      if (method === 'POST') { const why = invalid(entity, body, true); return why ? json(400, { error: 'validation', message: why }) : json(201, { data: put(entity, body) }); }
      const rec = table(entity).get(id);
      if (!rec) return json(404, { error: 'not found' });
      if (method === 'GET') return json(200, { data: rec });
      if (method === 'PATCH') { const why = invalid(entity, body, false); if (why) return json(400, { error: 'validation', message: why }); Object.assign(rec.data, body); return json(200, { data: rec }); }
      if (method === 'DELETE') { table(entity).delete(id); return new Response(null, { status: 204 }); }
    };
    let res;
    if (key && method === 'POST') {
      const prior = keys.get(key);
      if (prior) res = JSON.stringify(prior.body) === JSON.stringify(body) ? json(prior.status, prior.response) : json(409, { error: 'idempotency_conflict' });
      else { res = run(); if (res.ok) keys.set(key, { body, status: res.status, response: await res.clone().json() }); }
    } else res = run();
    if (lose === path && losses > 0) { if (--losses === 0) lose = null; throw new TypeError('fetch failed'); }
    return res;
  }
  return { db, calls, table, put, loseNext: (p, n = 1) => { lose = p; losses = n; }, fetch: handle };
}
const provider = (api) => new m.CompanyOSProvider({ fetch: api.fetch, getToken: async () => 'tok', retryDelayMs: 1, sleep: async () => {} });
const desk = { actorId: 'user-desk', role: 'front_desk' }, admin = { actorId: 'user-admin', role: 'admin' };
const today = m.dateKey(new Date());
const deskDraft = { kind: 'variable', category: 'supplies', concept: 'Jabón', amount: 18000, incurred_on: today, paid_on: today, method: 'cash', vendor: null, note: null };

await test('desk entry (S-11): one keyed POST /api/expense with the entity fields; a lost answer is replayed, not written twice', async () => {
  const api = fakeApi(), p = provider(api);
  api.loseNext('/api/expense', 3); // every transport attempt loses its answer (the server did the work)
  const cmd = { ...desk, type: 'create', requestId: crypto.randomUUID(), id: 'exp_desk_x', draft: deskDraft };
  await assert.rejects(m.runExpenseCommand(p, cmd), (e) => e.ambiguous);
  const res = await m.runExpenseCommand(p, cmd);
  assert.equal(api.table('expense').size, 1, 'one record');
  const posts = api.calls.filter((c) => c.path === '/api/expense');
  assert.equal(posts.length, 4, 'three attempts in the transport (same key), then the user retry under the same key');
  assert.ok(posts.every((c) => c.key === cmd.requestId));
  assert.deepEqual(posts[0].body, { kind: 'variable', category: 'supplies', concept: 'Jabón', amount: 18000, incurred_on: today, paid_on: today, method: 'cash', vendor: null, note: null, template_id: null });
  assert.equal(res.created, 1); assert.equal(res.total, 18000); assert.equal(res.items[0].table, 'expenses');
});

await test('desk entry: the desk limits and roles still apply before anything is sent', async () => {
  const api = fakeApi(), p = provider(api);
  for (const patch of [{ amount: 0 }, { amount: 5_000_001 }, { incurred_on: '2020-01-01' }, { paid_on: null }]) {
    await assert.rejects(m.runExpenseCommand(p, { ...desk, type: 'create', requestId: crypto.randomUUID(), id: 'x', draft: { ...deskDraft, ...patch } }), /validation/);
  }
  await assert.rejects(m.runExpenseCommand(p, { ...desk, type: 'template.create', requestId: crypto.randomUUID(), id: 't', draft: { concept: 'Arriendo', category: 'rent', amount: 1, cadence: 'monthly', anchor_day: 5, vendor: null } }), /denied/);
  await assert.rejects(m.readExpenseWorkspace(p, desk), /denied/, 'reception reads no ledger');
  await assert.rejects(m.runExpenseCommand(p, { ...deskDraft, actorId: 'c', role: 'customer', type: 'create', requestId: crypto.randomUUID(), id: 'x', draft: deskDraft }), /denied/);
  assert.equal(api.calls.filter((c) => c.method !== 'GET' && c.path !== '/query').length, 0);
});

await test('admin ledger (M-09c): template create → generate (one keyed /batch) → read back with the app\'s row shape', async () => {
  const api = fakeApi(), p = provider(api);
  await m.runExpenseCommand(p, { ...admin, type: 'template.create', requestId: crypto.randomUUID(), id: 'tpl', draft: { concept: 'Arriendo', category: 'rent', amount: 3_000_000, cadence: 'biweekly', anchor_day: 5, vendor: 'Inmobiliaria' } });
  const tplBody = api.calls.find((c) => c.path === '/api/expense_template').body;
  assert.deepEqual(tplBody, { concept: 'Arriendo', category: 'rent', amount: 3_000_000, cadence: 'biweekly', vendor: 'Inmobiliaria', note: null, active: true, day_of_month: 5 });
  let ws = await m.readExpenseWorkspace(p, admin);
  assert.equal(ws.templates.length, 1); assert.equal(ws.templates[0].anchor_day, 5); assert.equal(ws.templates[0].cadence, 'biweekly'); assert.equal(ws.templates[0].active, true);
  const gen = { ...admin, type: 'generate', requestId: crypto.randomUUID(), period: { start: '2030-10-01', end: '2030-10-31' }, templates: ws.templates };
  const res = await m.runExpenseCommand(p, gen);
  assert.equal(res.created, 2); assert.equal(res.total, 6_000_000);
  const batches = api.calls.filter((c) => c.path === '/batch');
  assert.equal(batches.length, 1); assert.equal(batches[0].key, gen.requestId);
  assert.ok(batches[0].body.ops.every((o) => o.entity === 'expense' && o.data.template_id === ws.templates[0].id && o.data.kind === 'fixed' && o.data.paid_on === null));
  ws = await m.readExpenseWorkspace(p, admin);
  assert.equal(ws.expenses.length, 2); assert.deepEqual(ws.expenses.map((e) => e.incurred_on).sort(), ['2030-10-05', '2030-10-20']);
  assert.equal(ws.expenses[0].created_by, 'user-desk', 'created_by comes from the record');
  const again = await m.runExpenseCommand(p, { ...gen, requestId: crypto.randomUUID() });
  assert.equal(again.created, 0); assert.equal(again.skipped, 2, 'generating twice adds nothing');
});

await test('admin ledger: pay, delete (refused once paid) and template toggle compare the before-state', async () => {
  const api = fakeApi(), p = provider(api);
  await m.runExpenseCommand(p, { ...admin, type: 'create', requestId: crypto.randomUUID(), id: 'e1', draft: { ...deskDraft, paid_on: null, incurred_on: '2026-10-20' } });
  let [row] = (await m.readExpenseWorkspace(p, admin)).expenses;
  await m.runExpenseCommand(p, { ...admin, type: 'pay', requestId: crypto.randomUUID(), id: row.id, before: row, paidOn: '2026-10-21' });
  const paid = (await m.readExpenseWorkspace(p, admin)).expenses[0];
  assert.equal(paid.paid_on, '2026-10-21');
  await assert.rejects(m.runExpenseCommand(p, { ...admin, type: 'pay', requestId: crypto.randomUUID(), id: row.id, before: row, paidOn: '2026-10-22' }), /stale/);
  await assert.rejects(m.runExpenseCommand(p, { ...admin, type: 'delete', requestId: crypto.randomUUID(), id: row.id, before: paid }), /paid_delete/);
  await m.runExpenseCommand(p, { ...admin, type: 'create', requestId: crypto.randomUUID(), id: 'e2', draft: { ...deskDraft, paid_on: null, incurred_on: '2026-10-19', concept: 'Otro' } });
  row = (await m.readExpenseWorkspace(p, admin)).expenses.find((e) => e.concept === 'Otro');
  await m.runExpenseCommand(p, { ...admin, type: 'delete', requestId: crypto.randomUUID(), id: row.id, before: row });
  assert.equal(api.table('expense').size, 1);
  await m.runExpenseCommand(p, { ...admin, type: 'template.create', requestId: crypto.randomUUID(), id: 't', draft: { concept: 'Internet', category: 'internet', amount: 120000, cadence: 'monthly', anchor_day: 1, vendor: null } });
  const [tpl] = (await m.readExpenseWorkspace(p, admin)).templates;
  await m.runExpenseCommand(p, { ...admin, type: 'template.toggle', requestId: crypto.randomUUID(), id: tpl.id, before: tpl });
  assert.equal([...api.table('expense_template').values()][0].data.active, false);
  await assert.rejects(m.runExpenseCommand(p, { ...admin, type: 'template.toggle', requestId: crypto.randomUUID(), id: tpl.id, before: tpl }), /stale/);
});

await test('another provider stays disconnected', async () => {
  await assert.rejects(m.runExpenseCommand({ name: 'supabase' }, { ...admin, type: 'create', requestId: 'r-1', id: 'x', draft: deskDraft }), /disconnected/);
});

console.log(`\n${passed} passed, ${failures} failed`);
process.exitCode = failures ? 1 : 0;
