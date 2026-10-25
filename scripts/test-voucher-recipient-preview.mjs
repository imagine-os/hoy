import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const dir = await mkdtemp(join(tmpdir(), 'hoy-recipient-preview-'));
const values = new Map();
let failStorage = false;
globalThis.localStorage = { getItem: k => values.get(k) ?? null, setItem: (k, v) => { if (failStorage) throw Error('synthetic_rollback'); values.set(k, v); } };
let assertions = 0;
try {
  const file = join(dir, 'fixture.mjs');
  await build({ stdin: { contents: "export {MockProvider} from './src/data/MockProvider'; export {resolveOperationalQuote,freezeSaleQuote} from './src/data/operationalQuotes'; export {voucherRecipientSource,buildVoucherRecipientPreview} from './src/modules/voucher-gifts/recipientPreview';", resolveDir: process.cwd() }, bundle: true, format: 'esm', platform: 'node', outfile: file, logLevel: 'silent' });
  const { MockProvider, resolveOperationalQuote, freezeSaleQuote, voucherRecipientSource, buildVoucherRecipientPreview } = await import(pathToFileURL(file));
  const data = new MockProvider(), key = 'hoyos.db.v1', scope = { tenantId: 'ten_hoy', actorId: 'usr_admin', role: 'admin', isCurrent: () => true };
  const quote = freezeSaleQuote(resolveOperationalQuote(data.peek('plans'), 'gift_single'));
  const purchase = { type: 'purchase', actorId: 'usr_c01', role: 'customer', requestId: 'recipient-purchase', quote, recipientEmail: 'unregistered-recipient@example.test', image: { dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAAA', fileName: 'fictional.png', mimeType: 'image/png', bytes: 12 } };
  const pending = await data.purchasedGift(purchase);
  assert.equal(voucherRecipientSource(pending, 'approve', 'usr_admin'), null); assertions++;
  const terms = { title: 'FICTIONAL {{title}} <b>class</b>', benefitKind: 'classes', benefitTotal: quote.classes, participantCap: 1, capScope: 'per_booking', creditUnit: 'per_person', expiresAt: null, cancellationPolicy: 'restore', recipientName: 'Fictional {{name}} <em>recipient</em>', recipientContact: purchase.recipientEmail, message: '' };
  const approve = { type: 'approve', purchaseId: pending.purchaseId, requestId: 'recipient-approve', actorId: 'usr_admin', role: 'admin', amount: quote.chargedAmount, reason: 'FICTIONAL review', reviewed: true, terms };
  let stable = values.get(key);
  failStorage = true; await assert.rejects(data.purchasedGift(approve)); failStorage = false;
  assert.equal(values.get(key), stable); assertions++;
  const approved = await data.purchasedGift(approve), source = voucherRecipientSource(approved, approve.requestId, approve.actorId);
  assert(source); assert.equal((await data.list('users')).some(u => u.email === purchase.recipientEmail), false);
  const result = await buildVoucherRecipientPreview(data, source, scope);
  assert.equal(result.status, 'ready', JSON.stringify(result));
  assert.equal(result.preview.recipient.email, purchase.recipientEmail); assert.equal(result.preview.recipient.name, terms.recipientName);
  assert.equal(result.preview.route, `/app/voucher-gifts?gift=${approved.payment.id}`);
  assert(result.preview.copy.body.en.includes(terms.title)); assert(result.preview.copy.body.en.includes('UNSENT')); assert(result.preview.copy.body.es.includes('SIN ENVIAR'));
  assert(Object.isFrozen(result.preview.copy.body)); assertions++;
  assert.equal(quote.classes, 1);
  assert(result.preview.copy.body.en.includes('Recorded benefit: 1 class.'));
  assert(result.preview.copy.body.es.includes('Beneficio registrado: 1 clase.')); assertions++;
  stable = values.get(key);
  await data.purchasedGift(approve); await buildVoucherRecipientPreview(data, source, scope); await buildVoucherRecipientPreview(data, source, scope);
  assert.equal(values.get(key), stable, 'approval replay and preview must preserve the entire database including history/outbox'); assertions++;
  const unavailable = async (provider, selected = source, context = scope) => { const r = await buildVoucherRecipientPreview(provider, selected, context); assert.equal(r.status, 'unavailable', JSON.stringify(r)); assertions++; };
  await unavailable(data, null);
  for (const patch of [{ tenantId: 'wrong' }, { actorId: 'usr_c01' }, { role: 'customer' }, { role: 'super_admin' }]) await unavailable(data, source, { ...scope, ...patch });
  await unavailable({ name: 'supabase' });
  for (const field of ['purchaseId', 'paymentId', 'voucherId', 'approvalRequestId']) await unavailable(data, { ...source, [field]: source[field] + '\n' });
  for (const malformed of [null, {}, { ...approved, state: 'pending' }, { ...approved, state: 'rejected' }]) { assert.equal(voucherRecipientSource(malformed, approve.requestId, approve.actorId), null); assertions++; }
  assert.equal(voucherRecipientSource(approved, 'bad\n', approve.actorId), null); assertions++;
  const stored = JSON.parse(stable);
  const mutated = async mutate => { const next = structuredClone(stored); mutate(next.db); values.set(key, JSON.stringify(next)); const provider = new MockProvider(); await unavailable(provider); values.set(key, stable); };
  for (const table of ['gift_purchase_intents', 'gift_purchase_requests', 'payments', 'vouchers', 'voucher_events', 'audit_log']) {
    await mutated(db => { const id = table === 'gift_purchase_intents' ? source.purchaseId : table === 'gift_purchase_requests' ? source.approvalRequestId : table === 'payments' ? source.paymentId : table === 'vouchers' ? source.voucherId : table === 'voucher_events' ? result.preview.issueEventId : result.preview.auditId; db[table] = db[table].filter(r => r.id !== id); });
    await mutated(db => { const id = table === 'gift_purchase_intents' ? source.purchaseId : table === 'gift_purchase_requests' ? source.approvalRequestId : table === 'payments' ? source.paymentId : table === 'vouchers' ? source.voucherId : table === 'voucher_events' ? result.preview.issueEventId : result.preview.auditId; db[table].push(structuredClone(db[table].find(r => r.id === id))); });
  }
  for (const mutate of [
    db => { db.users.find(r => r.id === scope.actorId).status = 'inactive'; },
    db => { db.user_roles = db.user_roles.filter(r => r.user_id !== scope.actorId); },
    db => { db.gift_purchase_requests.find(r => r.id === source.approvalRequestId).fingerprint = '{'; },
    db => { db.gift_purchase_requests.find(r => r.type === 'purchase' && r.result?.purchaseId === source.purchaseId).fingerprint = '{}'; },
    db => { db.gift_purchase_intents.find(r => r.id === source.purchaseId).recipientEmail = 'buyer@example.test'; },
    db => { db.vouchers.find(r => r.id === source.voucherId).recipientName = 'tampered'; },
    db => { db.audit_log.find(r => r.id === result.preview.auditId).diff.simulated = false; },
    db => { db.voucher_events.find(r => r.id === result.preview.issueEventId).fingerprint = '{}'; },
    db => { db.voucher_events.find(r => r.id === result.preview.issueEventId).payload.result.voucher.title = 'changed'; },
    db => { db.payments.find(r => r.id === source.paymentId).status = 'pending'; },
  ]) await mutated(mutate);
  const proxy = intercept => new Proxy(data, { get: (target, prop) => { const value = target[prop]; return typeof value === 'function' ? (...args) => intercept(prop, args, () => value.apply(target, args)) : value; } });
  const throwing = proxy((prop, args, next) => prop === 'get' ? Promise.reject(Error('synthetic read failure')) : next());
  assert.equal((await buildVoucherRecipientPreview(throwing, source, scope)).status, 'error'); assertions++;
  assert.equal((await buildVoucherRecipientPreview(data, source, scope)).status, 'ready'); assertions++;
  let reads = 0;
  const counting = proxy(async (prop, args, next) => { const value = await next(); if (prop === 'get' || prop === 'list') reads++; return value; });
  await buildVoucherRecipientPreview(counting, source, scope);
  const readCount = reads;
  for (let boundary = 0; boundary <= readCount; boundary++) {
    let current = true, count = 0;
    const late = proxy(async (prop, args, next) => { const value = await next(); if ((prop === 'get' || prop === 'list') && ++count === boundary) current = false; return value; });
    if (boundary === 0) current = false;
    assert.equal((await buildVoucherRecipientPreview(late, source, { ...scope, isCurrent: () => current })).status, 'cancelled'); assertions++;
  }
  let calls = 0;
  const changing = proxy(async (prop, args, next) => { const value = await next(); if (prop === 'list' && args[0] === 'users' && ++calls === 2) value[0].updated_at = 'changed'; return value; });
  await unavailable(changing);
  const rejectedPending = await data.purchasedGift({ ...purchase, requestId: 'recipient-rejected-purchase' });
  const rejected = await data.purchasedGift({ type: 'reject', purchaseId: rejectedPending.purchaseId, requestId: 'recipient-reject', actorId: 'usr_admin', role: 'admin', reason: 'FICTIONAL reject' });
  assert.equal(voucherRecipientSource(rejected, 'recipient-reject', 'usr_admin'), null); assertions++;
  const superPending = await data.purchasedGift({ ...purchase, requestId: 'recipient-super-purchase' });
  assert(data.peek('user_roles').some(r => r.user_id === 'usr_super' && r.role === 'super_admin'));
  assert.equal(data.peek('user_roles').some(r => r.user_id === 'usr_super' && r.role === 'admin'), false);
  const superApprove = { ...approve, purchaseId: superPending.purchaseId, requestId: 'recipient-super-approve', actorId: 'usr_super', role: 'admin' };
  const superApproved = await data.purchasedGift(superApprove);
  const superSource = voucherRecipientSource(superApproved, superApprove.requestId, superApprove.actorId);
  const superSnapshot = values.get(key);
  const superPreview = await buildVoucherRecipientPreview(data, superSource, { ...scope, actorId: 'usr_super', role: 'admin' });
  assert.equal(superPreview.status, 'ready', JSON.stringify(superPreview));
  assert.equal(superPreview.preview.recipient.email, purchase.recipientEmail);
  assert.equal(values.get(key), superSnapshot, 'super admin viewing as admin preview is read-only'); assertions++;
  await unavailable(data, superSource, { ...scope, actorId: 'usr_super', role: 'customer' });
  await unavailable(data, superSource, { ...scope, actorId: 'usr_super', role: 'super_admin' });
  if (process.env.QA_OUTPUT) { await mkdir(process.env.QA_OUTPUT, { recursive: true }); await writeFile(join(process.env.QA_OUTPUT, 'voucher-recipient-preview.json'), JSON.stringify({ status: 'PASS', assertions, fixture: 'actual MockProvider; synthetic unregistered .test recipient', readCount, invariants: ['read-only whole database snapshot', 'exact approval and issue proof', 'cancelled at every read boundary', 'no recipient account inference'] }, null, 2)); }
  console.log(`PASS voucher recipient preview: ${assertions} scenario assertions; ${readCount} guarded reads; actual MockProvider, protected proof, rollback/replay, tampering, retry, cancellation and no writes`);
} finally { await rm(dir, { recursive: true, force: true }); }
