// Hoy 12 Nov · lane H-CODES: teacher codes. Decisions D3-D6 and readings R2, R3 of the programme plan.
//   - Administration (and Super Admin) alone reach "Códigos de profesores"; a code is a courtesy voucher with `coach`,
//     `first_time_only: true` and no recipient; the share link opens the redeem page with the code.
//   - Funnel per teacher: codes, people who redeemed, of whom bought later (an approved payment after the redemption).
//   - The checkout code entry (VoucherCodeEntry) redeems, reports success and has words for every refusal, es and en.
// Fictional data only. Run: node scripts/test-teacher-codes.mjs
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fakeCredits } from './lib/fake-credits.mjs';

const dir = await mkdtemp(join(tmpdir(), 'hoy-teacher-codes-'));
let failed = 0;
const test = async (name, fn) => {
  try { await fn(); console.log(`ok   ${name}`); } catch (e) { failed++; console.log(`FAIL ${name}\n     ${e.stack?.split('\n').slice(0, 3).join('\n     ')}`); }
};
try {
  const file = join(dir, 'codes.mjs');
  const entry = [
    "export * from './src/modules/vouchers/production/model.ts';",
    "export * from './src/modules/vouchers/production/teacherCodes.ts';",
    "export * from './src/modules/vouchers/production/codeEntry.ts';",
    "export { productionStrings } from './src/modules/vouchers/production/strings.ts';",
    "export { teacherCodesSpec, studioSpec } from './src/modules/vouchers/production/specs.ts';",
    "export { matrixAllows } from './src/config/roleMatrix.ts';",
    "export { CONTRACT_REFUSALS } from './src/data/companyos/refusals.ts';",
  ].join('\n');
  await build({ stdin: { contents: entry, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', outfile: file, logLevel: 'silent',
    define: { 'import.meta.env': '{"VITE_HOY_BUILD":"production"}' } });
  const m = await import(pathToFileURL(file));
  const today = '2026-11-12';
  const setup = (extra = {}) => { const fake = fakeCredits({ today, ...extra }); return { fake, data: fake.wrap({ list: async () => [], subscribe: () => () => {} }) }; };
  const redeemAs = (fake, data, person, code, key) => { fake.state.me = person; return m.redeemVoucher(data, code, key); };

  await test('only Administration and Super Admin reach the page; every other role is refused', async () => {
    const path = '/admin/vouchers/teachers';
    for (const role of ['admin', 'super_admin']) assert.ok(m.matrixAllows(role, path), `${role} reaches it`);
    for (const role of ['front_desk', 'customer', 'public', 'coordinator', 'finance', 'teacher', 'maintenance', 'marketing', 'developer']) assert.ok(!m.matrixAllows(role, path), `${role} is refused`);
    assert.deepEqual([...m.teacherCodesSpec.roles].sort(), ['admin', 'super_admin'], 'the route lists Administration and Super Admin only');
    assert.ok(!m.studioSpec.roles.includes('front_desk') && !m.teacherCodesSpec.roles.includes('front_desk'));
  });

  await test('creating a code sends the teacher, first_time_only true, max uses and expiry, and no recipient', async () => {
    const { fake, data } = setup();
    const form = { coach: 'coa_ana', classes: '1', validUntil: '2026-12-31', maxUses: '200' };
    assert.deepEqual(m.teacherCodeErrors(form, today), {});
    const body = m.teacherCodeBody(form);
    assert.deepEqual(body, { kind: 'courtesy', classes: 1, valid_until: '2026-12-31', max_uses: 200, coach: 'coa_ana', first_time_only: true });
    assert.ok(!('recipient_email' in body) && !('recipient_name' in body), 'no recipient: nothing is emailed');
    const v = await m.createVoucher(data, body, 'key-teacher-1');
    assert.deepEqual(fake.state.writes.at(-1), { path: '/api/voucher', key: 'key-teacher-1', body });
    assert.match(v.code, /^[A-HJ-NP-Z2-9]{8}$/);
    // The form refuses what the server would, before it asks.
    assert.equal(m.teacherCodeErrors({ ...form, coach: '' }, today).coach, 'vouchers.cos.err.coach', 'a teacher is required');
    assert.ok(m.teacherCodeErrors({ ...form, maxUses: '0' }, today).maxUses && m.teacherCodeErrors({ ...form, maxUses: '501' }, today).maxUses, 'max uses 1 to 500');
    assert.ok(m.teacherCodeErrors({ ...form, classes: '0' }, today).classes, 'classes at least 1');
    assert.ok(m.teacherCodeErrors({ ...form, validUntil: '2026-11-11' }, today).validUntil, 'a past date is refused');
    assert.equal(m.teacherCodeErrors({ ...form, validUntil: today }, today).validUntil, undefined, 'today is allowed');
  });

  await test('a refused create (front desk may not attach a teacher) is shown in words', async () => {
    const { fake, data } = setup();
    fake.state.fail = 'forbidden';
    await assert.rejects(m.createVoucher(data, m.teacherCodeBody({ coach: 'coa_ana', classes: '1', validUntil: '2026-12-31', maxUses: '5' }), 'key-teacher-2'), (e) => m.refusalKey(e) === 'vouchers.cos.refusal.forbidden');
  });

  await test('the share link opens the redeem page with the code, from the app address', async () => {
    assert.equal(m.teacherCodeLink('https://app.hoy.test', 'abcd-2345'), 'https://app.hoy.test/#/app/vouchers/ABCD2345');
    assert.equal(m.teacherCodeLink('https://app.hoy.test/', 'ABCD2345'), 'https://app.hoy.test/#/app/vouchers/ABCD2345', 'no double slash');
    assert.equal(m.teacherCodeLink('', 'ABCD2345'), '/#/app/vouchers/ABCD2345', 'no address known: a relative link');
    assert.equal(m.redeemPath('ABCD2345'), '/app/vouchers/ABCD2345', 'the same path the emailed link uses');
  });

  // Made-up data: Ana has two codes, Beto one, a courtesy has no teacher.
  const coaches = [{ id: 'coa_ana', name: 'Ana Ficticia' }, { id: 'coa_beto', name: 'Beto Ficticio' }, { id: 'coa_cami', name: 'Cami Ficticia' }];
  const vouchers = [
    { id: 'v1', kind: 'courtesy', classes: 1, code: 'AAAAAAA2', coach: 'coa_ana', uses: 3, max_uses: 50, valid_until: '2026-12-31', first_time_only: true },
    { id: 'v2', kind: 'courtesy', classes: 1, code: 'AAAAAAA3', coach: 'coa_ana', uses: 1, max_uses: 50, first_time_only: true },
    { id: 'v3', kind: 'courtesy', classes: 1, code: 'BBBBBBB2', coach: 'coa_beto', uses: 1, max_uses: 10, first_time_only: true },
    { id: 'v4', kind: 'courtesy', classes: 2, code: 'CCCCCCC2', uses: 1, max_uses: 1 },
  ];
  const lot = (id, person, voucher, at) => ({ id, person, voucher, created_at: at });
  const lots = [
    lot('l1', 'p_luz', 'v1', '2026-11-03T15:00:00Z'),    // bought later (approved after)
    lot('l2', 'p_mar', 'v1', '2026-11-04T15:00:00Z'),    // bought BEFORE redeeming: not counted
    lot('l3', 'p_nico', 'v1', '2026-11-05T15:00:00Z'),   // payment pending: not counted
    lot('l4', 'p_luz', 'v2', '2026-11-06T15:00:00Z'),    // same person, second code of Ana: one person
    lot('l5', 'p_ofe', 'v3', '2026-11-07T15:00:00Z'),    // Beto: payment declined and another voided
    lot('l6', 'p_pao', 'v4', '2026-11-07T15:00:00Z'),    // a code without a teacher: in nobody's funnel
    lot('l7', 'p_qui', null, '2026-11-07T15:00:00Z'),    // a lot that did not come from a voucher
  ];
  const pay = (id, person, status, at) => ({ id, person, status, paid_at: status === 'approved' ? at : null, date: at.slice(0, 10) });
  const payments = [
    pay('y1', 'p_luz', 'approved', '2026-11-08T10:00:00Z'),
    pay('y2', 'p_mar', 'approved', '2026-11-01T10:00:00Z'),
    pay('y3', 'p_nico', 'pending', '2026-11-09T10:00:00Z'),
    pay('y4', 'p_ofe', 'declined', '2026-11-09T10:00:00Z'),
    pay('y5', 'p_ofe', 'voided', '2026-11-10T10:00:00Z'),
    pay('y6', 'p_pao', 'approved', '2026-11-09T10:00:00Z'),
  ];
  const names = new Map([['p_luz', 'Luz Ficticia'], ['p_mar', 'Mar Ficticia'], ['p_nico', 'Nico Ficticio'], ['p_ofe', 'Ofelia Ficticia']]);

  await test('the funnel counts codes, people who redeemed and who bought later, per teacher', async () => {
    const rows = m.teacherFunnel({ coaches, vouchers, lots, payments, names });
    const ana = rows.find((r) => r.coach === 'coa_ana'), beto = rows.find((r) => r.coach === 'coa_beto'), cami = rows.find((r) => r.coach === 'coa_cami');
    assert.deepEqual([ana.name, ana.codes.length, ana.redeemed, ana.bought], ['Ana Ficticia', 2, 3, 1], 'Luz redeemed twice but is one person; only her payment came after');
    assert.deepEqual(ana.people.map((p) => [p.name, p.boughtLater]).sort(), [['Luz Ficticia', true], ['Mar Ficticia', false], ['Nico Ficticio', false]]);
    assert.deepEqual([beto.codes.length, beto.redeemed, beto.bought], [1, 1, 0], 'declined and voided payments do not count');
    assert.deepEqual([cami.codes.length, cami.redeemed, cami.bought], [0, 0, 0], 'a teacher with no code is listed with zeros');
    assert.ok(!rows.some((r) => r.coach == null), 'a courtesy without a teacher is in nobody\'s funnel');
  });

  await test('"later" means after the redemption: before, at the same moment, another person or a pending payment is not counted', async () => {
    const one = (payment) => m.teacherFunnel({ coaches, vouchers, lots: [lot('l1', 'p_luz', 'v1', '2026-11-03T15:00:00Z')], payments: payment, names })[0];
    assert.equal(one([pay('a', 'p_luz', 'approved', '2026-11-03T15:00:01Z')]).bought, 1, 'a second later');
    assert.equal(one([pay('a', 'p_luz', 'approved', '2026-11-03T14:59:59Z')]).bought, 0, 'a second before');
    assert.equal(one([pay('a', 'p_luz', 'approved', '2026-11-03T15:00:00Z')]).bought, 0, 'the same instant');
    assert.equal(one([pay('a', 'p_otra', 'approved', '2026-11-09T15:00:00Z')]).bought, 0, 'another person');
    assert.equal(one([pay('a', 'p_luz', 'pending', '2026-11-09T15:00:00Z')]).bought, 0, 'pending');
    assert.equal(one([{ id: 'a', person: 'p_luz', status: 'approved', date: '2026-11-09' }]).bought, 1, 'a payment known only by its day: a later day counts');
    assert.equal(one([{ id: 'a', person: 'p_luz', status: 'approved', date: '2026-11-02' }]).bought, 0, 'an earlier day does not');
    // The mapped production row (user_id, paid_at) reads as well as the Company OS one.
    assert.equal(one([{ id: 'a', user_id: 'p_luz', status: 'approved', paid_at: '2026-11-09T10:00:00Z' }]).bought, 1, 'mapped payments row');
  });

  await test('the funnel reads lots and payments in the shape Company OS and the provider give them', async () => {
    const rec = (id, data, createdAt) => ({ id, data, createdAt });
    const flatLots = m.creditLotRows([
      rec('l1', { person: { id: 'p_luz', name: 'Luz Ficticia' }, voucher: 'v1' }, '2026-11-03T15:00:00Z'),
      rec('l2', { person: 'p_mar', voucher: { id: 'v1' } }, '2026-11-04T15:00:00Z'),
      rec('l3', { person: 'p_x', voucher: null }, '2026-11-04T15:00:00Z'),
    ]);
    assert.deepEqual(flatLots.map((l) => [l.id, l.person, l.voucher, l.name ?? null]), [['l1', 'p_luz', 'v1', 'Luz Ficticia'], ['l2', 'p_mar', 'v1', null]], 'only voucher lots, ids unwrapped, the included name kept');
    const { fake, data } = setup({ vouchers });
    fake.state.lots.push({ id: 'lot_9', person: 'p_luz', voucher: 'v1', created_at: '2026-11-03T15:00:00Z' });
    assert.ok(typeof m.listVoucherLots === 'function');
    const read = await m.listVoucherLots(data);
    assert.deepEqual(read.map((l) => [l.person, l.voucher]), [['p_luz', 'v1']]);
  });

  await test('the first redemption is the earliest instant, whatever the offset; codes of a removed teacher get an unknown group', async () => {
    const mixed = [lot('l1', 'p_luz', 'v1', '2026-11-03T12:00:00-05:00'), lot('l2', 'p_luz', 'v2', '2026-11-03T15:00:00Z')];
    const r = m.teacherFunnel({ coaches, vouchers, lots: mixed, payments: [pay('a', 'p_luz', 'approved', '2026-11-03T16:00:00Z')], names });
    assert.equal(r[0].people[0].redeemedAt, '2026-11-03T15:00:00Z', '15:00Z is before 17:00Z (12:00-05:00)');
    assert.equal(r[0].bought, 1);
    const orphan = [...vouchers, { id: 'v9', kind: 'courtesy', classes: 1, code: 'DDDDDDD2', coach: 'coa_gone', uses: 1, max_uses: 5 }];
    const all = m.withUnknownCoaches(coaches, orphan, 'Profesor desconocido');
    assert.deepEqual(all.map((c) => c.id), ['coa_ana', 'coa_beto', 'coa_cami', 'coa_gone']);
    assert.equal(all[3].name, 'Profesor desconocido');
    assert.deepEqual(m.withUnknownCoaches(coaches, vouchers, 'x'), coaches, 'none unknown: unchanged');
    const f = m.teacherFunnel({ coaches: all, vouchers: orphan, lots: [lot('l9', 'p_luz', 'v9', '2026-11-03T15:00:00Z')], payments: [], names });
    assert.deepEqual([f[3].codes.length, f[3].redeemed], [1, 1]);
    assert.ok(m.productionStrings['vouchers.teachers.unknown']?.es && m.productionStrings['vouchers.teachers.unknown']?.en);
  });

  await test('the lot read has a stable sort ending in a unique key', async () => {
    const { fake, data } = setup({ vouchers });
    let spec;
    const orig = fake.request;
    const spy = { ...data, request: (mth, path, body, o) => { if (body?.entity === 'credit_lot') spec = body; return orig(mth, path, body, o); } };
    Object.setPrototypeOf(spy, data);
    await m.listVoucherLots(spy);
    assert.ok(spec?.sort?.length >= 1, 'a sort is sent');
  });

  // ── the code entry at checkout ────────────────────────────────────────────────────────────────────────────────
  await test('the code entry redeems the typed code, reloads the balance, and reports the classes added', async () => {
    const { fake, data } = setup();
    const v = fake.createVoucher({ kind: 'courtesy', classes: 1, max_uses: 5, coach: 'coa_ana', first_time_only: true });
    const calls = [];
    const out = await m.enterCode({ data, code: ` ${v.code.slice(0, 4).toLowerCase()}-${v.code.slice(4)} `, key: 'key-entry-1', reloadBalance: async () => { calls.push('reload'); }, onRedeemed: (lot) => calls.push(`redeemed:${lot.quantity}`) });
    assert.deepEqual(out, { ok: true, lot: out.lot }); assert.equal(out.lot.quantity, 1);
    assert.deepEqual(fake.state.writes.at(-1), { path: '/api/credit_lot', key: 'key-entry-1', body: { person: 'per_cust', voucher_code: v.code } });
    assert.deepEqual(calls, ['reload', 'redeemed:1'], 'the balance is reloaded before the page is told');
    assert.equal(fake.balance('per_cust'), 1);
    // An unusable shape never reaches the server.
    const before = fake.state.writes.length;
    assert.deepEqual(await m.enterCode({ data, code: 'abc', key: 'k-bad-shape-1', onRedeemed: () => assert.fail('no') }), { ok: false, key: 'vouchers.cos.err.code', code: null });
    assert.equal(fake.state.writes.length, before);
  });

  const REFUSED = ['voucher_first_time_only', 'voucher_invalid', 'voucher_expired', 'voucher_used_up', 'voucher_redeemed', 'forbidden'];
  await test('every refusal shows words in Spanish and English, and nothing is reloaded or reported', async () => {
    for (const code of REFUSED) {
      const { fake, data } = setup();
      const v = fake.createVoucher({ kind: 'courtesy', classes: 1, max_uses: 5 });
      fake.state.fail = code;
      let called = 0;
      const out = await m.enterCode({ data, code: v.code, key: `key-refused-${code}`, reloadBalance: () => { called++; }, onRedeemed: () => { called++; } });
      assert.equal(out.ok, false, code); assert.equal(called, 0, `${code}: nothing reported`);
      assert.equal(out.key, `vouchers.cos.refusal.${code}`, code);
      for (const part of ['title', 'body']) {
        const entry = m.productionStrings[`${out.key}.${part}`];
        assert.ok(entry?.es && entry?.en, `${code}.${part} in es and en`);
      }
    }
    assert.ok(m.VOUCHER_REFUSALS.includes('voucher_first_time_only'));
    assert.ok(m.CONTRACT_REFUSALS.voucher_first_time_only?.es && m.CONTRACT_REFUSALS.voucher_first_time_only?.en, 'the code→copy table has it too');
    assert.match(m.productionStrings['vouchers.cos.refusal.voucher_first_time_only.body'].es, /nuev/i, 'says the code is for people new to Hoy');
    const { fake, data } = setup();
    const v = fake.createVoucher({ kind: 'courtesy', classes: 1 });
    fake.state.fail = 'something_new';
    assert.equal((await m.enterCode({ data, code: v.code, key: 'key-refused-new' })).key, 'vouchers.cos.refusal.generic', 'an unknown code falls to the generic words');
    fake.state.fail = 'network';
    const lost = await m.enterCode({ data, code: v.code, key: 'key-refused-net' });
    assert.deepEqual([lost.ok, lost.key, lost.keepKey], [false, 'vouchers.cos.refusal.generic', true], 'no answer: the key is kept for the retry');
  });

  await test('the entry and page copy exists in es and en', async () => {
    for (const k of ['vouchers.cos.entry.title', 'vouchers.cos.entry.label', 'vouchers.cos.entry.cta', 'vouchers.cos.entry.done', 'vouchers.teachers.title', 'vouchers.teachers.funnel.title', 'vouchers.cos.err.coach']) {
      assert.ok(m.productionStrings[k]?.es && m.productionStrings[k]?.en, k);
    }
    assert.match(m.productionStrings['vouchers.cos.entry.title'].es, /¿Tienes un código\?/);
  });

  await test('the app checkout offers the code field and books from the balance once it is redeemed (D5)', async () => {
    const { readFile } = await import('node:fs/promises');
    const page = await readFile(new URL('../src/modules/customer/pages/ServerCheckoutPage.tsx', import.meta.url), 'utf8');
    assert.match(page, /import \{ VoucherCodeEntry \} from '\.\.\/\.\.\/vouchers\/production\/VoucherCodeEntry'/, 'checkout imports the code entry');
    assert.match(page, /<VoucherCodeEntry onRedeemed=\{\(\) => \{ setChoice\('package'\);/, 'a redeemed code selects "Una clase de tu saldo"');
    assert.match(page, /!consentHeld && !closed && !existing && <VoucherCodeEntry/, 'no code field while consent waits, the class is closed or already booked');
  });
} finally { await rm(dir, { recursive: true, force: true }); }
console.log(failed ? `\n${failed} teacher-code (H-CODES) test(s) failed` : '\nteacher-code (H-CODES) tests passed');
process.exitCode = failed ? 1 : 0;
