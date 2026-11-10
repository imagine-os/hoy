// Hoy 12 Nov, lane H-BOOK (decisions D1, D9, D10): no mat picker, several bookings a day, person_overlap copy, terms without the per-day clause.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm, readFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { admissionFixture, admissionIds as ids, admissionNow as now } from './session-admission-fixture.mjs';

const read = (p) => readFile(p, 'utf8');
const exists = (p) => access(p).then(() => true, () => false);
const dir = await mkdtemp(join(tmpdir(), 'hoy-12nov-book-'));
const RealDate = Date, values = new Map();
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [now])); } static now() { return new RealDate(now).getTime(); } };
globalThis.localStorage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
const checks = [];
try {
  const fixture = await admissionFixture();
  const file = join(dir, 'book.mjs');
  await build({
    stdin: {
      contents: `export { MockProvider } from './src/data/MockProvider';
export { bookWithPackage } from './src/data/deskBooking';
export { rescheduleBooking } from './src/modules/customer/rescheduleCommand';
export { bookOnServer, moveOnServer } from './src/modules/customer/booking/serverCommands';
export { CONTRACT_REFUSALS, refusalCopy } from './src/data/companyos/refusals';
export { deskStrings, DESK_CODES } from './src/modules/staff/desk/strings';
export { BOOKING_REFUSALS } from './src/modules/customer/booking/refusals';
export { bookingStrings } from './src/modules/customer/booking/strings';
export { legalDocuments } from './src/data/seed/legal';
export { adapterFor, fromRecord } from './src/data/companyos/mapping';
export { makePendingDeskIntent } from './src/data/pendingDeskIntent';
export { settleAtDesk, readDeskBookingConfirmation } from './src/modules/transfers/deskSettlement';
export { resolveOperationalQuote, freezeSaleQuote } from './src/data/operationalQuotes';`,
      resolveDir: process.cwd(),
    },
    bundle: true, platform: 'node', format: 'esm', outfile: file, logLevel: 'silent',
    define: { 'import.meta.env.BASE_URL': '"/"' },
  });
  const m = await import(pathToFileURL(file));

  // ---- 1. Production writes carry no mat (D1) --------------------------------------------------------------------
  {
    const writes = [];
    const tx = { insert: async (t, row) => { writes.push({ t, row }); return row; }, update: async (t, id, patch) => { writes.push({ t, id, patch }); return patch; } };
    const data = { atomic: (write) => write(tx) };
    await m.bookOnServer(data, { userId: 'u1', sessionId: 's1', paidWith: 'package', matNumber: 5 }, 'k1');
    await m.bookOnServer(data, { userId: 'u1', sessionId: 's1', paidWith: 'single', paymentMethod: 'desk' }, 'k2');
    await m.moveOnServer(data, { bookingId: 'b1', toSessionId: 's2', matNumber: 3 }, 'k3');
    for (const w of writes) {
      const body = w.row ?? w.patch;
      assert(!('mat_number' in body), `a ${w.t} write must not carry mat_number: ${JSON.stringify(body)}`);
      assert(!('spot' in body), 'and no spot');
    }
    assert.deepEqual(writes[2].patch, { session_id: 's2' });
    checks.push('booking and moving send no mat_number or spot');
  }

  // ---- 2. Old bookings with a mat still read without errors -------------------------------------------------------
  {
    const row = m.fromRecord(m.adapterFor('bookings'), { id: 'b9', data: { status: 'booked', spot: 7, occurrence: 'o1', person: 'p1' } });
    assert(row && row.session_id === 'o1' && row.status === 'booked', 'a booking that already has a spot reads');
    checks.push('a booking that already has a mat number still reads');
  }
  for (const f of ['src/modules/customer/pages/BookedPage.tsx', 'src/modules/customer/pages/CheckoutPage.tsx']) {
    assert(!/site\.mat\.confirmed/.test(await read(f)), `${f} must not show the mat number`);
  }
  checks.push('the booked and checkout pages show no mat number');

  // ---- 3. Mock review provider: no mat assigned, two classes the same day allowed (D9) ----------------------------
  const provider = (f) => { values.set('hoyos.db.v1', JSON.stringify(f)); return new m.MockProvider(); };
  const sameDay = () => {
    const f = structuredClone(fixture);
    const s = f.db.class_sessions.find((x) => x.id === ids.session);
    f.db.modalities.find((x) => x.id === ids.modality).slug = 'qa_yoga';
    f.db.class_templates.forEach((t) => { t.generation_mode = 'manual'; });
    const prior = { ...s, id: 'h12_prior', starts_at: '2026-10-23T21:00:00Z', ends_at: '2026-10-23T22:00:00Z', booked_count: 1 };
    f.db.class_sessions.push(prior);
    f.db.bookings.push({ id: 'h12_old', tenant_id: 'ten_hoy', created_at: now, updated_at: now, user_id: ids.user, session_id: prior.id, status: 'booked', paid_with: 'comp', ledger_id: null });
    return f;
  };
  {
    const data = provider(sameDay());
    const booking = await data.atomic((tx) => m.bookWithPackage(tx, { userId: ids.user, sessionId: ids.session, status: 'booked', now }));
    assert.equal(booking.status, 'booked', 'a second class the same day is booked');
    assert.equal(booking.mat_number ?? null, null, 'a mat-style class is booked without a mat');
    assert.equal(data.peek('bookings').filter((b) => b.user_id === ids.user && b.status === 'booked').length, 2);
    checks.push('two classes the same day book; no mat is assigned');
  }
  {
    const f = sameDay();
    const original = { ...f.db.class_sessions.find((x) => x.id === ids.session), id: 'h12_move_from', starts_at: '2026-10-23T16:00:00Z', ends_at: '2026-10-23T17:00:00Z' };
    f.db.class_sessions.push(original);
    f.db.bookings.push({ id: 'h12_move', tenant_id: 'ten_hoy', created_at: now, updated_at: now, user_id: ids.user, session_id: original.id, status: 'booked', paid_with: 'comp', ledger_id: null });
    const data = provider(f);
    await data.atomic((tx) => m.rescheduleBooking(tx, { userId: ids.user, bookingId: 'h12_move', fromSessionId: original.id, toSessionId: ids.session, now: RealDate.parse(now) }));
    assert.equal(data.peek('bookings').find((b) => b.id === 'h12_move').session_id, ids.session, 'moving into a day that already has a class works');
    checks.push('moving onto a day that already has a class works');
  }
  assert.equal(await exists('src/data/dailyAdmission.ts'), false, 'the one-class-a-day module is gone');
  for (const [f, re] of [
    ['src/tenant/tenant.ts', /perPersonPerDay/], ['src/modules/admin/settings.ts', /perPersonPerDay/], ['src/modules/admin/SettingsPage.tsx', /perPersonPerDay/],
    ['src/modules/staff/CheckinPage.tsx', /perPersonPerDay/], ['src/tenant/pricing.ts', /perPersonPerDay/], ['src/modules/customer/legalContent.ts', /perPersonPerDay/],
    ['src/modules/customer/pages/ClassDetailPage.tsx', /customer\.book\.oneADay/], ['src/modules/customer/hooks.ts', /dailyAdmission|dailyConflict/],
  ]) assert(!re.test(await read(f)), `${f} still has the per-day rule (${re})`);
  checks.push('no per-day check, setting or copy is left in the frontend');

  // ---- 4. Desk sale: no mat needed, none stored ------------------------------------------------------------------
  {
    const f = structuredClone(fixture);
    f.db.modalities.find((x) => x.id === ids.modality).slug = 'qa_yoga';
    f.db.class_ledger = f.db.class_ledger.filter((g) => ![ids.user, ids.waiter].includes(g.user_id));
    const data = provider(f);
    const quote = m.freezeSaleQuote(m.resolveOperationalQuote(data.peek('plans'), 'pack12'));
    const scope = { tenantId: 'ten_hoy', customerId: ids.user, sessionId: ids.session, planId: quote.planId };
    const intent = m.makePendingDeskIntent(scope, quote);
    assert(!('matNumber' in intent), 'the desk intent carries no mat');
    const payment = await data.insert('payments', { id: 'h12_pay', user_id: ids.user, plan_id: quote.planId, amount: quote.chargedAmount, amount_paid: null, currency: 'COP', method: 'cash', provider: 'manual', provider_ref: null, status: 'pending', paid_at: null, taken_by: null, note: null, frontend_quote: quote, frontend_desk_intent: intent });
    await m.settleAtDesk(data, { paymentId: payment.id, actorId: 'usr_desk', role: 'front_desk', method: 'cash', amount: payment.amount, note: 'FICTIONAL received exact amount' });
    const booking = data.peek('bookings').find((b) => b.user_id === ids.user && b.session_id === ids.session);
    assert(booking, 'the desk sale booked the class');
    assert.equal(booking.mat_number ?? null, null, 'and stored no mat');
    checks.push('a desk sale of a mat-style class settles with no mat');
  }

  // ---- 5. person_overlap reads in words on app, desk and move ----------------------------------------------------
  for (const lang of ['es', 'en']) {
    const copy = m.CONTRACT_REFUSALS.person_overlap;
    assert(copy?.[lang] && copy[lang].length > 20, `refusals.ts person_overlap ${lang}`);
    assert.notEqual(m.refusalCopy('person_overlap', lang), m.refusalCopy('no_such_code_h12', lang), 'not the generic line');
    const desk = m.deskStrings['desk.error.person_overlap'];
    assert(desk?.[lang] && desk[lang].length > 15, `desk person_overlap ${lang}`);
    const app = m.bookingStrings['customer.refusal.person_overlap'];
    assert(app?.[lang] && app[lang].length > 15, `app person_overlap ${lang}`);
  }
  assert(m.DESK_CODES.includes('person_overlap'), 'desk lists person_overlap');
  assert(m.BOOKING_REFUSALS.includes('person_overlap'), 'the app (booking and move) lists person_overlap');
  checks.push('person_overlap has es and en copy on the app, the desk and moving');

  // ---- 6. Copy: no mat picker prompt, no per-day line, terms clause gone, version unchanged -----------------------
  for (const f of ['src/tenant/pricing.ts', 'src/modules/website/strings.ts', 'src/modules/customer/strings.ts', 'src/modules/customer/booking/strings.ts', 'src/modules/customer/actions.ts']) {
    const text = await read(f);
    assert(!/elige tu mat|choose your mat|pick your mat|app\.pickMat|customer\.srv\.move\.mat\b/i.test(text), `${f} still asks the person to choose a mat`);
  }
  for (const f of ['src/modules/customer/pages/SchedulePage.tsx', 'src/modules/website/pages/SchedulePage.tsx', 'src/modules/customer/pages/ServerCheckoutPage.tsx', 'src/modules/customer/pages/CheckoutPage.tsx', 'src/modules/customer/pages/ServerBookingParts.tsx']) {
    if (await exists(f)) assert(!/MatPicker/.test(await read(f)), `${f} still uses MatPicker`);
  }
  assert(!/spots_enabled:\s*true/.test(await read('src/modules/classSchedule/live/scheduleOps.ts')), 'new schedule rows no longer switch spots on');
  assert(!/perPersonPerDay|per person per day|por persona al día|una clase por persona al día|one class per person per day/i.test(await read('src/modules/website/strings.ts')), 'website copy has no one-a-day line');
  for (const doc of m.legalDocuments.filter((d) => d.kind === 'terms')) {
    const body = `${doc.body_md?.es ?? ''}\n${doc.body_md?.en ?? ''}`;
    assert(!/perPersonPerDay|clase por persona al día|class per person per day/.test(body), `terms ${doc.id} still has the per-day clause`);
  }
  assert.deepEqual(m.legalDocuments.filter((d) => d.kind === 'terms').map((d) => d.version), ['1.0', '2.0'], 'terms versions are unchanged');
  for (const f of ['docs/ops-manual/es/03-modelo-de-valor.md', 'docs/ops-manual/es/01-quienes-somos-y-filosofia.md', 'docs/ops-manual/es/04-recepcion-y-check-in.md']) {
    assert(!/una clase al día/.test(await read(f)), `${f} still says one class a day`);
  }
  checks.push('no mat picker copy, no one-a-day copy, terms clause gone with versions unchanged');
  console.log(`PASS hoy-12nov-book (${checks.length}): ${checks.join('; ')}`);
} finally {
  globalThis.Date = RealDate;
  await rm(dir, { recursive: true, force: true });
}
