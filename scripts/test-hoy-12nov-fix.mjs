// Hoy 12 Nov, lane FIX (owner, 2026-11-11): F1 REC-05 desk offers/books a started class inside the 15-minute grace;
// F2 PAG-04 the reason typed when a transfer payment is rejected reaches the customer (status_reason, views, email).
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = await mkdtemp(join(tmpdir(), 'hoy-12nov-fix-'));
try {
  const file = join(dir, 'fix.mjs');
  await build({
    stdin: {
      contents: `export { reviewOps } from './src/modules/transfers/launch/payments';
export { notStarted } from './src/modules/staff/desk/deskSale';
export { BOOKING_POLICY_DEFAULTS, configureBookingPolicy, bookingPolicy } from './src/modules/customer/booking/bookingPolicy';
export { adapterFor, fromRecord } from './src/data/companyos/mapping';
export { declinedReasonFor } from './src/modules/customer/declinedReason';
export { strings as customerStrings } from './src/modules/customer/strings';`,
      resolveDir: process.cwd(),
    },
    bundle: true, platform: 'node', format: 'esm', outfile: file, logLevel: 'silent', define: { 'import.meta.env.BASE_URL': '"/"' },
  });
  const m = await import(pathToFileURL(file));
  const checks = [];
  const check = (name, fn) => { fn(); checks.push(name); };

  // ── F1
  const now = Date.parse('2026-11-12T18:08:00Z');
  const at = (minutesAgo) => ({ session: { starts_at: new Date(now - minutesAgo * 60000).toISOString() } });
  check('F1 the policy carries the grace (15) and the desk offers a class that started 8 minutes ago, not 20, not a future one', () => {
    assert.equal(m.BOOKING_POLICY_DEFAULTS.lateGraceMinutes, 15);
    const list = [at(8), at(20), at(-30), { session: { starts_at: 'junk' } }];
    assert.deepEqual(m.notStarted(list, now, 15), [list[0], list[2]]);
    assert.deepEqual(m.notStarted(list, now, 0), [list[2]], 'grace 0 keeps the old reading');
    assert.deepEqual(m.notStarted(list, now), [list[2]], 'no grace given: unchanged');
  });
  check('F1 the grace is configured from the setting (whole numbers only)', () => {
    m.configureBookingPolicy({ lateGraceMinutes: 10 });
    assert.equal(m.bookingPolicy().lateGraceMinutes, 10);
    m.configureBookingPolicy({ lateGraceMinutes: -1 });
    assert.equal(m.bookingPolicy().lateGraceMinutes, 10);
  });

  // ── F2
  const payment = { id: 'p1', data: { status: 'pending', notes: 'gift-recipient:{"x":1}' } };
  check('F2 the desk reject writes the reason to status_reason and leaves notes alone', () => {
    const ops = m.reviewOps({ payment, product: null, decision: 'decline', amountReceived: 0, reason: '  No llegó la transferencia  ' });
    assert.equal(ops.length, 1);
    assert.deepEqual(ops[0].data, { status: 'declined', status_reason: 'No llegó la transferencia' });
    assert.throws(() => m.reviewOps({ payment, product: null, decision: 'decline', amountReceived: 0, reason: 'x' }), /reason_required/);
    assert.equal(m.reviewOps({ payment, product: null, decision: 'decline', amountReceived: 0, reason: 'a'.repeat(900) })[0].data.status_reason.length, 500);
  });
  check('F2 the payment mapping reads status_reason', () => {
    const row = m.fromRecord(m.adapterFor('payments'), { id: 'p1', data: { status: 'declined', status_reason: 'Monto incorrecto', person: 'u1', amount: 10 } });
    assert.equal(row.status_reason, 'Monto incorrecto');
    const receipt = m.fromRecord(m.adapterFor('transfer_receipts'), { id: 'p1', data: { status: 'declined', status_reason: 'Monto incorrecto', method: 'transfer', person: 'u1', amount: 10 } });
    assert.equal(receipt.review_reason, 'Monto incorrecto');
  });
  check('F2 the booking view finds the reason of its latest declined payment', () => {
    const rows = [
      { id: 'a', status: 'declined', for_entity: 'booking', for_id: 'b1', status_reason: 'Viejo', created_at: '2026-11-10T10:00:00Z' },
      { id: 'b', status: 'declined', for_entity: 'booking', for_id: 'b1', status_reason: ' Nuevo ', created_at: '2026-11-11T10:00:00Z' },
      { id: 'c', status: 'approved', for_entity: 'booking', for_id: 'b1', status_reason: null, created_at: '2026-11-12T10:00:00Z' },
      { id: 'd', status: 'declined', for_entity: 'booking', for_id: 'b2', status_reason: 'Otra', created_at: '2026-11-12T10:00:00Z' },
    ];
    assert.equal(m.declinedReasonFor(rows, 'b1'), 'Nuevo');
    assert.equal(m.declinedReasonFor(rows, 'b3'), null);
    assert.equal(m.declinedReasonFor([{ ...rows[0], status_reason: '  ' }], 'b1'), null);
  });
  check('F2 the copy exists in es and en', () => {
    const s = m.customerStrings['customer.pay.declinedReason'];
    assert.ok(s && s.es.includes('{reason}') && s.en.includes('{reason}'));
  });
  const src = await readFile('src/notifications/launchEmails.ts', 'utf8');
  const gen = JSON.parse(await readFile('deploy/comms/hoy-templates.json', 'utf8'));
  assert.match(src.slice(src.indexOf("key: 'payment_rejected'"), src.indexOf("key: 'booking_released'")), /\{\{event\.reason\}\}/);
  assert.ok(gen.templates.some((x) => x.key === 'payment_rejected' && x.body?.includes('{{event.reason}}')) || JSON.stringify(gen).includes('Motivo: {{event.reason}}'), 'generated templates carry {{event.reason}}');
  checks.push('F2 email source and generated templates');
  console.log('PASS ' + checks.join('; '));
} finally { await rm(dir, { recursive: true, force: true }); }
