// Connector contract (final review F1): every write a production screen makes, run through the real connector, keeps the
// Company OS fields the server needs. The screens' own write functions (H-4 booking, H-5 payments, H-6 vouchers,
// H-7 desk, M-08 settings) run against the real CompanyOSProvider (adapterFor + toData, /batch serialization, raw
// request) with a recording fetch; each recorded body is checked against the entity's required fields and the fields
// that screen means to send. A second part scans the production bundle for table writes that have no adapter.
// Fictional data only, no network. Run: node scripts/test-connector-contract.mjs   (QA_PROD_DIST=dist to reuse a build)
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const scratch = await mkdtemp(join(tmpdir(), 'hoy-contract-'));
let failed = 0, passed = 0;
const test = async (name, fn) => {
  try { await fn(); passed++; console.log(`ok   ${name}`); } catch (e) { failed++; console.log(`FAIL ${name}\n     ${e?.stack?.split('\n').slice(0, 4).join('\n     ') ?? e}`); }
};

/**
 * What the server refuses without (Company OS module definitions, `required: true` and the rules' own checks, in
 * `packages/core/src/modules/*` of ../Company-OS; payments with `payer = person`, which the Hoy recipe sets).
 */
const REQUIRED = {
  booking: ['occurrence', 'person'],
  payment: ['person', 'date', 'amount', 'concept'],
  voucher: ['kind', 'classes'],
  credit_lot: ['person'],
  setting: ['key', 'value'],
  person: ['name'],
  member: ['person'],
  policy_acceptance: ['person', 'policy', 'version'],
};

/**
 * Production tables written somewhere in the launch screens that have no adapter (the write refuses `not_in_launch`),
 * or whose fields the connector doesn't carry yet, each owned by another lane of the final review. Reported, not fixed.
 */
const KNOWN_GAPS = {
  deletion_requests: 'no adapter: P- account deletion requests (CU-04) refuse not_in_launch; customer lane (the admin queue /admin/crm/deletions is not a launch route since G2)',
  expenses: 'expense and expense_template fields (cadence, day_of_month) and permissions; lanes F3 (staff, S-11) and F5 (Company OS)',
};

try {
  const file = join(scratch, 'contract.mjs');
  await build({
    stdin: {
      contents: `export { CompanyOSProvider } from './src/data/companyos/CompanyOSProvider.ts';
        export { adapters, adapterFor, toData } from './src/data/companyos/mapping.ts';
        export { bookOnServer, moveOnServer, cancelOnServer } from './src/modules/customer/booking/serverCommands.ts';
        export { serverDesk } from './src/modules/staff/desk/deskCommands.ts';
        export { transferOps, reviewOps, deskOps, runPaymentOps, registerApprovalOps } from './src/modules/transfers/launch/payments.ts';
        export { cosOf } from './src/modules/transfers/launch/cos.ts';
        export * as vouchers from './src/modules/vouchers/production/model.ts';`,
      resolveDir: process.cwd(), loader: 'ts',
    },
    bundle: true, platform: 'node', format: 'esm', outfile: file, logLevel: 'silent',
    loader: { '.jpg': 'empty', '.png': 'empty', '.webp': 'empty', '.svg': 'empty', '.md': 'text', '.css': 'empty' },
    define: { 'import.meta.env': '{"VITE_HOY_BUILD":"production"}' },
  });
  const m = await import(pathToFileURL(file));
  const v = m.vouchers;

  // ── a recording Company OS (only what the writes need) ─────────────────────────────────────────────────────────
  const LOGIN = 'usr-login-1', PERSON = 'per-cust-1';
  const db = new Map();
  let clock = Date.parse('2026-11-02T15:00:00.000Z');
  /** Each record a minute after the previous one, so "newest first" is a real ordering. */
  const put = (entity, id, data) => { if (!db.has(entity)) db.set(entity, new Map()); const at = new Date(clock += 60_000).toISOString(); const rec = { id, data: { ...data }, createdAt: at, updatedAt: at }; db.get(entity).set(id, rec); return rec; };
  const rows = (entity) => [...(db.get(entity)?.values() ?? [])];
  let seq = 0;
  const newId = (entity) => `${entity}-new-${++seq}`;
  /** The server sets a voucher's code (8 of A–Z without I/O and 2–9) and uses; a lot's classes come from the voucher. */
  const serverSet = (entity) => (entity === 'voucher' ? { code: `K7M2QX${'ABCDEFGH'[seq % 8]}${'23456789'[seq % 8]}`, uses: 0 } : entity === 'credit_lot' ? { quantity: 2, source: 'courtesy', valid_until: '2026-11-30' } : {});
  /** Every write the connector sent: `{ via, op, entity, id?, data, key }`, one per record (a /batch op each). */
  let writes = [];
  const queries = [];
  const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  const matches = (rec, f) => !f || f.all || (f.and ? f.and.every((x) => matches(rec, x)) : f.op === 'eq' ? (f.field === 'id' ? rec.id : rec.data[f.field]) === (f.value?.$me ? LOGIN : f.value) : true);
  async function fetchApi(url, init = {}) {
    const u = new URL(url, 'http://hoy.test/');
    if (u.hostname === 'storage.test') return new Response(null, { status: 200 });
    if (u.pathname === '/app-config.json') return json(200, { tenant: 'hoy', apiBase: '/api/cos' });
    const path = u.pathname.replace(/^\/api\/cos\/t\/hoy/, '');
    const method = init.method ?? 'GET';
    const body = init.body ? JSON.parse(init.body) : undefined;
    const key = (init.headers ?? {})['idempotency-key'] ?? null;
    if (path === '/me') return json(200, { user: { id: LOGIN }, roleKeys: ['administrator'], caps: [], isSuperAdmin: false, tenant: { timezone: 'America/Bogota' } });
    if (path === '/query') {
      const all = rows(body.entity).filter((r) => matches(r, body.filter)).reverse(); // default order: newest first
      for (const s of [...(body.sort ?? [])].reverse()) all.sort((a, b) => String(a.data[s.field] ?? '').localeCompare(String(b.data[s.field] ?? '')) * (s.dir === 'desc' ? -1 : 1));
      queries.push(body);
      return json(200, { data: all.slice(body.offset ?? 0, (body.offset ?? 0) + (body.limit ?? 100)) });
    }
    if (path === '/batch') {
      const ids = [];
      for (const op of body.ops) {
        const data = op.data && Object.fromEntries(Object.entries(op.data).map(([k, val]) => [k, val && typeof val === 'object' && '$ref' in val ? ids[val.$ref] : val]));
        writes.push({ via: '/batch', op: op.op, entity: op.entity, id: op.id, data, key });
        ids.push(op.op === 'create' ? put(op.entity, newId(op.entity), { ...data, ...serverSet(op.entity) }).id : op.id);
      }
      return json(200, { ids });
    }
    if (path === '/files') return json(201, { file: { id: 'file-1', status: 'pending' }, uploadUrl: 'https://storage.test/upload/file-1' });
    if (/^\/files\/[^/]+\/confirm$/.test(path)) return json(200, { file: { id: 'file-1', status: 'ready' } });
    const one = path.match(/^\/api\/([a-z_]+)(?:\/([^/]+))?$/);
    if (one) {
      const [, entity, id] = one;
      if (method === 'POST') {
        writes.push({ via: `POST /api/${entity}`, op: 'create', entity, data: body, key });
        return json(201, { data: put(entity, newId(entity), { ...body, ...serverSet(entity) }) });
      }
      const rec = db.get(entity)?.get(decodeURIComponent(id));
      if (!rec) return json(404, { error: 'not found' });
      if (method === 'GET') return json(200, { data: rec });
      if (method === 'PATCH') { writes.push({ via: `PATCH /api/${entity}/:id`, op: 'update', entity, id: rec.id, data: body, key }); Object.assign(rec.data, body); return json(200, { data: rec }); }
    }
    return json(404, { error: 'not found' });
  }
  const provider = new m.CompanyOSProvider({ fetch: fetchApi, getToken: async () => 'tok-1', retryDelayMs: 1, sleep: async () => {} });
  const cos = m.cosOf(provider);
  const record = async (fn) => { writes = []; await fn(); return writes; };
  const KEY = () => crypto.randomUUID();

  // Fixtures in Company OS field names.
  put('person', PERSON, { name: 'Clienta Ficticia', user: LOGIN, email: 'clienta@demo.hoyos.test' });
  put('occurrence', 'occ-1', { title: 'Pulso', starts_at: '2026-11-03T12:00:00.000Z', capacity: 12 });
  put('occurrence', 'occ-2', { title: 'Pulso', starts_at: '2026-11-04T12:00:00.000Z', capacity: 12 });
  put('booking', 'bk-1', { occurrence: 'occ-1', person: PERSON, status: 'booked', entitlement: 'credit' });
  put('booking', 'bk-hold', { occurrence: 'occ-1', person: PERSON, status: 'held', entitlement: 'single' });
  put('product', 'prd-gift12', { key: 'gift_pack12', kind: 'gift', name: 'Regalo: 12 clases', credits: 12, price: 400000, active: true });
  put('product', 'prd-single', { key: 'single', kind: 'single', name: 'Clase suelta', credits: 1, price: 38000, active: true });
  const giftNotes = v.giftPaymentNotes({ name: 'Juliana Ficticia', email: 'juliana@demo.hoyos.test' });
  put('payment', 'pay-gift', { person: 'per-buyer', product: 'prd-gift12', status: 'pending', amount: 400000, date: '2026-11-01', concept: 'Regalo', method: 'transfer', notes: giftNotes });
  put('payment', 'pay-hold', { person: PERSON, product: 'prd-single', status: 'pending', amount: 38000, date: '2026-11-02', concept: 'Clase', method: 'cash', for_entity: 'booking', for_id: 'bk-hold' });
  put('voucher', 'vch-old', { kind: 'courtesy', classes: 1, max_uses: 1, code: 'ABCD2345', uses: 0, recipient_email: 'x@demo.hoyos.test' });
  const rec = (entity, id) => db.get(entity).get(id);

  /** The write keeps the entity's required fields and every expected field (with its value when given). */
  function keeps(w, expected = {}, { create = w.op === 'create' } = {}) {
    if (create) for (const f of REQUIRED[w.entity] ?? []) assert.ok(w.data[f] !== undefined && w.data[f] !== null && w.data[f] !== '', `${w.via} ${w.entity}: required field "${f}" is missing (${JSON.stringify(w.data)})`);
    for (const [f, want] of Object.entries(expected)) {
      assert.ok(f in w.data, `${w.via} ${w.entity}: "${f}" was dropped (${JSON.stringify(w.data)})`);
      if (want !== undefined) assert.deepEqual(w.data[f], want, `${w.via} ${w.entity}.${f}`);
    }
  }
  const only = (ws, n = 1) => { assert.equal(ws.length, n, `expected ${n} write(s), got ${JSON.stringify(ws)}`); return ws; };
  const keyed = (w) => assert.match(String(w.key), /^[A-Za-z0-9_-]{8,128}$/, `${w.via} ${w.entity}: no Idempotency-Key`);

  // ── vouchers (H-6, BO-01…BO-06) ────────────────────────────────────────────────────────────────────────────────
  await test("vouchers · redeem (BO-04): POST credit_lot with the caller's person (not the login id) and the code", async () => {
    const [w] = only(await record(() => v.redeemVoucher(provider, 'k7m2-qx9a', KEY())));
    assert.equal(w.via, 'POST /api/credit_lot'); keyed(w);
    keeps(w, { person: PERSON, voucher_code: 'K7M2QX9A' });
    assert.deepEqual(Object.keys(w.data).sort(), ['person', 'voucher_code'], 'only person and code: the voucher decides the lot');
    assert.equal(m.adapterFor('credit_lots'), null, 'the table the screen used to write has no adapter (it refused not_in_launch): the screen now uses the raw port');
  });
  await test('vouchers · courtesy (BO-03): every Company OS field reaches the server', async () => {
    const body = v.courtesyBody({ classes: '3', validUntil: '2026-11-30', maxUses: '10', name: 'Invitada Ficticia', email: 'invitada@demo.hoyos.test' });
    const [w] = only(await record(() => v.createVoucher(provider, body, KEY())));
    assert.equal(w.via, 'POST /api/voucher'); keyed(w);
    keeps(w, body);
    const viaTable = m.toData(m.adapterFor('vouchers'), body, 'create');
    assert.ok(!('kind' in viaTable) && !('recipient_email' in viaTable), 'the review-shape vouchers adapter would have dropped them (why the screen does not use it)');
  });
  await test('vouchers · gift issue at the desk (BO-02): product, buyer, recipient and the payment note reach the server', async () => {
    const products = v.giftProducts(await provider.list('plans'));
    const payment = v.giftPayment({ id: 'pay-gift', user_id: 'per-buyer', plan_id: 'prd-gift12', status: 'approved', note: giftNotes, amount: 400000 });
    const [w] = only(await record(() => v.issueGiftVoucher(provider, payment, products.find((p) => p.id === 'prd-gift12'), v.parseGiftNotes(giftNotes), '', KEY())));
    assert.equal(w.via, 'POST /api/voucher'); keyed(w);
    keeps(w, { kind: 'gift', product: 'prd-gift12', classes: 12, max_uses: 1, recipient_name: 'Juliana Ficticia', recipient_email: 'juliana@demo.hoyos.test', buyer: 'per-buyer', note: 'payment:pay-gift' });
  });
  await test('vouchers · gift in the approval batch (BO-02, H-5 hook): one /batch approves the payment and creates the voucher', async () => {
    const off = m.registerApprovalOps(v.giftVoucherOps);
    try {
      const ops = m.reviewOps({ payment: rec('payment', 'pay-gift'), product: rec('product', 'prd-gift12'), decision: 'approve', amountReceived: 400000, reason: '' });
      const ws = only(await record(() => m.runPaymentOps(cos, ops, KEY())), 2);
      ws.forEach(keyed);
      keeps(ws[0], { status: 'approved', amount: 400000 });
      assert.equal(ws[1].entity, 'voucher');
      keeps(ws[1], { kind: 'gift', product: 'prd-gift12', buyer: 'per-buyer', note: 'payment:pay-gift', recipient_email: 'juliana@demo.hoyos.test' });
    } finally { off(); }
  });
  await test('vouchers · list (M-13, S-08): /query voucher rows read back in Company OS names, so issued gifts leave the desk list', async () => {
    queries.length = 0;
    const list = await v.listVouchers(provider);
    assert.deepEqual(queries.map((q) => [q.entity, q.sort, q.limit, q.offset]), [['voucher', [{ field: 'code', dir: 'asc' }], 500, 0]], 'one page sorted by the unique code');
    const gifts = list.filter((x) => x.note === 'payment:pay-gift');
    assert.equal(gifts.length, 2, 'the desk issue and the approval batch above each made one');
    assert.ok(gifts.every((g) => g.kind === 'gift' && g.classes === 12 && v.isCode(g.code) && g.buyer === 'per-buyer'), JSON.stringify(gifts));
    assert.deepEqual(list.map((x) => x.created_at), [...list.map((x) => x.created_at)].sort().reverse(), 'newest first');
    assert.ok(new Set(list.map((x) => x.created_at)).size === list.length && list[0].id !== 'vch-old', 'distinct times, the fixture voucher last');
    assert.ok(list.every(v.isCosVoucher), 'every row is a Company OS voucher');
    const payments = await provider.list('payments');
    const waiting = v.giftsToIssue(payments, v.giftProducts(await provider.list('plans')), list);
    assert.ok(!waiting.some((w) => w.payment.id === 'pay-gift'), 'the approved gift payment is not offered for issue again');
  });

  // ── payments and transfers (H-5, PG) ───────────────────────────────────────────────────────────────────────────
  await test('payments · transfer purchase (PG-02): the pending payment keeps person, product, amount, date, concept and the gift notes', async () => {
    const [w] = only(await record(() => m.runPaymentOps(cos, m.transferOps({ person: PERSON, product: rec('product', 'prd-gift12'), today: '2026-11-02', reference: 'Bancolombia 123', concept: 'Regalo: 12 clases', notes: giftNotes }), KEY())));
    keyed(w); keeps(w, { person: PERSON, product: 'prd-gift12', amount: 400000, method: 'transfer', status: 'pending', notes: giftNotes });
  });
  await test('payments · confirm and reject (PG-04): status, amount and reason reach the payment', async () => {
    const approve = only(await record(() => m.runPaymentOps(cos, m.reviewOps({ payment: rec('payment', 'pay-hold'), product: rec('product', 'prd-single'), decision: 'approve', amountReceived: 35000, reason: 'Descuento acordado', checkInBooking: 'bk-hold' }), KEY())), 2);
    keeps(approve[0], { status: 'approved', amount: 35000, price_override_reason: 'Descuento acordado' });
    keeps(approve[1], { status: 'checked_in' });
    rec('payment', 'pay-hold').data.status = 'pending';
    const [decline] = only(await record(() => m.runPaymentOps(cos, m.reviewOps({ payment: rec('payment', 'pay-hold'), product: null, decision: 'decline', amountReceived: 0, reason: 'No llegó' }), KEY())));
    keeps(decline, { status: 'declined', notes: 'No llegó' });
  });
  await test('payments · the desk takes the money (PG-07): an approved payment with method and reference', async () => {
    const [w] = only(await record(() => m.runPaymentOps(cos, m.deskOps({ person: PERSON, product: rec('product', 'prd-single'), amount: 38000, method: 'card_terminal', reference: 'TX-1', reason: '', today: '2026-11-02', concept: 'Clase suelta', booking: 'bk-hold' }), KEY())));
    keyed(w); keeps(w, { person: PERSON, product: 'prd-single', amount: 38000, method: 'card_terminal', status: 'approved', reference: 'TX-1', for_entity: 'booking', for_id: 'bk-hold' });
  });
  await test('payments · receipt for a held class (J1, /app/pay/booking/:id): the pending payment names the single-class product and the booking', async () => {
    const [w] = only(await record(() => m.runPaymentOps(cos, m.transferOps({ person: PERSON, product: rec('product', 'prd-single'), today: '2026-11-02', reference: '', booking: 'bk-hold', concept: 'Clase suelta' }), KEY())));
    keyed(w); keeps(w, { person: PERSON, product: 'prd-single', amount: 38000, method: 'transfer', status: 'pending', for_entity: 'booking', for_id: 'bk-hold' });
  });

  // ── bookings (H-4, RS) ─────────────────────────────────────────────────────────────────────────────────────────
  await test('bookings · create from the balance (RS-02) and a held single class (RS-03)', async () => {
    const [credit] = only(await record(() => m.bookOnServer(provider, { userId: LOGIN, sessionId: 'occ-1', paidWith: 'package', matNumber: 4 }, KEY())));
    keyed(credit); keeps(credit, { occurrence: 'occ-1', person: PERSON, entitlement: 'credit', status: 'booked', spot: 4 });
    const [single] = only(await record(() => m.bookOnServer(provider, { userId: LOGIN, sessionId: 'occ-1', paidWith: 'single' }, KEY())));
    keeps(single, { occurrence: 'occ-1', person: PERSON, entitlement: 'single', payment_method: 'transfer' });
  });
  await test('bookings · move (RS-09): the new occurrence and mat reach the booking', async () => {
    const [w] = only(await record(() => m.moveOnServer(provider, { bookingId: 'bk-1', toSessionId: 'occ-2', matNumber: 7 }, KEY())));
    assert.equal(w.id, 'bk-1'); keeps(w, { occurrence: 'occ-2', spot: 7 });
  });
  await test('bookings · cancel (J3): status cancelled reaches the booking', async () => {
    const [w] = only(await record(() => m.cancelOnServer(provider, { bookingId: 'bk-1' }, KEY())));
    assert.equal(w.id, 'bk-1'); keeps(w, { status: 'cancelled' });
  });

  // ── front desk (H-7, RC) ───────────────────────────────────────────────────────────────────────────────────────
  const desk = m.serverDesk(provider, (method, path, body, opts) => provider.request(method, path, body, opts));
  await test('staff · check-in, no-show and undo (RC-02): the status (and the undo reason) reach the booking', async () => {
    const booking = { id: 'bk-1', status: 'booked' };
    keeps(only(await record(() => desk.attendance({ booking, to: 'checked_in', key: KEY() })))[0], { status: 'checked_in' });
    keeps(only(await record(() => desk.attendance({ booking, to: 'no_show', key: KEY() })))[0], { status: 'no_show' });
    keeps(only(await record(() => desk.attendance({ booking, to: 'booked', reason: 'Marcado por error', key: KEY() })))[0], { status: 'booked', reason: 'Marcado por error' });
  });
  await test('staff · book a customer at the desk (RC-04) and check them in', async () => {
    const ws = await record(() => desk.book({ personId: PERSON, sessionId: 'occ-2', checkIn: true, key: KEY() }));
    keeps(ws[0], { occurrence: 'occ-2', person: PERSON, entitlement: 'credit', source: 'desk' });
    keeps(ws[1], { status: 'checked_in' });
  });
  await test('staff · sale to a walk-in (RC-05/RC-10): person, member, consents, payment and booking in one keyed /batch', async () => {
    const ws = await record(() => desk.sell({ person: { new: { name: 'Nueva Ficticia', phone: '+573001112233', email: 'Nueva@demo.hoyos.test' }, consents: [{ policy: 'terms', version: '2026-10-01' }, { policy: 'privacy', version: '2026-10-01' }] }, productId: 'prd-single', price: 38000, amountReceived: 38000, method: 'cash', concept: 'Clase suelta', today: '2026-11-02', sessionId: 'occ-2', checkIn: false, key: KEY() }));
    assert.deepEqual(ws.map((w) => w.entity), ['person', 'member', 'policy_acceptance', 'policy_acceptance', 'payment', 'booking']);
    ws.forEach((w) => { keyed(w); keeps(w); });
    keeps(ws[0], { name: 'Nueva Ficticia', phone: '+573001112233', email: 'nueva@demo.hoyos.test' });
    keeps(ws[4], { product: 'prd-single', amount: 38000, method: 'cash', status: 'approved', person: ws[0].data.person ?? ws[1].data.person });
    keeps(ws[5], { occurrence: 'occ-2', entitlement: 'credit' });
  });
  await test('staff · approve a held class at the door and check in (J1c): one /batch', async () => {
    rec('payment', 'pay-hold').data.status = 'pending';
    const ws = only(await record(() => desk.approveAndCheckIn({ paymentId: 'pay-hold', bookingId: 'bk-hold', amountReceived: 38000, price: 38000, key: KEY() })), 2);
    ws.forEach(keyed);
    assert.deepEqual(ws.map((w) => [w.via, w.entity]), [['/batch', 'payment'], ['/batch', 'booking']]);
    keeps(ws[0], { status: 'approved', amount: 38000 }); keeps(ws[1], { status: 'checked_in' });
  });

  // ── settings (M-08, AD-05) ─────────────────────────────────────────────────────────────────────────────────────
  await test('settings · tenants → setting: the first save creates studio_settings with the whole JSON, the next one updates it', async () => {
    const settings = { openingHours: { mon: [['06:00', '21:00']] }, lateCancelHours: 12 };
    const [create] = only(await record(() => provider.update('tenants', 'ten_hoy', { settings })));
    assert.equal(create.via, 'POST /api/setting'); keyed(create);
    keeps(create, { key: 'studio_settings', value: settings });
    const next = { ...settings, lateCancelHours: 6 };
    const [update] = only(await record(() => provider.update('tenants', 'ten_hoy', { settings: next })));
    assert.equal(update.via, 'PATCH /api/setting/:id'); keeps(update, { value: next });
  });

  // ── tables the production bundle writes without an adapter ─────────────────────────────────────────────────────
  await test('production bundle: every table a shipped screen writes has an adapter, apart from the known gaps of other lanes', async () => {
    let dir = process.env.QA_PROD_DIST;
    if (!dir) {
      dir = join(scratch, 'dist');
      execFileSync('npx', ['vite', 'build', '--outDir', dir, '--emptyOutDir', '--logLevel', 'error'], { env: { ...process.env, VITE_HOY_BUILD: 'production' }, stdio: 'inherit' });
    }
    const assets = join(dir, 'assets');
    const files = (await readdir(assets)).filter((f) => f.endsWith('.js'));
    const written = new Map();
    for (const f of files) for (const [, how, table] of (await readFile(join(assets, f), 'utf8')).matchAll(/\.(insert|update|remove)\("([a-z_]+)"/g)) written.set(table, [...new Set([...(written.get(table) ?? []), how])]);
    assert.ok(written.size > 0, `no table writes found in ${assets}: not a production build?`);
    const missing = [...written.keys()].filter((t) => !m.adapterFor(t)).sort();
    console.log(`     the production bundle writes ${written.size} tables; ${missing.length} have no adapter (they refuse not_in_launch if reached):`);
    console.log(`     ${missing.map((t) => `${t} (${written.get(t).join('/')})`).join(', ')}`);
    console.log('     most belong to screens outside the launch routes (code split into shared chunks); the launch gaps, owned by other lanes:');
    for (const [t, why] of Object.entries(KNOWN_GAPS)) console.log(`     - ${t}: ${m.adapterFor(t) ? 'adapter present; ' : ''}${why}`);
    for (const t of ['vouchers', 'credit_lots']) assert.ok(!written.get(t)?.includes('insert'), `a shipped screen still inserts into "${t}" (vouchers go through the raw port)`);
  });
} finally { await rm(scratch, { recursive: true, force: true }); }
console.log(failed ? `\n${failed} connector contract test(s) failed (${passed} passed)` : `\nconnector contract: ${passed} tests passed`);
process.exitCode = failed ? 1 : 0;
