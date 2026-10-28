// H-4 launch rows in the browser, on the PRODUCTION build (VITE_HOY_BUILD=production): schedule → class → checkout → booked
// (RS-01, RS-02, RS-03), the held spot with its countdown and the outside-hours notice (PG-03, J1, J1c), the move and cancel sheet
// (RS-09, J3) and a server refusal shown as copy (RS-04…RS-07). ES and EN, 390 and 1280. Until the connector (H-3) is merged the
// production build still runs on the browser mock, so the held booking is seeded into the mock store; nothing leaves 127.0.0.1.
// Run: node scripts/test-booking-launch-ui.mjs   (builds the production dist into a temp dir unless QA_PROD_DIST names one)
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { serveDist, launchBrowser, newContext, reporter } from './lib/launch-qa.mjs';

const { check, done } = reporter('H-4 booking UI');
let dir = process.env.QA_PROD_DIST;
if (!dir) {
  dir = mkdtempSync(join(tmpdir(), 'hoy-h4-prod-'));
  execFileSync('npx', ['vite', 'build', '--outDir', dir, '--emptyOutDir', '--logLevel', 'error'], { env: { ...process.env, VITE_HOY_BUILD: 'production' }, stdio: 'inherit' });
}
const server = await serveDist(Number(process.env.QA_PORT ?? 5700 + Math.floor(Math.random() * 250)), dir);
const browser = await launchBrowser();
const USER = 'usr_cust';

const seen = (locator) => locator.first().waitFor({ timeout: 5000 }).then(() => true, () => false);
const readDb = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('hoyos.db.v1')));
const writeDb = (page, stored) => page.evaluate((s) => localStorage.setItem('hoyos.db.v1', JSON.stringify(s)), stored);
/** Future, scheduled, not full, not a mat class, on a day the user has no booking (so the mock's own rules agree). */
function pickSession(db, now, skip = []) {
  const myDays = new Set(db.bookings.filter((b) => b.user_id === USER && ['booked', 'checked_in', 'held'].includes(b.status)).map((b) => db.class_sessions.find((s) => s.id === b.session_id)?.starts_at.slice(0, 10)));
  const mats = new Set(db.modalities.filter((m) => /yoga|vinyasa|flow|yin|ligereza|hibrido|alineacion/.test(m.slug)).map((m) => m.id));
  return db.class_sessions.find((s) => s.status === 'scheduled' && Date.parse(s.starts_at) > now + 30 * 3600e3 && s.booked_count < s.capacity && !mats.has(s.modality_id) && !myDays.has(s.starts_at.slice(0, 10)) && !skip.includes(s.id));
}

try {
  for (const lang of ['es', 'en']) for (const width of [390, 1280]) {
    const tag = `${lang} ${width}`, ES = lang === 'es';
    const ctx = await newContext(browser, { userId: USER, lang, width });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(`${server.base}/#/app/schedule`);
    await page.waitForLoadState('networkidle');
    check(`RS-01 [${tag}] the schedule renders with method filters`, await page.locator('.cust-filters').count() > 0);

    const stored = await readDb(page), db = stored.db ?? stored;
    const now = await page.evaluate(() => Date.now());
    const target = pickSession(db, now);
    check(`RS-01 [${tag}] fixture: a future class with spots exists`, !!target);
    if (!target) { await ctx.close(); continue; }

    // RS-02: class → checkout → book from the balance → booked page.
    await page.goto(`${server.base}/#/app/class/${target.id}`);
    await page.locator('.cust-sticky button.btn-primary').first().click();
    await page.waitForURL(/#\/app\/checkout\//);
    check(`RS-02 [${tag}] class detail goes straight to checkout (no browser admission read)`, page.url().endsWith(`/app/checkout/${target.id}`));
    await page.getByRole('radio', { name: ES ? /Una clase de tu saldo/ : /A class from your balance/ }).click();
    await page.locator('.cust-sticky button.btn-primary').click();
    await page.waitForURL(/#\/app\/booking\//, { timeout: 10000 });
    const bookingId = page.url().split('/app/booking/')[1];
    const after = await readDb(page), adb = after.db ?? after;
    const saved = adb.bookings.filter((b) => b.user_id === USER && b.session_id === target.id && b.status === 'booked');
    check(`RS-02 [${tag}] one booking from the balance is saved and its page opens`, saved.length === 1 && saved[0].id === bookingId && saved[0].paid_with === 'package');
    await page.getByText(ES ? 'Pago confirmado' : 'Payment confirmed').first().waitFor({ timeout: 5000 }).catch(() => {});
    check(`RS-08 [${tag}] the booking page shows the payment status (confirmed) and directions`, await page.getByText(ES ? 'Pago confirmado' : 'Payment confirmed').count() > 0 && await page.getByText(ES ? 'Cómo llegar' : 'Getting here').count() > 0);

    // RS-09 / J3: the change sheet offers the move with its deadline and warns that cancelling loses the class.
    await page.goto(`${server.base}/#/app/booking/${bookingId}/change`);
    await page.getByText(ES ? /Puedes moverla hasta/ : /You can move it until/).first().waitFor({ timeout: 5000 });
    check(`RS-09 [${tag}] the move row shows the deadline (12 h before)`, await page.getByText(ES ? /12 h antes/ : /12 h before/).count() > 0);
    await page.getByText(ES ? /Pierdes la clase/ : /You lose the class/).first().click();
    check(`J3 [${tag}] the cancel step warns, every time, that the class is lost`, await page.getByText(ES ? /Si cancelas, pierdes esta clase/ : /If you cancel, you lose this class/).count() === 1 && await page.getByRole('button', { name: ES ? /cancelar y perder la clase/ : /cancel and lose the class/ }).count() === 1);

    // RS-03: choosing a package sends the customer to buy it and the purchase comes back to the same class.
    const other = pickSession(adb, now, [target.id]);
    await page.goto(`${server.base}/#/app/checkout/${other.id}`);
    await page.getByRole('radio').filter({ hasText: /12/ }).first().click();
    await page.getByRole('button', { name: ES ? /Comprar y volver a esta clase/ : /Buy and come back to this class/ }).click();
    await page.waitForURL(/#\/app\/plans\?plan=pack12/);
    await page.getByRole('dialog').getByRole('button', { name: ES ? /Pagar .* con Wompi/ : /Pay .* with Wompi/ }).click();
    const back = page.getByRole('button', { name: ES ? /Volver a tu clase y reservar/ : /Back to your class to book/ });
    check(`RS-03 [${tag}] after the purchase the customer is offered the way back to the chosen class`, await seen(back));
    if (await back.count()) { await back.click(); await page.waitForURL(/#\/app\/checkout\//); }
    check(`RS-03 [${tag}] … and lands on that class's checkout again`, page.url().endsWith(`/app/checkout/${other.id}`));
    check(`RS-03 [${tag}] a hostile return link is ignored (stays on the plans screen)`, await (async () => {
      await page.goto(`${server.base}/#/app/plans?plan=pack12&next=${encodeURIComponent('https://evil.test/')}`);
      await page.getByRole('dialog').getByRole('button', { name: ES ? /Pagar .* con Wompi/ : /Pay .* with Wompi/ }).click();
      return await seen(page.getByRole('dialog').getByText(ES ? 'Paquete activo' : 'Package active')) && await back.count() === 0;
    })());

    // PG-03 / J1: a held single class booked outside reception hours: "the clock starts at" its opening, plus the receipt upload.
    const fresh = await readDb(page), fdb = fresh.db ?? fresh;
    const opensAt = now + 9.75 * 3600e3, open = new Date(opensAt + 15 * 60e3).toISOString();
    fdb.bookings = fdb.bookings.filter((b) => !(b.user_id === USER && b.session_id === other.id));
    fdb.bookings.push({ ...saved[0], id: 'bkg_h4_held', session_id: other.id, status: 'held', paid_with: 'single', payment_method: 'transfer', hold_until: open, policy_hold_minutes: 15, hold_frozen_at: null, created_at: new Date(now).toISOString() });
    await writeDb(page, fresh);
    await page.goto(`${server.base}/#/app/booking/bkg_h4_held`);
    await page.reload();
    check(`PG-03 [${tag}] a held spot shows the receipt upload and the hold explainer`, await seen(page.getByText(ES ? /Enviar comprobante/ : /Send receipt/)) && await page.getByText(ES ? /Un comprobante enviado antes de la clase guarda el cupo/ : /A receipt sent before the class keeps the spot/).count() === 1);
    check(`J1 [${tag}] outside reception hours the clock "starts at" its opening time`, await page.getByText(ES ? /El reloj empieza a las/ : /The clock starts at/).count() === 1 && await page.getByText(ES ? /Fuera del horario de recepción/ : /Outside reception hours/).count() === 1);

    // J1c: once the receipt is with reception the spot is kept, past the class start too.
    const frozen = await readDb(page); (frozen.db ?? frozen).bookings.find((b) => b.id === 'bkg_h4_held').hold_frozen_at = new Date(now).toISOString();
    await writeDb(page, frozen); await page.reload();
    check(`J1c [${tag}] a sent receipt keeps the spot until reception reviews it`, await seen(page.getByText(ES ? /Recibimos tu comprobante/ : /We have your receipt/)) && await page.getByText(ES ? /aunque la clase ya haya empezado/ : /even if the class has started/).count() === 1);
    // A receipt payment whose image didn't upload (remembered on this device) offers the upload again.
    await page.evaluate(() => localStorage.setItem('hoyos.customer.unsentReceipt.bkg_h4_held', 'pay_unsent'));
    await page.reload();
    check(`J1c [${tag}] a receipt whose image didn't upload offers to send the image again`, await seen(page.getByText(ES ? /no se subió/ : /didn’t upload/)) && await page.getByRole('button', { name: ES ? /Enviar comprobante/ : /Send receipt/ }).count() === 1);
    await page.evaluate(() => localStorage.removeItem('hoyos.customer.unsentReceipt.bkg_h4_held'));

    // RS-08: a released hold reads released.
    const released = await readDb(page), rb = (released.db ?? released).bookings.find((b) => b.id === 'bkg_h4_held');
    Object.assign(rb, { status: 'cancelled', cancel_reason: 'hold_expired', hold_frozen_at: null });
    await writeDb(page, released); await page.reload();
    check(`RS-08 [${tag}] a hold that ran out reads "released"`, await seen(page.getByText(ES ? /Cupo liberado/ : /Spot released/)));

    check(`H-4 [${tag}] no page errors and no missing strings`, errors.length === 0 && await page.locator('text=/⟨customer\\./').count() === 0, errors.join(' | '));
    await ctx.close();
  }
} finally {
  await browser.close();
  await server.close();
}
done();
