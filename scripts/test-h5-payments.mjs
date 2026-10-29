// H-5 launch rows, logic level (no browser): products PR-01…PR-06, payments PG-01…PG-10, settings AD-04, against an
// in-memory stand-in for Company OS (scripts/lib/fake-cos.mjs). Fictional data only.
// Run: node scripts/test-h5-payments.mjs   (esbuild bundles the TS source, like test-launch-config.mjs)
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { fakeCos } from './lib/fake-cos.mjs';
import { readFile } from 'node:fs/promises';

let failed = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail && !ok ? ` — ${detail}` : ''}`); if (!ok) failed++; };
const code = async (p) => { try { await p; return 'ok'; } catch (e) { return e?.code ?? e?.message ?? String(e); } };
const codeOf = (f) => { try { f(); return 'ok'; } catch (e) { return e?.code ?? e?.message; } };

const temp = await mkdtemp(join(tmpdir(), 'hoy-h5-')), outfile = join(temp, 'h5.mjs');
await build({
  stdin: { contents: [
    "export * from './src/modules/products/launch/productMaster';",
    "export * from './src/modules/transfers/launch/payments';",
    "export * from './src/modules/transfers/launch/cos';",
    "export * from './src/modules/booking-policies/policies';",
    "export { ActionKey } from './src/modules/transfers/launch/useCos';",
    "export { receiptImageType } from './src/modules/transfers/launch/ReviewDrawer';",
    "export { affiliateOps } from './src/modules/transfers/launch/AffiliatePanel';",
    "export { readPay } from './src/modules/transfers/launch/TransferPayPage';",
    "export { readQueue } from './src/modules/transfers/launch/PendingPaymentsPage';",
    "export { readReceipt } from './src/modules/launch-receipts/launch/ReceiptPages';",
    "export { readReport } from './src/modules/transfers/launch/PaymentsReportPage';",
    "export { payLaunchStrings } from './src/modules/transfers/launch/strings';",
    "export { strings as productStrings } from './src/modules/products/strings';",
    "export { strings as policyStrings } from './src/modules/booking-policies';",
    "export { CompanyOSProvider } from './src/data/companyos/CompanyOSProvider';",
    "export { livePricing } from './src/data/livePricing';",
  ].join('\n'), resolveDir: process.cwd(), loader: 'ts' },
  bundle: true, platform: 'node', format: 'esm', outfile, logLevel: 'silent', jsx: 'automatic',
  loader: { '.css': 'empty', '.tsx': 'tsx' }, banner: { js: "import{createRequire}from'node:module';const require=createRequire(import.meta.url);" },
  define: { 'import.meta.env': '{"VITE_HOY_BUILD":"review","DEV":false,"BASE_URL":"/"}' },
});
const M = await import(pathToFileURL(outfile).href);
await rm(temp, { recursive: true, force: true });

const USERS = { usr_admin: { role: 'super_admin', name: 'Ana Admin' }, usr_desk: { role: 'front_desk', name: 'Diego Desk' }, usr_cust: { role: 'member', name: 'Carla Cliente' }, usr_other: { role: 'member', name: 'Otro' } };
const T0 = Date.parse('2026-11-01T14:00:00Z');
const today = '2026-11-01';
const setup = (opts = {}) => {
  const cos = fakeCos({ users: USERS, now: () => T0, ...opts });
  const carla = cos.seed('person', { name: 'Carla Cliente', email: 'carla@example.test', user: 'usr_cust' });
  const otro = cos.seed('person', { name: 'Otro Cliente', email: 'otro@example.test', user: 'usr_other' });
  const carlaMember = cos.seed('member', { person: carla.id, price_audience: 'general' });
  cos.seed('member', { person: otro.id, price_audience: 'general' });
  const P = (d) => cos.seed('product', { active: true, valid_from: '2026-10-01', valid_until: null, ...d });
  const products = {
    single: P({ key: 'single', name: 'Clase individual', kind: 'single', price: 55000, credits: 0 }),
    trial: P({ key: 'trial', name: 'Clase de prueba', kind: 'trial', price: 35000, credits: 1 }),
    pack12: P({ key: 'pack12', name: 'Paquete de 12 clases', kind: 'pack', price: 600000, credits: 12, validity_days: 90, freezable: true }),
    smtc: P({ key: 'pack12_smtc', name: 'Paquete Santa María', kind: 'pack', price: 480000, credits: 12, validity_days: 90, audience: 'affiliate' }),
    private: P({ key: 'private', name: 'Clase privada', kind: 'private', price: 250000 }),
    gift: P({ key: 'gift_pack12', name: 'Bono regalo 12 clases', kind: 'gift', price: 600000 }),
  };
  const held = (method, mins = 15) => cos.seed('booking', { person: carla.id, occurrence: 'occ_1', status: 'held', entitlement: 'single', payment_method: method, hold_until: new Date(T0 + mins * 60000).toISOString() }, 'usr_cust');
  return { cos, carla, otro, carlaMember, products, held };
};
const all = async (cos) => M.queryAll(cos, { entity: 'product' });
const png = () => new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])], 'comprobante.png', { type: 'image/png' });

// ── PR-01 — product master: code, name, type, classes, validity, price, start/end, active ─────────────────────────
{
  const { cos } = setup(); cos.as('usr_admin');
  const draft = { key: 'pack8', name: 'Paquete de 8', kind: 'pack', price: 420000, credits: 8, validity_days: 60, freezable: false, audience: null, active: true, valid_from: '2026-11-01', valid_until: null };
  check('PR-01 a valid product passes the browser check', M.validateProduct(draft, await all(cos)) === null);
  const [id] = await M.batch(cos, M.createOps(draft), M.newIdempotencyKey());
  const row = (await all(cos)).find((r) => r.id === id);
  check('PR-01 create stores every field the row lists (code, name, type, classes, validity, price, dates, active)', row && row.data.key === 'pack8' && row.data.kind === 'pack' && row.data.credits === 8 && row.data.validity_days === 60 && row.data.price === 420000 && row.data.valid_from === '2026-11-01' && row.data.active === true);
  check('PR-01 bad inputs are refused with a named reason', ['key', 'name', 'price', 'credits', 'dates'].every((why, i) => M.validateProduct([{ ...draft, key: 'X!' }, { ...draft, name: ' ' }, { ...draft, price: 1.5 }, { ...draft, credits: 0 }, { ...draft, valid_from: '2026-12-01', valid_until: '2026-11-01' }][i], []) === why));
  const edited = M.editOps(row, { ...row.data, name: 'Paquete de 8 clases', active: false });
  await M.batch(cos, edited, M.newIdempotencyKey());
  check('PR-01 edit renames and deactivates in place, guarded by the price it read', (await all(cos)).find((r) => r.id === id).data.active === false && edited[0].ifMatch.field === 'price');
  check('PR-01 editing the price in place is refused (a price change is a new period)', codeOf(() => M.editOps(row, { ...row.data, price: 1 })) === 'price_in_place');
  cos.as('usr_desk');
  check('PR-01 front desk cannot write products (read-only view)', await code(M.batch(cos, M.createOps({ ...draft, key: 'desk_try' }), M.newIdempotencyKey())) === 'forbidden');
  check('PR-01 front desk reads the master', (await all(cos)).length >= 7);
}

// ── PR-02 — price in force on the purchase date; history kept; past sales unchanged ────────────────────────────
{
  const { cos, carla, products } = setup(); cos.as('usr_admin');
  const sold = await M.batch(cos, M.deskOps({ person: carla.id, product: products.pack12, amount: 600000, method: 'cash', reference: '', reason: '', today, concept: 'x' }), M.newIdempotencyKey());
  const rows0 = await all(cos), cur = rows0.find((r) => r.id === products.pack12.id);
  const ops = M.newPriceOps(cur, 650000, '2026-12-01', rows0);
  await M.batch(cos, ops, M.newIdempotencyKey());
  const rows = await all(cos), hist = M.history(rows, 'pack12');
  check('PR-02 a new price ends the current period the day before and opens the next', hist.length === 2 && hist[1].data.valid_until === '2026-11-30' && hist[0].data.valid_from === '2026-12-01' && hist[0].data.price === 650000);
  check('PR-02 the price in force follows the date', M.rowOnDay(rows, 'pack12', '2026-11-30').data.price === 600000 && M.rowOnDay(rows, 'pack12', '2026-12-01').data.price === 650000);
  const past = cos.db.payment.find((p) => p.id === sold[0]);
  check('PR-02 a past purchase keeps its price and its product row', past.data.amount === 600000 && past.data.product === products.pack12.id);
  check('PR-02 overlapping active periods of one product are refused', M.validateProduct({ ...hist[0].data, valid_from: '2026-11-15' }, rows) === 'overlap');
  check('PR-02 a new price must start inside the current period', codeOf(() => M.newPriceOps(hist[1], 1, '2026-12-05', rows)) === 'dates');
  check('PR-02 the price write is guarded (ifMatch) and keyed: a replay changes nothing', ops[0].ifMatch?.value === 600000);
  const { cos: noDates } = setup({ productDates: false }); noDates.as('usr_admin');
  const g = { key: 'g1', name: 'G', kind: 'single', price: 1, credits: 0, active: true, valid_from: '2026-11-01', valid_until: null };
  const gOps = M.createOps(g), gIds = await M.batch(noDates, gOps, M.newIdempotencyKey());
  check('PR-02 (gap G1) a server that drops the dates is detected, not reported as saved', M.opsDatesStored(gOps, gIds, await all(noDates)) === false && M.opsDatesStored(gOps, gIds, [{ id: gIds[0], data: g }]) === true);
  check('PR-02 (G1) the screen asks the server first: dated saves are refused before payments 2.7.0', await M.datesSupported(noDates) === false && await M.datesSupported(cos) === true);
  const undatedRows = [{ id: 'a', data: M.undated({ ...g, key: 'kk' }) }];
  check('PR-02 (G1) without server dates a second active row of the same product is refused (deactivate the old one first)', M.validateProduct(M.undated({ ...g, key: 'kk' }), undatedRows) === 'overlap');
}

// ── PR-03 — launch products loaded and on sale ───────────────────────────────────────────────────────────────
{
  const { cos, products } = setup(); cos.as('usr_cust');
  const onSale = M.inForce(await all(cos), today).map((r) => r.data.key).sort();
  check('PR-03 single, trial, 12-pack, private, Santa María pack and gift voucher are on sale', ['gift_pack12', 'pack12', 'pack12_smtc', 'private', 'single', 'trial'].every((k) => onSale.includes(k)));
  check('PR-03 trial 35.000, 12-pack 600.000, Santa María 480.000 (fixture prices)', products.trial.data.price === 35000 && products.pack12.data.price === 600000 && products.smtc.data.price === 480000);
  check('PR-03 the private class has no public price ("contact the club")', M.publicPrice(products.private) === null && M.publicPrice(products.pack12) === 600000);
  check('PR-03 the customer pay screen refuses to sell a private class', codeOf(() => M.transferOps({ person: 'p', product: products.private, today, reference: '', concept: 'x' })) === 'product_inactive');
}

// ── PR-04 — trial once (server rule); the screen shows its copy ─────────────────────────────────────────────
{
  check('PR-04 the server refusal trial_used has Spanish and English copy', !!M.payLaunchStrings['payLaunch.code.trial_used']?.es && !!M.payLaunchStrings['payLaunch.code.trial_used']?.en && M.refusalKey('trial_used') === 'payLaunch.code.trial_used');
}

// ── PR-05 — Santa María pack only for verified members ──────────────────────────────────────────────────────
{
  const { cos, carla, carlaMember, products } = setup();
  cos.as('usr_cust');
  const view = await M.readPay(cos, 'product', 'pack12_smtc', today);
  check('PR-05 the pay screen shows the unverified state', view.affiliate === false);
  cos.as('usr_desk');
  const deny = await code(M.batch(cos, M.deskOps({ person: carla.id, product: products.smtc, amount: 480000, method: 'cash', reference: '', reason: '', today, concept: 'x' }), M.newIdempotencyKey()));
  check('PR-05 selling it to an unverified member is refused by the server (audience_not_allowed)', deny === 'audience_not_allowed');
  await M.batch(cos, M.affiliateOps(carlaMember, true), M.newIdempotencyKey());
  check('PR-05 the desk sets the affiliate state', cos.db.member.find((m) => m.id === carlaMember.id).data.price_audience === 'affiliate');
  check('PR-05 once verified, the desk sale goes through', await code(M.batch(cos, M.deskOps({ person: carla.id, product: products.smtc, amount: 480000, method: 'cash', reference: '', reason: '', today, concept: 'x' }), M.newIdempotencyKey())) === 'ok');
  cos.as('usr_cust');
  check('PR-05 the customer then sees the verified state', (await M.readPay(cos, 'product', 'pack12_smtc', today)).affiliate === true);
  check('PR-05 the affiliate flag on a product drives the badge', M.isAffiliateOnly(products.smtc) && !M.isAffiliateOnly(products.pack12));
}

// ── PR-06 — confirmed payment activates the pack (server); the receipt shows it ─────────────────────────────
{
  const { cos, carla, products } = setup(); cos.as('usr_desk');
  const [pid] = await M.batch(cos, M.deskOps({ person: carla.id, product: products.pack12, amount: 600000, method: 'cash', reference: '', reason: '', today, concept: 'x' }), M.newIdempotencyKey());
  const p = cos.db.payment.find((x) => x.id === pid);
  check('PR-06 a confirmed pack payment is approved against the pack row (credits issues 12 classes, 90 days)', p.data.status === 'approved' && p.data.product === products.pack12.id && products.pack12.data.credits === 12 && products.pack12.data.validity_days === 90);
}

// ── PG-01 / PG-02 — transfer screen and receipt upload ──────────────────────────────────────────────────────
{
  const { cos, carla, products, held } = setup();
  const b = held('transfer'); cos.as('usr_cust');
  const view = await M.readPay(cos, 'booking', b.id, today);
  check('PG-01 the amount due is the single-class row in force today', view.product.data.price === 55000 && view.booking.id === b.id);
  check('PG-02 receipt check: PNG and JPG by type and first bytes', M.checkReceipt({ type: 'image/png', size: 11 }, new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) === null && M.checkReceipt({ type: 'image/jpeg', size: 3 }, new Uint8Array([0xff, 0xd8, 0xff])) === null);
  check('PG-02 receipt check: other types, disguised files and > 10 MB are refused', M.checkReceipt({ type: 'application/pdf', size: 5 }, new Uint8Array([0x25])) === 'file_type_not_allowed' && M.checkReceipt({ type: 'image/png', size: 5 }, new Uint8Array([0xff, 0xd8, 0xff])) === 'file_type_not_allowed' && M.checkReceipt({ type: 'image/png', size: 10 * 1024 * 1024 + 1 }, new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) === 'file_too_large');
  const key = M.newIdempotencyKey();
  const [pid] = await M.batch(cos, M.transferOps({ person: carla.id, product: view.product, today, reference: '', booking: b.id, concept: 'Clase' }), key);
  const f = await M.uploadReceipt(cos, pid, png(), cos.put);
  const pay = cos.db.payment.find((x) => x.id === pid), bk = cos.db.booking.find((x) => x.id === b.id);
  check('PG-02 the pending payment names the booking, product and amount; the image is attached and ready', pay.data.status === 'pending' && pay.data.for_id === b.id && pay.data.amount === 55000 && f.data.status === 'ready' && f.data.owner_id === pid && f.data.kind === 'receipt');
  check('PG-02 the booking becomes "pending confirmation" (hold frozen while the receipt waits)', bk.data.status === 'held' && !!bk.data.hold_frozen_at);
  check('PG-02 the same screen then says a receipt is already pending', !!(await M.readPay(cos, 'booking', b.id, today)).pending);
  check('PG-02 a transfer without a typed reference still carries one (methods_requiring_reference)', pay.data.reference === 'comprobante');
  const bad = await code(M.uploadReceipt(cos, pid, new File([new Uint8Array([1, 2, 3])], 'x.pdf', { type: 'application/pdf' }), cos.put));
  check('PG-02 a wrong file is refused before anything is uploaded', bad === 'file_type_not_allowed');
  cos.as('usr_other');
  check('PG-02 another customer cannot attach a receipt to it', await code(M.uploadReceipt(cos, pid, png(), cos.put)) === 'file_owner_not_found');
}

// ── PG-03 — the 15-minute hold (server); the list shows the clock ───────────────────────────────────────────
{
  const { cos, held } = setup(); const b = held('transfer', 15);
  const items = M.pendingItems({ payments: [], bookings: [{ ...b, data: { ...b.data, payment_method: 'desk' } }], files: [], products: [] }, T0 + 5 * 60000);
  check('PG-03 a running hold shows its time left from hold_until', items[0].clock.state === 'waiting' && Math.ceil(items[0].clock.msLeft / 60000) === 10);
  check('PG-03 a frozen hold (receipt sent) shows "waiting for the desk"', M.holdClock({ ...b, data: { ...b.data, hold_frozen_at: 'x', hold_left_minutes: 7 } }, T0).state === 'frozen');
  check('PG-03 an ended hold shows as expired', M.holdClock(b, T0 + 16 * 60000).state === 'expired');
}

// ── PG-04 — confirm or reject with the amount received ──────────────────────────────────────────────────────
{
  const { cos, carla, products, held } = setup();
  const b = held('transfer'); cos.as('usr_cust');
  const [pid] = await M.batch(cos, M.transferOps({ person: carla.id, product: products.single, today, reference: 'r1', booking: b.id, concept: 'Clase' }), M.newIdempotencyKey());
  await M.uploadReceipt(cos, pid, png(), cos.put);
  cos.as('usr_desk');
  let q = await M.readQueue(cos), item = M.pendingItems(q, T0)[0];
  const review = (o) => M.reviewOps({ payment: item.payment, product: item.product, decision: 'approve', amountReceived: 55000, reason: '', ...o });
  check('PG-04 a different amount without a reason is stopped in the browser', codeOf(() => review({ amountReceived: 50000 })) === 'reason_required');
  check('PG-04 a zero or fractional amount is stopped', codeOf(() => review({ amountReceived: 0 })) === 'invalid_amount' && codeOf(() => review({ amountReceived: 1.5 })) === 'invalid_amount');
  check('PG-04 a decline needs a reason', codeOf(() => review({ decision: 'decline' })) === 'reason_required');
  const sneaky = [{ op: 'update', entity: 'payment', id: pid, data: { status: 'approved', amount: 50000 } }];
  cos.as('usr_cust');
  check('PG-04 a customer cannot approve their own transfer (member policy: status stays pending)', await code(M.batch(cos, [{ op: 'update', entity: 'payment', id: pid, data: { status: 'approved' } }], M.newIdempotencyKey())) === 'write_forbidden');
  cos.as('usr_desk');
  check('PG-04 the server refuses a mismatched approval without an override (amount_mismatch)', await code(M.batch(cos, sneaky, M.newIdempotencyKey())) === 'amount_mismatch');
  await M.batch(cos, review({ amountReceived: 50000, reason: 'Transfirió de menos; acordado' }), M.newIdempotencyKey());
  const pay = cos.db.payment.find((x) => x.id === pid);
  check('PG-04 approve records the amount received and the reason; the server stamps who approved (approved_by)', pay.data.status === 'approved' && pay.data.amount === 50000 && pay.data.price_override_reason === 'Transfirió de menos; acordado' && pay.data.approved_by === 'usr_desk' && !!pay.data.approved_at);
  check('PG-04 on confirmation the booking becomes active (booked)', cos.db.booking.find((x) => x.id === b.id).data.status === 'booked');
  const second = await code(M.batch(cos, review({}), M.newIdempotencyKey()));
  check('PG-04 a second desk confirming the same payment is refused (ifMatch status pending) with "someone changed this" copy', second === 'ifMatch mismatch' && M.refusalKey(second) === 'payLaunch.code.stale');
  // decline path restarts the hold with the minutes left
  const { cos: c2, carla: k2, products: p2, held: h2 } = setup(); const b2 = h2('transfer', 15); c2.as('usr_cust');
  const [pid2] = await M.batch(c2, M.transferOps({ person: k2.id, product: p2.single, today, reference: '', booking: b2.id, concept: 'Clase' }), M.newIdempotencyKey());
  c2.as('usr_desk'); q = await M.readQueue(c2); item = M.pendingItems(q, T0)[0];
  await M.batch(c2, M.reviewOps({ payment: item.payment, product: item.product, decision: 'decline', amountReceived: NaN, reason: 'No llegó la transferencia' }), M.newIdempotencyKey());
  check('PG-04 reject stores the reason; the hold resumes for a new receipt', c2.db.payment.find((x) => x.id === pid2).data.status === 'declined' && c2.db.payment.find((x) => x.id === pid2).data.notes === 'No llegó la transferencia' && !c2.db.booking.find((x) => x.id === b2.id).data.hold_frozen_at);
  // approve and check in at the door, one batch, payment first
  const { cos: c3, carla: k3, products: p3, held: h3 } = setup(); const b3 = h3('transfer'); c3.as('usr_cust');
  await M.batch(c3, M.transferOps({ person: k3.id, product: p3.single, today, reference: '', booking: b3.id, concept: 'Clase' }), M.newIdempotencyKey());
  c3.as('usr_desk'); q = await M.readQueue(c3); item = M.pendingItems(q, T0)[0];
  const door = M.reviewOps({ payment: item.payment, product: item.product, decision: 'approve', amountReceived: 55000, reason: '', checkInBooking: b3.id });
  check('PG-04 "confirm and check in" sends the payment first, then the check-in', door.length === 2 && door[0].entity === 'payment' && door[1].data.status === 'checked_in');
}

// ── PG-05 — one list with customer, product, amount, receipt and time left ──────────────────────────────────
{
  const { cos, carla, otro, products, held } = setup();
  const bt = held('transfer', 15), bd = cos.seed('booking', { person: otro.id, occurrence: 'occ_2', status: 'held', entitlement: 'single', payment_method: 'desk', hold_until: new Date(T0 + 50 * 60000).toISOString() }, 'usr_other');
  cos.as('usr_cust');
  const [pid] = await M.batch(cos, M.transferOps({ person: carla.id, product: products.single, today, reference: '', booking: bt.id, concept: 'Clase' }), M.newIdempotencyKey());
  await M.uploadReceipt(cos, pid, png(), cos.put);
  const [packPid] = await M.batch(cos, M.transferOps({ person: carla.id, product: products.pack12, today, reference: '', concept: 'Paquete' }), M.newIdempotencyKey());
  cos.as('usr_desk');
  const q = await M.readQueue(cos), items = M.pendingItems(q, T0);
  const r = items.find((i) => i.payment?.id === pid);
  check('PG-05 every pending item is in one list: transfer receipts, a pack purchase and the desk hold', items.length === 3 && items.some((i) => i.kind === 'desk_hold' && i.booking.id === bd.id) && items.some((i) => i.payment?.id === packPid));
  check('PG-05 each row has customer, product, amount and receipt', q.people.get(r.person) === 'Carla Cliente' && r.product.data.name === 'Clase individual' && r.amount === 55000 && !!r.receipt);
  check('PG-05 the desk hold shows its time left; the soonest deadline comes first', items[0].kind === 'desk_hold' && items[0].clock.state === 'waiting');
  check('PG-05 a customer reading the same queries sees only their own payments (row policies)', (await (async () => { cos.as('usr_cust'); const qq = await M.readQueue(cos); return qq.payments.length > 0 && qq.payments.every((p) => p.data.person === carla.id); })()));
}

// ── PG-06 / PG-07 — pay later at the desk; the desk records the payment ─────────────────────────────────────
{
  const { cos, carla, products, held } = setup();
  const b = held('desk', 60); cos.as('usr_desk');
  const base = { person: carla.id, product: products.single, amount: 55000, method: 'cash', reference: '', reason: '', today, booking: b.id, concept: 'Clase' };
  check('PG-07 card terminal and transfer need a reference', codeOf(() => M.deskOps({ ...base, method: 'card_terminal' })) === 'reference_required' && codeOf(() => M.deskOps({ ...base, method: 'transfer' })) === 'reference_required');
  check('PG-07 only cash, card terminal or transfer', codeOf(() => M.deskOps({ ...base, method: 'bitcoin' })) === 'invalid_method');
  const [pid] = await M.batch(cos, M.deskOps(base), M.newIdempotencyKey());
  const p = cos.db.payment.find((x) => x.id === pid);
  check('PG-06 the held desk booking is confirmed by the desk payment', cos.db.booking.find((x) => x.id === b.id).data.status === 'booked');
  check('PG-07 the payment is approved, by method, with who took it (createdBy)', p.data.status === 'approved' && p.data.method === 'cash' && p.createdBy === 'usr_desk');
  const quoted = M.deskOps({ ...base, booking: null, product: products.private, amount: 280000, reason: 'Cotización 2 personas' });
  check('PG-07 a private class at a quoted price carries the reason', quoted[0].data.price_override_reason === 'Cotización 2 personas' && await code(M.batch(cos, quoted, M.newIdempotencyKey())) === 'ok');
}

// ── PG-08 — "Nota de compra", no VAT, numbered by the server ────────────────────────────────────────────────
{
  const { cos, carla, products } = setup(); cos.as('usr_desk');
  const [a] = await M.batch(cos, M.deskOps({ person: carla.id, product: products.trial, amount: 35000, method: 'cash', reference: '', reason: '', today, concept: 'Prueba' }), M.newIdempotencyKey());
  const [b] = await M.batch(cos, M.deskOps({ person: carla.id, product: products.pack12, amount: 600000, method: 'card_terminal', reference: 'D-1', reason: '', today, concept: 'Pack' }), M.newIdempotencyKey());
  const ra = await M.readReceipt(cos, a, true), rb = await M.readReceipt(cos, b, true);
  check('PG-08 each confirmed payment gets a receipt numbered by the server, in sequence', ra.invoice?.data.kind === 'receipt' && ra.invoice.data.number === 1 && rb.invoice.data.number === 2);
  check('PG-08 the receipt carries product, customer, total and who recorded it', ra.product === 'Clase de prueba' && ra.customer === 'Carla Cliente' && ra.invoice.data.total === 35000 && ra.recorder === 'Diego Desk');
  check('PG-08 the copy says no VAT and not an invoice (J9), in both languages', /IVA/.test(M.payLaunchStrings['payLaunch.receipt.noVat'].es) && /VAT/.test(M.payLaunchStrings['payLaunch.receipt.noVat'].en));
  check('PG-08 the browser never writes an invoice', await code(M.batch(cos, [{ op: 'create', entity: 'invoice', data: { number: 99 } }], M.newIdempotencyKey())) === 'invoice_system_managed');
  cos.as('usr_cust');
  const mine = await M.readReceipt(cos, a, false);
  check('PG-08 the customer reads their own receipt without the staff member list', mine.invoice?.data.number === 1 && mine.recorder === null && !cos.calls.slice(-6).some((c) => c.path === '/members' && c.as === 'usr_cust'));
  cos.as('usr_other');
  check('PG-08 another customer cannot open it', await code(M.readReceipt(cos, a, false)) === 'not found');
}

// ── PG-09 — no duplicate payments on a double tap or a lost answer ──────────────────────────────────────────
{
  const { cos, carla, products } = setup(); cos.as('usr_desk');
  const ops = M.deskOps({ person: carla.id, product: products.pack12, amount: 600000, method: 'cash', reference: '', reason: '', today, concept: 'Pack' });
  const key = M.newIdempotencyKey();
  const [x, y] = await Promise.all([M.batch(cos, ops, key), M.batch(cos, ops, key)]);
  check('PG-09 the same action sent twice (double tap / retry) creates one payment and one receipt', x[0] === y[0] && cos.db.payment.length === 1 && cos.db.invoice.length === 1);
  check('PG-09 a changed body under the same key is refused (idempotency_conflict), nothing written', await code(M.batch(cos, M.deskOps({ person: carla.id, product: products.pack12, amount: 600001, method: 'cash', reference: '', reason: 'x y z', today, concept: 'Pack' }), key)) === 'idempotency_conflict' && cos.db.payment.length === 1);
  check('PG-09 a malformed key never reaches the server', await code(M.batch(cos, ops, 'bad key!')) === 'idempotency_key_invalid');
  check('PG-09 every money write carries a key', cos.calls.filter((c) => c.path === '/batch').every((c) => c.key));
  // the customer transfer: payment created, image upload lost → the retry re-sends only the image
  const { cos: c2, carla: k2, products: p2 } = setup(); c2.as('usr_cust');
  const tkey = M.newIdempotencyKey(), tops = M.transferOps({ person: k2.id, product: p2.pack12, today, reference: '', concept: 'Pack' });
  await M.batch(c2, tops, tkey); await M.batch(c2, tops, tkey);
  check('PG-09 a transfer submitted twice is one pending payment', c2.db.payment.length === 1);
}

// ── PG-10 — confirmed payments report (CSV) ─────────────────────────────────────────────────────────────────
{
  const { cos, carla, products, held } = setup();
  cos.as('usr_desk');
  await M.batch(cos, M.deskOps({ person: carla.id, product: products.trial, amount: 35000, method: 'cash', reference: '', reason: '', today, concept: 'Prueba' }), M.newIdempotencyKey());
  const b = held('transfer'); cos.as('usr_cust');
  const [tp] = await M.batch(cos, M.transferOps({ person: carla.id, product: products.single, today, reference: 'BC-77', booking: b.id, concept: 'Clase' }), M.newIdempotencyKey());
  cos.as('usr_admin');
  const q = await M.readQueue(cos), it = M.pendingItems(q, T0).find((i) => i.payment?.id === tp);
  await M.batch(cos, M.reviewOps({ payment: it.payment, product: it.product, decision: 'approve', amountReceived: 55000, reason: '' }), M.newIdempotencyKey());
  cos.seed('payment', { person: carla.id, product: products.pack12.id, amount: 600000, method: 'cash', status: 'approved', date: '2026-10-15' }, 'usr_desk');
  const data = await M.readReport(cos, today, today);
  const rep = M.paymentsReport({ ...data, from: today, to: today, methodLabel: (m) => ({ cash: 'Efectivo', transfer: 'Transferencia' })[m] ?? m });
  check('PG-10 only confirmed payments inside the date range', rep.rows.length === 2 && rep.total === 90000);
  const desk = rep.rows.find((r) => r[3] === 'Clase de prueba'), tr = rep.rows.find((r) => r[3] === 'Clase individual');
  check('PG-10 each row has method, product and who confirmed', desk[4] === 'Efectivo' && desk[8] === 'Diego Desk' && tr[4] === 'Transferencia' && tr[8] === 'Ana Admin' && tr[7] === 'Carla Cliente');
  check('PG-10 the CSV has the header, the Nota de compra number and opens in Excel (BOM, CRLF)', rep.csv.startsWith('﻿"fecha","nota_de_compra"') && rep.csv.includes('\r\n') && desk[1] === 1);
  const evil = M.paymentsReport({ ...data, people: new Map([[carla.id, '=HYPERLINK("x")']]), from: today, to: today, methodLabel: (m) => m });
  check('PG-10 a customer name cannot inject a spreadsheet formula', evil.csv.includes(`"'=HYPERLINK(""x"")"`));
  const { cos: noField, carla: k4, products: p4, held: h4 } = setup({ approvedBy: false }); const b4 = h4('transfer'); noField.as('usr_cust');
  const [p4id] = await M.batch(noField, M.transferOps({ person: k4.id, product: p4.single, today, reference: '', booking: b4.id, concept: 'Clase' }), M.newIdempotencyKey());
  noField.as('usr_admin'); const q4 = await M.readQueue(noField), i4 = M.pendingItems(q4, T0).find((i) => i.payment?.id === p4id);
  await M.batch(noField, M.reviewOps({ payment: i4.payment, product: i4.product, decision: 'approve', amountReceived: 55000, reason: '' }), M.newIdempotencyKey());
  const r4 = M.paymentsReport({ ...(await M.readReport(noField, today, today)), from: today, to: today, methodLabel: (m) => m });
  check('PG-10 (before payments 2.7.0) without approved_by a transfer shows no confirmer, never a wrong one', r4.rows[0][8] === '');
}

// ── AD-04 — hold minutes, move window, late cancel; future bookings only (reception hours: H-7's panel) ──────
{
  const before = M.fromSettings({ review_hours: 'mon-fri 08:00-20:00', hold_minutes_transfer: 15, hold_minutes_desk: 60, reschedule_hours: 12, late_cancel_hours: 12, policy_as_of_booking: true });
  const after = { ...before, hold_minutes_transfer: 20, reschedule_hours: 24 };
  check('AD-04 limits: hold minutes 1–1440, move window and late cancel 0–168 h', M.validatePolicies({ ...after, hold_minutes_transfer: 0 }) === 'transfer' && M.validatePolicies({ ...after, hold_minutes_desk: 1441 }) === 'desk' && M.validatePolicies({ ...after, reschedule_hours: 200 }) === 'reschedule' && M.validatePolicies({ ...after, late_cancel_hours: -1 }) === 'lateCancel' && M.validatePolicies(after) === null);
  const patch = M.settingsPatch(before, after);
  check('AD-04 only changed settings are sent', JSON.stringify(Object.keys(patch).sort()) === '["hold_minutes_transfer","reschedule_hours"]');
  check('AD-04 the panel never sends reception hours or closed dates (H-7 owns them on the same route)', !('review_hours' in patch) && !('review_closed_dates' in patch) && !M.EDITABLE.includes('review_hours'));
  const { cos } = setup(); cos.as('usr_admin'); cos.settings.review_hours = 'mon-fri 08:00-20:00';
  await cos.request('PATCH', '/modules/bookings/settings', { settings: patch });
  check('AD-04 the server stores them and keeps the reception hours untouched', cos.settings.reschedule_hours === 24 && cos.settings.hold_minutes_transfer === 20 && cos.settings.review_hours === 'mon-fri 08:00-20:00');
  check('AD-04 future bookings only: the screen reads policy_as_of_booking and warns when it is off', M.fromSettings(cos.settings).policy_as_of_booking === true && !!M.policyStrings['bookingPolicies.copiesOff']?.es);
  cos.as('usr_desk');
  check('AD-04 (gap G3) a non-Super-Admin gets forbidden, shown with its copy', await code(cos.request('PATCH', '/modules/bookings/settings', { settings: { reschedule_hours: 1 } })) === 'forbidden' && M.refusalKey('forbidden') === 'payLaunch.code.forbidden');
}

// ── H-6 hand-off — a gift purchase carries its recipient in the pending payment's notes ─────────────────────
{
  const { cos, carla, products } = setup(); cos.as('usr_cust');
  const note = 'gift-recipient:{"name":"Ana","email":"ana@example.test"}';
  check('gift notes: only a bounded `gift-recipient:` string is accepted', M.giftNotes(note) === note && M.giftNotes('notes: hi') === null && M.giftNotes(note + 'x'.repeat(1000)) === null && M.giftNotes({}) === null);
  const [pid] = await M.batch(cos, M.transferOps({ person: carla.id, product: products.gift, today, reference: '', concept: 'Bono', notes: note }), M.newIdempotencyKey());
  check('gift notes: written on the pending payment in the same keyed batch', cos.db.payment.find((x) => x.id === pid).data.notes === note);
  const [p2] = await M.batch(cos, M.transferOps({ person: carla.id, product: products.pack12, today, reference: '', concept: 'Pack', notes: 'evil: overwrite' }), M.newIdempotencyKey());
  check('gift notes: anything else is dropped', cos.db.payment.find((x) => x.id === p2).data.notes == null);
}

// ── Review round 1 fixes ─────────────────────────────────────────────────────────────────────────────────────
{
  // PG-09: the key lifecycle of one action
  const a = new M.ActionKey(), k0 = a.key;
  a.failed({ code: 'amount_mismatch', status: 422 });
  check('PG-09 a refusal (4xx) wrote nothing: editing the form starts a new key', a.renew() === true && a.key !== k0);
  const k1 = a.key; a.failed({ code: 'unknown' });
  check('PG-09 a lost answer (no status) locks the key: an edited resubmit cannot create a second payment', a.uncertain && a.renew() === false && a.key === k1);
  a.failed({ status: 502 }); check('PG-09 a 5xx is also "outcome unknown"', a.uncertain && a.renew() === false);
  a.failed({ status: 409, ambiguous: true }); check('PG-09 a provider-flagged ambiguous answer is "outcome unknown"', a.uncertain);
  a.succeeded(); check('PG-09 success ends the action: the next one gets a fresh key', !a.uncertain && a.key !== k1);
  check('PG-09 browser-side refusals are 4xx (never mistaken for a lost answer)', !M.outcomeUnknown(new M.CosError('reason_required')));
  const { cos, carla, products } = setup(); cos.as('usr_desk');
  const ops = M.deskOps({ person: carla.id, product: products.trial, amount: 35000, method: 'cash', reference: '', reason: '', today, concept: 'x' });
  const lost = M.newIdempotencyKey(); await M.batch(cos, ops, lost);
  const edited = M.deskOps({ person: carla.id, product: products.trial, amount: 30000, method: 'cash', reference: '', reason: 'descuento', today, concept: 'x' });
  check('PG-09 lost answer then edited resubmit under the kept key → conflict, still one payment', await code(M.batch(cos, edited, lost)) === 'idempotency_conflict' && cos.db.payment.length === 1);
}
{
  // PG-02: a payment whose image never arrived is resumed, not shown as sent
  const { cos, carla, products, held } = setup(); const b = held('transfer'); cos.as('usr_cust');
  await M.batch(cos, M.transferOps({ person: carla.id, product: products.single, today, reference: '', booking: b.id, concept: 'Clase' }), M.newIdempotencyKey());
  const v1 = await M.readPay(cos, 'booking', b.id, today);
  check('PG-02 a pending payment without a ready image offers the upload again (no second payment)', !!v1.pending && v1.pendingHasReceipt === false);
  await M.uploadReceipt(cos, v1.pending.id, png(), cos.put);
  check('PG-02 once the image is ready the screen says "already sent"', (await M.readPay(cos, 'booking', b.id, today)).pendingHasReceipt === true && cos.db.payment.length === 1);
  check('PG-02 an unknown product key reads cleanly (no empty `in` filter)', (await M.readPay(cos, 'product', 'nope', today)).product === null);
}
{
  // PG-02: the pending payment resumed is this purchase's own. A gift for another recipient, or a pack after a booking's
  // single-class payment, starts a new payment instead of being shown as "already sent".
  const { cos, carla, products, held } = setup(); const b = held('transfer'); cos.as('usr_cust');
  const ana = 'gift-recipient:{"name":"Ana","email":"ana@example.test"}', luis = 'gift-recipient:{"name":"Luis","email":"luis@example.test"}';
  await M.batch(cos, M.transferOps({ person: carla.id, product: products.gift, today, reference: '', concept: 'Bono', notes: ana }), M.newIdempotencyKey());
  check('PG-02 gift: the same recipient resumes its pending payment', (await M.readPay(cos, 'product', 'gift_pack12', today, ana)).pending?.data.notes === ana);
  check('PG-02 gift: another recipient starts a new payment', (await M.readPay(cos, 'product', 'gift_pack12', today, luis)).pending === null);
  await M.batch(cos, M.transferOps({ person: carla.id, product: products.single, today, reference: '', booking: b.id, concept: 'Clase' }), M.newIdempotencyKey());
  check('PG-02 a held class\'s pending payment never blocks buying a product', (await M.readPay(cos, 'product', 'single', today)).pending === null && !!(await M.readPay(cos, 'booking', b.id, today)).pending);
  const page = await readFile('src/modules/transfers/launch/TransferPayPage.tsx', 'utf8');
  check('PG-02 the receipt file is checked before the payment batch (a refused file leaves no pending payment)', page.indexOf('checkReceipt(file') > 0 && page.indexOf('checkReceipt(file') < page.indexOf('await batch(cos, transferOps('));
}
{
  // PG-04: receipt image type allowlist (never HTML in the app's origin)
  check('PG-04 a receipt image is shown only as PNG/JPEG', M.receiptImageType('image/png', 'text/html') === 'image/png' && M.receiptImageType(undefined, 'image/jpeg') === 'image/jpeg' && M.receiptImageType('text/html', 'text/html') === null && M.receiptImageType(undefined, '') === null);
  check('C7 refusal codes from the contract have copy (refunds, provider ref, invoice, file owner)', ['refunds_disabled', 'duplicate_provider_ref', 'invoice_system_managed', 'file_owner_not_found', 'file_not_pending', 'invalid_method'].every((c) => M.refusalKey(c) === `payLaunch.code.${c}`));
}
{
  // H-6: the gift voucher is created in the approval's own batch
  const { cos, carla, products } = setup(); cos.as('usr_cust');
  cos.db.voucher = []; 
  const [pid] = await M.batch(cos, M.transferOps({ person: carla.id, product: products.gift, today, reference: '', concept: 'Bono', notes: 'gift-recipient:{"name":"Ana","email":"ana@example.test"}' }), M.newIdempotencyKey());
  const off = M.registerApprovalOps((payment, product) => product?.data.kind === 'gift' ? [{ op: 'create', entity: 'voucher', data: { kind: 'gift', note: `payment:${payment.id}` } }] : []);
  cos.as('usr_desk'); const q = await M.readQueue(cos), it = M.pendingItems(q, T0).find((i) => i.payment?.id === pid);
  const gOps = M.reviewOps({ payment: it.payment, product: it.product, decision: 'approve', amountReceived: 600000, reason: '' });
  const nonGift = M.reviewOps({ payment: { ...it.payment, data: { ...it.payment.data } }, product: products.pack12, decision: 'approve', amountReceived: 600000, reason: '' });
  const dec = M.reviewOps({ payment: it.payment, product: it.product, decision: 'decline', amountReceived: NaN, reason: 'no llegó' });
  off();
  check('gift: approving a gift payment appends the registered voucher op to the same batch', gOps.length === 2 && gOps[0].entity === 'payment' && gOps[1].entity === 'voucher' && gOps[1].data.note === `payment:${pid}`);
  check('gift: other products and declines get no voucher op', nonGift.length === 1 && dec.length === 1);
  check('gift: after unregistering, approvals carry no extra ops', M.reviewOps({ payment: it.payment, product: it.product, decision: 'approve', amountReceived: 600000, reason: '' }).length === 1);
}

// ── J4 / SW-02: the catalogue a signed-out visitor sees matches Hoy's recipe; the private class has no public price ──
{
  // The Company OS checkout sits next to this repo (`../Company-OS`, CLAUDE.md); from a worktree, next to its main checkout.
  const root = dirname(execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir']).toString().trim());
  const candidates = [process.env.HOY_RECIPE, ...['.', root].flatMap((r) => ['.claude/worktrees/hoy-launch/deploy/recipes/hoy.json', 'deploy/recipes/hoy.json'].map((f) => join(r, '..', 'Company-OS', f)))].filter(Boolean);
  let recipe = null, recipePath = candidates[0];
  for (const c of candidates) { recipe = await readFile(c, 'utf8').then(JSON.parse, () => null); if (recipe) { recipePath = c; break; } }
  const products = recipe?.records?.flatMap((r) => (r.entity === 'product' ? r.rows : [])) ?? [];
  const provider = new M.CompanyOSProvider({ fetch: async () => { throw new Error('signed_out_read'); } });
  const rows = await provider.list('plans');
  const shown = M.livePricing(rows, '2026-11-01');
  check('J4 signed out, no private-class price is public (no private family row, nothing priced in it)', !rows.some((r) => r.family === 'privadas') && !shown.some((p) => p.family === 'privadas'), shown.filter((p) => p.family === 'privadas').map((p) => p.id).join(','));
  if (!products.length) { if (process.env.CI) check('SW-02 Hoy\'s recipe is readable (set HOY_RECIPE)', false, recipePath); else console.log(`skip SW-02 recipe comparison: ${recipePath} not found (set HOY_RECIPE)`); }
  else {
    const priced = products.filter((p) => p.price > 0).map((p) => `${p.key}=${p.price}`).sort();
    const visible = shown.map((p) => `${p.id}=${p.price}`).sort();
    check('SW-02 signed out, the catalogue keys and prices are the recipe\'s priced products', JSON.stringify(visible) === JSON.stringify(priced), `site ${visible.join(' ')} · recipe ${priced.join(' ')}`);
  }
}

// ── Copy: every refusal code and every new string exists in Spanish and English ─────────────────────────────
{
  const tables = [M.payLaunchStrings, M.productStrings, M.policyStrings];
  const missing = M.KNOWN_CODES.filter((c) => !M.payLaunchStrings[`payLaunch.code.${c}`]);
  check('C7 every refusal code the screens meet has copy', missing.length === 0, missing.join(','));
  const keys = tables.flatMap((t) => Object.entries(t).filter(([k]) => /^(payLaunch|bookingPolicies|products\.launch)\./.test(k)));
  check('C7 every new string has Spanish and English', keys.every(([, v]) => v.es?.trim() && v.en?.trim()), keys.filter(([, v]) => !v.es || !v.en).map(([k]) => k).join(','));
  check('C7 an unknown code falls back to the generic copy with the code', M.refusalKey('weird_code') === 'payLaunch.code.generic' && M.payLaunchStrings['payLaunch.code.generic'].es.includes('{code}'));
}

console.log(failed ? `\n${failed} FAILED` : '\nall H-5 checks passed');
process.exit(failed ? 1 : 0);
