import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import { admissionFixture, admissionIds as ids, admissionNow as now } from './session-admission-fixture.mjs';
const base = process.env.QA_BASE ?? 'http://127.0.0.1:5581', out = process.env.QA_OUTPUT ?? '/tmp/hoy-desk-confirmation-context';
const fixture = await admissionFixture(), checks = [], errors = [];
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', args: ['--no-sandbox'] });
let debug;
async function open(lang, width, kind) {
  const seed = structuredClone(fixture);
  for (const table of ['class_ledger', 'bookings', 'payments']) seed.db[table] = seed.db[table].filter(row => row.user_id !== ids.user);
  seed.db.modalities.find(row => row.id === ids.modality).slug = 'qa_non_mat';
  if (kind === 'role') {
    const template = seed.db.user_roles.find(row => row.user_id === ids.user);
    seed.db.user_roles = seed.db.user_roles.filter(row => row.user_id !== ids.user);
    seed.db.user_roles.push({ ...template, id: 'qa_confirmation_super_role', role: 'super_admin' });
  }
  const context = await browser.newContext({ viewport: { width, height: 1000 }, timezoneId: 'Asia/Tokyo' });
  await context.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, route => route.abort());
  // Track completion around the real reader, without changing its result, errors or arguments.
  await context.route('**/src/modules/transfers/deskSettlement.ts*', async route => {
    const response = await route.fetch(), original = await response.text();
    const signature = 'export async function readDeskBookingConfirmation(';
    assert(original.includes(signature));
    const body = original.replace(signature, 'async function originalDeskBookingConfirmation(') + '\nwindow.__qaDeskProofInstrumented=true; export async function readDeskBookingConfirmation(...args) { const s=window.qaDeskConfirmation; if(s)s.proofsStarted++; try { return await originalDeskBookingConfirmation(...args); } finally { if(s)s.proofsSettled++; } }\n';
    await route.fulfill({ response, body });
  });
  await context.addInitScript(({ seed, lang, now, user, roleFixture }) => {
    const D = Date; window.Date = class extends D { constructor(...a) { super(...(a.length ? a : [now])); } static now() { return new D(now).getTime(); } };
    if (!localStorage.getItem('hoyos.db.v1')) { localStorage.setItem('hoyos.db.v1', JSON.stringify(seed)); localStorage.setItem('hoyos.session', JSON.stringify({ userId: user, viewAs: roleFixture ? 'customer' : null, devMode: false })); }
    localStorage.setItem('hoyos.lang', lang);
  }, { seed, lang, now, user: ids.user, roleFixture: kind === 'role' });
  const page = await context.newPage(); debug = page; page.setDefaultTimeout(15000); page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + '/#/coming-soon');
  await page.evaluate(async path => (await import('/scripts/desk-confirmation-harness.tsx')).mountDeskConfirmationHarness(path), `/app/checkout/${ids.session}?pass=pack12`);
  await page.waitForFunction(() => window.qaDeskConfirmation?.role === 'customer');
  await page.waitForFunction(() => window.__qaDeskProofInstrumented === true);
  const root = page.locator('#qa-desk-confirmation'), en = lang === 'en';
  await root.locator('.cust-method').filter({ hasText: en ? 'At the front desk' : 'En recepción' }).click();
  const confirm = root.locator('.cust-sticky > button').last(); await confirm.waitFor();
  await page.waitForFunction(() => [...document.querySelectorAll('#qa-desk-confirmation .cust-sticky > button')].some(button => !button.disabled));
  await confirm.click(); await page.getByRole('dialog').waitFor();
  const paymentId = await page.evaluate(user => window.qaDeskConfirmation.provider.peek('payments', { where: { user_id: user } }).find(row => row.status === 'pending').id, ids.user);
  await page.evaluate(id => { window.qaDeskConfirmation.paymentId = id; }, paymentId);
  return { page, context, root, paymentId, en };
}
async function settle(page, paymentId) {
  await page.evaluate(async paymentId => {
    const { settleAtDesk } = await import('/src/modules/transfers/deskSettlement.ts'), data = window.qaDeskConfirmation.provider, payment = data.peek('payments', { where: { id: paymentId } })[0];
    await settleAtDesk(data, { paymentId, actorId: 'usr_desk', role: 'front_desk', method: 'cash', amount: payment.amount, note: 'FICTIONAL confirmation context' });
  }, paymentId);
}
const snapshot = page => page.evaluate(() => localStorage.getItem('hoyos.db.v1'));
try {
  for (const lang of ['en', 'es']) for (const width of [390, 1280]) {
    if (process.env.QA_LANG && process.env.QA_LANG !== lang || process.env.QA_WIDTH && Number(process.env.QA_WIDTH) !== width) continue;
    for (const kind of ['read-failure', 'receipt-copy', 'unavailable', 'historical', 'provider', 'actor', 'role', 'route', 'unmount']) {
      if (process.env.QA_KIND && process.env.QA_KIND !== kind) continue;
      const { page, context, root, paymentId, en } = await open(lang, width, kind);
      if (kind === 'unavailable') {
        // A synthetic declined request must not be presented as still awaiting collection.
        await page.evaluate(id => window.qaDeskConfirmation.provider.update('payments', id, { status: 'declined' }), paymentId);
        await page.getByRole('dialog').getByText(en ? 'This request can no longer be confirmed here. Review your payments and bookings.' : 'Esta solicitud ya no puede confirmarse aquí. Revisa tus pagos y reservas.', { exact: false }).waitFor();
        const before = await snapshot(page);
        await page.getByRole('dialog').getByRole('button', { name: en ? 'Retry' : 'Reintentar', exact: true }).click();
        await page.getByRole('dialog').getByText(en ? 'This request can no longer be confirmed here. Review your payments and bookings.' : 'Esta solicitud ya no puede confirmarse aquí. Revisa tus pagos y reservas.', { exact: false }).waitFor();
        assert.equal(await snapshot(page), before);
        assert.equal(await page.getByRole('dialog').getByText(en ? 'Saved booking record' : 'Registro de reserva guardado', { exact: true }).count(), 0);
      } else if (kind === 'historical') {
        await page.evaluate(() => { window.qaDeskConfirmation.hold = true; });
        await settle(page, paymentId); await page.waitForFunction(() => window.qaDeskConfirmation.paused);
        // Lifecycle proof fixture only: do not infer or implement a customer cancellation/refund policy.
        await page.evaluate(id => { const data = window.qaDeskConfirmation.provider, booking = data.peek('bookings').find(row => data.peek('class_ledger').some(debit => debit.id === row.ledger_id && debit.payment_id === id)); return data.update('bookings', booking.id, { status: 'cancelled' }); }, paymentId);
        const before = await snapshot(page); await page.evaluate(() => window.qaDeskConfirmation.release());
        await page.getByRole('dialog').getByText(en ? 'Saved booking record' : 'Registro de reserva guardado', { exact: true }).waitFor();
        await page.getByRole('dialog').getByText(en ? 'The saved record was verified. Its current status appears in the booking details.' : 'Se verificó el registro guardado. Su estado actual aparece en el detalle de la reserva.', { exact: true }).waitFor();
        assert.equal(await snapshot(page), before);
      } else if (kind === 'read-failure' || kind === 'receipt-copy') {
        // Arm only after settlement reads its input; intercept the customer proof after the real atomic command.
        await page.evaluate(kind => { const s = window.qaDeskConfirmation; const atomic = s.provider.atomic.bind(s.provider); s.provider.atomic = async (...args) => { if (kind === 'read-failure') s.readFail = true; else s.corrupt = true; return atomic(...args); }; }, kind);
        await settle(page, paymentId);
        await page.getByRole('dialog').getByText(en ? 'The current status of this request could not be confirmed. Review your payments or try again.' : 'No se pudo confirmar el estado actual de esta solicitud. Revisa tus pagos o vuelve a intentarlo.', { exact: false }).waitFor();
        assert.equal(await page.getByRole('dialog').getByText(en ? 'Saved booking record' : 'Registro de reserva guardado', { exact: true }).count(), 0);
        const before = await snapshot(page);
        await page.evaluate(() => { window.qaDeskConfirmation.readFail = false; window.qaDeskConfirmation.corrupt = false; });
        await page.getByRole('dialog').getByRole('button', { name: en ? 'Retry' : 'Reintentar', exact: true }).click();
        await page.getByRole('dialog').getByText(en ? 'Saved booking record' : 'Registro de reserva guardado', { exact: true }).waitFor();
        assert.equal(await snapshot(page), before, 'Proof retry must remain read-only');
      } else {
        await page.evaluate(() => { window.qaDeskConfirmation.hold = true; });
        await settle(page, paymentId); await page.waitForFunction(() => window.qaDeskConfirmation.paused);
        const before = await snapshot(page);
        await page.evaluate(kind => { const s = window.qaDeskConfirmation; if (kind === 'provider') s.swap(); if (kind === 'actor') s.switchUser('usr_desk'); if (kind === 'role') s.setViewAs('public'); if (kind === 'route') s.navigate('/app/history'); if (kind === 'unmount') s.unmount(); }, kind);
        if (kind === 'role') await page.waitForFunction(() => window.qaDeskConfirmation.role === 'public');
        if (kind === 'actor') await page.waitForFunction(() => window.qaDeskConfirmation.actor === 'usr_desk');
        if (kind === 'provider') await page.waitForFunction(() => window.qaDeskConfirmation.providerIndex === 1);
        if (kind === 'route') await page.getByText('FICTIONAL RECORD DESTINATION', { exact: true }).waitFor();
        if (kind === 'unmount') assert.equal(await root.locator('*').count(), 0);
        await page.evaluate(() => window.qaDeskConfirmation.release());
        await page.waitForFunction(() => { const s = window.qaDeskConfirmation; return s.proofsStarted > 0 && s.proofsSettled === s.proofsStarted; });
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        assert.equal(await page.getByRole('dialog').count(), 0, 'Old portal drawer cannot publish into a changed context');
        assert.equal(await page.getByText(en ? 'Saved booking record' : 'Registro de reserva guardado', { exact: true }).count(), 0, 'Old proof cannot publish into a changed context');
        assert.equal(await snapshot(page), before, 'Context change cannot write payment, booking or historical evidence');
      }
      checks.push({ lang, width, kind, passed: true }); await context.close();
    }
  }
  assert.deepEqual(errors, []);
} catch (error) {
  errors.push(error.stack ?? String(error)); if (debug && !debug.isClosed()) { await debug.screenshot({ path: out + '/failure.jpg', fullPage: true }); await writeFile(out + '/failure.txt', await debug.locator('body').innerText()); await writeFile(out + '/failure-state.json', JSON.stringify(await debug.evaluate(() => { const s=window.qaDeskConfirmation; return s ? { actor:s.actor,role:s.role,paused:s.paused,hold:s.hold,proofsStarted:s.proofsStarted,proofsSettled:s.proofsSettled,providerIndex:s.providerIndex,instrumented:window.__qaDeskProofInstrumented } : null; }), null, 2)); }
} finally {
  await browser.close(); await writeFile(out + '/results.json', JSON.stringify({ base, checks, errors }, null, 2)); console.log(JSON.stringify({ checks: checks.length, errors }));
}
assert.deepEqual(errors, []);
