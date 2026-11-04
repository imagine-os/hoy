// Hoy go-live, the payment void's screens at logic level, on the production build's code (esbuild, no browser): the exact
// write, who gets the action, every refusal in words, a voided receipt reads voided, what stays as it was. A fake Company
// OS (scripts/lib/fake-cos.mjs) stands in: it is NOT the rules, which Company OS's own suites prove. Fictional data only.
// The screens themselves are checked in the browser by scripts/test-void-payment-ui.mjs.
// Run: node scripts/test-void-payment.mjs
import { build } from 'esbuild';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fakeCos } from './lib/fake-cos.mjs';

let failures = 0, passed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log(`ok   ${name}`); }
  catch (e) { failures++; console.log(`FAIL ${name}\n     ${String(e?.message ?? e).split('\n').slice(0, 3).join('\n     ')}`); }
}
const values = new Map();
globalThis.localStorage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, String(v)), removeItem: (k) => values.delete(k) };
globalThis.sessionStorage = globalThis.localStorage;

const ENTRIES = {
  void: "export * from './src/modules/transfers/launch/voidPayment';",
  action: `export { VoidPaymentAction, useVoidAccess } from './src/modules/transfers/launch/VoidPaymentAction';
    export { I18nProvider } from './src/i18n/I18nProvider'; export { payLaunchStrings } from './src/modules/transfers/launch/strings';
    export { SessionContext } from './src/auth/sessionContext'; export { DataProviderRoot } from './src/data/DataContext';
    export { createElement } from 'react'; export { renderToStaticMarkup } from 'react-dom/server.browser';`,
  receipt: `export { NotaDeCompra, receiptOpens } from './src/modules/launch-receipts/launch/ReceiptPages';
    export { I18nProvider } from './src/i18n/I18nProvider'; export { payLaunchStrings } from './src/modules/transfers/launch/strings';
    export { createElement } from 'react'; export { renderToStaticMarkup } from 'react-dom/server.browser';`,
  refusals: "export { refusalCopy, hasRefusalCopy, GENERIC_REFUSAL } from './src/data/companyos/refusals'; export { refusalKey } from './src/modules/transfers/launch/cos'; export { payLaunchStrings } from './src/modules/transfers/launch/strings';",
  cos: "export * from './src/modules/transfers/launch/cos'; export { paymentsReport } from './src/modules/transfers/launch/payments';",
  trial: "export { assessLiveTrial } from './src/data/trialEligibility';",
  identity: "export { isSuperAdminMe, roleFromMe, superAdminFlag } from './src/auth/companyOsIdentity';",
  admin: "export { strings } from './src/modules/admin/strings';",
  desk: "export { deskErrorText, deskStrings } from './src/modules/staff/desk/strings';",
  voucher: "export { refusalKey } from './src/modules/vouchers/production/model'; export { productionStrings } from './src/modules/vouchers/production/strings';",
  mapping: "export { adapterFor, fromRecord } from './src/data/companyos/mapping'; export { showsLedgerValidity } from './src/data/packages'; export { strings as customerStrings } from './src/modules/customer/strings'; export { I18nProvider } from './src/i18n/I18nProvider';",
  report: "export * from './src/data/confirmedPaymentReport';",
};
async function load(contents) {
  try {
    const out = await build({
      stdin: { contents, resolveDir: process.cwd(), loader: 'ts' },
      bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent', jsx: 'automatic',
      banner: { js: "import{createRequire}from'node:module';const require=createRequire(import.meta.url);" },
      loader: { '.jpg': 'empty', '.png': 'empty', '.webp': 'empty', '.svg': 'empty', '.css': 'empty', '.md': 'text' },
      define: { 'import.meta.env': '{"VITE_HOY_BUILD":"production","DEV":false,"PROD":true,"BASE_URL":"/"}', __HOY_BUILD__: '"production"' },
    });
    const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const { pathToFileURL } = await import('node:url');
    const dir = await mkdtemp(join(tmpdir(), 'hoy-void-')), file = join(dir, 'm.mjs');
    await writeFile(file, out.outputFiles[0].text);
    try { return await import(pathToFileURL(file).href); } finally { await rm(dir, { recursive: true, force: true }); }
  } catch (e) { return { __error: String(e.message).split('\n').slice(0, 2).join(' ') }; }
}
const m = Object.fromEntries(await Promise.all(Object.entries(ENTRIES).map(async ([k, c]) => [k, await load(c)])));
const need = (k) => { if (m[k].__error) throw new Error(`${k} does not build: ${m[k].__error}`); return m[k]; };
const codeOf = async (p) => { try { await p; return 'ok'; } catch (e) { return e?.code ?? e?.message ?? String(e); } };
const src = (p) => readFile(new URL(`../${p}`, import.meta.url), 'utf8');
const syncCode = (f) => { try { f(); return 'ok'; } catch (e) { return e?.code ?? e?.message; } };

const USERS = { usr_sa: { role: 'super_admin', name: 'Ana Admin' }, usr_desk: { role: 'front_desk', name: 'Diego Desk' } };
const setup = () => {
  const cos = fakeCos({ users: USERS, voidRules: true, now: () => Date.parse('2026-11-05T14:00:00Z') }).as('usr_sa');
  const person = cos.seed('person', { name: 'Carla Cliente', email: 'carla@example.test' });
  const product = cos.seed('product', { key: 'pack', name: 'Paquete', kind: 'pack', price: 600000, credits: 12, active: true, valid_from: '2026-10-01' });
  const paid = cos.seed('payment', { person: person.id, product: product.id, amount: 600000, method: 'cash', status: 'approved', date: '2026-11-05', concept: 'Paquete' });
  const receipt = cos.seed('invoice', { kind: 'receipt', number: 41, payment: paid.id, person: person.id, product: product.id, total: 600000, issued_at: '2026-11-05T14:00:00.000Z' });
  return { cos, person, product, paid, receipt };
};

// ── The exact write ─────────────────────────────────────────────────────────────────────────────────────────
await test('voidOps: one update of that payment to voided, with the reason, only if it is still approved', () => {
  const { voidOps } = need('void');
  assert.deepEqual(voidOps('pay_1', '  Registrado por error  '), [{ op: 'update', entity: 'payment', id: 'pay_1', data: { status: 'voided', status_reason: 'Registrado por error' }, ifMatch: { field: 'status', value: 'approved' } }]);
});
await test('voidOps: a missing, blank or too short reason is refused in the browser (reason_required), nothing to send', () => {
  const { voidOps } = need('void');
  for (const reason of ['', '   ', 'ab', ' a ', '\n\t']) assert.equal(syncCode(() => voidOps('pay_1', reason)), 'reason_required', JSON.stringify(reason));
});
await test('voidOps: a long reason is cut to what the form allows; hostile text is kept as plain text', () => {
  const { voidOps } = need('void');
  assert.equal(voidOps('pay_1', 'x'.repeat(900))[0].data.status_reason.length, 500);
  assert.equal(voidOps('pay_1', '<img src=x onerror=alert(1)>')[0].data.status_reason, '<img src=x onerror=alert(1)>');
});
await test('voidPayment: goes through /batch with the action\'s key; the payment reads voided, the receipt keeps its number and gets its mark', async () => {
  const { voidPayment } = need('void');
  const { cos, paid, receipt } = setup();
  await voidPayment(cos, paid.id, 'Registrado por error', 'void-key-0001');
  const call = cos.calls.find((c) => c.path === '/batch');
  assert.equal(call.key, 'void-key-0001');
  assert.equal(cos.db.payment.find((p) => p.id === paid.id).data.status, 'voided');
  assert.equal(cos.db.payment.find((p) => p.id === paid.id).data.status_reason, 'Registrado por error');
  const after = cos.db.invoice.find((i) => i.id === receipt.id);
  assert.equal(after.data.number, 41); assert.ok(after.data.voided_at); assert.equal(after.data.void_reason, 'Registrado por error');
});
await test('voidPayment: a double tap (same key) replays: one void, one write', async () => {
  const { voidPayment } = need('void');
  const { cos, paid } = setup();
  await voidPayment(cos, paid.id, 'Registrado por error', 'void-key-0002');
  await voidPayment(cos, paid.id, 'Registrado por error', 'void-key-0002');
  assert.equal(cos.keyCount(), 1);
  assert.equal(cos.db.payment.find((p) => p.id === paid.id).data.status, 'voided');
});
await test('voidPayment: a stale screen, someone voided it first (409): reads as already voided, and the first reason stands', async () => {
  const { voidPayment } = need('void');
  const { cos, paid } = setup();
  assert.equal(await voidPayment(cos, paid.id, 'Primero', 'void-key-0003'), 'voided');
  assert.equal(await voidPayment(cos, paid.id, 'Segundo', 'void-key-0004'), 'already_voided');
  assert.equal(cos.db.payment.find((p) => p.id === paid.id).data.status_reason, 'Primero');
});
await test('voidPayment: the status changed to something else (409): refused as stale, with words', async () => {
  const { voidPayment, voidRefusalLine } = need('void');
  const { cos, paid } = setup();
  cos.db.payment.find((p) => p.id === paid.id).data.status = 'refunded';
  const code = await codeOf(voidPayment(cos, paid.id, 'Segundo', 'void-key-0004'));
  assert.equal(code, 'ifMatch mismatch');
  assert.equal(voidRefusalLine(code, 'es', (k) => k), 'payLaunch.code.stale');
});
await test('voidPayment: the 409 stands when the re-read fails, and another refusal is never re-read', async () => {
  const { voidPayment } = need('void');
  const { cos, paid } = setup();
  cos.db.payment.find((p) => p.id === paid.id).data.status = 'voided';
  const real = cos.request;
  const noRead = { ...cos, request: (m, path, ...r) => (m === 'GET' ? Promise.reject(Object.assign(new Error('x'), { code: 'network_error' })) : real(m, path, ...r)) };
  assert.equal(await codeOf(voidPayment(noRead, paid.id, 'Segundo', 'void-key-0005')), 'ifMatch mismatch');
  const fresh = setup(); fresh.cos.refuseVoid('void_gift_issued');
  const before = fresh.cos.calls.length;
  assert.equal(await codeOf(voidPayment(fresh.cos, fresh.paid.id, 'Motivo', 'void-key-0006')), 'void_gift_issued');
  assert.equal(fresh.cos.calls.slice(before).filter((c) => c.method === 'GET').length, 0);
});
await test('the form handles an already voided payment and refreshes the screen behind it on closing', async () => {
  const s = await src('src/modules/transfers/launch/VoidPaymentAction.tsx');
  assert.match(s, /already_voided/); assert.match(s, /refreshTables/);
  const { payLaunchStrings } = need('refusals');
  const line = payLaunchStrings['payLaunch.void.already'];
  assert.match(line.es, /ya estaba anulado/i); assert.match(line.es, /no se guardó/i); assert.match(line.en, /already voided/i); assert.match(line.en, /not saved/i);
});

// ── C2's later refusal codes ────────────────────────────────────────────────────────────────────────────────
for (const code of ['payment_voided', 'undo_payment_voided', 'voucher_payment_not_approved']) {
  await test(`${code}: is in the code→copy table in both languages, without the code`, () => {
    const { refusalCopy, hasRefusalCopy } = need('refusals');
    assert.ok(hasRefusalCopy(code)); assert.notEqual(refusalCopy(code, 'es'), refusalCopy(code, 'en'));
    for (const l of ['es', 'en']) assert.ok(!refusalCopy(code, l).includes(code));
  });
}
await test('payment_voided: the payment screens have their own words for it', () => {
  const { refusalKey, payLaunchStrings } = need('refusals');
  assert.equal(refusalKey('payment_voided'), 'payLaunch.code.payment_voided');
  assert.ok(payLaunchStrings['payLaunch.code.payment_voided']?.es && payLaunchStrings['payLaunch.code.payment_voided']?.en);
});
await test('undo_payment_voided: the screen that undoes attendance shows words, not the generic line', () => {
  const { deskErrorText, deskStrings } = need('desk');
  for (const l of ['es', 'en']) {
    const line = deskErrorText('undo_payment_voided', (k) => deskStrings[k]?.[l] ?? k);
    assert.match(line, l === 'es' ? /anul/i : /void/i, line); assert.ok(!line.includes('undo_payment_voided'));
  }
});
await test('voucher_payment_not_approved: the "to issue" screen shows its own title and body, not the generic one', () => {
  const { refusalKey, productionStrings } = need('voucher');
  const key = refusalKey({ code: 'voucher_payment_not_approved' });
  assert.equal(key, 'vouchers.cos.refusal.voucher_payment_not_approved');
  for (const part of ['title', 'body']) { const s = productionStrings[`${key}.${part}`]; assert.ok(s?.es && s?.en, part); assert.notEqual(s.es, s.en); }
  assert.match(productionStrings[`${key}.body`].es, /aprobado/i);
});
await test('void_booking_active still fits now that a duplicate payment can be voided: it speaks of this payment\'s booking, not of every payment', () => {
  const { refusalCopy } = need('refusals');
  assert.match(refusalCopy('void_booking_active', 'es'), /este pago/); assert.match(refusalCopy('void_booking_active', 'en'), /it paid for/);
});

// ── Each refusal has words ──────────────────────────────────────────────────────────────────────────────────
const CODES = ['void_classes_used', 'void_booking_active', 'void_gift_issued'];
for (const code of CODES) {
  await test(`${code}: reaches the screen as that code and writes nothing`, async () => {
    const { voidPayment } = need('void');
    const { cos, paid, receipt } = setup();
    cos.refuseVoid(code);
    assert.equal(await codeOf(voidPayment(cos, paid.id, 'Registrado por error', 'void-key-0005')), code);
    assert.equal(cos.db.payment.find((p) => p.id === paid.id).data.status, 'approved');
    assert.equal(cos.db.invoice.find((i) => i.id === receipt.id).data.voided_at, undefined);
  });
  await test(`${code}: has its own Spanish and English line, without the code`, () => {
    const { refusalCopy, hasRefusalCopy, GENERIC_REFUSAL } = need('refusals');
    assert.ok(hasRefusalCopy(code), 'in the code→copy table');
    const es = refusalCopy(code, 'es'), en = refusalCopy(code, 'en');
    assert.notEqual(es, en, 'two languages');
    for (const line of [es, en]) { assert.ok(line.length > 15); assert.ok(!line.includes(code)); assert.ok(!line.includes(GENERIC_REFUSAL.es.slice(0, 20))); assert.ok(!line.includes(GENERIC_REFUSAL.en.slice(0, 20))); }
  });
}
for (const code of ['payment_undeletable', 'lot_voided', 'invalid_status_transition', 'reason_required', 'write_forbidden']) {
  await test(`${code}: is in the code→copy table in both languages`, () => {
    const { refusalCopy, hasRefusalCopy } = need('refusals');
    assert.ok(hasRefusalCopy(code)); assert.notEqual(refusalCopy(code, 'es'), refusalCopy(code, 'en')); assert.ok(!refusalCopy(code, 'es').includes(code));
  });
}
await test('voidRefusalLine: the status changed meanwhile (409, "ifMatch mismatch", no code, normalised by the transport) says so', () => {
  const { voidRefusalLine } = need('void');
  for (const c of ['ifMatch mismatch', 'ifmatch_mismatch']) assert.equal(voidRefusalLine(c, 'es', (k) => k), 'payLaunch.code.stale', c);
});
await test('voidRefusalLine: a code of the table in the language; a screen code from payLaunch; an unknown one keeps the support code', () => {
  const { voidRefusalLine } = need('void');
  const t = (key, vars) => `${key}|${vars?.code ?? ''}`;
  assert.match(voidRefusalLine('void_gift_issued', 'en', t), /gift/i);
  assert.match(voidRefusalLine('void_gift_issued', 'es', t), /regalo/i);
  assert.equal(voidRefusalLine('ifMatch mismatch', 'es', t), 'payLaunch.code.stale|ifMatch mismatch');
  assert.equal(voidRefusalLine('something_new', 'es', t), 'payLaunch.code.generic|something_new');
});
await test('forbidden and write_forbidden (not Super Admin): say so in words', () => {
  const { voidRefusalLine } = need('void');
  assert.match(voidRefusalLine('forbidden', 'es', (k) => k), /permiso/);
  assert.match(voidRefusalLine('write_forbidden', 'es', (k) => k), /cuenta|permiso/);
});

// ── Who gets the action ─────────────────────────────────────────────────────────────────────────────────────
await test('canVoidPayment: Super Admin, connected, on an approved payment; nothing else', () => {
  const { canVoidPayment } = need('void');
  assert.equal(canVoidPayment({ superAdmin: true, connected: true, status: 'approved' }), true);
  assert.equal(canVoidPayment({ superAdmin: false, connected: true, status: 'approved' }), false, 'any other role');
  assert.equal(canVoidPayment({ superAdmin: true, connected: false, status: 'approved' }), false, 'the review build');
  for (const status of ['pending', 'declined', 'refunded', 'voided', undefined, null, '']) assert.equal(canVoidPayment({ superAdmin: true, connected: true, status }), false, String(status));
});
await test('/me: an Administration login that also holds Super Admin resolves to admin, and has the flag though isSuperAdmin is false for it', () => {
  const { roleFromMe, isSuperAdminMe, superAdminFlag } = need('identity');
  const both = { roleKeys: ['administrator', 'super_admin'], isSuperAdmin: true }, alone = { roleKeys: ['administrator'], isSuperAdmin: false }, pure = { roleKeys: ['super_admin'], isSuperAdmin: true };
  assert.equal(roleFromMe(both), 'admin'); assert.equal(isSuperAdminMe(both), false, 'why the session\'s isSuperAdmin cannot gate this');
  assert.equal(superAdminFlag(both, null), true); assert.equal(superAdminFlag(pure, null), true); assert.equal(superAdminFlag(alone, null), false);
  assert.equal(superAdminFlag(both, 'front_desk'), false, 'viewing as another role'); assert.equal(superAdminFlag(pure, 'customer'), false);
});
await test('the session carries the flag; the customer area\'s session drops it', async () => {
  assert.match(await src('src/auth/ProductionSession.tsx'), /meSuperAdmin: superAdminFlag\(info, activeViewAs\)/);
  assert.match(await src('src/auth/RequireRole.tsx'), /role: 'customer', isSuperAdmin: false, meSuperAdmin: false/);
});
const session = (over) => ({ status: 'ready', signedIn: true, role: 'admin', isSuperAdmin: false, viewAs: null, viewAsPerson: null, caps: [], can: () => true, hasRole: () => true, user: { id: 'u', name: 'U' }, ...over });
const renderAction = (s, status, connected = true) => {
  const a = need('action'), h = a.createElement;
  const provider = { subscribe: () => () => {}, ...(connected ? { request: async () => ({}) } : {}) };
  return a.renderToStaticMarkup(h(a.I18nProvider, { tables: [a.payLaunchStrings] }, h(a.DataProviderRoot, { provider }, h(a.SessionContext.Provider, { value: session(s) }, h(a.VoidPaymentAction, { paymentId: 'pay_1', status })))));
};
await test('the action renders for a Super Admin on an approved payment (even though the session\'s role resolves to admin)', () => {
  assert.match(renderAction({ meSuperAdmin: true, role: 'admin' }, 'approved'), /data-void-payment/);
});
await test('the action does not render for Administration, the desk, Finance, a customer, or a Super Admin viewing as another role', () => {
  for (const role of ['admin', 'front_desk', 'finance', 'customer']) assert.equal(renderAction({ role }, 'approved'), '', role);
  assert.equal(renderAction({ role: 'front_desk', meSuperAdmin: false, viewAs: 'front_desk' }, 'approved'), '', 'view-as');
  assert.equal(renderAction({ role: 'super_admin', isSuperAdmin: true }, 'approved'), '', 'the flag decides, not isSuperAdmin (a build without /me)');
});
await test('the action does not render on a pending, declined, refunded or voided payment', () => {
  for (const status of ['pending', 'declined', 'refunded', 'voided']) assert.equal(renderAction({ meSuperAdmin: true }, status), '', status);
});
await test('review build unchanged: no Company OS connection, no action, even for its super admin', () => {
  assert.equal(renderAction({ meSuperAdmin: true, role: 'super_admin' }, 'approved', false), '');
});

// ── A voided receipt reads voided ───────────────────────────────────────────────────────────────────────────
const view = (status, invoiceData, paymentData = {}) => ({
  payment: { id: 'pay_1', data: { amount: 600000, method: 'cash', status, date: '2026-11-05', concept: 'Paquete', ...paymentData } },
  invoice: invoiceData ? { id: 'inv_1', data: { kind: 'receipt', number: 41, total: 600000, issued_at: '2026-11-05T14:00:00.000Z', ...invoiceData } } : null,
  product: 'Paquete', customer: 'Carla Cliente', recorder: null,
});
const renderNote = (v, lang = 'es', staff = true) => {
  const r = need('receipt'), h = r.createElement;
  values.set('hoyos.lang', lang);
  return r.renderToStaticMarkup(h(r.I18nProvider, { tables: [r.payLaunchStrings] }, h(r.NotaDeCompra, { view: v, staff })));
};
await test('NotaDeCompra: voided, in Spanish and English, with the reason, the same number and the amount', () => {
  const v = view('voided', { voided_at: '2026-11-06T10:00:00.000Z', void_reason: 'Registrado por error' });
  const es = renderNote(v, 'es'), en = renderNote(v, 'en');
  assert.match(es, /data-testid="receipt-voided"/); assert.match(es, /anulada/i); assert.match(es, /Registrado por error/); assert.match(es, /41/);
  assert.match(en, /voided/i); assert.match(en, /Registrado por error/); assert.match(en, /41/);
  assert.match(es, /data-testid="nota-de-compra"/, 'the document stays readable');
});
await test('NotaDeCompra: the reason falls back to the payment\'s when the receipt has none; with no reason at all it still reads voided', () => {
  assert.match(renderNote(view('voided', {}, { status_reason: 'Motivo del pago' })), /Motivo del pago/);
  const bare = renderNote(view('voided', {}));
  assert.match(bare, /data-testid="receipt-voided"/);
  assert.doesNotMatch(bare, /Motivo/);
});
await test('the customer\'s receipt reads voided without the reason, whichever record holds it (owner, 4 Nov)', () => {
  for (const v of [view('voided', { voided_at: '2026-11-06T10:00:00.000Z', void_reason: 'Motivo interno' }), view('voided', {}, { status_reason: 'Motivo interno' }), view('voided', null, { status_reason: 'Motivo interno' })]) {
    const html = renderNote(v, 'es', false);
    assert.match(html, /data-testid="receipt-voided"/); assert.doesNotMatch(html, /Motivo/);
  }
  const { showVoidReason } = need('void');
  assert.equal(showVoidReason(true), true); assert.equal(showVoidReason(false), false);
});
await test('a receipt is voided when `voided_at` is set, even if the payment read is older; otherwise by the payment\'s status', () => {
  const { receiptVoid } = need('void');
  assert.equal(receiptVoid({ status: 'approved' }, { voided_at: '2026-11-06T10:00:00.000Z', void_reason: 'R' }).voided, true);
  assert.equal(receiptVoid({ status: 'voided', status_reason: 'P' }, {}).reason, 'P');
  assert.equal(receiptVoid({ status: 'voided', status_reason: 'P' }, { voided_at: 'x', void_reason: 'R' }).reason, 'R');
  assert.equal(receiptVoid({ status: 'approved' }, {}).voided, false);
  assert.equal(receiptVoid({ status: 'approved' }, null).voided, false);
});
await test('NotaDeCompra: a hostile reason shows as text, never as markup', () => {
  const html = renderNote(view('voided', { void_reason: '<img src=x onerror=alert(1)>' }));
  assert.doesNotMatch(html, /<img/); assert.match(html, /&lt;img/);
});
await test('NotaDeCompra: a voided payment that never had a receipt reads voided, not "not confirmed yet"', () => {
  const html = renderNote(view('voided', null, { status_reason: 'Registrado por error' }));
  assert.match(html, /data-testid="receipt-voided"/); assert.match(html, /Registrado por error/); assert.doesNotMatch(html, /aún no está confirmado/);
});
await test('NotaDeCompra: approved has no voided mark; pending and refunded read as before', () => {
  const ok = renderNote(view('approved', {}));
  assert.match(ok, /data-testid="nota-de-compra"/); assert.doesNotMatch(ok, /receipt-voided/); assert.doesNotMatch(ok, /anulada/i);
  assert.match(renderNote(view('pending', null)), /aún no está confirmado/);
  assert.doesNotMatch(renderNote(view('refunded', {})), /receipt-voided/);
});
await test('My purchase notes: a voided payment still opens its note; pending and declined still don\'t', () => {
  const { receiptOpens } = need('receipt');
  assert.equal(receiptOpens('approved'), true); assert.equal(receiptOpens('voided'), true);
  for (const s of ['pending', 'declined', 'refunded', undefined]) assert.equal(receiptOpens(s), false, String(s));
});

// ── What follows from a void, on Hoy's side ─────────────────────────────────────────────────────────────────
await test('the confirmed payments report leaves a voided payment out, and out of the total', () => {
  const { paymentsReport } = need('cos');
  const p = (id, status) => ({ id, data: { status, amount: 100, date: '2026-11-05', method: 'cash' } });
  const r = paymentsReport({ payments: [p('a', 'approved'), p('b', 'voided')], invoices: [], products: [], people: new Map(), members: new Map(), from: '2026-11-01', to: '2026-11-30', methodLabel: (x) => x });
  assert.equal(r.rows.length, 1); assert.equal(r.total, 100);
});
const TRIAL_PLAN = [{ id: 'prod_trial', kind: 'trial' }];
const grant = (over = {}) => ({ id: 'e1', user_id: 'u', delta: 1, plan_id: 'prod_trial', lot_source: 'trial', purchase_ledger_id: null, payment_id: 'pay_t', lot_voided_at: null, ...over });
const VOIDED_AT = '2026-11-06T10:00:00.000Z';
await test('a voided trial lets that person buy again: the lot\'s voided_at, as on the server, and the payment no longer counts', () => {
  const { assessLiveTrial } = need('trial');
  assert.equal(assessLiveTrial({ ledger: [grant({ lot_voided_at: VOIDED_AT })], payments: [{ id: 'pay_t', plan_id: 'prod_trial', status: 'voided' }], plans: TRIAL_PLAN }).status, 'eligible');
});
await test('the lot decides, not the payment read: a voided lot whose payment isn\'t in the read is clear; a live lot stays used even beside a voided payment', () => {
  const { assessLiveTrial } = need('trial');
  assert.equal(assessLiveTrial({ ledger: [grant({ lot_voided_at: VOIDED_AT })], payments: [], plans: TRIAL_PLAN }).status, 'eligible');
  assert.equal(assessLiveTrial({ ledger: [grant()], payments: [{ id: 'pay_t', plan_id: 'prod_trial', status: 'voided' }], plans: TRIAL_PLAN }).status, 'trial_used');
});
await test('a trial lot still counts when its payment stands, when the lot has no payment (a courtesy), or when another lot stands', () => {
  const { assessLiveTrial } = need('trial');
  assert.equal(assessLiveTrial({ ledger: [grant()], payments: [{ id: 'pay_t', plan_id: 'prod_trial', status: 'approved' }], plans: TRIAL_PLAN }).status, 'trial_used');
  assert.equal(assessLiveTrial({ ledger: [grant({ payment_id: null })], payments: [], plans: TRIAL_PLAN }).status, 'trial_used');
  assert.equal(assessLiveTrial({ ledger: [grant({ lot_voided_at: VOIDED_AT }), grant({ id: 'e2', payment_id: 'pay_x' })], payments: [], plans: TRIAL_PLAN }).status, 'trial_used');
});

// ── The void on the member's classes (real mapping) ─────────────────────────────────────────────────────────
const entry = (reason, delta, lot = {}) => ({ id: `ce_${reason}`, data: { person: 'per_1', delta, reason, lot: { id: 'lot_1', source: 'purchase', valid_until: '2027-02-01', ...lot } }, createdAt: '2026-11-05T10:00:00.000Z', updatedAt: '2026-11-05T10:00:00.000Z' });
await test('a void entry maps to reason "void", and that key has words in both languages (no raw key on /app/classes)', () => {
  const { adapterFor, fromRecord, customerStrings } = need('mapping');
  const row = fromRecord(adapterFor('class_ledger'), entry('void', -12, { voided_at: VOIDED_AT }));
  assert.equal(row.reason, 'void');
  assert.deepEqual(customerStrings[`customer.classes.reason.${row.reason}`], { es: 'Anulación', en: 'Voided' });
});
await test('every reason the mapping can give the movements list has words', () => {
  const { adapterFor, fromRecord, customerStrings } = need('mapping');
  for (const [reason, delta] of [['grant', 1], ['booking', -1], ['refund', 1], ['expiry', -1], ['studio_cancel', 1], ['adjustment', 1], ['adjustment', -1], ['reschedule', 1], ['void', -1]]) {
    const r = fromRecord(adapterFor('class_ledger'), entry(reason, delta)).reason;
    assert.ok(customerStrings[`customer.classes.reason.${r}`], `${reason} → ${r}`);
  }
});
await test('the ledger reads the lot\'s voided_at: its grant row carries it and shows no validity; a live lot\'s grant row still does', () => {
  const { adapterFor, fromRecord, showsLedgerValidity } = need('mapping');
  const a = adapterFor('class_ledger');
  assert.ok(a.include[0].fields.includes('voided_at'), 'in the include');
  const voidedGrant = fromRecord(a, entry('grant', 12, { voided_at: VOIDED_AT })), liveGrant = fromRecord(a, entry('grant', 12));
  assert.equal(voidedGrant.lot_voided_at, VOIDED_AT); assert.equal(liveGrant.lot_voided_at, null);
  assert.equal(showsLedgerValidity(voidedGrant), false); assert.equal(showsLedgerValidity(liveGrant), true);
  assert.equal(showsLedgerValidity(fromRecord(a, entry('booking', -1))), false, 'a spend row never did');
});
await test('/app/classes uses the rule for the validity badge', async () => {
  assert.match(await src('src/modules/customer/pages/PassesPage.tsx'), /showsLedgerValidity\(c\) && <Badge/);
});

// ── A voided payment stays on Finance's date range; totals don't change ─────────────────────────────────────
const pay = (data, updatedAt = '2026-11-06T10:00:00.000Z') => ({ id: 'pay_1', data: { person: 'per_1', amount: 100000, ...data }, createdAt: '2026-10-01T10:00:00.000Z', updatedAt });
await test('paid_at: a voided payment keeps the moment it was approved, not the void\'s, and has none if it never was', () => {
  const { adapterFor, fromRecord } = need('mapping');
  const a = adapterFor('payments');
  assert.equal(fromRecord(a, pay({ status: 'voided', approved_at: '2026-11-01T14:00:00.000Z' })).paid_at, '2026-11-01T14:00:00.000Z');
  assert.equal(fromRecord(a, pay({ status: 'voided' })).paid_at, null, 'never approved: no paid date, not the update');
  assert.equal(fromRecord(a, pay({ status: 'approved', approved_at: '2026-11-01T14:00:00.000Z' })).paid_at, '2026-11-01T14:00:00.000Z');
  assert.equal(fromRecord(a, pay({ status: 'declined' })).paid_at, null);
});
await test('money: a voided payment still has no received amount, and the confirmed report leaves it out though it has a paid date', () => {
  const { adapterFor, fromRecord } = need('mapping'); const R = need('report');
  const a = adapterFor('payments');
  const voided = { ...fromRecord(a, pay({ status: 'voided', approved_at: '2026-11-01T14:00:00.000Z' })), tenant_id: 't' };
  assert.equal(voided.amount_paid, null);
  const fn = R.confirmedPaymentRows ?? R.confirmedPaymentReport ?? R.buildConfirmedPaymentReport;
  assert.equal(typeof fn, 'function', Object.keys(R).join());
  assert.equal(fn([voided], { tenantId: 't', from: '2026-11-01', to: '2026-11-30', personName: () => '', productName: () => '' }).rows.length, 0);
});
await test('every revenue figure counts approved only: Finance, the Dashboard and the desk\'s day', async () => {
  assert.match(await src('src/modules/admin/FinancePage.tsx'), /const approved = inRange\.filter\(\(p\) => p\.status === 'approved'\);\n\s*const revenue = approved\.reduce/);
  assert.match(await src('src/modules/admin/DashboardPage.tsx'), /useTable<PaymentRow>\('payments', \{ where: \{ status: 'approved' \} \}\)/);
  assert.match(await src('src/modules/staff/HomePage.tsx'), /p\.status === 'approved' && p\.paid_at/);
});

// ── The words for the two refusals the review found ─────────────────────────────────────────────────────────
await test('a too-short reason says how long it must be, in both languages', () => {
  const { voidRefusalLine, voidOps } = need('void'); const { payLaunchStrings } = need('refusals');
  assert.equal(syncCode(() => voidOps('pay_1', 'ab')), 'reason_required');
  for (const lang of ['es', 'en']) {
    const line = voidRefusalLine('reason_required', lang, (k) => payLaunchStrings[k][lang]);
    assert.match(line, /3/, lang);
  }
});
await test('void_booking_active fits a booked, checked-in or completed booking: "cancel" only for one not taken yet', () => {
  const { refusalCopy } = need('refusals');
  const es = refusalCopy('void_booking_active', 'es'), en = refusalCopy('void_booking_active', 'en');
  assert.doesNotMatch(es, /Cancélala primero\.$/); assert.doesNotMatch(en, /Cancel it first\.$/);
  assert.match(es, /ya (se )?tom/i); assert.match(en, /already/i);
  assert.match(es, /aún no/i); assert.match(en, /not (been )?taken|not yet/i);
});

// ── Finance and the member's tab name the status, and mount the action ─────────────────────────────────────
await test('Finance and the member\'s payments tab have words for "voided" in both languages', () => {
  const { strings } = need('admin');
  assert.deepEqual(strings['admin.finance.status.voided'], { es: 'Anulado', en: 'Voided' });
});
await test('the three screens offer the void: Finance, the member\'s payments tab and the staff receipt, and the customer\'s receipt does not', async () => {
  for (const f of ['src/modules/admin/FinancePage.tsx', 'src/modules/admin/MemberPage.tsx']) { const s = await src(f); assert.match(s, /useVoidAccess\(/, f); assert.match(s, /VoidPaymentDrawer/, f); }
  assert.match(await src('src/modules/launch-receipts/launch/ReceiptPages.tsx'), /staff && <VoidPaymentAction/);
});
await test('no launch screen offers a payment delete: the generic tables screen, the only one that deletes rows, is out of production', async () => {
  const routes = await src('src/config/launchRoutes.ts');
  assert.doesNotMatch(routes, /\/admin\/tables/);
  for (const f of ['src/modules/admin/FinancePage.tsx', 'src/modules/admin/MemberPage.tsx', 'src/modules/launch-receipts/launch/ReceiptPages.tsx', 'src/modules/transfers/launch/PendingPaymentsPage.tsx']) assert.doesNotMatch(await src(f), /'DELETE'|op: 'delete'|\.remove\(/, f);
});
await test('the new suites run on CI', async () => {
  const ci = await src('.github/workflows/auth-checks.yml');
  assert.match(ci, /node scripts\/test-void-payment\.mjs/); assert.match(ci, /node scripts\/test-void-payment-ui\.mjs/);
});

console.log(`\n${failures ? 'FAIL' : 'PASS'} void payment screens: ${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
