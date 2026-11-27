// Hoy group pass (Company OS ADR 0045: one code, one class, X places), logic level, no browser. The production build's
// code (esbuild, VITE_HOY_BUILD=production) against the in-memory Company OS in scripts/lib/fake-cos.mjs (and the credits
// fake in scripts/lib/fake-credits.mjs), through the real CompanyOSProvider where a screen writes through it.
// Covers: the product master's group kind and places; the plans, bookings and vouchers mapping (pass, places, party);
// the member's group passes (their own vouchers only) and the share link; joining a class with the code (one booking per
// person, `entitlement: pass` + `pass_code`); the desk adding a person into an unnamed place (code read from the voucher)
// and swapping a named person (PATCH person); the refusal copy of every new code in every table that can meet it; group
// vouchers kept out of the gift and courtesy lists and the redeem flow. Fictional data only.
// Run: node scripts/test-group-pass.mjs
import { build } from 'esbuild';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fakeCos } from './lib/fake-cos.mjs';
import { fakeCredits } from './lib/fake-credits.mjs';

let failures = 0, passed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log(`ok   ${name}`); }
  catch (e) { failures++; console.log(`FAIL ${name}\n     ${String(e?.stack ?? e).split('\n').slice(0, 12).join('\n     ')}`); }
}
const values = new Map();
globalThis.localStorage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, String(v)), removeItem: (k) => values.delete(k) };
globalThis.sessionStorage = globalThis.localStorage;

const ENTRIES = {
  products: "export * from './src/modules/products/launch/productMaster'; export { strings as productStrings } from './src/modules/products/strings';",
  mapping: "export { adapterFor, fromRecord, toData, PAID_WITH } from './src/data/companyos/mapping';",
  provider: "export { CompanyOSProvider } from './src/data/companyos/CompanyOSProvider';",
  group: "export * from './src/modules/vouchers/production/groupPass';",
  vouchers: "export * from './src/modules/vouchers/production/model'; export { productionStrings } from './src/modules/vouchers/production/strings';",
  refusals: "export { CONTRACT_REFUSALS, refusalCopy, hasRefusalCopy } from './src/data/companyos/refusals';",
  desk: "export { DESK_CODES, deskStrings, deskErrorText } from './src/modules/staff/desk/strings'; export { saleOps } from './src/modules/staff/desk/deskCommands';",
  booking: "export { BOOKING_REFUSALS, refusalMessage } from './src/modules/customer/booking/refusals'; export { bookingStrings } from './src/modules/customer/booking/strings';",
  launchCos: "export { KNOWN_CODES } from './src/modules/transfers/launch/cos'; export { payLaunchStrings } from './src/modules/transfers/launch/strings';",
  pricing: "export { genericPlans, websitePlans } from './src/data/livePricing';",
  routes: "export { LAUNCH_ROUTES } from './src/config/launchRoutes'; export { customerReturn } from './src/modules/customer/auth/customerReturn';",
  core: "export { coreStrings } from './src/i18n/core'; export { strings as customerStrings } from './src/modules/customer/strings';",
  share: "export { copyLink } from './src/components/molecule/ShareLink/copyLink';",
};
async function load(contents) {
  try {
    const out = await build({
      stdin: { contents, resolveDir: process.cwd(), loader: 'ts' },
      bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent', jsx: 'automatic',
      loader: { '.jpg': 'empty', '.png': 'empty', '.webp': 'empty', '.svg': 'empty', '.css': 'empty', '.md': 'text' },
      define: { 'import.meta.env': '{"VITE_HOY_BUILD":"production","DEV":false,"PROD":true,"BASE_URL":"/"}', __HOY_BUILD__: '"production"' },
    });
    return await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
  } catch (e) { return { __error: String(e.message).split('\n').slice(0, 3).join(' ') }; }
}
const m = Object.fromEntries(await Promise.all(Object.entries(ENTRIES).map(async ([k, c]) => [k, await load(c)])));
const need = (k) => { if (m[k].__error) throw new Error(`does not build (${k}): ${m[k].__error}`); return m[k]; };
const codeOf = async (p) => { try { await p; return 'ok'; } catch (e) { return e?.code ?? e?.message ?? String(e); } };

const NEW_CODES = ['pass_unresolved', 'pass_class_only', 'group_does_not_fit', 'party_full', 'voucher_wrong_kind', 'pass_occurrence_mismatch', 'pass_person_required', 'void_pass_used', 'voucher_kind_fixed'];
/** The codes a pass booking can meet (new and reused, ADR 0045 "Refusal codes"). */
const BOOKING_CODES = ['pass_unresolved', 'pass_class_only', 'group_does_not_fit', 'party_full', 'voucher_wrong_kind', 'pass_occurrence_mismatch', 'pass_person_required', 'voucher_invalid', 'voucher_expired', 'voucher_used_up', 'voucher_payment_not_approved', 'occurrence_not_open', 'already_booked', 'person_overlap', 'booking_system_managed'];

// ── the product master (PR-01): kind `group` with its number of places ───────────────────────────────────────────────
await test('PR-01 group: the product master offers the kind `group`, and its `places` must be a whole number of at least 2', () => {
  const P = need('products');
  assert.ok(P.PRODUCT_KINDS.includes('group'), 'kind group is offered');
  const base = { key: 'grupo4', name: 'Clase para 4', kind: 'group', price: 180000, credits: null, validity_days: 60, active: true, valid_from: null, valid_until: null };
  assert.equal(P.validateProduct({ ...base, places: 4 }, []), null, '4 places is valid');
  for (const bad of [undefined, null, 1, 0, 2.5, -3, 101, '4']) assert.equal(P.validateProduct({ ...base, places: bad }, []), 'places', `places ${JSON.stringify(bad)} is refused`);
  assert.equal(P.validateProduct({ ...base, kind: 'pack', credits: 12, places: null }, []), null, 'a pack needs no places');
});
await test('PR-01 group: createOps sends `places` for a group product, and null for any other kind', () => {
  const P = need('products');
  const [op] = P.createOps({ key: 'grupo4', name: ' Clase para 4 ', kind: 'group', price: 180000, credits: null, validity_days: 60, places: 4, active: true });
  assert.deepEqual([op.op, op.entity, op.data.kind, op.data.places, op.data.name], ['create', 'product', 'group', 4, 'Clase para 4']);
  const [pack] = P.createOps({ key: 'pack6', name: 'Paquete 6', kind: 'pack', price: 300000, credits: 6, places: 4, active: true });
  assert.equal(pack.data.places, null, 'a stray places value on a pack is not sent');
});
await test('PR-01 group: the master copy has the kind, the field and its error in Spanish and English', () => {
  const { productStrings } = need('products');
  for (const k of ['products.launch.kind.group', 'products.places', 'products.launch.error.places', 'products.launch.placesCount']) {
    assert.ok(productStrings[k]?.es && productStrings[k]?.en, k); assert.notEqual(productStrings[k].es, productStrings[k].en, `${k} is translated`);
  }
});

// ── mapping: plans, bookings, vouchers ─────────────────────────────────────────────────────────────────────────────
await test('mapping: a group product reads as family `grupales` with its places (never the packs family)', () => {
  const M = need('mapping');
  const row = M.fromRecord(M.adapterFor('plans'), { id: 'prd_g', data: { key: 'grupo4', name: 'Clase para 4', kind: 'group', price: 180000, places: 4, active: true } });
  assert.deepEqual([row.kind, row.family, row.places], ['group', 'grupales', 4]);
  assert.equal(M.toData(M.adapterFor('plans'), { family: 'grupales' }, 'update').kind, 'group', 'the family maps back to kind group');
  assert.equal(M.toData(M.adapterFor('plans'), { slug: 'grupo4', kind: 'group', places: 4 }, 'create').places, 4, 'places is written');
});
await test('mapping: a pass booking reads paid_with `pass` with its party, and a client never writes the party stamps', () => {
  const M = need('mapping');
  const a = M.adapterFor('bookings');
  const row = M.fromRecord(a, { id: 'bkg_1', data: { person: 'per_1', occurrence: 'occ_1', status: 'booked', entitlement: 'pass', party: 'vch_1', party_size: 4, party_lead: true } });
  assert.deepEqual([row.paid_with, row.party, row.party_size, row.party_lead], ['pass', 'vch_1', 4, true]);
  const plain = M.fromRecord(a, { id: 'bkg_2', data: { person: 'per_1', occurrence: 'occ_1', status: 'booked', entitlement: 'credit' } });
  assert.deepEqual([plain.party, plain.party_size, plain.party_lead], [null, null, false], 'an ordinary booking has no party');
  const data = M.toData(a, { user_id: 'per_1', session_id: 'occ_1', paid_with: 'pass', pass_code: 'ABCD2345', source: 'member', party: 'vch_x', party_size: 9, party_lead: true }, 'create');
  assert.deepEqual(data, { person: 'per_1', occurrence: 'occ_1', entitlement: 'pass', pass_code: 'ABCD2345', source: 'member' }, 'pass_code goes out; the party stamps never do (hostile input)');
  assert.ok(M.PAID_WITH.expand('pass').includes('pass'), 'a filter on paid_with pass asks for entitlement pass');
});
await test('mapping: the vouchers table reads a group voucher\'s places, joined and class', () => {
  const M = need('mapping');
  const row = M.fromRecord(M.adapterFor('vouchers'), { id: 'vch_1', data: { kind: 'group', code: 'ABCD2345', places: 4, joined: 2, occurrence: 'occ_1', classes: 1, uses: 1, max_uses: 1 } });
  assert.deepEqual([row.places, row.joined, row.occurrence], [4, 2, 'occ_1']);
});

// ── the journey on the fake Company OS, through the real provider ──────────────────────────────────────────────────
const USERS = { usr_admin: { role: 'super_admin', name: 'Ana Admin' }, usr_desk: { role: 'front_desk', name: 'Diego Desk' }, usr_buyer: { role: 'member', name: 'Bea Compradora' }, usr_f1: { role: 'member', name: 'Fer Amiga' }, usr_f2: { role: 'member', name: 'Gabi Amigo' } };
const T0 = Date.parse('2026-11-24T14:00:00Z');
function world() {
  const cos = fakeCos({ users: USERS, now: () => T0 });
  const people = Object.fromEntries(['buyer', 'f1', 'f2'].map((k) => [k, cos.seed('person', { name: USERS[`usr_${k}`].name, email: `${k}@example.test`, user: `usr_${k}` })]));
  people.walkin = cos.seed('person', { name: 'Hugo Sinapp', email: null, user: null });
  people.walkin2 = cos.seed('person', { name: 'Iris Sinapp', email: null, user: null });
  const product = cos.seed('product', { key: 'grupo3', name: 'Clase para 3', kind: 'group', price: 150000, places: 3, credits: null, validity_days: 30, active: true });
  const occ = cos.seed('occurrence', { title: 'Pulso', kind: 'class', starts_at: new Date(T0 + 864e5).toISOString(), ends_at: new Date(T0 + 864e5 + 3600e3).toISOString(), capacity: 10, status: 'scheduled', booked_count: 0 });
  const other = cos.seed('occurrence', { title: 'Fuego', kind: 'class', starts_at: new Date(T0 + 2 * 864e5).toISOString(), ends_at: new Date(T0 + 2 * 864e5 + 3600e3).toISOString(), capacity: 10, status: 'scheduled', booked_count: 0 });
  const small = cos.seed('occurrence', { title: 'Centro', kind: 'class', starts_at: new Date(T0 + 3 * 864e5).toISOString(), ends_at: new Date(T0 + 3 * 864e5 + 3600e3).toISOString(), capacity: 2, status: 'scheduled', booked_count: 0 });
  const pay = cos.seed('payment', { person: people.buyer.id, product: product.id, amount: 150000, method: 'transfer', status: 'pending', date: '2026-11-24', concept: 'Clase para 3', reference: 'ref1', provider: 'manual' });
  // One provider per signed-in person, as in the app (it keeps its own `/me`).
  const providers = new Map();
  const as = (user) => { cos.as(user); if (!providers.has(user)) providers.set(user, new (need('provider').CompanyOSProvider)({ fetch: cos.fetch, config: { tenant: 'hoy', apiBase: '/api/cos' }, getToken: async () => `tok-${user}`, retryDelayMs: 1, sleep: async () => {} })); return providers.get(user); };
  const approve = async () => { cos.as('usr_desk'); await cos.request('POST', '/batch', { ops: [{ op: 'update', entity: 'payment', id: pay.id, data: { status: 'approved', amount: 150000 } }] }, { idempotencyKey: `approve-${pay.id}` }); };
  return { cos, people, product, occ, other, small, pay, as, approve };
}
const batches = (cos, from = 0) => cos.calls.slice(from).filter((c) => c.method === 'POST' && c.path === '/batch');

await test('C-43 my group passes: the member reads only their own group vouchers, with the code, places and validity', async () => {
  const G = need('group');
  const w = world();
  await w.approve();
  w.cos.as('usr_buyer');
  const mine = await G.myGroupPasses(w.cos);
  assert.equal(mine.length, 1, 'the approved payment issued one code');
  assert.deepEqual([mine[0].places, mine[0].joined, mine[0].occurrence, mine[0].uses], [3, 0, null, 0]);
  assert.match(mine[0].code, /^[A-HJ-NP-Z2-9]{8}$/);
  const q = w.cos.calls.filter((c) => c.path === '/query' && c.body.entity === 'voucher').at(-1).body;
  assert.ok(JSON.stringify(q.filter).includes('"kind"') && JSON.stringify(q.filter).includes('"group"') && JSON.stringify(q.filter).includes(w.people.buyer.id), 'the read asks for kind group and buyer = own person (the policy decides anyway)');
  w.cos.as('usr_f1');
  assert.deepEqual(await G.myGroupPasses(w.cos), [], 'another member sees no one else\'s pass');
  assert.equal(G.passPath(mine[0].code.toLowerCase()), `/app/pass/${mine[0].code}`, 'share path before first use: no class');
  assert.equal(G.passPath(mine[0].code, 'occ_9'), `/app/pass/${mine[0].code}?c=occ_9`, 'after first use the class rides along');
  assert.equal(G.passState(mine[0], '2026-11-24'), 'unused');
});

await test('C-44 join: the buyer books one class with the code (entitlement pass + pass_code, one /batch with the key); friends take places with ?c=', async () => {
  const G = need('group');
  const w = world();
  await w.approve();
  let p = w.as('usr_buyer');
  const [pass] = await G.myGroupPasses(w.cos);
  const from = w.cos.calls.length;
  const lead = await G.joinPass(p, { personId: w.people.buyer.id, occurrenceId: w.occ.id, code: pass.code.toLowerCase() }, 'join-lead-0001');
  const [b] = batches(w.cos, from);
  assert.equal(b.key, 'join-lead-0001', 'the action\'s Idempotency-Key');
  assert.deepEqual(b.body.ops, [{ op: 'create', entity: 'booking', data: { person: w.people.buyer.id, occurrence: w.occ.id, entitlement: 'pass', pass_code: pass.code, source: 'member', status: 'booked' } }]);
  assert.equal(lead.party, pass.id, 'the server stamps the party');
  const [after] = await G.myGroupPasses(w.cos);
  assert.deepEqual([after.occurrence, after.joined, G.passState(after, '2026-11-24')], [w.occ.id, 1, 'used']);
  p = w.as('usr_f1');
  await G.joinPass(p, { personId: w.people.f1.id, occurrenceId: w.occ.id, code: pass.code }, 'join-f1-00001');
  assert.equal(await codeOf(G.joinPass(p, { personId: w.people.f1.id, occurrenceId: w.other.id, code: pass.code }, 'join-f1-00002')), 'pass_occurrence_mismatch', 'the code books only the lead\'s class');
  assert.equal(await codeOf(G.joinPass(p, { personId: w.people.f1.id, occurrenceId: w.occ.id, code: 'ZZZZ2222' }, 'join-f1-00003')), 'voucher_invalid');
  assert.equal(await codeOf(G.joinPass(p, { personId: w.people.f2.id, occurrenceId: w.occ.id, code: pass.code }, 'join-f2-00001')), 'forbidden', 'a member books only for themselves');
  assert.equal(w.cos.db.occurrence.find((o) => o.id === w.occ.id).data.booked_count, 3, 'the class holds all 3 places');
});

await test('C-44 join: a group that does not fit is refused with its details; the class picker offers only classes with room', async () => {
  const G = need('group');
  const w = world();
  await w.approve();
  let p = w.as('usr_buyer');
  const [pass] = await G.myGroupPasses(w.cos);
  let err = null;
  try { await G.joinPass(p, { personId: w.people.buyer.id, occurrenceId: w.small.id, code: pass.code }, 'join-small-01'); } catch (e) { err = e; }
  assert.equal(err?.code, 'group_does_not_fit');
  assert.deepEqual(err?.details, { needed: 3, free: 2 });
  const joined = (s) => ({ session: { id: s.id, status: s.data.status, starts_at: s.data.starts_at, capacity: s.data.capacity, booked_count: s.data.booked_count } });
  const offered = G.passClasses([joined(w.occ), joined(w.small), { session: { id: 'past', status: 'scheduled', starts_at: new Date(T0 - 1).toISOString(), capacity: 10, booked_count: 0 } }, { session: { id: 'off', status: 'cancelled', starts_at: new Date(T0 + 1e6).toISOString(), capacity: 10, booked_count: 0 } }], 3, T0);
  assert.deepEqual(offered.map((x) => x.session.id), [w.occ.id], 'open, upcoming, enough free places (capacity − booked_count)');
  assert.deepEqual(G.passClasses([joined(w.small)], null, T0).map((x) => x.session.id), [w.small.id], 'places unknown (a friend\'s link): every open class, the server decides');
});

await test('S-02 desk: the roster groups a party with "N of X places named"; the desk adds a person into an unnamed place with the voucher\'s code', async () => {
  const G = need('group');
  const w = world();
  await w.approve();
  let p = w.as('usr_buyer');
  const [pass] = await G.myGroupPasses(w.cos);
  await G.joinPass(p, { personId: w.people.buyer.id, occurrenceId: w.occ.id, code: pass.code }, 'join-lead-0002');
  p = w.as('usr_desk');
  const rows = await p.list('bookings', { where: { session_id: w.occ.id } });
  const [party] = G.parties(rows);
  assert.deepEqual([party.party, party.size, party.named, party.lead?.user_id], [pass.id, 3, 1, w.people.buyer.id]);
  assert.equal(await G.partyCode(w.cos, party.party), pass.code, 'the desk reads the code from the voucher (id = party)');
  const from = w.cos.calls.length;
  await G.deskAddToParty(p, w.cos, { party: party.party, personId: w.people.walkin.id, sessionId: w.occ.id }, 'desk-add-00001');
  const [b] = batches(w.cos, from);
  assert.deepEqual(b.body.ops[0].data, { person: w.people.walkin.id, occurrence: w.occ.id, entitlement: 'pass', pass_code: pass.code, source: 'desk', status: 'booked' });
  await G.deskAddToParty(p, w.cos, { party: party.party, personId: w.people.f2.id, sessionId: w.occ.id }, 'desk-add-00002');
  assert.equal(G.parties(await p.list('bookings', { where: { session_id: w.occ.id } }))[0].named, 3);
  assert.equal(await codeOf(G.deskAddToParty(p, w.cos, { party: party.party, personId: w.people.walkin2.id, sessionId: w.occ.id }, 'desk-add-00003')), 'party_full');
});

await test('S-02 desk: a swap changes the named person (PATCH person, one keyed write); a member cannot swap', async () => {
  const G = need('group');
  const w = world();
  await w.approve();
  let p = w.as('usr_buyer');
  const [pass] = await G.myGroupPasses(w.cos);
  await G.joinPass(p, { personId: w.people.buyer.id, occurrenceId: w.occ.id, code: pass.code }, 'join-lead-0003');
  p = w.as('usr_f1');
  const friend = await G.joinPass(p, { personId: w.people.f1.id, occurrenceId: w.occ.id, code: pass.code }, 'join-f1-00009');
  assert.equal(await codeOf(G.deskSwap(p, { bookingId: friend.id, personId: w.people.walkin.id }, 'swap-member-1')), 'forbidden', 'a member may not swap (write_forbidden reads as forbidden)');
  p = w.as('usr_desk');
  const from = w.cos.calls.length;
  await G.deskSwap(p, { bookingId: friend.id, personId: w.people.walkin.id }, 'swap-desk-001');
  const [b] = batches(w.cos, from);
  assert.deepEqual(b.body.ops, [{ op: 'update', entity: 'booking', id: friend.id, data: { person: w.people.walkin.id } }]);
  assert.equal(b.key, 'swap-desk-001');
  assert.equal(w.cos.db.booking.find((x) => x.id === friend.id).data.person, w.people.walkin.id);
  assert.equal(await codeOf(G.deskSwap(p, { bookingId: friend.id, personId: w.people.buyer.id }, 'swap-desk-002')), 'already_booked', 'the new person passes already_booked');
});

await test('void: a used pass refuses the payment void (void_pass_used)', async () => {
  const G = need('group');
  const w = world();
  await w.approve();
  let p = w.as('usr_buyer');
  const [pass] = await G.myGroupPasses(w.cos);
  await G.joinPass(p, { personId: w.people.buyer.id, occurrenceId: w.occ.id, code: pass.code }, 'join-lead-0004');
  w.cos.as('usr_admin');
  assert.equal(await codeOf(w.cos.request('POST', '/batch', { ops: [{ op: 'update', entity: 'payment', id: w.pay.id, data: { status: 'voided', status_reason: 'error' } }] }, { idempotencyKey: 'void-0000001' })), 'void_pass_used');
});

// ── desk sale and the price lists ──────────────────────────────────────────────────────────────────────────────────
await test('S-04 desk sale: a group product is sold like a pack, without a class booking (the code books it later)', () => {
  const D = need('desk');
  const ops = D.saleOps({ person: { id: 'per_1' }, productId: 'prd_g', productKind: 'group', price: 150000, amountReceived: 150000, method: 'cash', concept: 'Clase para 3', today: '2026-11-24', sessionId: 'occ_1', checkIn: true, key: 'k-sale-0001' });
  assert.deepEqual(ops.map((o) => `${o.op}:${o.entity}`), ['create:payment'], 'no booking op, no voucher op: Company OS issues the code on approval');
  const pack = D.saleOps({ person: { id: 'per_1' }, productId: 'prd_p', productKind: 'pack', price: 1, amountReceived: 1, method: 'cash', concept: 'Paquete', today: '2026-11-24', sessionId: 'occ_1', key: 'k-sale-0002' });
  assert.deepEqual(pack.map((o) => o.entity), ['payment', 'booking'], 'a pack still books the class (unchanged)');
});
await test('C-06 plans: a group product on sale is a generic card with its places (classes not required)', () => {
  const P = need('pricing'), M = need('mapping');
  const row = (id, data) => M.fromRecord(M.adapterFor('plans'), { id, data });
  const plans = P.genericPlans([row('prd_g', { key: 'grupo4', kind: 'group', name: 'Clase para 4', price: 180000, credits: null, places: 4, validity_days: 60, active: true })], '2026-11-24');
  assert.equal(plans.length, 1);
  assert.deepEqual([plans[0].kind, plans[0].places], ['group', 4]);
  assert.equal(P.genericPlans([row('prd_g1', { key: 'grupo1', kind: 'group', name: 'Mal', price: 180000, places: 1, active: true })], '2026-11-24').length, 0, 'a group of one is not offered');
});

// ── copy for every new code ────────────────────────────────────────────────────────────────────────────────────────
await test(`refusals: the ${NEW_CODES.length} new codes have their own Spanish and English line in the contract table`, () => {
  const R = need('refusals');
  for (const code of NEW_CODES) {
    const c = R.CONTRACT_REFUSALS[code];
    assert.ok(c?.es && c?.en, code); assert.notEqual(c.es, c.en, `${code} is translated`); assert.ok(!c.es.includes(code) && !c.en.includes(code), `${code}: no raw code`);
  }
});
await test('refusals: test-companyos-provider lists the new codes in CONTRACT_CODES', async () => {
  const src = await readFile('scripts/test-companyos-provider.mjs', 'utf8');
  const list = src.slice(src.indexOf('const CONTRACT_CODES'), src.indexOf('];', src.indexOf('const CONTRACT_CODES')));
  for (const code of NEW_CODES) assert.ok(list.includes(`'${code}'`), code);
});
await test('refusals: the desk has words for every code a pass booking, add or swap can meet', () => {
  const D = need('desk');
  for (const code of BOOKING_CODES) { assert.ok(D.DESK_CODES.includes(code), code); const s = D.deskStrings[`desk.error.${code}`]; assert.ok(s?.es && s?.en && s.es !== s.en, code); }
});
await test('refusals: the member\'s booking screens have words for every code a pass booking can meet', () => {
  const B = need('booking');
  for (const code of BOOKING_CODES) { assert.ok(B.BOOKING_REFUSALS.includes(code), code); const s = B.bookingStrings[`customer.refusal.${code}`]; assert.ok(s?.es && s?.en && s.es !== s.en, code); }
});
await test('refusals: the voucher screens name a group code met at redeem (voucher_wrong_kind) and a kind change (voucher_kind_fixed)', () => {
  const V = need('vouchers');
  for (const code of ['voucher_wrong_kind', 'voucher_kind_fixed']) {
    assert.ok(V.VOUCHER_REFUSALS.includes(code), code);
    for (const part of ['title', 'body']) { const s = V.productionStrings[`vouchers.cos.refusal.${code}.${part}`]; assert.ok(s?.es && s?.en && s.es !== s.en, `${code}.${part}`); }
  }
});
await test('refusals: the payment screens name void_pass_used', () => {
  const L = need('launchCos');
  assert.ok(L.KNOWN_CODES.includes('void_pass_used'));
  const s = L.payLaunchStrings['payLaunch.code.void_pass_used']; assert.ok(s?.es && s?.en && s.es !== s.en);
});
await test('copy: the pass label, the plan kind and the group pages exist in Spanish and English', () => {
  const C = need('core'), V = need('vouchers');
  const all = { ...C.coreStrings, ...C.customerStrings, ...V.productionStrings };
  for (const k of ['customer.paidWith.pass', 'core.plan.kind.group', 'core.plan.places', 'vouchers.group.title', 'vouchers.group.empty', 'vouchers.group.places', 'vouchers.group.named', 'vouchers.group.copy', 'vouchers.group.copied', 'vouchers.group.copyFailed', 'vouchers.group.join.title', 'vouchers.group.join.pick', 'vouchers.group.join.book', 'vouchers.group.join.take', 'vouchers.group.join.done', 'vouchers.group.state.unused', 'vouchers.group.state.used', 'vouchers.group.state.expired', 'vouchers.group.state.voided']) {
    assert.ok(all[k]?.es && all[k]?.en, k); assert.notEqual(all[k].es, all[k].en, `${k} is translated`);
  }
});

// ── vouchers: group codes stay out of the gift and courtesy lists and the redeem flow ──────────────────────────────
await test('vouchers: a group voucher is a Company OS voucher, but the staff gift/courtesy list leaves it out', async () => {
  const V = need('vouchers'), G = need('group');
  const group = { id: 'vch_g', kind: 'group', code: 'GRUP2345', classes: 1, places: 4, joined: 0, uses: 0, max_uses: 1, payment: 'pay_g', buyer: 'per_1', created_at: '2026-11-23T15:00:00Z', updated_at: '2026-11-23T15:00:00Z' };
  assert.ok(V.isCosVoucher(group), 'kind group is accepted');
  assert.ok(G.isGroupVoucher(group) && !G.isGroupVoucher({ ...group, kind: 'gift' }));
  const fake = fakeCredits({ vouchers: [group, { id: 'vch_c', kind: 'courtesy', code: 'CORT2345', classes: 2, uses: 0, max_uses: 1, created_at: '2026-11-22T15:00:00Z', updated_at: '2026-11-22T15:00:00Z' }] });
  const data = fake.wrap({ list: async () => [], insert: async () => { throw Error('x'); }, subscribe: () => () => {} });
  assert.deepEqual((await V.listVouchers(data)).map((v) => v.id), ['vch_c'], 'the staff list shows gifts and courtesies only');
  fake.state.me = 'per_1';
  assert.equal(await codeOf(V.redeemVoucher(data, 'GRUP2345', 'redeem-group-1')), 'voucher_wrong_kind', 'the redeem flow is refused for a group code');
  assert.equal(V.refusalKey(Object.assign(new Error('voucher_wrong_kind'), { code: 'voucher_wrong_kind' })), 'vouchers.cos.refusal.voucher_wrong_kind');
});

// ── routes, sign-in return, required Company OS ────────────────────────────────────────────────────────────────────
await test('routes: /app/group-passes and /app/pass/:code are launch routes, apart from /app/passes and /app/vouchers/:code', () => {
  const R = need('routes');
  for (const r of ['/app/group-passes', '/app/pass/:code', '/app/passes', '/app/vouchers/:code']) assert.ok(R.LAUNCH_ROUTES.includes(r), r);
});
await test('sign-in return: a signed-out visitor comes back to the pass link, class included; hostile links are dropped', () => {
  const R = need('routes');
  assert.equal(R.customerReturn('/app/pass/ABCD2345'), '/app/pass/ABCD2345');
  assert.equal(R.customerReturn('/app/pass/ABCD2345?c=occ_12-ab'), '/app/pass/ABCD2345?c=occ_12-ab');
  for (const bad of ['/app/pass/ABCD2345?c=occ_1&x=1', '/app/pass/ABCD2345?next=//evil', '/app/pass/ABCD2345?c=<script>', '/app/pass/../admin']) assert.equal(R.customerReturn(bad), null, bad);
});
await test('company-os.json requires Company OS 1.23.0 or newer for group passes', async () => {
  const { requires } = JSON.parse(await readFile('company-os.json', 'utf8'));
  const minimum = /^>=(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(requires);
  assert.ok(minimum, 'expected a stable >=major.minor.patch floor');
  const [major, minor] = minimum.slice(1).map(Number);
  assert.ok(major > 1 || (major === 1 && minor >= 23), requires);
});

// ── review round 1: the screens' decision logic (C-43, C-44, S-02, S-04, C-08, PR-01) ─────────────────────────────────
const V0 = { id: 'vch_1', code: 'ABCD2345', places: 4, joined: 0, uses: 0, occurrence: null, valid_until: '2026-12-31', buyer: 'per_1', product: 'prd_g', voided_at: null, created_at: '' };
const LOC = { origin: 'https://hoy.example.test', pathname: '/' };
const NOW = Date.parse('2026-11-24T14:00:00Z');
await test('C-43 card: an unused pass shows its code, places, the link without a class and "book the class"', () => {
  const G = need('group');
  const c = G.passCard(V0, { today: '2026-11-24', now: NOW, cls: null, loc: LOC });
  assert.deepEqual([c.state, c.code, c.places, c.named, c.shareUrl, c.cta?.path], ['unused', 'ABCD2345', 4, null, 'https://hoy.example.test/#/app/pass/ABCD2345', '/app/pass/ABCD2345']);
});
await test('C-43 card: a used pass shows "N of X named" and the link with its class, until the class starts', () => {
  const G = need('group');
  const v = { ...V0, uses: 1, joined: 2, occurrence: 'occ_1' };
  const c = G.passCard(v, { today: '2026-11-24', now: NOW, cls: { starts_at: '2026-11-25T14:00:00Z' }, loc: LOC });
  assert.deepEqual([c.state, c.named, c.shareUrl], ['used', { n: 2, total: 4 }, 'https://hoy.example.test/#/app/pass/ABCD2345?c=occ_1']);
  const started = G.passCard(v, { today: '2026-11-24', now: NOW, cls: { starts_at: '2026-11-24T13:00:00Z' }, loc: LOC });
  assert.deepEqual([started.state, started.shareUrl, started.cta], ['closed', null, null], 'class started or over: no link to share');
});
await test('C-43 card: a spent pass (lead no longer active), an expired or a voided one has no share link', () => {
  const G = need('group');
  const spent = G.passCard({ ...V0, uses: 1, joined: 0, occurrence: 'occ_1' }, { today: '2026-11-24', now: NOW, cls: { starts_at: '2026-11-25T14:00:00Z' }, loc: LOC });
  assert.deepEqual([spent.state, spent.shareUrl, spent.cta], ['spent', null, null]);
  assert.equal(G.passCard({ ...V0, valid_until: '2026-11-01' }, { today: '2026-11-24', now: NOW, cls: null, loc: LOC }).shareUrl, null);
  assert.equal(G.passCard({ ...V0, voided_at: '2026-11-20T00:00:00Z' }, { today: '2026-11-24', now: NOW, cls: null, loc: LOC }).state, 'voided');
});
const S = (id, over = {}) => ({ session: { id, status: 'scheduled', starts_at: new Date(NOW + 864e5).toISOString(), capacity: 10, booked_count: 0, ...over }, modality: { id: 'mod_pulso' } });
await test('C-44 view: no ?c → the picker with classes that have room; ?c → take a place in that class; a bad code → bad', () => {
  const G = need('group');
  const sessions = [S('occ_a'), S('occ_b', { booked_count: 8 }), { ...S('occ_c'), modality: undefined }];
  const pick = G.joinView({ code: 'ABCD2345', occurrence: null, own: { ...V0 }, named: null, sessions, now: NOW, uncertain: false });
  assert.deepEqual([pick.mode, pick.target, pick.offered.map((x) => x.session.id)], ['pick', null, ['occ_a']], 'room for 4, a class type, not started');
  const take = G.joinView({ code: 'ABCD2345', occurrence: 'occ_b', own: null, named: null, sessions, now: NOW, uncertain: false });
  assert.deepEqual([take.mode, take.target], ['take', 'occ_b']);
  assert.equal(G.joinView({ code: 'abc', occurrence: null, own: null, named: null, sessions, now: NOW, uncertain: false }).mode, 'bad');
  const ownUsed = G.joinView({ code: 'ABCD2345', occurrence: null, own: { ...V0, occurrence: 'occ_b' }, named: null, sessions, now: NOW, uncertain: false });
  assert.deepEqual([ownUsed.mode, ownUsed.target], ['take', 'occ_b'], 'the buyer\'s used pass opens its class');
  const locked = G.joinView({ code: 'ABCD2345', occurrence: null, own: null, named: null, sessions, now: NOW, uncertain: true });
  assert.equal(locked.locked, true, 'outcome unknown: rows and the book button stay locked, only the retry is offered');
});
await test('C-44 failure: pass_occurrence_mismatch with details.occurrence switches the page to that class; group_does_not_fit says the numbers', () => {
  const G = need('group');
  const mismatch = G.joinFailure(Object.assign(new Error('pass_occurrence_mismatch'), { code: 'pass_occurrence_mismatch', details: { occurrence: 'occ_b' } }));
  assert.equal(mismatch.named, 'occ_b');
  const view = G.joinView({ code: 'ABCD2345', occurrence: null, own: null, named: mismatch.named, sessions: [S('occ_a'), S('occ_b')], now: NOW, uncertain: false });
  assert.deepEqual([view.mode, view.target], ['take', 'occ_b']);
  assert.deepEqual(G.joinMessage('pass_occurrence_mismatch', mismatch.details, mismatch.named), { key: 'vouchers.group.join.thatClass', vars: {} });
  assert.equal(G.joinFailure(Object.assign(new Error('x'), { code: 'pass_occurrence_mismatch', details: { occurrence: '../x y' } })).named, null, 'a hostile id is not followed');
  const fit = G.joinFailure(Object.assign(new Error('group_does_not_fit'), { code: 'group_does_not_fit', details: { needed: 4, free: 2 } }));
  assert.deepEqual(G.joinMessage('group_does_not_fit', fit.details, null), { key: 'vouchers.group.join.noRoom', vars: { n: 4, free: 2 } });
  assert.deepEqual(G.joinMessage('party_full', null, null), { key: 'customer.refusal.party_full', vars: { code: 'party_full' } });
  assert.equal(G.joinMessage(null, null, null), null);
});
await test('S-02 party block: "N of X places named"; add while places are left and check-in is open; swap on booked places only', () => {
  const G = need('group');
  const g = { party: 'vch_1', size: 4, named: 2, lead: { id: 'b1', user_id: 'per_1', status: 'booked', party_lead: true }, members: [{ id: 'b1', user_id: 'per_1', status: 'booked', party_lead: true }, { id: 'b2', user_id: 'per_2', status: 'checked_in' }] };
  const nameOf = (id) => ({ per_1: 'Bea', per_2: 'Fer' })[id] ?? id;
  const open = G.partyView(g, { open: true, nameOf });
  assert.deepEqual([open.name, open.named, open.total, open.full, open.canAdd, open.swappable], ['Bea', 2, 4, false, true, ['b1']]);
  const closed = G.partyView(g, { open: false, nameOf });
  assert.deepEqual([closed.canAdd, closed.swappable], [false, []], 'check-in closed: no add, no swap');
  assert.equal(G.partyView({ ...g, named: 4 }, { open: true, nameOf }).canAdd, false, 'every place named: no add');
});
await test('ShareLink: the clipboard write gives copied; a refusal, a throw or no clipboard gives failed', async () => {
  const { copyLink } = need('share');
  assert.equal(await copyLink('u', { writeText: async () => {} }), 'copied');
  assert.equal(await copyLink('u', { writeText: async () => { throw new Error('denied'); } }), 'failed');
  assert.equal(await copyLink('u', { writeText: () => { throw new Error('sync'); } }), 'failed');
  assert.equal(await copyLink('u', undefined), 'failed');
});
await test('S-04 desk sale: after selling a group product the notice names the code the approval issued (read by payment)', async () => {
  const G = need('group');
  const w = world();
  await w.approve();
  w.cos.as('usr_desk');
  const v = await G.voucherForPayment(w.cos, w.pay.id);
  assert.match(v?.code ?? '', /^[A-HJ-NP-Z2-9]{8}$/);
  assert.deepEqual(G.groupSaleNotice(v.code), { title: { key: 'desk.sale.groupCode', vars: { code: v.code } }, body: 'desk.sale.groupCodeLater' });
  assert.deepEqual(G.groupSaleNotice(null), { title: null, body: 'desk.sale.groupCodeLater' });
});
await test('C-08 cancel: the lead of a group pass is warned that cancelling cancels the group\'s places and loses the code', () => {
  const G = need('group'), C = need('core');
  assert.equal(G.passCancelWarning({ paid_with: 'pass', party_lead: true }), 'customer.change.cancel.passLead');
  assert.equal(G.passCancelWarning({ paid_with: 'pass', party_lead: false }), null);
  assert.equal(G.passCancelWarning({ paid_with: 'package' }), null);
  const s = C.customerStrings['customer.change.cancel.passLead']; assert.ok(s?.es && s?.en && s.es !== s.en);
});
await test('PR-01 group: the master hides Classes for a group product and sends credits null', () => {
  const P = need('products');
  assert.equal(P.showsClasses('group'), false); assert.equal(P.showsClasses('pack'), true);
  const [op] = P.createOps({ key: 'grupo4', name: 'Clase para 4', kind: 'group', price: 180000, credits: 3, places: 4, active: true });
  assert.equal(op.data.credits, null, 'a group product gives no credits');
});

await test('website (owner 2026-11-23): the public site shows no group pass card; the app\'s Plans does', () => {
  const P = need('pricing'), M = need('mapping');
  const row = (id, data) => M.fromRecord(M.adapterFor('plans'), { id, data });
  const all = P.genericPlans([row('prd_g', { key: 'grupo4', kind: 'group', name: 'Clase para 4', price: 180000, places: 4, active: true }), row('prd_p', { key: 'pack6', kind: 'pack', name: 'Paquete 6', price: 300000, credits: 6, active: true })], '2026-11-24');
  assert.deepEqual(all.map((p) => p.key).sort(), ['grupo4', 'pack6']);
  assert.deepEqual(P.websitePlans(all).map((p) => p.key), ['pack6']);
});

// ── integrated round 1 ────────────────────────────────────────────────────────────────────────────────────────────
await test('S-02 desk (Q1): a person with no account is registered into an unnamed place in one /batch, nothing sold', async () => {
  const G = need('group');
  const w = world();
  await w.approve();
  let p = w.as('usr_buyer');
  const [pass] = await G.myGroupPasses(w.cos);
  await G.joinPass(p, { personId: w.people.buyer.id, occurrenceId: w.occ.id, code: pass.code }, 'join-lead-0010');
  w.as('usr_desk');
  const consents = [{ policy: 'terms', version: '2026-10-01' }, { policy: 'privacy', version: '2026-10-01' }];
  const ops = G.registerIntoPassOps({ person: { name: ' Nina Nueva ', phone: '300 111 2222', email: 'Nina@Example.TEST' }, consents, code: pass.code, sessionId: w.occ.id, today: '2026-11-24' });
  assert.deepEqual(ops.map((o) => `${o.op}:${o.entity}`), ['create:person', 'create:member', 'create:policy_acceptance', 'create:policy_acceptance', 'create:booking'], 'person → member → consents → booking; no payment');
  assert.deepEqual(ops[0].data, { name: 'Nina Nueva', phone: '300 111 2222', whatsapp: '300 111 2222', email: 'nina@example.test' });
  assert.deepEqual(ops[4].data, { occurrence: w.occ.id, person: { $ref: 0 }, entitlement: 'pass', pass_code: pass.code, source: 'desk', status: 'booked' });
  const from = w.cos.calls.length;
  const res = await G.deskRegisterIntoParty(w.cos, { party: pass.id, person: { name: 'Nina Nueva', phone: '3001112222' }, consents, sessionId: w.occ.id, today: '2026-11-24' }, 'desk-register-01');
  const [b] = batches(w.cos, from);
  assert.equal(b.key, 'desk-register-01');
  assert.equal(b.body.ops.length, 5);
  assert.ok(!b.body.ops.some((o) => o.entity === 'payment'), 'nothing is sold');
  const nina = w.cos.db.person.find((x) => x.data.name === 'Nina Nueva');
  assert.equal(res.personId, nina.id);
  assert.equal(w.cos.db.booking.find((x) => x.id === res.bookingId).data.party, pass.id, 'the new person holds a place of the party');
  for (const bad of [{ name: 'N', phone: '3001112222' }, { name: 'Nina', phone: '12' }]) assert.throws(() => G.registerIntoPassOps({ person: bad, consents, code: pass.code, sessionId: w.occ.id, today: '2026-11-24' }), /pass_person_required/, JSON.stringify(bad));
  assert.throws(() => G.registerIntoPassOps({ person: { name: 'Nina', phone: '3001112222' }, consents: [], code: pass.code, sessionId: w.occ.id, today: '2026-11-24' }), /consent_required/);
  const D = need('desk');
  for (const k of ['desk.party.none', 'desk.party.register', 'desk.party.register.cta', 'desk.party.register.consent']) { const c = D.deskStrings[k]; assert.ok(c?.es && c?.en && c.es !== c.en, k); }
  assert.match(D.deskStrings['desk.party.none'].es, /reg[ií]str/i, 'the empty state offers to register here');
});
await test('C-44 view: when this booking would make the person the lead, the page says it books the class for the whole group', () => {
  const G = need('group'), V = need('vouchers');
  const sessions = [S('occ_a'), S('occ_b')];
  const first = G.joinView({ code: 'ABCD2345', occurrence: null, own: { ...V0 }, named: null, sessions, now: NOW, uncertain: false });
  assert.deepEqual([first.mode, first.lead, first.places], ['pick', true, 4]);
  const returned = G.joinView({ code: 'ABCD2345', occurrence: 'occ_b', own: { ...V0, occurrence: null, uses: 0 }, named: null, sessions, now: NOW, uncertain: false });
  assert.deepEqual([returned.mode, returned.lead], ['take', true], 'an old ?c= link after the pass was returned books the class again as lead');
  const join = G.joinView({ code: 'ABCD2345', occurrence: 'occ_b', own: { ...V0, occurrence: 'occ_b', uses: 1, joined: 1 }, named: null, sessions, now: NOW, uncertain: false });
  assert.equal(join.lead, false, 'a pass with its class booked: a place in it');
  assert.equal(G.joinView({ code: 'ABCD2345', occurrence: 'occ_b', own: null, named: null, sessions, now: NOW, uncertain: false }).lead, false, 'a friend\'s ?c= link: a place (the server decides)');
  for (const k of ['vouchers.group.join.leadNote', 'vouchers.group.join.leadNoteUnknown']) { const c = V.productionStrings[k]; assert.ok(c?.es && c?.en && c.es !== c.en, k); }
});
await test('C-43/C-44: a booked pass whose valid_until has passed keeps its share link and its join while the class is ahead', () => {
  const G = need('group');
  const v = { ...V0, valid_until: '2026-11-20', uses: 1, joined: 2, occurrence: 'occ_b' };
  const c = G.passCard(v, { today: '2026-11-24', now: NOW, cls: { starts_at: new Date(NOW + 864e5).toISOString() }, loc: LOC });
  assert.deepEqual([c.state, c.shareUrl], ['used', 'https://hoy.example.test/#/app/pass/ABCD2345?c=occ_b']);
  const view = G.joinView({ code: 'ABCD2345', occurrence: 'occ_b', own: v, named: null, sessions: [S('occ_b')], now: NOW, uncertain: false });
  assert.deepEqual([view.mode, view.target, view.lead], ['take', 'occ_b', false]);
  assert.equal(G.passState({ ...V0, valid_until: '2026-11-20' }, '2026-11-24'), 'expired', 'an unused pass past its date is still expired');
});

// ── integrated round 2: the fake follows the server (ADR 0045 as built) ───────────────────────────────────────────────
const deskCancel = (w, id, key) => w.cos.request('POST', '/batch', { ops: [{ op: 'update', entity: 'booking', id, data: { status: 'cancelled' } }] }, { idempotencyKey: key });
async function party3(w) {
  await w.approve();
  const G = need('group');
  let p = w.as('usr_buyer');
  const [pass] = await G.myGroupPasses(w.cos);
  const lead = await G.joinPass(p, { personId: w.people.buyer.id, occurrenceId: w.occ.id, code: pass.code }, 'p3-lead-00001');
  p = w.as('usr_f1');
  const f1 = await G.joinPass(p, { personId: w.people.f1.id, occurrenceId: w.occ.id, code: pass.code }, 'p3-f1-000001');
  p = w.as('usr_f2');
  const f2 = await G.joinPass(p, { personId: w.people.f2.id, occurrenceId: w.occ.id, code: pass.code }, 'p3-f2-000001');
  return { pass, lead, f1, f2 };
}
const bk = (w, id) => w.cos.db.booking.find((b) => b.id === id).data;
const vch = (w, id) => w.cos.db.voucher.find((v) => v.id === id).data;
await test('fake: the lead\'s cancel cancels only booked friends; a friend already checked in keeps their place', async () => {
  const w = world();
  const { lead, f1, f2 } = await party3(w);
  w.cos.as('usr_desk');
  await w.cos.request('POST', '/batch', { ops: [{ op: 'update', entity: 'booking', id: f1.id, data: { status: 'checked_in' } }] }, { idempotencyKey: 'p3-checkin-01' });
  w.cos.as('usr_buyer');
  await w.cos.request('POST', '/batch', { ops: [{ op: 'update', entity: 'booking', id: lead.id, data: { status: 'cancelled' } }] }, { idempotencyKey: 'p3-cancel-001' });
  assert.equal(bk(w, f1.id).status, 'checked_in');
  assert.deepEqual([bk(w, f2.id).status, bk(w, f2.id).cancel_reason], ['cancelled', 'party_lead_cancelled']);
});
await test('fake: a voided pass answers voucher_payment_not_approved at the lead\'s booking; an unknown code voucher_invalid', async () => {
  const G = need('group');
  const w = world();
  await w.approve();
  let p = w.as('usr_buyer');
  const [pass] = await G.myGroupPasses(w.cos);
  w.cos.as('usr_admin');
  await w.cos.request('POST', '/batch', { ops: [{ op: 'update', entity: 'payment', id: w.pay.id, data: { status: 'voided', status_reason: 'error' } }] }, { idempotencyKey: 'void-unused-01' });
  p = w.as('usr_buyer');
  assert.equal(await codeOf(G.joinPass(p, { personId: w.people.buyer.id, occurrenceId: w.occ.id, code: pass.code }, 'voided-lead-01')), 'voucher_payment_not_approved');
  assert.equal(await codeOf(G.joinPass(p, { personId: w.people.buyer.id, occurrenceId: w.occ.id, code: 'ZZZZ2222' }, 'voided-lead-02')), 'voucher_invalid');
});
await test('fake: only a change to or from kind group is refused (voucher_kind_fixed)', async () => {
  const w = world();
  w.cos.as('usr_admin');
  const gift = w.cos.seed('voucher', { kind: 'gift', code: 'GIFT2345', classes: 1 });
  const grp = w.cos.seed('voucher', { kind: 'group', code: 'GRUP2345', classes: 1, places: 2 });
  const upd = (id, kind, k) => codeOf(w.cos.request('POST', '/batch', { ops: [{ op: 'update', entity: 'voucher', id, data: { kind } }] }, { idempotencyKey: k }));
  assert.equal(await upd(gift.id, 'courtesy', 'kind-fix-0001'), 'ok', 'gift → courtesy is not a group change');
  assert.equal(await upd(grp.id, 'gift', 'kind-fix-0002'), 'voucher_kind_fixed');
  assert.equal(await upd(gift.id, 'group', 'kind-fix-0003'), 'voucher_kind_fixed');
});
await test('fake: expiry, void and payment checks apply to the lead only: a friend joins a booked pass after its valid_until', async () => {
  const G = need('group');
  const w = world();
  await w.approve();
  let p = w.as('usr_buyer');
  const [pass] = await G.myGroupPasses(w.cos);
  await G.joinPass(p, { personId: w.people.buyer.id, occurrenceId: w.occ.id, code: pass.code }, 'late-lead-0001');
  vch(w, pass.id).valid_until = '2026-11-01';
  p = w.as('usr_f1');
  assert.equal(await codeOf(G.joinPass(p, { personId: w.people.f1.id, occurrenceId: w.occ.id, code: pass.code }, 'late-f1-00001')), 'ok');
  const w2 = world();
  await w2.approve();
  const p2 = w2.as('usr_buyer');
  const [pass2] = await G.myGroupPasses(w2.cos);
  w2.cos.db.voucher.find((v) => v.id === pass2.id).data.valid_until = '2026-11-01';
  assert.equal(await codeOf(G.joinPass(p2, { personId: w2.people.buyer.id, occurrenceId: w2.occ.id, code: pass2.code }, 'late-lead-0002')), 'voucher_expired', 'the lead still meets the expiry');
});
await test('fake: a studio-side cancel returns the code only before the class starts and while nobody checked in', async () => {
  const w = world();
  const a = await party3(w);
  w.cos.as('usr_desk');
  await deskCancel(w, a.lead.id, 'ret-cancel-001');
  assert.equal(vch(w, a.pass.id).uses, 0, 'returned: not started, nobody in');
  const w2 = world();
  const b = await party3(w2);
  w2.cos.as('usr_desk');
  await w2.cos.request('POST', '/batch', { ops: [{ op: 'update', entity: 'booking', id: b.f1.id, data: { status: 'checked_in' } }] }, { idempotencyKey: 'ret-checkin-01' });
  await deskCancel(w2, b.lead.id, 'ret-cancel-002');
  assert.equal(w2.cos.db.voucher.find((v) => v.id === b.pass.id).data.uses, 1, 'someone checked in: the code is spent');
  const w3 = world();
  const c = await party3(w3);
  w3.cos.db.occurrence.find((o) => o.id === w3.occ.id).data.starts_at = new Date(T0 - 600e3).toISOString();
  w3.cos.as('usr_desk');
  await deskCancel(w3, c.lead.id, 'ret-cancel-003');
  assert.equal(w3.cos.db.voucher.find((v) => v.id === c.pass.id).data.uses, 1, 'the class started: the code is spent');
});
await test('copy: the lead\'s cancel warning and the join rules say checked-in friends keep their place and the pass is not given back once the class started or anyone checked in', () => {
  const C = need('core'), V = need('vouchers');
  const warn = C.customerStrings['customer.change.cancel.passLead'], rules = V.productionStrings['vouchers.group.join.rules'];
  for (const c of [warn, rules]) {
    assert.match(c.es, /registr\S* (su )?llegada/i, c.es); assert.match(c.en, /checked in/i, c.en);
    assert.doesNotMatch(c.es, /todos los lugares|lugares de todo el grupo/i, c.es); assert.doesNotMatch(c.en, /every place/i, c.en);
  }
  assert.match(rules.es, /empez/i); assert.match(rules.en, /start/i);
});

console.log(`\ngroup pass: ${passed} passed, ${failures} failed`);
if (failures) process.exit(1);
