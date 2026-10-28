// H-3: CompanyOSProvider against a fake Company OS API (no network). Run: node scripts/test-companyos-provider.mjs
// Covers the field and status mapping, QuerySpec planning, /batch + Idempotency-Key (one key per action, reused on
// retry), 20 s polling only while watched, refetch after own writes, and the refusal copy for every contract code.
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

process.env.TZ = 'Asia/Tokyo'; // studio dates must not follow the device timezone
const scratch = await mkdtemp(join(tmpdir(), 'hoy-companyos-'));
let failures = 0, passed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log(`ok   ${name}`); }
  catch (e) { failures++; console.log(`FAIL ${name}\n     ${e?.stack ?? e}`); }
}

try {
  const file = join(scratch, 'companyos.mjs');
  await build({
    stdin: {
      contents: `export * from './src/data/companyos/CompanyOSProvider.ts';
        export * from './src/data/companyos/transport.ts';
        export * from './src/data/companyos/refusals.ts';
        export * from './src/data/companyos/mapping.ts';
        export * from './src/data/companyos/query.ts';
        export * from './src/data/companyos/dates.ts';`,
      resolveDir: process.cwd(), loader: 'ts',
    },
    bundle: true, platform: 'node', format: 'esm', outfile: file, logLevel: 'silent',
    loader: { '.jpg': 'empty', '.png': 'empty', '.webp': 'empty', '.svg': 'empty', '.md': 'text' },
    define: { 'import.meta.env': '{"VITE_HOY_BUILD":"production"}' },
  });
  const m = await import(pathToFileURL(file));
  const { CompanyOSProvider, CompanyOSError, refusalCopy, refusalCode, hasRefusalCopy, adapters, fromRecord, toData, planQuery, toDay, toInstant, POLL_MS, wireKey } = m;

  // ------------------------------------------------------------------ the fake API
  const UUID = () => crypto.randomUUID();
  function fakeApi() {
    const db = new Map(); // entity -> Map(id -> record)
    const calls = [];
    const keys = new Map(); // idempotency key -> { body, status, response }
    const faults = []; // queue of { match, kind: 'lost'|'502'|'refuse', code?, opIndex? }
    let token = 'tok-1';
    const table = (e) => { if (!db.has(e)) db.set(e, new Map()); return db.get(e); };
    const put = (entity, data, id = UUID()) => {
      const at = new Date().toISOString();
      const rec = { id, tenantId: 't', entityId: entity, orgUnitId: null, data: { ...data }, createdBy: 'user-1', createdAt: at, updatedAt: at };
      table(entity).set(id, rec); return rec;
    };
    const match = (rec, f) => {
      if (!f || f.all) return true;
      if (f.and) return f.and.every((x) => match(rec, x));
      if (f.or) return f.or.some((x) => match(rec, x));
      const v = f.field === 'id' ? rec.id : rec.data[f.field];
      const want = f.value && typeof f.value === 'object' && f.value.$me ? 'user-1' : f.value;
      switch (f.op) {
        case 'eq': return v === want; case 'neq': return v !== want;
        case 'in': return want.includes(v); case 'is_null': return v == null; case 'is_not_null': return v != null;
        default: throw new Error(`fake: op ${f.op}`);
      }
    };
    const json = (status, body, headers = {}) => new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'x-request-id': 'req-1', ...headers } });
    const refuse = (status, error, extra = {}) => json(status, { error, message: `${error} (fake)`, ...extra });
    function applyOps(ops) {
      const snapshot = new Map([...db].map(([k, v]) => [k, new Map(v)]));
      const ids = [];
      try {
        ops.forEach((op, i) => {
          const fault = faults[0]?.kind === 'refuse' && faults[0].opIndex === i ? faults.shift() : null;
          if (fault) throw Object.assign(new Error(fault.code), { opIndex: i });
          if (op.op === 'create') {
            const data = Object.fromEntries(Object.entries(op.data).map(([k, v]) => [k, v && typeof v === 'object' && '$ref' in v ? ids[v.$ref] : v]));
            ids.push(put(op.entity, data).id);
          } else if (op.op === 'update') {
            const rec = table(op.entity).get(op.id); if (!rec) throw Object.assign(new Error('not found'), { opIndex: i, status: 404 });
            Object.assign(rec.data, op.data); ids.push(op.id);
          } else { table(op.entity).delete(op.id); ids.push(op.id); }
        });
      } catch (e) { db.clear(); for (const [k, v] of snapshot) db.set(k, v); throw e; }
      return ids;
    }
    async function handle(url, init = {}) {
      const u = new URL(url, 'http://hoy.test/');
      const method = init.method ?? 'GET';
      const body = init.body ? JSON.parse(init.body) : undefined;
      const headers = init.headers ?? {};
      calls.push({ method, path: u.pathname, body, headers });
      if (u.pathname === '/app-config.json') return json(200, { tenant: 'hoy', apiBase: '/api/cos', clerkPublishableKey: 'pk_test', launch: { siteLive: true } });
      if (headers.authorization !== `Bearer ${token}`) return refuse(401, 'unauthorized');
      const path = u.pathname.replace(/^\/api\/cos\/t\/hoy/, '');
      const fault = faults[0] && faults[0].kind !== 'refuse' && (!faults[0].path || faults[0].path === path) ? faults.shift() : null;
      if (fault?.kind === '502') return json(502, { error: 'bad gateway' });
      const key = headers['idempotency-key'];
      const run = () => {
        if (path === '/query') {
          let rows = [...table(body.entity).values()].filter((r) => match(r, body.filter));
          if (body.sort) rows.sort((a, b) => (a.data[body.sort[0].field] < b.data[body.sort[0].field] ? -1 : 1) * (body.sort[0].dir === 'desc' ? -1 : 1));
          rows = rows.slice(body.offset ?? 0, (body.offset ?? 0) + (body.limit ?? 100));
          rows = rows.map((r) => ({ id: r.id, data: { ...r.data }, orgUnitId: null, createdAt: r.createdAt, updatedAt: r.updatedAt }));
          for (const inc of body.include ?? []) for (const r of rows) {
            const target = [...db.values()].map((t) => t.get(r.data[inc.field])).find(Boolean);
            r.data[inc.field] = target ? { id: target.id, ...(inc.fields ? Object.fromEntries(inc.fields.map((f) => [f, target.data[f]])) : target.data) } : null;
          }
          return json(200, { data: rows });
        }
        if (path === '/me') return json(200, { user: { id: 'user-1' }, roleKeys: ['member'], caps: [], isSuperAdmin: false, tenant: { timezone: 'America/Bogota' } });
        if (path === '/batch') {
          try { return json(200, { ids: applyOps(body.ops) }); }
          catch (e) { return refuse(e.status ?? 422, e.message, { opIndex: e.opIndex }); }
        }
        if (path === '/files') { const rec = put('file', { ...body, status: 'pending' }); return json(201, { file: { id: rec.id, ...rec.data }, uploadUrl: 'https://storage.test/upload/' + rec.id }); }
        const confirm = path.match(/^\/files\/([^/]+)\/confirm$/);
        if (confirm) { const rec = table('file').get(confirm[1]); rec.data.status = 'ready'; return json(200, { file: { id: rec.id, ...rec.data } }); }
        const one = path.match(/^\/api\/([a-z_]+)(?:\/([^/]+))?$/);
        if (one) {
          const [, entity, id] = one;
          if (method === 'POST') {
            const refusal = faults[0]?.kind === 'refuse' && faults[0].opIndex == null ? faults.shift() : null;
            if (refusal) return refuse(422, refusal.code);
            if (entity === 'credit_lot' && body.voucher_code) {
              const v = [...table('voucher').values()].find((x) => x.data.code === body.voucher_code);
              if (!v) return refuse(422, 'voucher_invalid');
              v.data.uses = (v.data.uses ?? 0) + 1; v.data.redeemed_by = body.person;
              return json(201, { data: put('credit_lot', { person: body.person, source: v.data.kind, quantity: v.data.classes, valid_until: v.data.valid_until, voucher: v.id }) });
            }
            if (entity === 'voucher') return json(201, { data: put('voucher', { ...body, code: 'K7M2QX9A', uses: 0 }) });
            return json(201, { data: put(entity, body) });
          }
          const rec = table(entity).get(id);
          if (!rec) return refuse(404, 'not found');
          if (method === 'GET') return json(200, { data: rec });
          if (method === 'PATCH') { Object.assign(rec.data, body); rec.updatedAt = new Date().toISOString(); return json(200, { data: rec }); }
          if (method === 'DELETE') { table(entity).delete(id); return new Response(null, { status: 204 }); }
        }
        return refuse(404, 'not found');
      };
      // Idempotency (ADR 0040): only successes are stored; same key + same body replays; a different body conflicts.
      if (key && method === 'POST' && (path === '/batch' || path.startsWith('/api/'))) {
        if (!/^[A-Za-z0-9_-]{8,128}$/.test(key)) return refuse(400, 'idempotency_key_invalid');
        const prior = keys.get(key);
        if (prior) {
          if (JSON.stringify(prior.body) !== JSON.stringify(body) || prior.path !== path) return refuse(409, 'idempotency_conflict');
          return json(prior.status, prior.response, { 'idempotency-replayed': 'true' });
        }
        const res = run();
        const text = await res.clone().text();
        if (res.ok) keys.set(key, { body, path, status: res.status, response: JSON.parse(text) });
        if (fault?.kind === 'lost') throw new TypeError('fetch failed'); // the server did it; the answer is lost
        return res;
      }
      const res = run();
      if (fault?.kind === 'lost') throw new TypeError('fetch failed');
      return res;
    }
    return {
      db, calls, faults, put, table,
      setToken: (t) => { token = t; },
      fetch: (url, init) => (String(url).startsWith('https://storage.test/') ? Promise.resolve(new Response(null, { status: 200 })) : handle(url, init)),
    };
  }
  const make = (api, extra = {}) => new CompanyOSProvider({ fetch: api.fetch, getToken: async () => 'tok-1', retryDelayMs: 1, sleep: async () => {}, ...extra });
  const apiCalls = (api, path) => api.calls.filter((c) => c.path === `/api/cos/t/hoy${path}`);
  const queriesOf = (api, entity) => apiCalls(api, '/query').filter((c) => c.body.entity === entity);

  // ------------------------------------------------------------------ mapping
  await test('mapping: occurrence → class_sessions (ISO instants, modality slug, server count)', () => {
    const row = fromRecord(adapters.class_sessions, { id: 'o1', createdAt: '2026-10-28T10:00:00Z', updatedAt: '2026-10-28T10:00:00Z', data: { title: 'Pulso', modality: 'pulso', schedule: 's1', coach: 'c1', resource: 'r1', starts_at: '2026-11-01T12:00:00.000Z', ends_at: '2026-11-01T12:50:00Z', capacity: 16, booked_count: 3, status: 'scheduled', spots_enabled: true } });
    assert.equal(row.modality_id, 'mod_pulso'); assert.equal(row.template_id, 's1'); assert.equal(row.teacher_id, 'c1'); assert.equal(row.room_id, 'r1');
    assert.equal(row.ends_at, '2026-11-01T12:50:00.000Z'); assert.equal(row.booked_count, 3); assert.equal(row.tenant_id, 'ten_hoy');
    const noField = fromRecord(adapters.class_sessions, { id: 'o2', data: { title: 'Fuego con Sara', starts_at: '2026-11-01T12:00:00Z' } });
    assert.equal(noField.modality_id, 'mod_fuego', 'modality from the title when the tenant field is missing');
    const data = toData(adapters.class_sessions, { modality_id: 'mod_pulso', booked_count: 9, starts_at: '2026-11-01T07:00:00-05:00', level: 'all' }, 'update');
    assert.deepEqual(data, { modality: 'pulso', starts_at: '2026-11-01T12:00:00.000Z' }, 'server count and derived columns are never sent');
  });
  await test('mapping: booking ↔ bookings (person, occurrence, entitlement, spot, held status)', () => {
    const row = fromRecord(adapters.bookings, { id: 'b1', data: { person: 'p1', occurrence: 'o1', status: 'held', entitlement: 'credit', spot: 4, hold_until: '2026-11-01T13:15:00Z', payment_method: 'transfer' } });
    assert.equal(row.user_id, 'p1'); assert.equal(row.session_id, 'o1'); assert.equal(row.status, 'held'); assert.equal(row.paid_with, 'package'); assert.equal(row.mat_number, 4);
    assert.equal(row.hold_until, '2026-11-01T13:15:00.000Z'); assert.equal(row.ledger_id, null);
    for (const [front, cos] of [['package', 'credit'], ['trial', 'credit'], ['single', 'single'], ['comp', 'comp'], ['guest', 'guest']])
      assert.equal(toData(adapters.bookings, { paid_with: front }, 'create').entitlement, cos);
    assert.deepEqual(toData(adapters.bookings, { user_id: 'p1', session_id: 'o1', paid_with: 'single', payment_method: 'desk', mat_number: 2, hold_until: 'x', checked_in_at: 'x', status: 'booked' }, 'create'),
      { person: 'p1', occurrence: 'o1', entitlement: 'single', payment_method: 'desk', spot: 2, status: 'booked' });
    assert.deepEqual(toData(adapters.bookings, { session_id: 'o2' }, 'update'), { occurrence: 'o2' }, 'a move is PATCH { occurrence }');
  });
  await test('mapping: product → plans (key, credits, family, build content by slug)', () => {
    const row = fromRecord(adapters.plans, { id: 'pr1', data: { key: 'unknown-slug', name: 'Paquete', kind: 'pack', price: 480000, credits: 12, validity_days: 60, active: true, freezable: true } });
    assert.equal(row.slug, 'unknown-slug'); assert.equal(row.classes, 12); assert.equal(row.family, 'paquetes'); assert.equal(row.price, 480000); assert.equal(row.name_en, 'Paquete');
    assert.equal(fromRecord(adapters.plans, { id: 'x', data: { kind: 'gift' } }).family, 'regalos');
    assert.equal(toData(adapters.plans, { family: 'privadas' }, 'create').kind, 'private');
    assert.equal(toData(adapters.plans, { family: 'paquetes', kind: 'trial' }, 'create').kind, 'trial');
  });
  await test('mapping: payment ↔ payments and transfer_receipts (methods, providers, statuses)', () => {
    const p = fromRecord(adapters.payments, { id: 'pay1', updatedAt: '2026-10-28T15:00:00Z', data: { person: 'p1', product: 'pr1', amount: 38000, method: 'online_gateway', provider: 'gateway', status: 'approved', notes: 'n' } });
    assert.equal(p.method, 'pse'); assert.equal(p.provider, 'wompi'); assert.equal(p.amount_paid, 38000); assert.equal(p.paid_at, '2026-10-28T15:00:00.000Z'); assert.equal(p.note, 'n'); assert.equal(p.currency, 'COP');
    assert.equal(fromRecord(adapters.payments, { id: 'x', data: { status: 'pending', amount: 1 } }).amount_paid, null);
    const d = toData(adapters.payments, { user_id: 'p1', plan_id: 'pr1', amount: 38000, method: 'qr', status: 'pending' }, 'create');
    assert.equal(d.method, 'transfer'); assert.equal(d.person, 'p1'); assert.equal(d.product, 'pr1'); assert.match(d.date, /^\d{4}-\d{2}-\d{2}$/); assert.equal(d.provider, 'manual');
    assert.equal(toData(adapters.payments, { amount: 38000, amount_paid: null }, 'update').amount, 38000, 'a null amount_paid never clears the amount');
    assert.equal(toData(adapters.payments, { status: 'approved', amount_paid: 30000 }, 'update').amount, 30000);
    const r = fromRecord(adapters.transfer_receipts, { id: 'pay2', updatedAt: '2026-10-28T15:00:00Z', data: { person: 'p1', amount: 38000, method: 'transfer', status: 'declined', for_entity: 'booking', for_id: 'b1', notes: 'blurry' } });
    assert.equal(r.status, 'rejected'); assert.equal(r.booking_id, 'b1'); assert.equal(r.payment_id, 'pay2'); assert.equal(r.review_reason, 'blurry');
    assert.deepEqual(toData(adapters.transfer_receipts, { user_id: 'p1', booking_id: 'b1', amount_received: 38000 }, 'create'),
      { status: 'pending', method: 'transfer', provider: 'manual', date: toDay(new Date()), concept: 'Transferencia', person: 'p1', amount: 38000, for_entity: 'booking', for_id: 'b1' });
    assert.equal(toData(adapters.payments, { amount: 1, method: 'cash' }, 'create').concept, 'Compra', 'payments require a concept');
    assert.deepEqual(toData(adapters.transfer_receipts, { status: 'rejected', review_reason: 'no llegó' }, 'update'), { status: 'declined', notes: 'no llegó' });
  });
  await test('mapping: credit entries → class_ledger (grant row = lot, lot fields, reasons)', () => {
    const lot = { id: 'lot1', source: 'purchase', valid_until: '2026-12-31', frozen_from: null, frozen_until: null, product: 'pr1', payment: 'pay1' };
    const grant = fromRecord(adapters.class_ledger, { id: 'e1', data: { lot, person: 'p1', delta: 12, reason: 'grant' } });
    assert.equal(grant.id, 'lot1'); assert.equal(grant.reason, 'purchase'); assert.equal(grant.expires_at, '2026-12-31'); assert.equal(grant.plan_id, 'pr1'); assert.equal(grant.purchase_ledger_id, null);
    const use = fromRecord(adapters.class_ledger, { id: 'e2', data: { lot, person: 'p1', delta: -1, reason: 'booking', booking: 'b1' } });
    assert.equal(use.id, 'e2'); assert.equal(use.purchase_ledger_id, 'lot1'); assert.equal(use.reason, 'booking');
    assert.equal(fromRecord(adapters.class_ledger, { id: 'e3', data: { lot, delta: 1, reason: 'studio_cancel' } }).reason, 'cancel_return');
    assert.equal(fromRecord(adapters.class_ledger, { id: 'e4', data: { lot: { ...lot, source: 'courtesy' }, delta: 2, reason: 'grant' } }).reason, 'gift');
    assert.deepEqual(toData(adapters.class_ledger, { frozen_from: '2026-11-02', frozen_until: '2026-11-20T05:00:00Z' }, 'update'), { frozen_from: '2026-11-02', frozen_until: '2026-11-20' });
    assert.deepEqual(toData(adapters.class_ledger, { user_id: 'p1', delta: 2, reason: 'comp', expires_at: '2026-12-01' }, 'create'), { person: 'p1', source: 'comp', quantity: 2, valid_until: '2026-12-01' });
  });
  await test('mapping: people, teachers, vouchers, roles', () => {
    const prof = fromRecord(adapters.profiles, { id: 'p1', data: { name: 'Ana María Ruiz', dob: '1990-05-04', email: 'ana@example.test' } });
    assert.equal(prof.user_id, 'p1'); assert.equal(prof.full_name, 'Ana María Ruiz'); assert.equal(prof.initials, 'AM'); assert.equal(prof.birthday, '1990-05-04');
    assert.equal(fromRecord(adapters.users, { id: 'p1', data: { email: 'a@example.test', user: 'u1' } }).status, 'active');
    const t = fromRecord(adapters.teachers, { id: 'c1', data: { person: { id: 'p9', name: 'Raghu' }, active: true } });
    assert.equal(t.display_name, 'Raghu'); assert.equal(t.user_id, 'p9'); assert.ok(t.bio.es.length > 0, 'bio from build content');
    const v = fromRecord(adapters.vouchers, { id: 'v1', data: { kind: 'gift', classes: 2, code: 'K7M2QX9A', uses: 1, max_uses: 1, valid_until: '2026-12-31', recipient_email: 'x@example.test' } });
    assert.equal(v.status, 'claimed'); assert.equal(v.balance, 0); assert.equal(v.source, 'purchased_gift'); assert.equal(v.expiresAt, '2026-12-31'); assert.equal(v.recipientContact, 'x@example.test');
  });
  await test('dates: days are studio days, instants ISO UTC (device in Tokyo)', () => {
    assert.equal(toDay('2026-11-01T03:00:00Z'), '2026-10-31', '22:00 in Medellín is still the 31st');
    assert.equal(toDay('2026-11-01'), '2026-11-01');
    assert.equal(toInstant('2026-11-01'), '2026-11-01T05:00:00.000Z', 'a bare day starts at studio midnight');
    assert.equal(toInstant('2026-11-01T07:00:00-05:00'), '2026-11-01T12:00:00.000Z');
    assert.equal(toDay(null), null); assert.equal(toInstant(''), null); assert.equal(toDay('not a date'), null);
  });

  // ------------------------------------------------------------------ reads
  await test('list: where/orderBy become a QuerySpec on mapped fields; tenant_id is implicit', async () => {
    const { spec, exact } = planQuery(adapters.bookings, { where: { tenant_id: 'ten_hoy', session_id: 'o1', status: ['booked', 'checked_in'], paid_with: 'package' }, orderBy: { column: 'mat_number', dir: 'asc' } });
    assert.deepEqual(spec.filter, { and: [
      { field: 'occurrence', op: 'is_not_null' }, { field: 'occurrence', op: 'eq', value: 'o1' },
      { field: 'status', op: 'in', value: ['booked', 'checked_in'] }, { field: 'entitlement', op: 'in', value: ['credit'] },
    ] });
    assert.deepEqual(planQuery(adapters.transfer_receipts, { where: { status: 'rejected' } }).spec.filter.and[1], { field: 'status', op: 'in', value: ['declined', 'voided'] }, 'every server value that reads as rejected');
    const byModality = planQuery(adapters.class_sessions, { where: { modality_id: 'mod_pulso' }, orderBy: { column: 'modality_id' } });
    assert.deepEqual(byModality.spec.filter, { all: true }, 'modality is filtered in the browser (the tenant field may be missing)');
    assert.equal(byModality.spec.sort, undefined); assert.equal(byModality.exact, false);
    assert.deepEqual(spec.sort, [{ field: 'spot', dir: 'asc' }]);
    assert.equal(exact, false, 'a mapped value (paid_with) is re-checked in the browser');
    assert.deepEqual(planQuery(adapters.rooms, undefined).spec.filter, { and: [{ field: 'kind', op: 'eq', value: 'room' }] });
    assert.deepEqual(planQuery(adapters.invoices, undefined).spec.filter, { all: true });
  });
  await test('list: reads every page past 500 rows, then filters derived columns in the browser', async () => {
    const api = fakeApi();
    for (let i = 0; i < 1203; i++) api.put('booking', { person: i % 2 ? 'p1' : 'p2', occurrence: 'o1', status: 'booked', entitlement: 'credit' });
    api.put('booking', { person: 'p1', resource: 'r1', status: 'booked' }); // a rental: never a class booking
    const p = make(api);
    const rows = await p.list('bookings', { where: { user_id: 'p1', rated: false } });
    assert.equal(rows.length, 601);
    assert.ok(rows.every((r) => r.user_id === 'p1' && r.session_id === 'o1'));
    assert.equal(queriesOf(api, 'booking').length, 2, 'the person filter runs on the server: 601 rows in two pages');
    assert.equal((await p.list('bookings')).length, 1203, 'three pages, rentals left out');
    assert.equal(queriesOf(api, 'booking').length, 5);
    const few = await p.list('bookings', { where: { user_id: 'p2' }, limit: 5 });
    assert.equal(few.length, 5); assert.equal(queriesOf(api, 'booking').at(-1).body.limit, 5, 'an exact query pages on the server');
  });
  await test('list: identical concurrent reads share one request; results are detached copies', async () => {
    const api = fakeApi(); api.put('resource', { name: 'Sala principal', kind: 'room', capacity: 16 });
    const p = make(api);
    const [a, b] = await Promise.all([p.list('rooms'), p.list('rooms')]);
    assert.equal(queriesOf(api, 'resource').length, 1); a[0].name = 'changed'; assert.equal(b[0].name, 'Sala principal');
    assert.equal(a[0].heated, true, 'room heating from build content');
  });
  await test('get: record by id; 404 → null; class_ledger reads through the query', async () => {
    const api = fakeApi(); const rec = api.put('occurrence', { title: 'Pulso', starts_at: '2026-11-01T12:00:00Z', ends_at: '2026-11-01T12:50:00Z', capacity: 16, status: 'scheduled' });
    const p = make(api);
    assert.equal((await p.get('class_sessions', rec.id)).title, 'Pulso');
    assert.equal(await p.get('class_sessions', 'missing'), null);
    const lot = api.put('credit_lot', { person: 'p1', source: 'purchase', quantity: 4, valid_until: '2026-12-31' });
    api.put('credit_entry', { lot: lot.id, person: 'p1', delta: 4, reason: 'grant' });
    const g = await p.get('class_ledger', lot.id);
    assert.equal(g.id, lot.id); assert.equal(g.delta, 4); assert.equal(g.expires_at, '2026-12-31');
  });
  await test('signed out: build catalogue only, nothing reaches Company OS', async () => {
    const api = fakeApi(); const p = make(api, { getToken: async () => null });
    assert.ok((await p.list('plans')).length > 0); assert.ok((await p.list('modalities')).length === 7);
    assert.deepEqual(await p.list('bookings'), []); assert.equal(await p.get('class_sessions', 'x'), null); assert.equal(await p.me(), null);
    assert.equal(api.calls.filter((c) => c.path.startsWith('/api/')).length, 0);
  });
  await test('session: user_roles from /me for the signed-in person', async () => {
    const api = fakeApi(); const me = api.put('person', { name: 'Ana', user: 'user-1' });
    const p = make(api);
    const roles = await p.list('user_roles');
    assert.deepEqual(roles.map((r) => [r.user_id, r.role]), [['user-1', 'customer']], 'the session\'s user id');
    assert.equal((await p.me()).personId, me.id);
  });
  await test('self: the session\'s user id stands for the signed-in person, both ways', async () => {
    const api = fakeApi(); const me = api.put('person', { name: 'Ana', user: 'user-1', email: 'ana@example.test' });
    api.put('booking', { person: me.id, occurrence: 'o1', status: 'booked', entitlement: 'credit' });
    api.put('booking', { person: 'someone-else', occurrence: 'o1', status: 'booked', entitlement: 'credit' });
    const p = make(api);
    const mine = await p.list('bookings', { where: { user_id: 'user-1' } });
    assert.equal(mine.length, 1); assert.equal(mine[0].user_id, 'user-1');
    assert.equal(queriesOf(api, 'booking')[0].body.filter.and[1].value, me.id, 'the query names the person');
    assert.deepEqual((await p.list('bookings')).map((b) => b.user_id).sort(), ['someone-else', 'user-1']);
    const b = await p.insert('bookings', { user_id: 'user-1', session_id: 'o2', paid_with: 'package' });
    assert.equal(b.user_id, 'user-1'); assert.equal(apiCalls(api, '/api/booking')[0].body.person, me.id);
    assert.equal((await p.get('users', 'user-1')).email, 'ana@example.test');
    assert.equal((await p.list('profiles', { where: { user_id: 'user-1' } }))[0].full_name, 'Ana');
    await p.atomic(async (d) => { await d.insert('payments', { user_id: 'user-1', amount: 1, method: 'cash' }); await d.update('profiles', 'user-1', { full_name: 'Ana R' }); });
    const ops = apiCalls(api, '/batch')[0].body.ops;
    assert.equal(ops[0].data.person, me.id); assert.deepEqual([ops[1].entity, ops[1].id, ops[1].data], ['person', me.id, { name: 'Ana R' }]);
  });
  await test('hidden, static and sink tables', async () => {
    const api = fakeApi(); const p = make(api);
    assert.deepEqual(await p.list('waitlist'), []);
    await assert.rejects(p.insert('waitlist', {}), (e) => e instanceof CompanyOSError && e.code === 'not_in_launch');
    await assert.rejects(p.insert('faq_entries', {}), (e) => e.code === 'read_only');
    await assert.rejects(p.update('invoices', 'i1', { total: 1 }), (e) => e.code === 'invoice_system_managed');
    const audit = await p.insert('audit_log', { action: 'x' });
    assert.equal(audit.action, 'x'); assert.deepEqual(await p.list('audit_log'), []);
    assert.equal(api.calls.filter((c) => c.path.startsWith('/api/cos')).length, 0);
  });

  // ------------------------------------------------------------------ transport
  await test('transport: bearer token, refresh once on 401, no content-type on bodyless calls', async () => {
    const api = fakeApi(); api.setToken('tok-2');
    const asked = [];
    const p = make(api, { getToken: async ({ refresh } = {}) => { asked.push(Boolean(refresh)); return refresh ? 'tok-2' : 'tok-1'; } });
    const rec = api.put('resource', { name: 'Sala', kind: 'room' });
    await p.remove('rooms', rec.id);
    assert.ok(asked.includes(true), 'a 401 asks for a refreshed token');
    const del = apiCalls(api, `/api/resource/${rec.id}`).at(-1);
    assert.equal(del.headers.authorization, 'Bearer tok-2'); assert.equal(del.headers['content-type'], undefined);
    api.setToken('never');
    await assert.rejects(p.update('rooms', rec.id, { name: 'x' }), (e) => e.code === 'unauthorized' && e.status === 401);
  });
  await test('insert: one Idempotency-Key, reused when the answer is lost (one record)', async () => {
    const api = fakeApi(); const p = make(api);
    api.faults.push({ kind: 'lost', path: '/api/booking' });
    const row = await p.insert('bookings', { user_id: 'p1', session_id: 'o1', paid_with: 'package', status: 'booked' });
    const posts = apiCalls(api, '/api/booking');
    assert.equal(posts.length, 2); assert.ok(posts[0].headers['idempotency-key']); assert.equal(posts[0].headers['idempotency-key'], posts[1].headers['idempotency-key']);
    assert.equal(api.table('booking').size, 1); assert.equal(row.user_id, 'p1'); assert.equal(row.paid_with, 'package');
  });
  await test('transport: 502 is retried with the same key; still down → service_unavailable (ambiguous)', async () => {
    const api = fakeApi(); const p = make(api);
    api.faults.push({ kind: '502', path: '/api/payment' }, { kind: '502', path: '/api/payment' }, { kind: '502', path: '/api/payment' });
    await assert.rejects(p.insert('payments', { user_id: 'p1', amount: 1, method: 'cash' }), (e) => e.code === 'service_unavailable' && e.ambiguous && e.status === 502);
    assert.equal(apiCalls(api, '/api/payment').length, 3);
  });
  await test('transport: refusal → CompanyOSError with the code; message is the code', async () => {
    const api = fakeApi(); const p = make(api);
    api.faults.push({ kind: 'refuse', code: 'occurrence_full' });
    const e = await p.insert('bookings', { user_id: 'p1', session_id: 'o1' }).catch((x) => x);
    assert.ok(e instanceof CompanyOSError); assert.equal(e.code, 'occurrence_full'); assert.equal(e.message, 'occurrence_full'); assert.equal(e.status, 422); assert.equal(e.requestId, 'req-1');
    assert.equal(e.ambiguous, false); assert.equal(refusalCode(e), 'occurrence_full');
  });

  // ------------------------------------------------------------------ atomic → /batch
  await test('atomic: the writes become one /batch with $ref; tokens resolve to the new ids', async () => {
    const api = fakeApi(); const p = make(api);
    const occ = api.put('occurrence', { title: 'Pulso', capacity: 16, status: 'scheduled' });
    const result = await p.atomic(async (d) => {
      const pay = await d.insert('payments', { user_id: 'p1', plan_id: 'pr1', amount: 38000, method: 'cash', status: 'approved' });
      const booking = await d.insert('bookings', { user_id: 'p1', session_id: occ.id, paid_with: 'single', payment_method: 'desk' });
      await d.update('bookings', booking.id, { mat_number: 3 }); // merged into the create
      await d.insert('audit_log', { action: 'desk.sale' }); // sink: not sent
      return { payment: pay.id, booking: booking.id, nested: [booking.id] };
    }, { idempotencyKey: 'f3b0c7a2-5d8e-4c1a-9b6f-0e2d4a6c8b10' });
    const batches = apiCalls(api, '/batch');
    assert.equal(batches.length, 1);
    assert.equal(batches[0].headers['idempotency-key'], 'f3b0c7a2-5d8e-4c1a-9b6f-0e2d4a6c8b10');
    assert.deepEqual(batches[0].body.ops.map((o) => [o.op, o.entity]), [['create', 'payment'], ['create', 'booking']]);
    assert.equal(batches[0].body.ops[1].data.spot, 3);
    assert.ok(api.table('payment').has(result.payment)); assert.ok(api.table('booking').has(result.booking)); assert.equal(result.nested[0], result.booking);
  });
  await test('atomic: a reference to an earlier create is { $ref: n }; ids in nested values refuse', async () => {
    const api = fakeApi(); const p = make(api);
    await p.atomic(async (d) => {
      const u = await d.insert('users', { email: 'nuevo@example.test', phone: '+570000000000' });
      await d.insert('profiles', { user_id: u.id, full_name: 'Persona Nueva' }); // merged into the person create
      await d.insert('legal_acceptances', { user_id: u.id, kind: 'terms', version: '2026-10-01' });
    });
    const ops = apiCalls(api, '/batch')[0].body.ops;
    assert.deepEqual(ops[0], { op: 'create', entity: 'person', data: { email: 'nuevo@example.test', phone: '+570000000000', name: 'Persona Nueva' } });
    assert.deepEqual(ops[1].data.person, { $ref: 0 });
    const person = [...api.table('person').values()][0];
    assert.equal([...api.table('policy_acceptance').values()][0].data.person, person.id);
    await assert.rejects(p.atomic(async (d) => { const u = await d.insert('users', { email: 'x@example.test' }); await d.insert('expenses', { note: { by: u.id } }); }), (e) => e.code === 'atomic_ref_invalid');
  });
  await test('atomic: a refused op rolls the whole batch back and reports its opIndex', async () => {
    const api = fakeApi(); const p = make(api);
    api.faults.push({ kind: 'refuse', code: 'spot_taken', opIndex: 1 });
    const e = await p.atomic(async (d) => { await d.insert('payments', { amount: 1, method: 'cash' }); await d.insert('bookings', { user_id: 'p1', session_id: 'o1', mat_number: 1 }); }).catch((x) => x);
    assert.equal(e.code, 'spot_taken'); assert.equal(e.opIndex, 1); assert.equal(api.table('payment').size, 0);
  });
  await test('atomic: a lost answer is replayed with the same key and body, never re-run or written twice', async () => {
    const api = fakeApi(); const p = make(api, { retries: 0 });
    let runs = 0;
    const action = async (d) => { runs++; const b = await d.insert('bookings', { user_id: 'p1', session_id: 'o1', paid_with: 'package', note: runs }); return b.id; };
    api.faults.push({ kind: 'lost', path: '/batch' });
    const key = 'retry-key-0001';
    await assert.rejects(p.atomic(action, { idempotencyKey: key }), (e) => e.code === 'network_error' && e.ambiguous);
    const id = await p.atomic(action, { idempotencyKey: key });
    assert.equal(runs, 2, 'the callback runs again and produces the same body');
    const batches = apiCalls(api, '/batch');
    assert.equal(batches.length, 2); assert.deepEqual(batches[0].body, batches[1].body); assert.equal(batches[1].headers['idempotency-key'], key);
    assert.equal(api.table('booking').size, 1); assert.ok(api.table('booking').has(id));
  });
  await test('atomic: a changed choice after a lost answer goes out under the same key → idempotency_conflict, no second booking', async () => {
    const api = fakeApi(); const p = make(api, { retries: 0 });
    let session = 'o1';
    const action = async (d) => { await d.insert('bookings', { user_id: 'p1', session_id: session, paid_with: 'package' }); };
    api.faults.push({ kind: 'lost', path: '/batch' });
    await assert.rejects(p.atomic(action, { idempotencyKey: 'changed-choice-1' }), (e) => e.code === 'network_error');
    session = 'o2';
    await assert.rejects(p.atomic(action, { idempotencyKey: 'changed-choice-1' }), (e) => e.code === 'idempotency_conflict');
    assert.equal(api.table('booking').size, 1); assert.equal([...api.table('booking').values()][0].data.occurrence, 'o1');
  });
  await test('atomic: a double tap with one key sends one batch and both taps get its answer', async () => {
    const api = fakeApi(); const p = make(api);
    let runs = 0;
    const action = async (d) => { runs++; return (await d.insert('payments', { user_id: 'p1', amount: 1, method: 'cash' })).id; };
    const [a, b] = await Promise.all([p.atomic(action, { idempotencyKey: 'double-tap-01' }), p.atomic(action, { idempotencyKey: 'double-tap-01' })]);
    assert.equal(a, b); assert.equal(runs, 1); assert.equal(apiCalls(api, '/batch').length, 1); assert.equal(api.table('payment').size, 1);
  });
  await test('atomic: the browser\'s own bookkeeping (ledger debit, booked_count, ledger_id) is left to the server', async () => {
    const api = fakeApi(); const p = make(api);
    const occ = api.put('occurrence', { title: 'Pulso', capacity: 16, booked_count: 3, status: 'scheduled' });
    // The shape of the review build's package booking (customer/hooks.ts).
    const booking = await p.atomic(async (t) => {
      const fresh = await t.get('class_sessions', occ.id);
      const b = await t.insert('bookings', { user_id: 'p1', session_id: fresh.id, status: 'booked', paid_with: 'package', ledger_id: null, mat_number: 2 });
      const c = await t.insert('class_ledger', { purchase_ledger_id: 'lot1', user_id: 'p1', delta: -1, reason: 'booking', expires_at: null });
      await t.update('bookings', b.id, { ledger_id: c.id });
      await t.update('class_sessions', fresh.id, { booked_count: fresh.booked_count + 1 });
      await t.insert('audit_log', { action: 'booking.create' });
      return b;
    }, { idempotencyKey: 'package-booking-1' });
    const ops = apiCalls(api, '/batch')[0].body.ops;
    assert.deepEqual(ops, [{ op: 'create', entity: 'booking', data: { person: 'p1', occurrence: occ.id, status: 'booked', entitlement: 'credit', spot: 2 } }]);
    assert.ok(api.table('booking').has(booking.id));
    assert.equal(api.table('occurrence').get(occ.id).data.booked_count, 3, 'the count is the server\'s');
    // Outside atomic too: a plain booked_count update sends nothing; a cancellation return is the server's.
    await p.update('class_sessions', occ.id, { booked_count: 9 });
    await p.insert('class_ledger', { user_id: 'p1', delta: 1, reason: 'cancel_return' });
    assert.equal(apiCalls(api, `/api/occurrence/${occ.id}`).filter((c) => c.method === 'PATCH').length, 0);
    assert.equal(apiCalls(api, '/api/credit_lot').length, 0);
    await p.insert('class_ledger', { user_id: 'p1', delta: 2, reason: 'comp', expires_at: '2026-12-31' });
    assert.deepEqual(apiCalls(api, '/api/credit_lot')[0].body, { person: 'p1', source: 'comp', quantity: 2, valid_until: '2026-12-31' }, 'a desk comp is a real lot');
  });
  await test('insert: a caller-held key makes the user\'s own retry safe', async () => {
    const api = fakeApi(); const p = make(api, { retries: 0 });
    api.faults.push({ kind: 'lost', path: '/api/payment' });
    const row = { user_id: 'p1', amount: 38000, method: 'transfer', status: 'pending' };
    await assert.rejects(p.insert('payments', row, { idempotencyKey: 'pay-action-001' }), (e) => e.code === 'network_error');
    await p.insert('payments', row, { idempotencyKey: 'pay-action-001' });
    assert.equal(api.table('payment').size, 1);
  });
  await test('session: another user signing in on the same tab gets their own /me', async () => {
    const api = fakeApi();
    const jwt = (sub) => `h.${Buffer.from(JSON.stringify({ sub })).toString('base64url')}.s`;
    let token = jwt('clerk_a'); api.setToken(token);
    const p = make(api, { getToken: async () => token });
    await p.me(); await p.me();
    assert.equal(apiCalls(api, '/me').length, 1, 'cached for one user');
    token = jwt('clerk_b'); api.setToken(token);
    await p.me();
    assert.equal(apiCalls(api, '/me').length, 2, 'refetched for the next user');
  });
  await test('atomic: after a refusal the same key is judged afresh (the callback runs again)', async () => {
    const api = fakeApi(); const p = make(api);
    let runs = 0;
    api.faults.push({ kind: 'refuse', code: 'occurrence_full', opIndex: 0 });
    const action = async (d) => { runs++; await d.insert('bookings', { user_id: 'p1', session_id: runs === 1 ? 'o1' : 'o2' }); };
    await assert.rejects(p.atomic(action, { idempotencyKey: 'judged-afresh-1' }), (e) => e.code === 'occurrence_full');
    await p.atomic(action, { idempotencyKey: 'judged-afresh-1' });
    assert.equal(runs, 2); assert.equal([...api.table('booking').values()][0].data.occurrence, 'o2');
  });
  await test('atomic: a key reused for another action → idempotency_conflict; a key the API refuses is replaced', async () => {
    const api = fakeApi(); const p = make(api);
    await p.atomic(async (d) => { await d.insert('payments', { amount: 1, method: 'cash' }); }, { idempotencyKey: 'same-key-12345' });
    await assert.rejects(p.atomic(async (d) => { await d.insert('payments', { amount: 2, method: 'cash' }); }, { idempotencyKey: 'same-key-12345' }), (e) => e.code === 'idempotency_conflict' && e.status === 409);
    await p.atomic(async (d) => { await d.insert('payments', { amount: 3, method: 'cash' }); }, { idempotencyKey: 'req:1' });
    const sent = apiCalls(api, '/batch').at(-1).headers['idempotency-key'];
    assert.match(sent, /^[0-9a-f-]{36}$/); assert.equal(wireKey('req:1'), sent, 'the same caller key always maps to the same header');
    assert.equal(api.table('payment').size, 2);
  });
  await test('atomic: no write → no request; updates and deletes of existing rows', async () => {
    const api = fakeApi(); const p = make(api);
    const b = api.put('booking', { person: 'p1', occurrence: 'o1', status: 'booked' });
    assert.equal(await p.atomic(async (d) => (await d.list('bookings')).length), 1);
    assert.equal(apiCalls(api, '/batch').length, 0);
    const returned = await p.atomic(async (d) => d.update('bookings', b.id, { status: 'cancelled' }));
    assert.equal(returned.status, 'cancelled'); assert.equal(returned.user_id, 'p1');
    assert.deepEqual(apiCalls(api, '/batch')[0].body.ops, [{ op: 'update', entity: 'booking', id: b.id, data: { status: 'cancelled' } }]);
  });

  await test('studio settings (AD-05): the tenants row\'s settings are the comms setting `studio_settings`', async () => {
    const api = fakeApi(); const p = make(api);
    const empty = await p.list('tenants', { where: { id: 'ten_hoy' } });
    assert.equal(empty.length, 1); assert.deepEqual(empty[0].settings, {}); assert.equal(empty[0].tenant_id, 'ten_hoy');
    await p.update('tenants', 'ten_hoy', { settings: { contact: { email: 'hola@example.test' } } });
    const created = [...api.table('setting').values()];
    assert.equal(created.length, 1); assert.deepEqual(created[0].data, { key: 'studio_settings', value: { contact: { email: 'hola@example.test' } } });
    await p.update('tenants', 'ten_hoy', { settings: { contact: { email: 'otro@example.test' } } });
    assert.equal(api.table('setting').size, 1, 'the second save updates the same record');
    assert.equal((await p.get('tenants', 'ten_hoy')).settings.contact.email, 'otro@example.test');
    await assert.rejects(p.remove('tenants', 'ten_hoy'), (e) => e.code === 'read_only');
    assert.deepEqual(await make(api, { getToken: async () => null }).list('tenants'), []);
  });
  await test('atomic: a read-back of a row the callback updated sees the change (payment settings pattern)', async () => {
    const api = fakeApi(); const p = make(api);
    api.put('setting', { key: 'studio_settings', value: { payments: { bank: 'old' }, contact: { email: 'a@example.test' } } });
    const saved = await p.atomic(async (tx) => {
      const row = await tx.get('tenants', 'ten_hoy');
      await tx.update('tenants', row.id, { settings: { ...row.settings, payments: { bank: 'new' } } });
      await tx.insert('audit_log', { action: 'settings.update' });
      return (await tx.get('tenants', row.id)).settings;
    }, { idempotencyKey: 'payment-settings-1' });
    assert.deepEqual(saved, { payments: { bank: 'new' }, contact: { email: 'a@example.test' } });
    const ops = apiCalls(api, '/batch')[0].body.ops;
    assert.equal(ops.length, 1); assert.equal(ops[0].entity, 'setting'); assert.deepEqual(ops[0].data.value.payments, { bank: 'new' });
    const b = api.put('booking', { person: 'p1', occurrence: 'o1', status: 'booked' });
    const seen = await p.atomic(async (tx) => { await tx.update('bookings', b.id, { status: 'cancelled' }); return (await tx.get('bookings', b.id)).status; });
    assert.equal(seen, 'cancelled');
  });

  // ------------------------------------------------------------------ change feed
  await test('subscribe: own writes refetch the table and the ones it changes on the server', async () => {
    const api = fakeApi(); const p = make(api);
    const seen = [];
    for (const t of ['bookings', 'class_sessions', 'class_ledger', 'plans']) p.subscribe(t, (e) => seen.push(`${e.table}:${e.type}`));
    const all = []; p.subscribe('*', (e) => all.push(e.table));
    await p.insert('bookings', { user_id: 'p1', session_id: 'o1' });
    assert.deepEqual(seen.sort(), ['bookings:reset', 'class_ledger:reset', 'class_sessions:reset']);
    assert.ok(all.includes('payments'));
  });
  await test('polling: 20 s by default, only while a screen watches, only the tables it names', async () => {
    assert.equal(POLL_MS, 20000);
    const api = fakeApi(); const p = make(api, { pollMs: 15 });
    const seen = [];
    p.subscribe('class_sessions', () => seen.push('class_sessions')); p.subscribe('plans', () => seen.push('plans'));
    await new Promise((r) => setTimeout(r, 50));
    assert.deepEqual(seen, [], 'nothing polls without a watching screen');
    const stop = p.watch(['class_sessions']);
    await new Promise((r) => setTimeout(r, 50));
    stop();
    const n = seen.length;
    assert.ok(n >= 2 && seen.every((t) => t === 'class_sessions'), `polled ${n} times`);
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(seen.length, n, 'stops when the screen unmounts');
  });

  // ------------------------------------------------------------------ commands
  await test('voucher: issue creates a credits voucher; claim redeems the code as a lot', async () => {
    const api = fakeApi(); const p = make(api);
    const issued = await p.voucher({ type: 'issue', requestId: 'issue-req-0001', actorId: 'a', role: 'admin', title: 'Cortesía', benefitKind: 'classes', benefitTotal: 2, participantCap: 1, capScope: 'lifetime', creditUnit: 'per_person', expiresAt: '2026-12-31', cancellationPolicy: 'forfeit', recipientName: 'Ana', recipientContact: 'ana@example.test', message: 'Bienvenida' });
    assert.equal(issued.voucher.code, 'K7M2QX9A'); assert.equal(issued.voucher.benefitTotal, 2);
    assert.deepEqual(apiCalls(api, '/api/voucher')[0].body, { kind: 'courtesy', classes: 2, valid_until: '2026-12-31', max_uses: 1, recipient_name: 'Ana', recipient_email: 'ana@example.test', note: 'Bienvenida' });
    const claimed = await p.voucher({ type: 'claim', requestId: 'claim-req-0001', actorId: 'p1', role: 'customer', voucherId: 'k7m2qx9a', userId: 'p1' });
    assert.equal(apiCalls(api, '/api/credit_lot')[0].body.voucher_code, 'K7M2QX9A'); assert.equal(claimed.voucher.status, 'claimed');
    await assert.rejects(p.voucher({ type: 'issue', requestId: 'r-cop-00001', actorId: 'a', role: 'admin', benefitKind: 'cop', benefitTotal: 1 }), (e) => e.code === 'not_in_launch');
    await assert.rejects(p.voucher({ type: 'book', requestId: 'r-book-0001', actorId: 'a', role: 'admin' }), (e) => e.code === 'not_in_launch');
    await assert.rejects(p.promotion({ type: 'create_share' }), (e) => e.code === 'promotions_disabled');
  });
  await test('uploadFile: link, upload, confirm', async () => {
    const api = fakeApi(); const p = make(api);
    const out = await p.uploadFile({ ownerEntity: 'payment', ownerId: 'pay1', kind: 'receipt', file: new Blob([new Uint8Array([0xff, 0xd8])], { type: 'image/jpeg' }), filename: 'r.jpg' });
    assert.equal(out.status, 'ready'); assert.deepEqual(apiCalls(api, '/files')[0].body, { ownerEntity: 'payment', ownerId: 'pay1', kind: 'receipt', filename: 'r.jpg', mime: 'image/jpeg', sizeBytes: 2 });
  });
  await test('launch settings come from /app-config.json', async () => {
    const api = fakeApi(); const p = new CompanyOSProvider({ fetch: api.fetch, getToken: async () => 'tok-1' });
    assert.deepEqual(await p.launchSettings(), { siteLive: true });
  });

  // ------------------------------------------------------------------ refusal copy (rule C7)
  const CONTRACT_CODES = [
    'occurrence_full', 'occurrence_not_open', 'already_booked', 'daily_limit_reached', 'spot_required', 'spot_invalid', 'spot_taken', 'hold_expired', 'reschedule_window_closed', 'invalid_transition', 'booking_system_managed', 'reason_required',
    'no_credits', 'lot_expired', 'lot_frozen', 'freeze_limit', 'freeze_too_long', 'freeze_not_allowed', 'trial_used', 'voucher_invalid', 'voucher_expired', 'voucher_redeemed', 'voucher_used_up',
    'product_inactive', 'audience_not_allowed', 'amount_mismatch', 'invalid_amount', 'invalid_status_transition', 'refunds_disabled', 'duplicate_provider_ref', 'invoice_system_managed',
    'file_too_large', 'file_type_not_allowed', 'file_upload_expired', 'file_upload_missing', 'storage_unavailable',
    'already_signed_up', 'person_email_mismatch', 'consent_required',
    'idempotency_conflict', 'idempotency_key_invalid', 'forbidden',
  ];
  await test(`refusals: all ${CONTRACT_CODES.length} contract codes have their own Spanish and English line`, () => {
    const generic = (lang, code) => refusalCopy(`zz_${code}`, lang).replace(`zz_${code}`, code);
    const es = new Set(), en = new Set();
    for (const code of CONTRACT_CODES) {
      assert.ok(hasRefusalCopy(code), code);
      const s = refusalCopy(code, 'es'), e = refusalCopy(code, 'en');
      assert.ok(s.length > 10 && e.length > 10, code); assert.notEqual(s, e, `${code}: English is translated`);
      assert.notEqual(s, generic('es', code)); assert.ok(!s.includes(code), `${code}: no raw code in its own line`);
      es.add(s); en.add(e);
    }
    assert.equal(es.size, CONTRACT_CODES.length, 'every Spanish line is distinct'); assert.equal(en.size, CONTRACT_CODES.length, 'every English line is distinct');
  });
  await test('refusals: connector codes have copy; an unknown code falls back to the generic line with the code', () => {
    for (const code of ['unauthorized', 'network_error', 'service_unavailable', 'not_in_launch', 'promotions_disabled', 'read_only', 'not_found', 'validation', 'account_not_invited', 'email_not_verified'])
      assert.ok(hasRefusalCopy(code), code);
    assert.equal(refusalCopy('offer_expired', 'es'), 'No pudimos completar la acción. Si se repite, escríbenos con este código: offer_expired.');
    assert.match(refusalCopy('offer_expired', 'en'), /code: offer_expired\.$/);
    assert.match(refusalCopy('', 'es'), /código: unknown\./);
    assert.equal(refusalCode(new Error('Something broke: see logs')), 'unknown');
    assert.equal(refusalCode(new CompanyOSError('spot_taken')), 'spot_taken');
    assert.equal(refusalCopy('spot_taken'), refusalCopy('spot_taken', 'es'), 'Spanish is the default');
  });
  await test('refusals: the API\'s two error styles normalise to codes', async () => {
    const { normalizeCode } = m;
    assert.equal(normalizeCode('not found', 404), 'not_found'); assert.equal(normalizeCode('super-admin only', 403), 'forbidden');
    assert.equal(normalizeCode('invalid body', 400), 'invalid_body'); assert.equal(normalizeCode(undefined, 401), 'unauthorized');
    assert.equal(normalizeCode('storage_not_configured', 503), 'storage_unavailable'); assert.equal(normalizeCode('occurrence_full', 422), 'occurrence_full');
  });
} finally {
  await rm(scratch, { recursive: true, force: true });
}
console.log(`\n${passed} passed, ${failures} failed`);
if (failures) process.exit(1);
