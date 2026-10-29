// H-4 launch rows, logic level (no browser): the production booking writes (RS-02, RS-03, RS-09, J3), the server's refusals and
// their copy (RS-04…RS-07, rule C7), the held-spot display (PG-03, J1, J1c), payment status (RS-08), the move window (RS-09,
// J3b), duplicate taps (Idempotency-Key) and the RS-13 support content. Fictional fixtures only.
// Run: node scripts/test-booking-launch.mjs   (esbuild bundles the TS source with VITE_HOY_BUILD=production)
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';

let failed = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail && !ok ? ` — ${detail}` : ''}`); if (!ok) failed++; };
const rejects = async (p) => { try { await p; return null; } catch (e) { return e; } };

const load = async (build_) => {
  const bundle = await build({
    stdin: { contents: [
      "export * from './src/modules/customer/booking/bookingPolicy';",
      "export * from './src/modules/customer/booking/serverBooking';",
      "export { bookOnServer, moveOnServer, cancelOnServer } from './src/modules/customer/booking/serverCommands';",
      "export * from './src/modules/customer/booking/refusals';",
      "export { bookingStrings } from './src/modules/customer/booking/strings';",
      "export { strings as customerStrings } from './src/modules/customer/strings';",
      "export { faqEntries, contentArticles } from './src/data/seed/content';",
    ].join('\n'), resolveDir: process.cwd(), loader: 'ts' },
    bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent', jsx: 'automatic',
    define: { 'import.meta.env': JSON.stringify({ VITE_HOY_BUILD: build_, DEV: false }) },
  });
  return import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
};
const M = await load('production');
const R = await load('review');

/**
 * A fake Company OS behind the DataProvider seam: `atomic` records the idempotency key and replays a stored answer for a
 * repeated key; every read throws, so a browser re-check of a rule would fail the test. `decide` plays the server.
 */
function fakeServer(decide) {
  const calls = [], answers = new Map();
  const reads = () => { throw new Error('browser_read_attempted'); };
  const provider = {
    name: 'companyos-fake', calls,
    list: reads, get: reads, peek: reads, subscribe: () => () => {}, remove: reads,
    insert: async (table, row) => { calls.push({ op: 'insert', table, row }); return decide({ op: 'insert', table, row }); },
    update: async (table, id, patch) => { calls.push({ op: 'update', table, id, patch }); return decide({ op: 'update', table, id, patch }); },
    async atomic(action, options = {}) {
      calls.push({ op: 'atomic', key: options.idempotencyKey });
      if (options.idempotencyKey && answers.has(options.idempotencyKey)) { const a = answers.get(options.idempotencyKey); if (a.error) throw a.error; return a.value; }
      try { const value = await action(provider); answers.set(options.idempotencyKey, { value }); return value; }
      catch (error) { if (error?.code) answers.set(options.idempotencyKey, { error }); throw error; }
    },
  };
  return provider;
}
const refuse = (code) => Object.assign(new Error(code), { code, status: 422 });
const writes = (p) => p.calls.filter((c) => c.op !== 'atomic');
const NOW = Date.parse('2026-11-02T15:00:00Z'); // Mon 2 Nov, 10:00 Bogotá
const at = (h) => new Date(NOW + h * 3600e3).toISOString();
const policy = M.BOOKING_POLICY_DEFAULTS;
const es = (key) => M.customerStrings[key]?.es, en = (key) => M.customerStrings[key]?.en;

// ── Build switch ────────────────────────────────────────────────────────────────────────────────────────────────────
check('H-4 production build: the server decides booking rules (SERVER_RULES on)', M.SERVER_RULES === true);
check('H-4 review build: the browser rules stay (SERVER_RULES off, MockProvider unchanged)', R.SERVER_RULES === false);

// ── RS-02 — book with an active package (or a redeemed voucher): one write, one class taken by the server ─────────────
{
  const p = fakeServer(({ row }) => ({ id: 'bkg_1', ...row, status: 'booked' }));
  const b = await M.bookOnServer(p, { userId: 'usr_ana', sessionId: 'ses_1', paidWith: 'package', matNumber: 4 }, 'key-rs02');
  const w = writes(p);
  check('RS-02 booking from the balance is one insert into bookings, inside atomic with an Idempotency-Key', w.length === 1 && w[0].table === 'bookings' && p.calls[0].op === 'atomic' && p.calls[0].key === 'key-rs02');
  check('RS-02 the write names the class, the person, paid_with package and the mat; no browser reads', w[0].row.session_id === 'ses_1' && w[0].row.user_id === 'usr_ana' && w[0].row.paid_with === 'package' && w[0].row.mat_number === 4 && !('payment_method' in w[0].row));
  check('RS-02 the confirmed booking comes back for the upcoming list (status booked, id from the server)', b.id === 'bkg_1' && b.status === 'booked');
  check('RS-02 no browser balance check: no_credits is the server\'s answer, with ES/EN copy', !!es('customer.refusal.no_credits') && !!en('customer.refusal.no_credits'));
}

// ── RS-03 — book and buy in one flow, keeping the chosen class ───────────────────────────────────────────────────────
{
  const p = fakeServer(({ row }) => ({ id: 'bkg_2', ...row, status: 'held', hold_until: at(0.25) }));
  const b = await M.bookOnServer(p, { userId: 'usr_ana', sessionId: 'ses_2', paidWith: 'single' }, 'key-rs03');
  check('RS-03 a single class is booked with payment_method (default transfer), so the server holds it instead of booking it unpaid', writes(p)[0].row.payment_method === 'transfer' && writes(p)[0].row.paid_with === 'single' && b.status === 'held');
  const d = fakeServer(({ row }) => ({ id: 'bkg_3', ...row, status: 'held' }));
  await M.bookOnServer(d, { userId: 'usr_ana', sessionId: 'ses_2', paidWith: 'single', paymentMethod: 'desk' }, 'key-rs03d');
  check('RS-03 pay at reception sends payment_method desk (J2 one-hour hold)', writes(d)[0].row.payment_method === 'desk');
  const link = M.purchaseReturnLink('pack12', 'ses_2', 7), next = decodeURIComponent(new URL(link, 'http://x').searchParams.get('next'));
  check('RS-03 buying a package first keeps the chosen class and mat in the return link', link.startsWith('/app/plans?plan=pack12&') && next === '/app/checkout/ses_2?mat=7');
  check('RS-03 the purchase screen only follows a return to this app\'s checkout (no open redirect)', M.safeCheckoutReturn(next) === next && M.safeCheckoutReturn('/app/checkout/ses_2') === '/app/checkout/ses_2' && ['https://evil.test', '//evil.test', '/admin', '/app/checkout/../admin', '/app/checkout/ses?x=1', null].every((v) => M.safeCheckoutReturn(v) === null));
  check('RS-03 a trial bought first keeps the class too (no mat for a non-mat class)', decodeURIComponent(new URL(M.purchaseReturnLink('trial', 'ses_9', null), 'http://x').searchParams.get('next')) === '/app/checkout/ses_9');
}

// ── RS-04 / RS-05 / RS-06 / RS-07 — the server decides; the screen shows its refusal ─────────────────────────────────
for (const [row, code, words] of [
  ['RS-04', 'daily_limit_reached', /una clase por persona al día/], ['RS-05', 'occurrence_not_open', /ya no admite reservas/],
  ['RS-06', 'occurrence_full', /llena/], ['RS-06', 'spot_taken', /mat/],
]) {
  const p = fakeServer(() => { throw refuse(code); });
  const e = await rejects(M.bookOnServer(p, { userId: 'usr_ana', sessionId: 'ses_x', paidWith: 'package' }, `key-${code}`));
  const m = M.refusalMessage(e);
  check(`${row} ${code}: one write reaches the server (no browser re-check) and its refusal maps to clear ES/EN copy`, writes(p).length === 1 && m.key === `customer.refusal.${code}` && words.test(es(m.key)) && !!en(m.key));
}
{
  // RS-07: two people take the last spot at the same time; the server gives it to one.
  let left = 1;
  const server = () => fakeServer(({ row }) => { if (left <= 0) throw refuse('occurrence_full'); left--; return { id: `bkg_${row.user_id}`, ...row }; });
  const [a, b] = await Promise.allSettled([M.bookOnServer(server(), { userId: 'usr_a', sessionId: 'ses_last', paidWith: 'package' }, 'k-a'), M.bookOnServer(server(), { userId: 'usr_b', sessionId: 'ses_last', paidWith: 'package' }, 'k-b')]);
  const loser = [a, b].find((r) => r.status === 'rejected');
  check('RS-07 last spot: exactly one booking succeeds', [a, b].filter((r) => r.status === 'fulfilled').length === 1);
  check('RS-07 the other person is told plainly that someone took the last spot', !!loser && M.refusalMessage(loser.reason).key === 'customer.refusal.occurrence_full' && /último cupo/.test(es('customer.refusal.occurrence_full')) && /last spot/.test(en('customer.refusal.occurrence_full')));
}
check('RS-05 explainer: a started or ended class shows why instead of a book button', M.classPhase({ status: 'scheduled', starts_at: at(-0.5), ends_at: at(0.5), capacity: 16, booked_count: 3 }, NOW) === 'started' && M.classPhase({ status: 'scheduled', starts_at: at(-2), ends_at: at(-1), capacity: 16, booked_count: 3 }, NOW) === 'ended');
check('RS-06 / RS-07 a full class reads full from the server\'s booked_count; one spot left stays open', M.classPhase({ status: 'scheduled', starts_at: at(2), ends_at: at(3), capacity: 8, booked_count: 8 }, NOW) === 'full' && M.classPhase({ status: 'scheduled', starts_at: at(2), ends_at: at(3), capacity: 8, booked_count: 7 }, NOW) === 'open');

// ── Rule C7 — every booking-flow code in the contract has Spanish and English copy ───────────────────────────────────
const CONTRACT = ['occurrence_full', 'occurrence_not_open', 'already_booked', 'daily_limit_reached', 'spot_required', 'spot_invalid', 'spot_taken', 'hold_expired', 'reschedule_window_closed', 'invalid_transition', 'booking_system_managed', 'reason_required', 'no_credits', 'lot_expired', 'lot_frozen', 'trial_used', 'voucher_invalid', 'voucher_expired', 'voucher_redeemed', 'voucher_used_up', 'file_too_large', 'file_type_not_allowed', 'file_upload_expired', 'file_upload_missing', 'storage_unavailable', 'idempotency_conflict', 'idempotency_key_invalid', 'forbidden'];
const missing = CONTRACT.filter((c) => !es(`customer.refusal.${c}`) || !en(`customer.refusal.${c}`));
check('C7 every bookings, credits, files and request refusal code has ES and EN copy', missing.length === 0, missing.join(', '));
const unknown = M.refusalMessage(refuse('some_new_code'));
check('C7 an unknown code shows the generic message with the code for support', unknown.key === 'customer.refusal.generic' && unknown.vars.code === 'some_new_code' && /\{code\}/.test(es('customer.refusal.generic')));
check('Idempotency a bare Error whose message looks like a code (timeout) is not a server answer: the key is kept for the retry', M.refusalCode(new Error('timeout')) === null && M.refusalCode(new Error('network_error')) === null && M.refusalCode(refuse('spot_taken')) === 'spot_taken');
check('Idempotency a lost answer (the connector\'s ambiguous network_error / service_unavailable, or a 5xx) keeps the key and shows the network copy', [
  Object.assign(new Error('network_error'), { code: 'network_error', status: 0, ambiguous: true }),
  Object.assign(new Error('service_unavailable'), { code: 'service_unavailable', status: 503, ambiguous: true }),
  Object.assign(new Error('internal'), { code: 'internal', status: 500, ambiguous: false }),
].every((e) => M.refusalCode(e) === null && M.refusalMessage(e).key === 'customer.refusal.network'));
check('Idempotency a browser-side refusal (status 0, not ambiguous) and a 4xx are final answers', M.refusalCode(Object.assign(new Error('not_in_launch'), { code: 'not_in_launch', status: 0, ambiguous: false })) === 'not_in_launch' && M.refusalCode(Object.assign(new Error('spot_taken'), { code: 'spot_taken', status: 409 })) === 'spot_taken');
check('C7 no answer (offline) is not a refusal: the network copy says it will not book twice', M.refusalCode(new TypeError('Failed to fetch')) === null && M.refusalMessage(new TypeError('Failed to fetch')).key === 'customer.refusal.network');
const keys = Object.keys(M.bookingStrings);
check('i18n every new H-4 string has Spanish and English', keys.every((k) => M.bookingStrings[k].es && M.bookingStrings[k].en), keys.filter((k) => !M.bookingStrings[k].es || !M.bookingStrings[k].en).join(', '));

// ── Duplicate taps — Idempotency-Key ────────────────────────────────────────────────────────────────────────────────
{
  const p = fakeServer(({ row }) => ({ id: `bkg_${writes(p).length}`, ...row }));
  const first = await M.bookOnServer(p, { userId: 'usr_ana', sessionId: 'ses_1', paidWith: 'package' }, 'tap-1');
  const again = await M.bookOnServer(p, { userId: 'usr_ana', sessionId: 'ses_1', paidWith: 'package' }, 'tap-1');
  check('Idempotency a second tap with the same key replays the first answer: one booking, same id', writes(p).length === 1 && first.id === again.id);
  const m = fakeServer(({ id, patch }) => ({ id, ...patch })), c = fakeServer(({ id, patch }) => ({ id, ...patch }));
  await M.moveOnServer(m, { bookingId: 'b', toSessionId: 's2' }, 'mv'); await M.cancelOnServer(c, { bookingId: 'b' }, 'cx');
  check('Idempotency move and cancel go through atomic with their key too', m.calls[0].op === 'atomic' && m.calls[0].key === 'mv' && c.calls[0].op === 'atomic' && c.calls[0].key === 'cx');
  check('Idempotency a write without the atomic adapter is refused, never sent bare', !!(await rejects(Promise.resolve().then(() => M.bookOnServer({ ...p, atomic: undefined }, { userId: 'u', sessionId: 's', paidWith: 'package' }, 'k')))));
}

// ── RS-09 / J3b — move a booking up to reschedule_hours before the class ─────────────────────────────────────────────
{
  const p = fakeServer(({ id, patch }) => ({ id, ...patch }));
  await M.moveOnServer(p, { bookingId: 'bkg_9', toSessionId: 'ses_new', matNumber: 3 }, 'mv-1');
  const w = writes(p)[0];
  check('RS-09 a move is PATCH bookings { session_id } with the new class\'s mat (the old one never carries over)', w.op === 'update' && w.id === 'bkg_9' && w.patch.session_id === 'ses_new' && w.patch.mat_number === 3 && Object.keys(w.patch).length === 2);
  const n = fakeServer(({ id, patch }) => ({ id, ...patch }));
  await M.moveOnServer(n, { bookingId: 'bkg_9', toSessionId: 'ses_plain' }, 'mv-2');
  check('RS-09 moving to a class without mats sends no mat', writes(n)[0].patch.mat_number === null);
  const booked = { id: 'b', status: 'booked' };
  check('RS-09 the move button is open 12 h before the class, including the exact deadline', M.moveOpen(booked, at(12), policy, NOW) && M.moveOpen(booked, at(13), policy, NOW));
  check('RS-09 after the deadline the button is unavailable', !M.moveOpen(booked, at(11.99), policy, NOW));
  check('RS-09 the booking\'s own copy of the window wins over the setting (ADR 0039)', M.moveOpen({ ...booked, policy_reschedule_hours: 24 }, at(13), policy, NOW) === false && M.moveOpen({ ...booked, policy_reschedule_hours: 6 }, at(7), { ...policy, rescheduleHours: 12 }, NOW) === true);
  check('RS-09 a copy of 0 keeps the booking unmovable', M.moveDeadline({ ...booked, policy_reschedule_hours: 0 }, at(48), policy) === null);
  check('RS-09 a late move is the server\'s reschedule_window_closed, with copy', M.refusalMessage(refuse('reschedule_window_closed')).key === 'customer.refusal.reschedule_window_closed' && !!en('customer.refusal.reschedule_window_closed'));
  M.configureBookingPolicy({ rescheduleHours: 6, holdMinutesTransfer: -1, holdMinutesDesk: 'x' });
  check('RS-09 the setting reaches the screens through configureBookingPolicy (H-3 boot); bad values are ignored', M.bookingPolicy().rescheduleHours === 6 && M.bookingPolicy().holdMinutesTransfer === 15 && M.bookingPolicy().holdMinutesDesk === 60);
  M.configureBookingPolicy(M.BOOKING_POLICY_DEFAULTS);
}

// ── J3 — a customer cancel always loses the class, with a very clear warning ─────────────────────────────────────────
{
  const p = fakeServer(({ id }) => ({ id, status: 'late_cancel' }));
  const r = await M.cancelOnServer(p, { bookingId: 'bkg_5' }, 'cx-1');
  check('J3 cancel sends status cancelled only; the server stores late_cancel (the class is kept by the studio)', writes(p)[0].patch.status === 'cancelled' && Object.keys(writes(p)[0].patch).length === 1 && r.status === 'late_cancel');
  check('J3 the warning says the class is lost even when cancelling early, and the button repeats it (ES/EN)', /pierdes esta clase/.test(es('customer.srv.cancel.title')) && /aunque canceles con mucho tiempo/.test(es('customer.srv.cancel.body')) && /lose the class/.test(en('customer.srv.cancel.confirm')) && /perder la clase/.test(es('customer.srv.cancel.confirm')));
  check('J3 a held spot is released, not "lost": nothing was paid', /No se cobró nada/.test(es('customer.srv.cancel.held.done')));
}

// ── PG-03 / J1 / J1c — the held spot ─────────────────────────────────────────────────────────────────────────────────
{
  const held = (extra) => ({ id: 'h', status: 'held', payment_method: 'transfer', policy_hold_minutes: 15, ...extra });
  const running = M.holdView(held({ hold_until: at(0.2) }), at(5), policy, NOW);
  check('PG-03 a held spot counts down to hold_until (15 minutes, transfer)', running.phase === 'running' && running.until === at(0.2) && running.minutes === 15);
  const night = M.holdView(held({ hold_until: '2026-11-03T13:15:00Z' }), '2026-11-03T23:00:00Z', policy, Date.parse('2026-11-03T03:00:00Z'));
  check('PG-03 / J1 booked at 22:00: the clock starts at 8:00 when reception opens and ends 8:15', night.phase === 'not_started' && night.clockStartsAt === '2026-11-03T13:00:00.000Z' && night.until === '2026-11-03T13:15:00.000Z');
  const early = M.holdView(held({ hold_until: '2026-11-03T12:00:00Z' }), '2026-11-03T12:00:00Z', policy, Date.parse('2026-11-03T04:00:00Z'));
  check('J1c a night booking for a 7:00 class is held until the class start', early.phase === 'until_class' && early.until === '2026-11-03T12:00:00.000Z');
  const frozen = M.holdView(held({ hold_until: at(-1), hold_frozen_at: at(-1.5), hold_left_minutes: 9 }), at(-0.5), policy, NOW);
  check('J1c an uploaded receipt keeps the spot, past the class start too ("waiting for reception")', frozen.phase === 'waiting_reception' && /aunque la clase ya haya empezado/.test(es('customer.srv.hold.frozen.body')));
  check('PG-03 a run-out hold shows expired; a released hold reads "released" (RS-08)', M.holdView(held({ hold_until: at(-0.1) }), at(3), policy, NOW).phase === 'expired' && M.serverPaymentStatus({ status: 'cancelled', cancel_reason: 'hold_expired' }) === 'released');
  check('J2 a desk hold reads the desk length (60 min) when the booking has no copy', M.holdView({ id: 'd', status: 'held', payment_method: 'desk', hold_until: at(0.5) }, at(5), policy, NOW).minutes === 60);
  check('PG-03 a held spot can still be moved (a live hold moves, bookings 1.4.0)', M.moveOpen(held({ hold_until: at(0.2) }), at(20), policy, NOW) && !M.moveOpen(held({ hold_until: at(-0.2) }), at(20), policy, NOW));
  check('PG-03 the outside-hours notice names the start time (ES/EN)', /\{start\}/.test(es('customer.srv.hold.not_started.transfer')) && /\{start\}/.test(en('customer.srv.hold.not_started.transfer')) && /8:00/.test(es('customer.srv.hold.explain.transfer')));
  // The receipt of a held class goes through the transfer payment (H-5), which prices it by product key and resumes a
  // payment whose image didn't upload; the booking page no longer builds its own payment (a review-build plan id was refused).
  const parts = readFileSync('src/modules/customer/pages/ServerBookingParts.tsx', 'utf8');
  check('J1c the held spot sends the receipt through /app/pay/booking/:id (no payment built on the booking page)', /\/app\/pay\/booking\/\$\{encodeURIComponent\(booking\.id\)\}/.test(parts) && !/plan_single|sendHoldReceipt|insert<[^>]*>\('payments'/.test(parts));
}

// ── RS-08 — booking details: payment status from the booking itself ──────────────────────────────────────────────────
check('RS-08 held = pending, booked = confirmed, released hold = released', M.serverPaymentStatus({ status: 'held' }) === 'pending' && M.serverPaymentStatus({ status: 'booked' }) === 'confirmed' && M.serverPaymentStatus({ status: 'cancelled', cancel_reason: 'hold_expired' }) === 'released');
check('RS-08 a customer cancel is not shown as a released payment', M.serverPaymentStatus({ status: 'cancelled', cancel_reason: null }) === 'unknown');
check('RS-08 the history label exists for a held booking (ES/EN)', !!es('customer.history.status.held') && !!en('customer.history.status.held'));
check('RS-08 a live held booking still occupies its place ("booked by me"); a frozen one too', M.holdsPlace({ status: 'held', hold_until: at(0.2) }, NOW) && M.holdsPlace({ status: 'held', hold_until: at(-1), hold_frozen_at: at(-2) }, NOW) && !M.holdsPlace({ status: 'cancelled' }, NOW));
check('PG-03 a hold that ran out but is not released yet no longer blocks booking again', !M.holdsPlace({ status: 'held', hold_until: at(-0.01) }, NOW));

// ── RS-13 — club rules and FAQ match the agreed rules (J3, J3b) ──────────────────────────────────────────────────────
{
  const cancelFaq = M.faqEntries.find((f) => /cancelar mi reserva/.test(f.question?.es ?? f.q?.es ?? ''));
  check('RS-13 the FAQ no longer promises a free cancel window: cancelling loses the class (J3)', !!cancelFaq && /se pierde/.test(cancelFaq.answer.es) && /loses the class/.test(cancelFaq.answer.en) && !/Puedes cancelar hasta/.test(cancelFaq.answer.es));
  check('RS-13 the FAQ points to moving the booking up to 12 hours before (J3b)', /12 horas/.test(cancelFaq.answer.es) && /12 hours/.test(cancelFaq.answer.en));
  check('RS-13 the club rules no longer mention a waitlist (not at launch) and say a cancel loses the class', M.contentArticles.every((a) => !/lista de espera/.test(a.body_md?.es ?? '')) && M.contentArticles.some((a) => /Si cancelas, la clase se pierde/.test(a.body_md?.es ?? '')));
}

console.log(failed ? `\n${failed} H-4 booking check(s) failed` : '\nH-4 booking checks passed');
process.exitCode = failed ? 1 : 0;
