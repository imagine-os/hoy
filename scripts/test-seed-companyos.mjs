// Checks scripts/seed-companyos.ts, the generator of Company OS's test seed for Hoy (Company-OS deploy/seeds/hoy.json):
// made-up people only, one per role and customers, with packs, payments and bookings that agree with each other
// (Company OS's import skips the module rules), and the same file every run (determinism).
//   node scripts/test-seed-companyos.mjs
import assert from 'node:assert/strict';
import { buildCompanyOsSeed, loadHoySample, DEFAULT_AS_OF, ROLE_KEYS } from './seed-companyos.ts';

// The recipe's products and booking policy as the generator reads them (Company-OS deploy/recipes/hoy.json); prices made up for the check.
const RECIPE = {
  modules: [{ key: 'bookings', settings: { late_cancel_hours: 12, reschedule_hours: 12, policy_as_of_booking: true } }],
  records: [{
    entity: 'product',
    rows: [
      { key: 'trial', name: 'Trial class', kind: 'trial', price: 30000, credits: 1 },
      { key: 'single', name: 'Single class', kind: 'single', price: 50000, credits: 0 },
      { key: 'pack12', name: '12-class pack', kind: 'pack', price: 500000, credits: 12, validity_days: 90, freezable: true },
      { key: 'pack12_smtc', name: '12-class pack (affiliate)', kind: 'pack', price: 400000, credits: 12, validity_days: 90, freezable: true, audience: 'affiliate' },
      { key: 'gift_pack12', name: 'Gift card', kind: 'gift', price: 500000, credits: 12, validity_days: 90 },
    ],
  }],
};

const failures = [];
const check = async (name, fn) => { try { await fn(); console.log(`ok   ${name}`); } catch (err) { failures.push(name); console.log(`FAIL ${name}\n     ${err.message.split('\n').join('\n     ')}`); } };

process.env.TZ = 'America/Bogota';
const sample = loadHoySample(DEFAULT_AS_OF);
const seed = await buildCompanyOsSeed({ recipe: RECIPE });
const text = JSON.stringify(seed);
const of = (entity) => seed.records.filter((r) => r.entity === entity);
const byId = new Map(seed.records.map((r) => [r.id, r]));
const asOf = Date.parse(DEFAULT_AS_OF);
const day = (iso) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date(iso));

await check('is marked fictional, starts with a person that has an id, and fits one import batch (1000 records)', () => {
  assert.equal(seed.fictional, true);
  assert.equal(seed.records[0].entity, 'person');
  assert.equal(typeof seed.records[0].id, 'string');
  assert.ok(seed.records.length <= 1000, `${seed.records.length} records`);
  assert.deepEqual(seed.files, []);
  assert.equal(seed.asOf, DEFAULT_AS_OF);
});

await check('gives every record a unique UUID', () => {
  for (const r of seed.records) assert.match(r.id, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/, r.entity);
  assert.equal(new Set(seed.records.map((r) => r.id)).size, seed.records.length);
});

await check('holds only made-up addresses and phones', () => {
  const people = of('person');
  assert.ok(people.length >= 41, `${people.length} people`);
  for (const p of people) {
    assert.match(String(p.data.email), /^[a-z0-9.-]+@demo\.hoyos\.test$/, p.data.name);
    if (p.data.phone !== undefined) assert.match(String(p.data.phone), /^\+57 300 555 01\d\d$/, p.data.name);
  }
  assert.equal(new Set(people.map((p) => p.data.email)).size, people.length, 'one address per person');
});

await check('names no real teacher: the studio publishes its teachers, so the seed makes them up', async () => {
  const { teachers, demoUsers } = await sample;
  const real = [...teachers.map((t) => t.name), demoUsers.find((u) => u.role === 'teacher').name];
  for (const name of real) assert.ok(!text.includes(name), `the seed names ${name}`);
});

await check('gives every role key a person: one membership per person, in the recipe\'s keys or the system super_admin', () => {
  const roles = new Set(seed.memberships.map((m) => m.role));
  for (const key of ROLE_KEYS) assert.ok(roles.has(key), `no person in ${key}`);
  assert.deepEqual([...roles].sort(), [...ROLE_KEYS].sort());
  assert.equal(new Set(seed.memberships.map((m) => m.person)).size, seed.memberships.length, 'one role per person');
  for (const m of seed.memberships) assert.equal(byId.get(m.person)?.entity, 'person', m.role);
  assert.ok(seed.memberships.filter((m) => m.role === 'member').length >= 30, 'customers');
});

await check('gives customers a member facet and teachers a coach facet; every class has its coach', () => {
  const members = of('member'), coaches = of('coach');
  const customers = seed.memberships.filter((m) => m.role === 'member').map((m) => m.person);
  assert.deepEqual(members.map((m) => m.data.person).sort(), [...customers].sort());
  for (const m of members) assert.ok(['general', 'affiliate'].includes(m.data.price_audience));
  assert.ok(coaches.length >= 8, `${coaches.length} coaches`);
  const teacherLogin = seed.memberships.find((m) => m.role === 'coach').person;
  assert.ok(coaches.some((c) => c.data.person === teacherLogin), 'the teacher who signs in is a coach');
  for (const o of of('occurrence')) assert.equal(byId.get(o.data.coach)?.entity, 'coach', o.data.title);
});

await check('keeps every reference inside the seed', () => {
  const refs = { member: { person: 'person' }, coach: { person: 'person' }, occurrence: { coach: 'coach' }, booking: { person: 'person', occurrence: 'occurrence' }, credit_lot: { person: 'person', payment: 'payment' }, credit_entry: { lot: 'credit_lot', person: 'person', booking: 'booking' }, payment: { person: 'person' }, invoice: { payment: 'payment', person: 'person' } };
  for (const r of seed.records) for (const [field, entity] of Object.entries(refs[r.entity] ?? {})) {
    const v = r.data[field];
    if (v === undefined || v === null) continue;
    assert.equal(byId.get(v)?.entity, entity, `${r.entity}.${field}`);
  }
  for (const p of of('payment').filter((p) => p.data.for_entity)) assert.equal(byId.get(p.data.for_id)?.entity, p.data.for_entity);
});

await check('has classes behind and ahead of its date: two weeks back, three weeks on', () => {
  const starts = of('occurrence').map((o) => Date.parse(o.data.starts_at));
  assert.ok(starts.some((s) => s < asOf - 6 * 864e5), 'past classes');
  assert.ok(starts.some((s) => s > asOf + 20 * 864e5), 'classes three weeks on');
  for (const o of of('occurrence')) {
    const past = Date.parse(o.data.ends_at) < asOf;
    if (o.data.status === 'completed') assert.ok(past, `${o.data.starts_at} completed before it ended`);
    if (o.data.status === 'scheduled') assert.ok(!past, `${o.data.starts_at} still scheduled after it ended`);
  }
});

await check('counts each class\'s places from its bookings and never overfills it; a cancelled class has none', () => {
  const bookings = of('booking');
  for (const o of of('occurrence')) {
    const mine = bookings.filter((b) => b.data.occurrence === o.id);
    assert.equal(o.data.booked_count, mine.filter((b) => ['booked', 'checked_in'].includes(b.data.status)).length, o.data.starts_at);
    assert.ok(o.data.booked_count <= o.data.capacity);
    if (o.data.status === 'cancelled') assert.equal(mine.length, 0);
  }
  assert.ok(bookings.length >= 50, `${bookings.length} bookings`);
});

await check('books a person at most once a day, after they paid, as the rules would', () => {
  const seen = new Set();
  for (const b of of('booking')) {
    const occ = byId.get(b.data.occurrence);
    const key = `${b.data.person} ${day(occ.data.starts_at)}`;
    assert.ok(!seen.has(key), `two bookings: ${key}`);
    seen.add(key);
    assert.ok(Date.parse(b.createdAt) <= Date.parse(occ.data.starts_at) && Date.parse(b.createdAt) <= asOf, 'booked before the class and before the seed date');
    const past = occ.data.status === 'completed';
    assert.ok(past ? ['checked_in', 'no_show', 'late_cancel'].includes(b.data.status) : b.data.status === 'booked', `${b.data.status} on a ${occ.data.status} class`);
    assert.ok(['credit', 'single'].includes(b.data.entitlement));
    // As the bookings module writes a class booking: the class's times (its daily limit reads them) and the policy copies.
    assert.equal(b.data.start, occ.data.starts_at);
    assert.equal(b.data.end, occ.data.ends_at);
    assert.equal(b.data.policy_late_cancel_hours, 12);
    assert.equal(b.data.policy_reschedule_hours, 12);
  }
});

await check('takes one class from a usable lot of the same person for each credit booking; a lot never goes below 0', () => {
  const entries = of('credit_entry');
  for (const b of of('booking').filter((b) => b.data.entitlement === 'credit')) {
    const taken = entries.filter((e) => e.data.booking === b.id);
    assert.equal(taken.length, 1, 'one entry');
    assert.equal(taken[0].data.delta, -1);
    assert.equal(taken[0].data.reason, 'booking');
    const lot = byId.get(taken[0].data.lot);
    assert.equal(lot.data.person, b.data.person);
    const d = day(byId.get(b.data.occurrence).data.starts_at);
    assert.ok(lot.data.valid_from <= d && (!lot.data.valid_until || d <= lot.data.valid_until), `lot ${lot.data.valid_from}..${lot.data.valid_until} on ${d}`);
  }
  for (const lot of of('credit_lot')) {
    const mine = entries.filter((e) => e.data.lot === lot.id);
    const grant = mine.filter((e) => e.data.reason === 'grant');
    assert.equal(grant.length, 1);
    assert.equal(grant[0].data.delta, lot.data.quantity);
    assert.ok(mine.reduce((s, e) => s + e.data.delta, 0) >= 0, 'remaining');
  }
});

await check('issues one lot per approved pack or trial payment, as payments and credits would, with the product\'s classes and validity', () => {
  const lots = of('credit_lot');
  for (const p of of('payment')) {
    assert.equal(p.data.status, 'approved');
    const product = RECIPE.records[0].rows.find((r) => r.name === p.data.concept);
    assert.ok(product, `payment of ${p.data.concept}`);
    assert.equal(p.data.amount, product.price);
    const mine = lots.filter((l) => l.data.payment === p.id);
    if (product.credits > 0 && product.kind !== 'gift') {
      assert.equal(mine.length, 1);
      assert.equal(mine[0].data.quantity, product.credits);
      assert.equal(mine[0].data.source, product.kind === 'trial' ? 'trial' : 'purchase');
      assert.equal(mine[0].data.valid_from, p.data.date);
      assert.equal(mine[0].data.freezable, product.freezable === true);
      if (product.validity_days) {
        const end = new Date(`${p.data.date}T12:00:00Z`); end.setUTCDate(end.getUTCDate() + product.validity_days - 1);
        assert.equal(mine[0].data.valid_until, end.toISOString().slice(0, 10));
      }
    } else assert.equal(mine.length, 0);
    if (product.kind === 'single') assert.equal(p.data.for_entity, 'booking', 'a single class pays for its booking');
    if (product.audience === 'affiliate') assert.equal(of('member').find((m) => m.data.person === p.data.person).data.price_audience, 'affiliate');
    if (['card', 'online_gateway', 'card_terminal'].includes(p.data.method)) assert.ok(p.data.reference, 'a card or gateway payment carries its reference');
  }
  for (const b of of('booking').filter((b) => b.data.entitlement === 'single')) {
    assert.equal(of('payment').filter((p) => p.data.for_id === b.id).length, 1, 'a single booking has its payment');
  }
  const trials = of('payment').filter((p) => lots.some((l) => l.data.payment === p.id && l.data.source === 'trial'));
  assert.equal(new Set(trials.map((p) => p.data.person)).size, trials.length, 'one trial per person');
  assert.ok(lots.length >= 10, `${lots.length} lots`);
});

await check('gives every approved payment its numbered receipt, 1 to N, as payments would', () => {
  const receipts = of('invoice');
  assert.equal(receipts.length, of('payment').length);
  assert.deepEqual(receipts.map((r) => r.data.number).sort((a, b) => a - b), receipts.map((_, i) => i + 1));
  for (const r of receipts) {
    const p = byId.get(r.data.payment);
    assert.equal(r.data.kind, 'receipt');
    assert.equal(r.data.total, p.data.amount);
    assert.equal(r.data.tax, 0);
    assert.equal(r.data.person, p.data.person);
  }
});

await check('gives the demo customer a pack with classes left and an upcoming class', () => {
  const juliana = of('person').find((p) => p.data.email === 'juliana@demo.hoyos.test');
  assert.ok(juliana);
  const lots = of('credit_lot').filter((l) => l.data.person === juliana.id);
  const left = lots.reduce((s, l) => s + of('credit_entry').filter((e) => e.data.lot === l.id).reduce((t, e) => t + e.data.delta, 0), 0);
  assert.ok(left > 0, 'classes left');
  assert.ok(of('booking').some((b) => b.data.person === juliana.id && b.data.status === 'booked'), 'an upcoming class');
});

await check('writes no product ids by default (the recipe makes them); --recipe-refs names them by key', async () => {
  for (const r of [...of('payment'), ...of('credit_lot'), ...of('invoice')]) assert.equal(r.data.product, undefined);
  const withRefs = await buildCompanyOsSeed({ recipe: RECIPE, recipeRefs: true });
  const pay = withRefs.records.find((r) => r.entity === 'payment');
  const key = RECIPE.records[0].rows.find((r) => r.name === pay.data.concept).key;
  assert.deepEqual(pay.data.product, { $ref: { entity: 'product', where: { key } } });
});

// Determinism: the same file every run, on any machine's clock and timezone; a different date moves the dates.
const again = await buildCompanyOsSeed({ recipe: RECIPE });
process.env.TZ = 'UTC';
const utc = await buildCompanyOsSeed({ recipe: RECIPE });
process.env.TZ = 'America/Bogota';
const later = await buildCompanyOsSeed({ recipe: RECIPE, asOf: '2026-11-20T06:00:00-05:00' });
await check('is the same every run (stable ids), so a regenerated seed has a clean diff', () => assert.equal(JSON.stringify(again), text));
await check('is the same whatever the machine\'s timezone', () => assert.equal(JSON.stringify(utc), text));
await check('moves its dates with --as-of and keeps its ids', () => {
  assert.notEqual(JSON.stringify(later), text);
  assert.deepEqual(later.records.filter((r) => r.entity === 'person').map((r) => r.id), of('person').map((r) => r.id));
});

if (failures.length) {
  console.log(`\n${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('\nseed-companyos: all checks passed');
