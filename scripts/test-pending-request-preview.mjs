import assert from 'node:assert/strict';
import { build, transform } from 'esbuild';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const dir = await mkdtemp(join(tmpdir(), 'hoy-pending-request-preview-'));
const values = new Map(); let storageFailure = false, assertions = 0;
globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => { if (storageFailure) throw Error('synthetic_storage_failure'); values.set(key, value); } };
try {
  const file = join(dir, 'fixture.mjs');
  await build({ stdin: { contents: "export {MockProvider} from './src/data/MockProvider';export {recordPayment} from './src/modules/customer/payments';export {makePendingDeskIntent} from './src/data/pendingDeskIntent';export {resolveOperationalQuote,freezeSaleQuote} from './src/data/operationalQuotes';export {submitTransfer} from './src/modules/transfers/receipts';export {alertIntentId} from './src/modules/transfers/receiptAlert';export {buildPendingRequestPreview} from './src/modules/customer/pendingRequestPreview';", resolveDir: process.cwd() }, bundle: true, format: 'esm', platform: 'node', outfile: file, logLevel: 'silent' });
  const { MockProvider, recordPayment, makePendingDeskIntent, resolveOperationalQuote, freezeSaleQuote, submitTransfer, alertIntentId, buildPendingRequestPreview } = await import(pathToFileURL(file));
  const data = new MockProvider(), owner = 'usr_c01', key = 'hoyos.db.v1';
  const scope = { tenantId: 'ten_hoy', actorId: owner, role: 'customer', isCurrent: () => true };
  const quote = freezeSaleQuote(resolveOperationalQuote(data.peek('plans'), 'single'));
  const deskScope = { tenantId: scope.tenantId, customerId: owner, sessionId: data.peek('class_sessions')[0].id, matNumber: null, planId: quote.planId };
  // The same two existing producers as CheckoutPage's cash branch, inside the real mock atomic adapter.
  const cash = provider => provider.atomic(async tx => { const payment = await recordPayment(tx, { userId: owner, planId: quote.planId, amount: quote.chargedAmount, method: 'cash', ivaRate: 0, quote }); return tx.update('payments', payment.id, { frontend_desk_intent: makePendingDeskIntent(deskScope, quote) }); });
  const transferInput = { key: 'qa_pending_transfer', userId: owner, sessionId: null, matNumber: null, productId: quote.planId, productName: quote.name, amount: quote.chargedAmount, classes: quote.classes, expiresAt: quote.entitlementExpiresAt, quote, image: { dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAAA', fileName: 'fictional.png', mimeType: 'image/png', bytes: 12 } };
  const atomic = data.atomic.bind(data);
  for (const producer of [cash, provider => submitTransfer(provider, transferInput)]) {
    for (const failAfterWrites of [1, 2, 3]) {
      const before = values.get(key); data.atomic = (action, options) => atomic(action, { ...options, failAfterWrites });
      await assert.rejects(producer(data), /mock_injected/); assert.equal(values.get(key), before, 'rolled back request creates no saved event or proof'); assertions++;
    }
    data.atomic = atomic; const before = values.get(key); storageFailure = true;
    await assert.rejects(producer(data), /synthetic_storage_failure/); storageFailure = false; assert.equal(values.get(key), before); assertions++;
  }
  const cashPayment = await cash(data), transferReceipt = await submitTransfer(data, transferInput);
  const sources = [{ kind: 'cash', paymentId: cashPayment.id }, { kind: 'transfer', receiptId: transferReceipt.id }];
  const stable = values.get(key), stored = JSON.parse(stable);
  const unavailable = async (provider, source = sources[0], context = scope) => { const result = await buildPendingRequestPreview(provider, source, context); assert.equal(result.status, 'unavailable', JSON.stringify(result)); assertions++; };
  for (const source of sources) {
    const result = await buildPendingRequestPreview(data, source, scope);
    assert.equal(result.status, 'ready', JSON.stringify(result));
    assert.equal(result.preview.recipient.email, data.peek('users').find(row => row.id === owner).email);
    assert.equal(result.preview.recipient.name, data.peek('profiles').find(row => row.user_id === owner).full_name);
    assert.equal(result.preview.amount, quote.chargedAmount); assert.deepEqual(result.preview.product, quote.name);
    assert.equal(result.preview.method, source.kind); assert.equal(result.preview.kind, source.kind);
    assert.equal(result.preview.route, '/app/history'); assert(Object.isFrozen(result.preview.recipient));
    assert.deepEqual(result.preview.contract, { kind: 'builtin-mock', key: 'pending-payment-request', revision: 1 });
    const paymentId = result.preview.paymentId;
    assert.equal(data.peek('bookings').filter(row => row.payment_id === paymentId).length, 0);
    assert.equal(data.peek('class_ledger').filter(row => row.payment_id === paymentId).length, 0);
    await buildPendingRequestPreview(data, source, scope); assert.equal(values.get(key), stable, 'entire persisted database must remain byte-identical'); assertions++;
  }
  await unavailable(data, null); await unavailable({ name: 'supabase' });
  for (const context of [{ tenantId: 'foreign' }, { actorId: 'usr_c02' }, { role: 'admin' }, { role: 'super_admin' }]) for (const source of sources) await unavailable(data, source, { ...scope, ...context });
  for (const source of [{ kind: 'cash', paymentId: 'missing' }, { kind: 'transfer', receiptId: 'missing' }, { kind: 'card', paymentId: cashPayment.id }, { kind: 'cash', paymentId: cashPayment.id + '\n' }, { kind: 'transfer', receiptId: '../wrong' }]) await unavailable(data, source);
  const mutated = async (source, mutate) => { const copy = structuredClone(stored); mutate(copy.db); values.set(key, JSON.stringify(copy)); const before = values.get(key); await unavailable(new MockProvider(), source); assert.equal(values.get(key), before, 'unavailable proof must not change persisted data'); values.set(key, stable); };
  for (const source of sources) {
    const paymentId = source.kind === 'cash' ? source.paymentId : transferReceipt.payment_id;
    const payment = db => db.payments.find(row => row.id === paymentId);
    const audit = db => db.audit_log.find(row => row.action === 'payment.mock.pending' && row.entity_id === paymentId);
    for (const mutate of [
      db => { db.users.find(row => row.id === owner).status = 'disabled'; },
      db => { db.user_roles = db.user_roles.filter(row => row.user_id !== owner); },
      db => { db.profiles.push(structuredClone(db.profiles.find(row => row.user_id === owner))); },
      db => { db.users.find(row => row.id === owner).email = 'bad\n@example.test'; },
      db => { db.payments = db.payments.filter(row => row.id !== paymentId); },
      db => { db.payments.push(structuredClone(payment(db))); },
      db => { payment(db).tenant_id = 'foreign'; },
      db => { payment(db).user_id = 'usr_c02'; },
      db => { payment(db).method = 'card'; },
      db => { payment(db).provider = 'wompi'; },
      db => { payment(db).status = 'approved'; },
      db => { payment(db).paid_at = '2026-10-25T12:00:00Z'; },
      db => { payment(db).amount_paid = quote.chargedAmount; },
      db => { payment(db).taken_by = 'usr_admin'; },
      db => { payment(db).frontend_quote = null; },
      db => { delete payment(db).created_at; },
      db => { payment(db).frontend_quote.chargedAmount++; },
      db => { payment(db).frontend_quote.tenantId = 'foreign'; },
      db => { payment(db).frontend_quote.kind = 'gift'; },
      db => { db.audit_log = db.audit_log.filter(row => row.id !== audit(db).id); },
      db => { db.audit_log.push(structuredClone(audit(db))); },
      db => { audit(db).actor_id = 'usr_admin'; },
      db => { audit(db).diff.simulated = false; },
      db => { audit(db).diff.extra = 'unrecorded'; },
      db => { db.bookings.push({ id: 'qa_illicit_booking', tenant_id: 'ten_hoy', payment_id: paymentId }); },
      db => { db.class_ledger.push({ id: 'qa_illicit_grant', tenant_id: 'ten_hoy', payment_id: paymentId }); },
    ]) await mutated(source, mutate);
  }
  // RegisterPage creates the phone-only placeholder address; it is not an email recipient.
  // Match the existing receiptEmailPreview syntax/placeholder semantics for both saved request kinds.
  for (const email of ['3000000000@sin-email.hoyos.test', '3000000000@SIN-EMAIL.HOYOS.TEST', 'fictional<owner>@example.test', 'fictional>owner@example.test', 'fictional@example<.test', 'fictional@example>.test']) {
    for (const source of sources) await mutated(source, db => { db.users.find(row => row.id === owner).email = email; });
  }
  await mutated(sources[0], db => { delete db.payments.find(row => row.id === cashPayment.id).frontend_desk_intent; });
  await mutated(sources[0], db => { db.payments.find(row => row.id === cashPayment.id).frontend_desk_intent.customerId = 'usr_c02'; });
  await mutated(sources[0], db => { db.transfer_receipts.push({ id: 'qa_cash_receipt', tenant_id: 'ten_hoy', payment_id: cashPayment.id }); });
  const receipt = db => db.transfer_receipts.find(row => row.id === transferReceipt.id);
  const uploadId = alertIntentId(owner, transferReceipt.id);
  for (const mutate of [
    db => { db.transfer_receipts = db.transfer_receipts.filter(row => row.id !== transferReceipt.id); },
    db => { db.transfer_receipts.push({ ...structuredClone(receipt(db)), id: 'qa_duplicate_receipt' }); },
    db => { receipt(db).tenant_id = 'foreign'; },
    db => { receipt(db).user_id = 'usr_c02'; },
    db => { receipt(db).product_name.en = 'changed'; },
    db => { receipt(db).classes++; },
    db => { receipt(db).status = 'approved'; },
    db => { receipt(db).image_data_url += 'tamper'; },
    db => { db.audit_log = db.audit_log.filter(row => row.id !== uploadId); },
    db => { db.audit_log.find(row => row.id === uploadId).diff.receipt_digest = '0'.repeat(64); },
    db => { db.audit_log.push(structuredClone(db.audit_log.find(row => row.id === uploadId))); },
  ]) await mutated(sources[1], mutate);
  const proxy = intercept => new Proxy(data, { get: (target, prop) => { const value = target[prop]; return typeof value === 'function' ? (...args) => intercept(prop, args, () => value.apply(target, args)) : value; } });
  const readCounts = {};
  for (const source of sources) {
    let reads = 0;
    const counting = proxy(async (prop, args, next) => { if (prop === 'list') assert.equal(args[1].where.tenant_id, scope.tenantId); const result = await next(); if (prop === 'get' || prop === 'list') reads++; return result; });
    assert.equal((await buildPendingRequestPreview(counting, source, scope)).status, 'ready'); readCounts[source.kind] = reads;
    for (let boundary = 0; boundary <= reads; boundary++) {
      let current = boundary !== 0, count = 0;
      const late = proxy(async (prop, args, next) => { const result = await next(); if ((prop === 'get' || prop === 'list') && ++count === boundary) current = false; return result; });
      assert.equal((await buildPendingRequestPreview(late, source, { ...scope, isCurrent: () => current })).status, 'cancelled'); assertions++;
    }
    for (const field of ['tenantId', 'actorId', 'role']) {
      const mutableScope = { ...scope }; let changed = false;
      const switching = proxy(async (prop, args, next) => { const result = await next(); if (!changed && prop === 'list') { changed = true; mutableScope[field] = 'changed'; } return result; });
      assert.equal((await buildPendingRequestPreview(switching, source, mutableScope)).status, 'cancelled'); assertions++;
    }
    const failing = proxy((prop, args, next) => prop === 'get' ? Promise.reject(Error('synthetic_read_failure')) : next());
    assert.equal((await buildPendingRequestPreview(failing, source, scope)).status, 'error');
    assert.equal((await buildPendingRequestPreview(data, source, scope)).status, 'ready'); assertions++;
    let count = 0;
    const changing = proxy(async (prop, args, next) => { const result = await next(); if (prop === 'list' && args[0] === 'users' && ++count === 2) result[0].email = 'changed@example.test'; return result; });
    await unavailable(changing, source);
    const foreign = proxy(async (prop, args, next) => prop === 'list' && args[0] === 'bookings' ? [{ id: 'qa_foreign_booking', tenant_id: 'foreign', payment_id: source.paymentId ?? transferReceipt.payment_id }] : next());
    await unavailable(foreign, source);
  }
  const digest = crypto.subtle.digest.bind(crypto.subtle);
  let helperCurrent = true;
  try {
    crypto.subtle.digest = async (...args) => { helperCurrent = false; return digest(...args); };
    assert.equal((await buildPendingRequestPreview(data, sources[1], { ...scope, isCurrent: () => helperCurrent })).status, 'cancelled'); assertions++;
  } finally { crypto.subtle.digest = digest; }
  assert.equal(values.get(key), stable);
  await transform(await readFile('src/modules/customer/pendingRequestPreview.ts', 'utf8'), { loader: 'ts', target: 'es2022' });
  const report = { status: 'PASS', assertions, fixture: 'actual MockProvider recordPayment+makePendingDeskIntent cash producers and submitTransfer protected upload producer; fictional existing customer', readCounts, noWrites: true, noBookingHoldOrGrant: true };
  if (process.env.QA_OUTPUT) { await mkdir(process.env.QA_OUTPUT, { recursive: true }); await writeFile(join(process.env.QA_OUTPUT, 'pending-request-preview.json'), JSON.stringify(report, null, 2)); }
  console.log(`PASS pending request preview: ${assertions} scenarios, ${JSON.stringify(readCounts)} guarded live reads; source/recipient proof, rollback, replay, context, retry and no writes.`);
} finally { await rm(dir, { recursive: true, force: true }); }
