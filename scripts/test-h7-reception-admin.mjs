// H-7 · named tests for the reception and administration launch rows (RC-01…RC-05, RC-10, AD-01, AD-02, AD-05…AD-07).
// Fictional fixtures only; a fake Company OS `request` records every call. No network, no browser.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const scratch = await mkdtemp(join(tmpdir(), 'hoy-h7-'));
const values = new Map();
globalThis.localStorage = { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) };
let passed = 0;
const row = async (name, fn) => { await fn(); passed++; console.log(`PASS ${name}`); };

/** A fake Company OS: records calls, answers batches with ids, refuses with a code when told to. */
function fakeCos() {
  const calls = [];
  let refuse = null, n = 0;
  const request = async (method, path, body, options) => {
    calls.push({ method, path, body: structuredClone(body), key: options?.idempotencyKey });
    if (refuse) { const e = Object.assign(new Error(refuse), { code: refuse, status: 422 }); refuse = null; throw e; }
    if (path === '/batch') {
      // The required fields of the launch entities (Company OS module schemas), so a missing one fails like the API (400).
      const REQUIRED = { payment: ['person', 'date', 'amount', 'concept'], person: ['name'], member: ['person'], booking: ['occurrence', 'person'], policy_acceptance: ['person', 'policy', 'version'], schedule: ['title', 'weekday', 'start_time'], resource: ['name'], coach: ['person'], occurrence: [] };
      body.ops.forEach((op, i) => {
        if (op.op === 'create' && REQUIRED[op.entity]) for (const f of REQUIRED[op.entity]) if (op.data[f] == null || op.data[f] === '') throw Object.assign(new Error('validation'), { code: 'validation', status: 400, opIndex: i, field: `${op.entity}.${f}` });
        for (const v of Object.values(op.data ?? {})) if (v && typeof v === 'object' && '$ref' in v && !(v.$ref < i)) throw Object.assign(new Error('invalid_ref'), { code: 'invalid_ref', opIndex: i });
        if (op.op !== 'create' && !op.id) throw Object.assign(new Error('invalid body'), { code: 'invalid body', opIndex: i });
      });
      return { ids: body.ops.map(op => op.id ?? `new_${++n}`) };
    }
    return { data: {} };
  };
  return { request, calls, refuseNext: code => { refuse = code; } };
}

/** A fake production provider: `update`/`insert` and `atomic` groups are recorded; a refusal is thrown with its code. */
function fakeProvider(cos) {
  const writes = [];
  let refuse = null, n = 0;
  const fail = () => { if (refuse) { const code = refuse; refuse = null; throw Object.assign(new Error(code), { code, status: 422 }); } };
  const tx = group => ({
    insert: async (table, row) => { group.push(['insert', table, structuredClone(row)]); return { id: `tok_${++n}`, ...row }; },
    update: async (table, id, patch) => { group.push(['update', table, id, structuredClone(patch)]); return { id, ...patch }; },
  });
  return {
    name: 'companyos', writes, refuseNext: code => { refuse = code; }, request: cos?.request,
    async update(table, id, patch) { fail(); writes.push({ key: null, ops: [['update', table, id, structuredClone(patch)]] }); return { id, ...patch }; },
    async atomic(fn, options) { fail(); const group = []; const result = await fn(tx(group)); writes.push({ key: options?.idempotencyKey, ops: group }); return result; },
  };
}

try {
  const file = join(scratch, 'h7.mjs');
  await build({
    stdin: { contents: [
      "export * from './src/modules/staff/desk/deskCommands';",
      "export * from './src/modules/staff/desk/deskFigures';",
      "export { deskErrorText, deskStrings, DESK_CODES } from './src/modules/staff/desk/strings';",
      "export { batch, errorCode, createActionKeys } from './src/modules/staff/desk/wire';",
      "export { personMatches, phoneKey } from './src/modules/staff/people';",
      "export * from './src/modules/classSchedule/live/scheduleOps';",
      "export * from './src/modules/admin/reception/reviewHours';",
      "export * from './src/modules/admin/team/teamApi';",
      "export * from './src/modules/admin/customers/customerBalances';",
      "export { MockProvider } from './src/data/MockProvider';",
      "export { strings as adminStrings } from './src/modules/admin/strings';",
      "export { setReceptionAttendance } from './src/data/receptionAttendance';",
    ].join('\n'), resolveDir: process.cwd() },
    bundle: true, format: 'esm', platform: 'node', outfile: file, logLevel: 'silent', jsx: 'automatic',
    define: { 'import.meta.env.VITE_HOY_BUILD': '"review"', 'import.meta.env.DEV': 'false' },
  });
  const m = await import(pathToFileURL(file));
  const t = (key, vars) => { const e = m.deskStrings[key]; assert.ok(e, `missing copy ${key}`); return Object.entries(vars ?? {}).reduce((s, [k, v]) => s.replace(`{${k}}`, String(v)), e.es); };
  const tEn = key => m.deskStrings[key].en;

  await row('RC-01 front desk home: arrivals, expected, pending payments and next class from one source match the check-in counter', () => {
    const now = Date.parse('2026-11-02T13:30:00Z');
    const s = (id, start, status = 'scheduled') => ({ id, starts_at: start, ends_at: new Date(Date.parse(start) + 50 * 60000).toISOString(), status });
    const sessions = [s('a', '2026-11-02T12:00:00Z'), s('b', '2026-11-02T14:00:00Z'), s('c', '2026-11-02T16:00:00Z', 'cancelled'), s('d', '2026-11-03T12:00:00Z')];
    const b = (session_id, status) => ({ id: `${session_id}${status}${Math.random()}`, session_id, status });
    const bookings = [b('a', 'checked_in'), b('a', 'checked_in'), b('a', 'no_show'), b('b', 'booked'), b('b', 'held'), b('b', 'cancelled'), b('c', 'booked'), b('d', 'booked')];
    const payments = [{ status: 'pending' }, { status: 'pending' }, { status: 'approved' }, { status: 'declined' }];
    const f = m.deskFigures({ sessions, bookings, payments, now, isToday: iso => iso.startsWith('2026-11-02') });
    assert.deepEqual({ arrivals: f.arrivals, expected: f.expected, noShows: f.noShows, pending: f.pendingPayments, classes: f.classesToday, next: f.next?.id }, { arrivals: 2, expected: 2, noShows: 1, pending: 2, classes: 2, next: 'b' });
    // The check-in header for each class adds up to the home tiles: same statuses, same rows.
    const perClass = ['a', 'b'].map(id => m.sessionCounter(bookings.filter(x => x.session_id === id)));
    assert.equal(perClass.reduce((a, c) => a + c.arrived, 0), f.arrivals);
    assert.equal(perClass.reduce((a, c) => a + (c.holding - c.arrived), 0), f.expected);
    assert.equal(payments.filter(m.isPendingPayment).length, f.pendingPayments);
    assert.equal(m.deskFigures({ sessions: [], bookings: [], payments: [], now, isToday: () => true }).next, null, 'empty day: no next class');
  });

  await row('RC-02 attendance: Arrived and No-show are one write each; undo needs a reason and sends it; a refusal comes back as its code', async () => {
    const data = fakeProvider(fakeCos()), desk = m.serverDesk(data, data.request, () => '2026-11-02');
    const booking = { id: 'bk1', session_id: 'oc1', user_id: 'p1', status: 'booked' };
    await desk.attendance({ booking, to: 'checked_in', key: 'k-arrive-0001' });
    await desk.attendance({ booking, to: 'no_show', key: 'k-noshow-0001' });
    await assert.rejects(desk.attendance({ booking: { ...booking, status: 'checked_in' }, to: 'booked', key: 'k-undo-0001' }), /reason_required/);
    await desk.attendance({ booking: { ...booking, status: 'checked_in' }, to: 'booked', reason: ' marked by mistake ', key: 'k-undo-0002' });
    assert.deepEqual(data.writes.map(w => w.ops[0]), [
      ['update', 'bookings', 'bk1', { status: 'checked_in' }],
      ['update', 'bookings', 'bk1', { status: 'no_show' }],
      ['update', 'bookings', 'bk1', { status: 'booked', reason: 'marked by mistake' }],
    ]);
    data.refuseNext('invalid_transition');
    await assert.rejects(desk.attendance({ booking, to: 'checked_in', key: 'k' }), e => m.errorCode(e) === 'invalid_transition');
    assert.match(m.deskErrorText('invalid_transition', t), /no está permitido/);
    // Review build: the browser command also refuses an undo without a reason (and keeps it in the audit row with one).
    const mock = new m.MockProvider();
    const session = mock.peek('class_sessions').find(x => x.status === 'scheduled' && Date.parse(x.starts_at) > Date.now() + 3600000);
    const user = mock.peek('users')[0];
    await mock.insert('bookings', { id: 'qa_h7_b', user_id: user.id, session_id: session.id, status: 'checked_in', paid_with: 'package', checked_in_at: new Date().toISOString(), ledger_id: null });
    const b = mock.peek('bookings').find(x => x.id === 'qa_h7_b');
    const input = reason => ({ actorId: 'usr_desk', role: 'front_desk', bookingId: b.id, sessionId: b.session_id, userId: b.user_id, requestId: `h7-${reason ?? 'none'}`, status: 'booked', reason, before: { status: b.status, checked_in_at: b.checked_in_at, updated_at: b.updated_at } });
    await assert.rejects(m.setReceptionAttendance(mock, input(undefined)), /reason_required/);
    await m.setReceptionAttendance(mock, input('wrong person'));
    assert.equal(mock.peek('audit_log').find(a => a.id === 'reception_attendance_h7-wrong person').diff.reason, 'wrong person');
  });

  await row('RC-03 search people: name without accents, WhatsApp with or without +57 and separators, email; anyone, booked or not', () => {
    const p = { name: 'María José Ruíz', phone: '+57 300 123 4567', email: 'mj.ruiz@example.invalid' };
    for (const q of ['maria', 'RUIZ', 'josé', '3001234567', '300-123-4567', '+57 300 123', '573001234567', 'mj.ruiz@', 'EXAMPLE.INVALID']) assert.equal(m.personMatches(p, q), true, q);
    for (const q of ['pedro', '3109999999', '12', 'otro@example.invalid']) assert.equal(m.personMatches(p, q), false, q);
    assert.equal(m.personMatches({ ...p, phone: null }, '300'), false, 'no phone never matches digits');
    assert.equal(m.phoneKey('573001234567'), '3001234567');
    assert.equal(m.phoneKey('3001234567'), '3001234567');
  });

  await row('RC-04 book for a customer: one keyed atomic write of the desk credit booking; the server rules decide; a retry reuses the key', async () => {
    const data = fakeProvider(fakeCos()), desk = m.serverDesk(data, data.request, () => '2026-11-02');
    const r = await desk.book({ personId: 'p1', sessionId: 'oc1', checkIn: false, key: 'key-book-0001' });
    assert.deepEqual(data.writes[0], { key: 'key-book-0001', ops: [['insert', 'bookings', { user_id: 'p1', session_id: 'oc1', paid_with: 'package', source: 'desk' }]] });
    assert.equal(r.bookingId, 'tok_1');
    for (const code of ['occurrence_full', 'no_credits', 'daily_limit_reached', 'lot_expired']) {
      data.refuseNext(code);
      await assert.rejects(desk.book({ personId: 'p1', sessionId: 'oc1', checkIn: false, key: 'key-book-0002' }), e => m.errorCode(e) === code);
      assert.notEqual(t(`desk.error.${code}`), '', code); assert.ok(tEn(`desk.error.${code}`));
    }
    assert.equal(data.writes.length, 1, 'a refused write records nothing');
    assert.match(m.deskErrorText('some_new_code', t), /some_new_code/, 'unknown code: generic copy with the code');
  });

  await row('RC-05 walk-in: a new person, member facet and verbal consents are created with the approved desk payment in one batch', async () => {
    const cos = fakeCos(), data = fakeProvider(cos), desk = m.serverDesk(data, cos.request, () => '2026-11-02');
    const res = await desk.sell({ person: { new: { name: ' Ana Gómez ', phone: '+57 300 000 0001', email: 'ANA@example.invalid' }, consents: m.DESK_CONSENTS }, productId: 'prod_trial', price: 30000, amountReceived: 30000, method: 'cash', concept: 'Clase de prueba', today: '2026-11-02', key: 'key-walkin-0001' });
    const [call] = cos.calls;
    assert.equal(call.key, 'key-walkin-0001');
    assert.deepEqual(call.body.ops.map(o => o.entity), ['person', 'member', 'policy_acceptance', 'policy_acceptance', 'payment']);
    assert.deepEqual(call.body.ops[0].data, { name: 'Ana Gómez', phone: '+57 300 000 0001', whatsapp: '+57 300 000 0001', email: 'ana@example.invalid' });
    assert.deepEqual(call.body.ops[1].data, { person: { $ref: 0 }, source: 'desk', status: 'active', joined_at: '2026-11-02' });
    assert.deepEqual(call.body.ops.slice(2, 4).map(o => o.data), m.DESK_CONSENTS.map(c => ({ person: { $ref: 0 }, ...c })));
    assert.deepEqual(call.body.ops[4].data, { person: { $ref: 0 }, product: 'prod_trial', date: '2026-11-02', amount: 30000, concept: 'Clase de prueba', method: 'cash', provider: 'manual', status: 'approved' });
    assert.deepEqual(res, { personId: 'new_1', paymentId: 'new_5', bookingId: null, checkedIn: false });
    // An existing customer checks in and the class comes from their package: a credit booking, then arrival.
    const data2 = fakeProvider(fakeCos()), desk2 = m.serverDesk(data2, data2.request, () => '2026-11-02');
    await desk2.book({ personId: 'p9', sessionId: 'oc1', checkIn: true, key: 'key-walkin-0002' });
    assert.deepEqual(data2.writes.map(w => [w.key, w.ops[0][0], w.ops[0][1]]), [['key-walkin-0002', 'insert', 'bookings'], [null, 'update', 'bookings']]);
    assert.deepEqual(data2.writes[1].ops[0], ['update', 'bookings', 'tok_1', { status: 'checked_in' }]);
  });

  await row('RC-10 sell and check in: payment, then the booking that spends it, then arrival; a price difference needs a reason; J1c approves then checks in in one batch', async () => {
    const cos = fakeCos(), data = fakeProvider(cos), desk = m.serverDesk(data, cos.request, () => '2026-11-02');
    await assert.rejects(desk.sell({ person: { id: 'p1' }, productId: 'prod_single', price: 38000, amountReceived: 35000, method: 'cash', concept: 'Clase', today: '2026-11-02', sessionId: 'oc1', checkIn: true, key: 'k-sale-0001' }), /reason_required/);
    assert.equal(cos.calls.length, 0, 'nothing is sent without the reason');
    const res = await desk.sell({ person: { id: 'p1' }, productId: 'prod_single', price: 38000, amountReceived: 35000, reason: 'Descuento acordado', method: 'card_terminal', concept: 'Clase', today: '2026-11-02', sessionId: 'oc1', checkIn: true, key: 'k-sale-0002' });
    const ops = cos.calls[0].body.ops;
    assert.deepEqual(ops.map(o => [o.op, o.entity]), [['create', 'payment'], ['create', 'booking']]);
    assert.equal(ops[0].data.price_override_reason, 'Descuento acordado');
    assert.equal(ops[0].data.amount, 35000);
    assert.deepEqual(ops[1].data, { occurrence: 'oc1', person: 'p1', entitlement: 'credit', source: 'desk' });
    assert.equal(cos.calls.length, 1);
    assert.deepEqual(data.writes[0].ops[0], ['update', 'bookings', 'new_2', { status: 'checked_in' }], 'arrival through the provider, so the screens refetch');
    assert.deepEqual(res, { personId: 'p1', paymentId: 'new_1', bookingId: 'new_2', checkedIn: true });
    // The arrival fails after the sale is saved: the result says so and nothing is sold again.
    data.refuseNext('occurrence_not_open');
    const late = await desk.sell({ person: { id: 'p1' }, productId: 'prod_single', price: 38000, amountReceived: 38000, method: 'transfer', reference: 'TRX-1', concept: 'Clase', today: '2026-11-02', sessionId: 'oc1', checkIn: true, key: 'k-sale-0003' });
    assert.deepEqual(late, { personId: 'p1', paymentId: 'new_3', bookingId: 'new_4', checkedIn: false, checkInError: 'occurrence_not_open' });
    assert.equal(cos.calls.at(-1).body.ops[0].data.reference, 'TRX-1');
    await assert.rejects(desk.sell({ person: { id: 'p1' }, productId: 'prod_single', price: 38000, amountReceived: 38000, method: 'cash', concept: ' ', today: '2026-11-02', key: 'k-sale-0004' }), e => e.field === 'payment.concept', 'the fake API refuses a payment without its required fields');
    // J1c: the receipt is pending, the customer is at the door.
    const j = fakeProvider(fakeCos()), dj = m.serverDesk(j, j.request, () => '2026-11-02');
    await dj.approveAndCheckIn({ paymentId: 'pay1', bookingId: 'bk1', amountReceived: 38000, price: 38000, key: 'k-j1c-0001' });
    assert.equal(j.writes.length, 1, 'one transaction');
    assert.deepEqual(j.writes[0], { key: 'k-j1c-0001', ops: [
      ['update', 'payments', 'pay1', { status: 'approved', amount_paid: 38000 }],
      ['update', 'bookings', 'bk1', { status: 'checked_in' }],
    ] });
    await dj.approveAndCheckIn({ paymentId: 'pay2', bookingId: 'bk2', amountReceived: 30000, price: 38000, reason: 'Transferencia parcial', key: 'k-j1c-0003' });
    assert.equal(j.writes[1].ops[0][3].price_override_reason, 'Transferencia parcial');
    await assert.rejects(dj.approveAndCheckIn({ paymentId: 'pay1', bookingId: 'bk1', amountReceived: 30000, price: 38000, key: 'k-j1c-0002' }), /reason_required/);
  });

  await row('Duplicate taps: every multi-record write is one /batch carrying the action key; an empty batch sends nothing', async () => {
    let made = 0;
    const keys = m.createActionKeys(() => `key-${String(++made).padStart(4, '0')}`);
    const intent = ['book', 'u1', 'p1', 'oc1', 'booked'];
    assert.equal(keys.keyFor(intent), 'key-0001');
    assert.equal(keys.keyFor([...intent]), 'key-0001', 'a retry (double tap, lost answer) reuses the key');
    assert.equal(keys.keyFor([...intent.slice(0, 4), 'checked_in']), 'key-0002', 'a changed input is a new action with a new key');
    keys.done(intent);
    assert.equal(keys.keyFor(intent), 'key-0003', 'after a success the same button is a new action');
    const cos = fakeCos();
    assert.deepEqual(await m.batch(cos.request, [], 'k-empty-0001'), []);
    assert.equal(cos.calls.length, 0);
    await m.batch(cos.request, m.createCoachOps({ name: 'Profe', active: true }), 'k-coach-0001');
    await m.batch(cos.request, m.cancelOccurrenceOps('oc1', 'Lluvia'), 'k-cancel-0001');
    assert.ok(cos.calls.every(c => c.path === '/batch' && /^[A-Za-z0-9_-]{8,128}$/.test(c.key)), 'every batch has a valid key');
  });

  await row('AD-01 classes, schedule, teachers and rooms: :00 starts, 50-minute classes, room capacity with numbered mats, publish/unpublish, a teacher is a person + coach', () => {
    const d = { title: 'Alineación', weekday: 1, start_time: '07:00', resource: 'room16', coach: 'c1', capacity: 16, valid_from: '2026-11-01', valid_until: '', active: true };
    assert.deepEqual(m.scheduleProblems(d, 16), []);
    assert.deepEqual(m.scheduleProblems({ ...d, start_time: '07:30' }, 16), ['on_the_hour']);
    assert.deepEqual(m.scheduleProblems({ ...d, capacity: 9 }, 8), ['capacity'], 'the 8-mat room takes at most 8');
    assert.deepEqual(m.scheduleProblems({ ...d, title: ' ', coach: '', resource: '' }, undefined), ['title', 'resource', 'coach']);
    assert.deepEqual(m.createScheduleOps(d)[0].data, { title: 'Alineación', kind: 'class', weekday: 1, start_time: '07:00', duration_minutes: 50, resource: 'room16', coach: 'c1', capacity: 16, spots_enabled: true, valid_from: '2026-11-01', valid_until: null, active: true });
    assert.deepEqual(m.publishScheduleOps('s1', false), [{ op: 'update', entity: 'schedule', id: 's1', data: { active: false } }]);
    assert.deepEqual(m.generateOps('2026-11-30'), [{ op: 'create', entity: 'generation_request', data: { until: '2026-11-30' } }]);
    assert.deepEqual(m.createResourceOps({ name: ' Salón 2 ', capacity: 8 })[0].data, { name: 'Salón 2', kind: 'room', capacity: 8 });
    const coach = m.createCoachOps({ name: 'Laura', email: 'LAURA@example.invalid', active: true });
    assert.deepEqual(coach, [{ op: 'create', entity: 'person', data: { name: 'Laura', email: 'laura@example.invalid' } }, { op: 'create', entity: 'coach', data: { person: { $ref: 0 }, kind: 'teacher', active: true } }]);
    assert.deepEqual(m.WEEKDAYS, [1, 2, 3, 4, 5, 6, 0]);
  });

  await row('AD-02 studio cancel: one guarded write with the reason; the server cancels the bookings, returns the classes and the automation emails everyone', () => {
    assert.deepEqual(m.cancelOccurrenceOps('oc1', '  Corte de luz  '), [{ op: 'update', entity: 'occurrence', id: 'oc1', data: { status: 'cancelled', cancel_reason: 'Corte de luz' }, ifMatch: { field: 'status', value: 'scheduled' } }]);
  });

  await row('AD-05 reception hours: weekly windows and closed days round-trip in the bookings 1.4.0 format; Sunday rule notice (Q-15)', () => {
    // The Company OS parser's entry pattern (bookings review-hours.ts).
    const ENTRY = /^([a-z]{3})(?:-([a-z]{3}))?\s+(\d{2}:\d{2})-(\d{2}:\d{2})$/;
    const week = m.parseWeek('mon-fri 08:00-20:00, sat 08:00-13:00');
    assert.equal(week[0], null, 'Sunday closed');
    assert.deepEqual(week[6], { open: '08:00', close: '13:00' });
    const text = m.formatWeek(week);
    assert.equal(text, 'mon 08:00-20:00, tue 08:00-20:00, wed 08:00-20:00, thu 08:00-20:00, fri 08:00-20:00, sat 08:00-13:00');
    assert.ok(text.split(', ').every(e => ENTRY.test(e)));
    assert.deepEqual(m.parseWeek(text), week);
    assert.deepEqual(m.parseWeek('sat-mon 09:00-12:00').map(w => !!w), [true, true, false, false, false, false, true], 'a wrapping range');
    assert.deepEqual(m.weekProblems([null, { open: '20:00', close: '08:00' }, { open: '8', close: '9' }, null, null, null, null]), [{ day: 1, problem: 'order' }, { day: 2, problem: 'time' }]);
    assert.equal(m.formatDates(['2026-12-25', 'bad', '2026-12-08', '2026-12-25']), '2026-12-08, 2026-12-25');
    assert.deepEqual(m.parseDates('2026-12-25 2026-12-08,2026-12-08'), ['2026-12-08', '2026-12-25']);
    assert.equal(m.sundayNeedsNotice(week, 2), true);
    assert.equal(m.sundayNeedsNotice(week, 0), false);
    assert.equal(m.sundayNeedsNotice(m.parseWeek('sun 08:00-12:00'), 2), false);
  });

  await row('AD-06 team users: invite with the role, change role (remove then add), remove; last administrator and self are protected; customers are not listed', async () => {
    const users = [
      { userId: 'u1', email: 'admin@example.invalid', name: 'Admin', memberships: [{ membershipId: 'm1', roleKey: 'administrator' }] },
      { userId: 'u2', email: 'desk@example.invalid', name: 'Desk', memberships: [{ membershipId: 'm2', roleKey: 'front_desk' }] },
      { userId: 'u3', email: 'cust@example.invalid', name: 'Cust', memberships: [{ membershipId: 'm3', roleKey: 'member' }] },
    ];
    assert.deepEqual(m.teamMembers(users).map(u => u.userId), ['u1', 'u2']);
    assert.equal(m.teamGuard(users, users[0], 'front_desk', 'u2'), 'last_admin');
    assert.equal(m.teamGuard(users, users[0], null, 'u2'), 'last_admin');
    assert.equal(m.teamGuard(users, users[1], null, 'u2'), 'self');
    assert.equal(m.teamGuard(users, users[1], 'administrator', 'u1'), null);
    const cos = fakeCos();
    await m.invite(cos.request, ' New@Example.invalid ', 'front_desk', 'https://app.example.invalid/');
    await m.changeRole(cos.request, users[1], 'administrator');
    await m.removeFromTeam(cos.request, users[1]);
    await m.sendInvitationEmail(cos.request, { email: ' New@example.invalid', subject: 'Invitación', body: 'Entra: https://clerk.example.invalid/x' });
    assert.deepEqual(cos.calls.map(c => [c.method, c.path]), [['POST', '/invitations'], ['DELETE', '/admin/memberships/m2'], ['POST', '/admin/users'], ['DELETE', '/admin/memberships/m2'], ['POST', '/api/comms_log']]);
    assert.deepEqual(cos.calls[0].body, { email: 'new@example.invalid', roleKey: 'front_desk', redirectUrl: 'https://app.example.invalid/' });
    assert.deepEqual(cos.calls[2].body, { email: 'desk@example.invalid', name: 'Desk', roleKey: 'administrator' });
    assert.equal(cos.calls[4].body.deliver, true);
    assert.equal(cos.calls[4].body.address, 'new@example.invalid');
    assert.match(cos.calls[4].body.body, /https:\/\/clerk\.example\.invalid\/x/);
  });

  await row('AD-07 customer list: package, classes left, expiry and vouchers from lots, entry sums and vouchers (expired and frozen lots handled)', () => {
    const today = '2026-11-02';
    const lot = (id, person, extra = {}) => ({ id, person, source: 'purchase', product: 'pack12', valid_from: '2026-10-01', valid_until: '2026-12-30', frozen_from: null, frozen_until: null, voucher: null, ...extra });
    const lots = [
      lot('l1', 'p1'), lot('l2', 'p1', { product: 'single', valid_until: '2026-11-10' }), lot('l3', 'p1', { valid_until: '2026-10-31' }),
      lot('l4', 'p2', { frozen_from: '2026-11-01', frozen_until: '2026-11-15' }),
      lot('l5', 'p3', { source: 'gift', product: null, voucher: 'v1' }),
    ];
    const left = [{ lot: 'l1', left: 7 }, { lot: 'l2', left: 1 }, { lot: 'l3', left: 4 }, { lot: 'l4', left: 5 }, { lot: 'l5', left: 2 }];
    const vouchers = [{ id: 'v2', buyer: 'p1', redeemed_by: null, uses: 0, max_uses: 1, valid_until: '2027-01-01' }, { id: 'v3', buyer: 'p1', redeemed_by: 'p9', uses: 1, max_uses: 1, valid_until: null }];
    const b = m.customerBalances({ lots, left, vouchers, today });
    assert.deepEqual(b.get('p1'), { product: 'single', remaining: 8, expires: '2026-11-10', frozen: false, vouchers: 1 }, 'expired lot l3 does not count; the next lot to spend expires first');
    assert.deepEqual(b.get('p2'), { product: 'pack12', remaining: 0, expires: null, frozen: true, vouchers: 0 });
    assert.deepEqual(b.get('p3'), { product: null, remaining: 2, expires: '2026-12-30', frozen: false, vouchers: 1 });
    assert.equal(b.get('nobody'), undefined, 'no lots: no package (the list shows "no plan")');
    assert.deepEqual(m.BALANCE_QUERIES.left.aggregate, { groupBy: ['lot'], metrics: [{ op: 'sum', field: 'delta', alias: 'left' }] });
  });

  await row('Copy: every desk refusal code has Spanish and English text', () => {
    for (const code of m.DESK_CODES) { const e = m.deskStrings[`desk.error.${code}`]; assert.ok(e?.es && e?.en, code); }
  });

  await row('AD-05 payment details: the production copy of the shared payment block never says demo or "do not pay"', () => {
    for (const k of ['title', 'boundary', 'qrAlt']) {
      const e = m.adminStrings[`admin.paymentInstructions.live.${k}`];
      assert.ok(e?.es && e?.en, k);
      assert.doesNotMatch(`${e.es} ${e.en}`, /demo|ficticia|fictional|no realices|do not make/i, k);
    }
  });

  await row('Production build: the browser copies of the desk-booking and attendance rules are not in the shipped bundle', async () => {
    // The real bundler (Vite/Rollup) with the production switch; a plugin reads what each chunk actually renders.
    const { build: viteBuild } = await import('vite');
    const shipped = async production => {
      process.env.VITE_HOY_BUILD = production ? 'production' : 'review';
      const rendered = {};
      await viteBuild({ logLevel: 'silent', configFile: join(process.cwd(), 'vite.config.ts'), build: { write: false, outDir: join(scratch, 'dist'), emptyOutDir: false, reportCompressedSize: false },
        plugins: [{ name: 'h7-modules', generateBundle(_, bundle) { for (const c of Object.values(bundle)) if (c.type === 'chunk') for (const [id, mod] of Object.entries(c.modules)) rendered[id.replace(process.cwd() + '/', '')] = (rendered[id.replace(process.cwd() + '/', '')] ?? 0) + mod.renderedLength; } }] });
      delete process.env.VITE_HOY_BUILD;
      return rendered;
    };
    const prod = await shipped(true);
    for (const f of ['src/data/receptionAttendance.ts', 'src/modules/staff/desk/reviewDesk.ts']) assert.equal(prod[f] ?? 0, 0, `${f} is not in the production build`);
    for (const f of ['src/modules/staff/desk/deskCommands.ts', 'src/modules/classSchedule/live/LiveSchedulePage.tsx', 'src/modules/admin/customers/LiveCustomerList.tsx', 'src/modules/admin/team/TeamUsersPanel.tsx', 'src/modules/admin/reception/ReceptionHoursPanel.tsx']) assert.ok((prod[f] ?? 0) > 0, `${f} ships in production`);
    // deskBooking.ts is still imported by the transfers module (lane H-5); the reception pages no longer reach it.
    if ((prod['src/data/deskBooking.ts'] ?? 0) > 0) console.log('NOTE deskBooking.ts still ships in production through src/modules/transfers (lane H-5).');
  });

  console.log(`PASS H-7 reception and administration: ${passed} named checks.`);
} finally { await rm(scratch, { recursive: true, force: true }); }
