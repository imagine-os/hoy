// Hoy 12 Nov, lane FIX (owner, 2026-11-11): F1b no late grace and no check-in after the class has ended (F1, a grace, was reversed);
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
export { notStarted, checkInOpen } from './src/modules/staff/desk/deskSale';
export { deskStrings, DESK_CODES } from './src/modules/staff/desk/strings';
export { CONTRACT_REFUSALS } from './src/data/companyos/refusals';
export { BOOKING_POLICY_DEFAULTS } from './src/modules/customer/booking/bookingPolicy';
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

  // ── F1b (owner, 2026-11-11, supersedes F1): no late grace; no check-in after the class has ended (the UI only hints)
  const now = Date.parse('2026-11-12T18:08:00Z');
  const at = (minutesAgo) => ({ session: { starts_at: new Date(now - minutesAgo * 60000).toISOString() } });
  check('F1b no grace in the policy and the desk offers only classes that have not started', () => {
    assert.equal('lateGraceMinutes' in m.BOOKING_POLICY_DEFAULTS, false);
    const list = [at(8), at(20), at(-30), { session: { starts_at: 'junk' } }];
    assert.deepEqual(m.notStarted(list, now), [list[2]]);
  });
  check('F1b check-in is offered before the start and during the class, not after its end', () => {
    const cls = (start, end) => ({ starts_at: new Date(now + start * 60000).toISOString(), ends_at: new Date(now + end * 60000).toISOString() });
    assert.equal(m.checkInOpen(cls(30, 80), now), true);
    assert.equal(m.checkInOpen(cls(-10, 40), now), true);
    assert.equal(m.checkInOpen(cls(-60, -1), now), false);
    assert.equal(m.checkInOpen(cls(-60, 0), now), true, 'at the end minute it is still open (the server refuses strictly after the end)');
    assert.equal(m.checkInOpen({ starts_at: 'junk', ends_at: 'junk' }, now), true, 'an unreadable end is not a reason to hide the button');
  });
  check('F1b check_in_closed has desk and contract copy in es and en', () => {
    assert.ok(m.DESK_CODES.includes('check_in_closed'));
    const d = m.deskStrings['desk.error.check_in_closed'], c = m.CONTRACT_REFUSALS.check_in_closed;
    for (const x of [d, c]) assert.ok(x && x.es.length > 10 && x.en.length > 10);
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
    assert.equal(m.declinedReasonFor(rows, 'b1'), null, 'a newer approved payment hides the older rejection');
    assert.equal(m.declinedReasonFor(rows.filter((r) => r.id !== 'c'), 'b1'), 'Nuevo');
    assert.equal(m.declinedReasonFor([...rows.filter((r) => r.id !== 'c'), { id: 'e', status: 'pending', for_entity: 'booking', for_id: 'b1', created_at: '2026-11-12T11:00:00Z' }], 'b1'), null, 'a new pending receipt hides it too');
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
  const read = (f) => readFile(f, 'utf8');
  const [teacher, settingsPage, checkin, booked] = await Promise.all(['src/modules/teacher/ClassPage.tsx', 'src/modules/admin/SettingsPage.tsx', 'src/modules/staff/CheckinPage.tsx', 'src/modules/customer/pages/BookedPage.tsx'].map(read));
  assert.match(teacher, /SERVER_RULES \? 0 : settings\.policies\.lateGraceMin/, 'teacher class page promises no grace in production');
  assert.match(settingsPage, /!SERVER_RULES && <Field label=\{t\('admin\.settings\.f\.lateGrace'\)\}/, 'the late-grace field is hidden in production');
  assert.match(checkin, /useNow\(/, 'check-in re-evaluates the ended class on a timer');
  assert.match(checkin, /if \(!checkInOffered\) setError\(t\('staff\.checkin\.ended'\)\)/, 'Enter on an ended class says why');
  assert.equal(booked.includes('as never'), false, 'no cast in BookedPage');
  checks.push('F2/F1b review: teacher grace, settings field, timer, Enter feedback, no cast');
  console.log('PASS ' + checks.join('; '));
} finally { await rm(dir, { recursive: true, force: true }); }
