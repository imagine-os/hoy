// H-6 · vouchers on Company OS credits: the production model (src/modules/vouchers/production/model.ts) against a fake of
// the credits API behind the provider's raw port (scripts/lib/fake-credits.mjs); products and payments go through the real
// mapping (src/data/companyos/mapping.ts). One named test per tracker row BO-01…BO-06, plus the production cut.
// Fictional data only. Run: node scripts/test-vouchers-cos.mjs
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fakeCredits, fixtures } from './lib/fake-credits.mjs';

const dir = await mkdtemp(join(tmpdir(), 'hoy-vouchers-cos-'));
let failed = 0;
const test = async (name, fn) => {
  try { await fn(); console.log(`ok   ${name}`); } catch (e) { failed++; console.log(`FAIL ${name}\n     ${e.stack?.split('\n').slice(0, 3).join('\n     ')}`); }
};
try {
  const file = join(dir, 'model.mjs');
  const entry = "export * from './src/modules/vouchers/production/model.ts'; export { adapterFor, fromRecord } from './src/data/companyos/mapping.ts';";
  await build({ stdin: { contents: entry, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', outfile: file, logLevel: 'silent',
    // The production screens and the connector read the build flag (src/config/launch.ts).
    define: { 'import.meta.env': '{"VITE_HOY_BUILD":"production"}' } });
  const m = await import(pathToFileURL(file));
  const mapping = { adapterFor: m.adapterFor, fromRecord: m.fromRecord };
  /** A stored fixture row as the production `plans` / `payments` table reads it (the real mapping). */
  const mapped = (table, rows) => rows.map(({ id, ...data }) => m.fromRecord(m.adapterFor(table), { id, data }));
  const addDaysKey = (key, n) => new Date(Date.parse(`${key}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
  const today = '2026-11-02';
  const notes = m.giftPaymentNotes({ name: ' Juliana Ficticia ', email: 'Juliana@Demo.HoyOS.test ' });
  const setup = (extra = {}) => { const fake = fakeCredits({ today, products: fixtures.products, payments: fixtures.payments(notes), ...extra }); return { fake, data: fake.wrap({ list: async () => [], insert: async () => { throw Error('not a voucher table'); }, subscribe: () => () => {} }, mapping) }; };
  /** Redeem as a given person: the model reads the caller's person (`person.user` = the login), the fake answers it. */
  const redeemAs = (fake, data, person, code, key) => { fake.state.me = person; return m.redeemVoucher(data, code, key); };
  const EXTRAS = ['benefitKind', 'benefitTotal', 'participantCap', 'capScope', 'creditUnit', 'cancellationPolicy', 'balance', 'title', 'expiresAt', 'value', 'cop'];

  await test('BO-01 the customer picks a gift of N classes, gives the recipient email, and goes to pay by transfer', async () => {
    const gifts = m.giftProducts(fixtures.products);
    assert.deepEqual(gifts.map((g) => [g.id, g.classes, g.price]), [['prd_gift1', 1, 38000], ['prd_gift12', 12, 400000]], 'gift products only, active only (Company OS shape)');
    const viaMapping = m.giftProducts(mapped('plans', fixtures.products));
    assert.deepEqual(viaMapping.map((g) => [g.id, g.key, g.classes, g.price, g.validityDays]), gifts.map((g) => [g.id, g.key, g.classes, g.price, g.validityDays]), 'the same through the production plans mapping');
    assert.deepEqual(viaMapping[1].name, { es: 'Regalo: 12 clases', en: 'Gift card · 12-class package' }, 'the mapping adds the English name by product key');
    assert.deepEqual(m.giftProducts([{ id: 'p', slug: 'g', family: 'regalos', name_es: 'Regalo', name_en: 'Gift', classes: 2, price: 1 }])[0].name, { es: 'Regalo', en: 'Gift' }, 'frontend shape, English name kept');
    assert.deepEqual(m.parseGiftNotes(notes), { name: 'Juliana Ficticia', email: 'juliana@demo.hoyos.test' }, 'the recipient rides on the payment notes, trimmed and lower-cased');
    assert.equal(m.parseGiftNotes('Transferencia Bancolombia\n' + notes).email, 'juliana@demo.hoyos.test', 'found on any line of the notes');
    for (const bad of [null, '', 'gift-recipient:{oops', 'gift-recipient:{"name":1}']) assert.equal(m.parseGiftNotes(bad), null);
    for (const ok of ['a@b.co', 'juliana@demo.hoyos.test']) assert.ok(m.isEmail(ok), ok);
    for (const bad of ['', 'a@b', 'Ana <a@b.co>', 'a@b.co, c@d.co', 'a b@c.co']) assert.ok(!m.isEmail(bad), bad);
    assert.deepEqual(gifts.map((g) => g.key), ['gift_single', 'gift_pack12'], 'product key (Company OS key or frontend slug)');
    assert.equal(m.giftCheckoutPath('gift_pack12'), '/app/pay/product/gift_pack12', "H-5's pay screen, by product key");
    assert.ok(notes.length <= 1000 && notes.startsWith('gift-recipient:'), "within H-5's notes limit");
  });

  await test('BO-02 once the transfer is approved the desk issues the gift voucher; its create carries the recipient email and a unique code for the link', async () => {
    const { fake, data } = setup();
    const products = m.giftProducts(fixtures.products);
    const payments = await data.list('payments');
    let waiting = m.giftsToIssue(payments, products, []);
    assert.deepEqual(waiting.map((w) => w.payment.id), ['pay_gift_ok', 'pay_gift_nonotes'], 'approved gift payments only: not pending, declined, without a status, or a pack');
    assert.equal(waiting[1].recipient, null, 'a payment without recipient notes is still listed (the desk types the recipient)');
    assert.equal(waiting[1].payment.person, 'usr_c02', 'the production payments mapping (user_id, plan_id, note) is read');
    assert.deepEqual(m.giftsToIssue(fake.state.payments, products, []).map((w) => w.payment.id), ['pay_gift_ok', 'pay_gift_nonotes'], 'and the Company OS shape');
    const w = waiting[0];
    const until = m.giftValidUntil(w.product, today, addDaysKey);
    assert.equal(until, '', 'no validity_days → no end');
    assert.equal(m.giftValidUntil(products[0], today, addDaysKey), '2026-12-31', '60 days counting today');
    const v = await m.issueGiftVoucher(data, w.payment, w.product, w.recipient, until, 'key-gift-1');
    assert.deepEqual(fake.state.writes.at(-1), { path: '/api/voucher', key: 'key-gift-1', body: { kind: 'gift', product: 'prd_gift12', classes: 12, max_uses: 1, recipient_name: 'Juliana Ficticia', recipient_email: 'juliana@demo.hoyos.test', buyer: 'usr_c01', note: 'payment:pay_gift_ok' } });
    assert.match(v.code, /^[A-HJ-NP-Z2-9]{8}$/, 'server-generated code');
    assert.equal(m.redeemPath(v.code.toLowerCase()), `/app/vouchers/${v.code}`, 'the emailed link');
    const again = await m.issueGiftVoucher(data, w.payment, w.product, w.recipient, until, 'key-gift-1');
    assert.equal(again.id, v.id, 'a retry with the same Idempotency-Key replays, no second voucher');
    assert.equal(fake.state.vouchers.length, 1);
    await assert.rejects(m.issueGiftVoucher(data, w.payment, w.product, { name: 'Otra', email: 'otra@demo.hoyos.test' }, until, 'key-gift-1'), (e) => m.refusalCode(e) === 'idempotency_conflict', 'the same key with another body is a conflict, not a second voucher');
    const listed = await m.listVouchers(data);
    assert.deepEqual(listed.map((x) => [x.id, x.kind, x.classes, x.note, x.code]), [[v.id, 'gift', 12, 'payment:pay_gift_ok', v.code]], 'the list reads Company OS records ({ id, data }) as flat rows');
    waiting = m.giftsToIssue(payments, products, listed);
    assert.deepEqual(waiting.map((x) => x.payment.id), ['pay_gift_nonotes'], 'an issued gift leaves the list');
    for (let i = 0; i < m.VOUCHER_READ_MAX; i++) fake.state.vouchers.push({ id: `vch_bulk_${i}`, kind: 'courtesy', classes: 1, code: `B${String(i).padStart(7, '0')}`, uses: 0, max_uses: 1 });
    await assert.rejects(m.listVouchers(data), (e) => m.refusalCode(e) === 'too_many_vouchers', 'a list past the read limit refuses instead of dropping rows (issued gifts would look unissued)');
    fake.state.vouchers.splice(1);
    fake.state.readVouchers = false;
    await assert.rejects(m.listVouchers(data), (e) => m.refusalCode(e) === 'forbidden', 'a member may not read vouchers: the read refuses (the screen shows its notice)');
    await assert.rejects(data.insert('vouchers', { kind: 'gift' }), (e) => e.code === 'not_in_launch', 'nothing writes the review-shape vouchers table');
  });

  await test('BO-02 the voucher can ride in the approval batch: one create op, or none when it cannot be issued', async () => {
    const [ok, , , , nostatus, nonotes] = fixtures.payments(notes);
    const [gift1, gift12, , pack] = fixtures.products;
    const ops = m.giftVoucherOps(ok, gift12, today);
    assert.deepEqual(ops, [{ op: 'create', entity: 'voucher', data: { kind: 'gift', product: 'prd_gift12', classes: 12, max_uses: 1, recipient_name: 'Juliana Ficticia', recipient_email: 'juliana@demo.hoyos.test', buyer: 'usr_c01', note: 'payment:pay_gift_ok' } }]);
    assert.equal(m.giftVoucherOps({ ...ok, status: 'pending' }, gift12, today).length, 1, 'built for the batch that approves it');
    assert.equal(m.giftVoucherOps(nostatus, gift1, today)[0].data.valid_until, '2026-12-31', "the product's validity from the approval day");
    assert.deepEqual(m.giftVoucherOps(ok, pack, today), [], 'not a gift product');
    const raw = (r) => { const { id, ...data } = r; return { id, data }; };
    assert.deepEqual(m.giftVoucherOps(raw({ ...ok, status: 'approved' }), raw(gift12), today), ops, "raw Company OS records ({ id, data }), as H-5's registerApprovalOps passes them");
    assert.deepEqual(m.giftVoucherOps(nonotes, gift1, today), [], 'no recipient: the desk issues it');
    assert.deepEqual(m.giftVoucherOps({ ...ok, notes: m.giftPaymentNotes({ name: 'Ana', email: 'not-an-email' }) }, gift12, today), [], 'a bad email is not sent');
    const { fake, data } = setup();
    fake.createVoucher(ops[0].data);
    assert.deepEqual(m.giftsToIssue(await data.list('payments'), m.giftProducts(await data.list('plans')), await m.listVouchers(data)).map((w) => w.payment.id), ['pay_gift_nonotes'], 'a voucher made in the approval batch leaves the desk list (no second issue)');
  });

  await test('BO-03 administration creates a courtesy voucher with classes, expiry and usage limit, sent by email', async () => {
    const { fake, data } = setup();
    const form = { classes: '3', validUntil: '2026-11-30', maxUses: '10', name: ' Invitada Ficticia ', email: 'INVITADA@demo.hoyos.test' };
    assert.deepEqual(m.courtesyErrors(form, today), {});
    const bad = m.courtesyErrors({ classes: '0', validUntil: '2026-11-01', maxUses: '1.5', name: 'A', email: 'no' }, today);
    assert.deepEqual(Object.keys(bad).sort(), ['classes', 'email', 'maxUses', 'name', 'validUntil']);
    assert.deepEqual(m.courtesyErrors({ ...form, classes: '-2' }, today).classes, 'vouchers.cos.err.classes');
    assert.equal(m.courtesyErrors({ ...form, validUntil: today }, today).validUntil, undefined, 'today is a valid last day');
    const body = m.courtesyBody(form);
    assert.deepEqual(body, { kind: 'courtesy', classes: 3, valid_until: '2026-11-30', max_uses: 10, recipient_name: 'Invitada Ficticia', recipient_email: 'invitada@demo.hoyos.test' });
    const v = await m.createVoucher(data, body, 'key-courtesy');
    assert.equal(fake.state.writes.at(-1).key, 'key-courtesy');
    assert.equal(v.uses, 0); assert.match(v.code, /^[A-HJ-NP-Z2-9]{8}$/);
    assert.deepEqual(fake.state.writes.at(-1).body, body, 'every courtesy field reaches the server');
    fake.state.fail = 'invalid_quantity';
    await assert.rejects(m.createVoucher(data, body, 'key-courtesy-2'), (e) => m.refusalKey(e) === 'vouchers.cos.refusal.invalid_quantity' && !m.writeMayHaveCommitted(e), 'a refusal: the key is renewed');
    fake.state.fail = 'network';
    await assert.rejects(m.createVoucher(data, body, 'key-courtesy-3'), (e) => m.writeMayHaveCommitted(e), 'no answer: the key is kept for the retry');
  });

  await test("BO-04 opening the link and redeeming adds the voucher's classes to the person's balance", async () => {
    const { fake, data } = setup();
    const v = fake.createVoucher({ kind: 'courtesy', classes: 2, valid_until: '2026-11-30', max_uses: 5, recipient_email: 'x@demo.hoyos.test' });
    assert.equal(m.normalizeCode(` ${v.code.slice(0, 4).toLowerCase()}-${v.code.slice(4)} `), v.code, 'spaces, dashes and case are forgiven');
    assert.ok(m.isCode(v.code.toLowerCase()) && !m.isCode('ABCDEFGI') && !m.isCode('ABC'));
    const lot = await redeemAs(fake, data, 'per_cust', v.code.toLowerCase(), 'key-redeem');
    assert.deepEqual(fake.state.writes.at(-1), { path: '/api/credit_lot', key: 'key-redeem', body: { person: 'per_cust', voucher_code: v.code } }, "only the caller's person and the code: the voucher decides the lot");
    assert.deepEqual([lot.quantity, lot.valid_until, lot.source], [2, '2026-11-30', 'courtesy']);
    assert.equal(fake.balance('per_cust'), 2);
    const other = fake.createVoucher({ kind: 'gift', classes: 3 });
    fake.state.fail = 'lost';
    await assert.rejects(redeemAs(fake, data, 'per_cust', other.code, 'key-lost'), (e) => m.refusalKey(e) === 'vouchers.cos.refusal.generic' && m.writeMayHaveCommitted(e), 'the server committed, the answer was lost');
    assert.equal(fake.balance('per_cust'), 5);
    const replay = await redeemAs(fake, data, 'per_cust', other.code, 'key-lost');
    assert.equal(replay.quantity, 3, 'the retry with the same key replays the committed lot instead of refusing voucher_used_up');
    assert.equal(fake.balance('per_cust'), 5, 'and adds nothing twice');
    fake.state.me = null;
    await assert.rejects(m.redeemVoucher(data, other.code, 'key-noperson'), (e) => m.refusalKey(e) === 'vouchers.cos.refusal.forbidden', 'a login without a person is refused before any write');
  });

  await test('BO-05 an expired, used-up or unknown voucher is refused with its own clear message', async () => {
    const { fake, data } = setup();
    const expired = fake.createVoucher({ kind: 'courtesy', classes: 1, valid_until: '2026-11-01' });
    const single = fake.createVoucher({ kind: 'gift', classes: 1, valid_until: '2026-12-01' });
    const two = fake.createVoucher({ kind: 'courtesy', classes: 1, max_uses: 2 });
    const key = (e) => m.refusalKey(e);
    await assert.rejects(redeemAs(fake, data, 'usr_cust', expired.code, 'key-bo05-1'), (e) => key(e) === 'vouchers.cos.refusal.voucher_expired');
    await redeemAs(fake, data, 'usr_cust', single.code, 'key-bo05-2');
    await assert.rejects(redeemAs(fake, data, 'usr_c02', single.code, 'key-bo05-3'), (e) => key(e) === 'vouchers.cos.refusal.voucher_used_up', 'single use: another person');
    await redeemAs(fake, data, 'usr_cust', two.code, 'key-bo05-4');
    await assert.rejects(redeemAs(fake, data, 'usr_cust', two.code, 'key-bo05-5'), (e) => key(e) === 'vouchers.cos.refusal.voucher_used_up', 'one redemption per person');
    await redeemAs(fake, data, 'usr_c02', two.code, 'key-bo05-6');
    await assert.rejects(redeemAs(fake, data, 'usr_c03', two.code, 'key-bo05-7'), (e) => key(e) === 'vouchers.cos.refusal.voucher_used_up', 'max_uses reached');
    await assert.rejects(redeemAs(fake, data, 'usr_cust', 'ZZZZZZZZ', 'key-bo05-8'), (e) => key(e) === 'vouchers.cos.refusal.voucher_invalid');
    assert.equal(fake.balance('usr_cust'), 2, 'refusals add nothing');
    // Every shape a provider may throw maps to the same copy; unknown codes and network errors fall back to the generic message.
    assert.equal(m.refusalKey({ code: 'voucher_redeemed' }), 'vouchers.cos.refusal.voucher_redeemed');
    assert.equal(m.refusalKey({ error: { code: 'voucher_expired' } }), 'vouchers.cos.refusal.voucher_expired');
    assert.equal(m.refusalKey(new Error('voucher_used_up')), 'vouchers.cos.refusal.voucher_used_up');
    assert.equal(m.refusalKey(new TypeError('Failed to fetch')), 'vouchers.cos.refusal.generic');
    assert.equal(m.refusalCode(new TypeError('Failed to fetch')), null);
    assert.equal(m.refusalKey({ code: 'something_new' }), 'vouchers.cos.refusal.generic');
    // The studio's list shows the same states (display only).
    const state = (v) => m.voucherState(fake.state.vouchers.find((x) => x.id === v.id), today);
    assert.deepEqual([state(expired), state(single), state(two)], ['expired', 'used_up', 'used_up']);
    assert.equal(m.voucherState({ kind: 'courtesy', classes: 1, valid_until: today, uses: 0 }, today), 'active', 'the last day is still valid');
  });

  await test('BO-06 the gift names its buyer, and its redemption is stamped, so the buyer can be told it was sent and used', async () => {
    const { fake, data } = setup();
    const [w] = m.giftsToIssue(await data.list('payments'), m.giftProducts(await data.list('plans')), []);
    const v = await m.issueGiftVoucher(data, w.payment, w.product, w.recipient, '', 'key-bo06-gift');
    assert.equal(fake.state.vouchers[0].buyer, 'usr_c01', 'voucher.created → "your gift was sent" goes to record.buyer');
    await redeemAs(fake, data, 'usr_juliana', v.code, 'key-bo06-redeem');
    const after = fake.state.vouchers[0];
    assert.deepEqual([after.uses, after.redeemed_by, typeof after.redeemed_at], [1, 'usr_juliana', 'string'], 'voucher.redeemed → "your gift was used" goes to the voucher buyer');
  });

  await test('production cut: no value in pesos, attendee cap, booking scope or restore-on-cancel in any request', async () => {
    const [w] = m.giftsToIssue(fixtures.payments(notes), m.giftProducts(fixtures.products), []);
    const bodies = [m.courtesyBody({ classes: '1', validUntil: '2026-12-01', maxUses: '1', name: 'Ana', email: 'a@b.co' }), m.giftBody(w.payment, w.product, w.recipient, '2026-12-01')];
    for (const body of bodies) for (const k of Object.keys(body)) assert.ok(!EXTRAS.includes(k), k);
    for (const body of bodies) assert.deepEqual(Object.keys(body).filter((k) => !['kind', 'product', 'classes', 'valid_until', 'max_uses', 'recipient_name', 'recipient_email', 'buyer', 'note'].includes(k)), [], 'Company OS voucher fields only');
    assert.ok(!m.isCosVoucher({ title: 'demo', benefitKind: 'classes', benefitTotal: 2 }), 'review-build demo rows are not shown as vouchers');
    await assert.rejects(m.createVoucher({ list: async () => [] }, bodies[0], 'key-review'), (e) => m.refusalCode(e) === 'not_in_launch', 'the review build has no raw port: the production calls refuse');
  });
} finally { await rm(dir, { recursive: true, force: true }); }
console.log(failed ? `\n${failed} voucher (H-6) test(s) failed` : '\nvoucher (H-6) model tests passed');
process.exitCode = failed ? 1 : 0;
