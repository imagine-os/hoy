// H-4 launch rows in the browser, on the PRODUCTION routes and pages (a dev server with VITE_HOY_BUILD=production):
// schedule → class → checkout → booked (RS-01, RS-02), a pack bought for a class goes to the bank-transfer payment (RS-03),
// the held spot with its countdown and the outside-hours notice (PG-03, J1, J1c), and the move and cancel sheet (RS-09, J3).
// ES and EN, 390 and 1280. Production signs in with Clerk and talks to Company OS, so the pages run in
// scripts/booking-launch-harness.html: the production routes on the in-browser store (a held booking is seeded into it)
// and a ready session for a fictional customer. Server rules are Company OS's own suite; nothing leaves 127.0.0.1.
// Run: node scripts/test-booking-launch-ui.mjs
import { createServer } from 'vite';
import { launchBrowser, newContext, reporter } from './lib/launch-qa.mjs';

const { check, done } = reporter('H-4 booking UI');
process.env.VITE_HOY_BUILD = 'production';
const port = Number(process.env.QA_PORT ?? 5700 + Math.floor(Math.random() * 250));
const dev = await createServer({ server: { port, strictPort: true, host: '127.0.0.1' }, logLevel: 'error', clearScreen: false });
await dev.listen();
const server = { base: `http://127.0.0.1:${port}/scripts/booking-launch-harness.html`, close: () => dev.close() };
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
    await page.goto(`${server.base}#/app/schedule`);
    await page.waitForLoadState('networkidle');
    check(`RS-01 [${tag}] the schedule renders with method filters`, await page.locator('.cust-filters').count() > 0);

    const stored = await readDb(page), db = stored.db ?? stored;
    const now = await page.evaluate(() => Date.now());
    const target = pickSession(db, now);
    check(`RS-01 [${tag}] fixture: a future class with spots exists`, !!target);
    if (!target) { await ctx.close(); continue; }

    // RS-02: class → checkout → book from the balance → booked page.
    await page.goto(`${server.base}#/app/class/${target.id}`);
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
    await page.goto(`${server.base}#/app/booking/${bookingId}/change`);
    await page.getByText(ES ? /Puedes moverla hasta/ : /You can move it until/).first().waitFor({ timeout: 5000 });
    check(`RS-09 [${tag}] the move row shows the deadline (12 h before)`, await page.getByText(ES ? /12 h antes/ : /12 h before/).count() > 0);
    await page.getByText(ES ? /Pierdes la clase/ : /You lose the class/).first().click();
    check(`J3 [${tag}] the cancel step warns, every time, that the class is lost`, await page.getByText(ES ? /Si cancelas, pierdes esta clase/ : /If you cancel, you lose this class/).count() === 1 && await page.getByRole('button', { name: ES ? /cancelar y perder la clase/ : /cancel and lose the class/ }).count() === 1);

    // RS-03: choosing a package for a class sends the customer to buy it by bank transfer (production): the pack is the
    // desk's to approve, so the class is booked with it afterwards. A hostile return link changes nothing.
    const other = pickSession(adb, now, [target.id]);
    await page.goto(`${server.base}#/app/checkout/${other.id}`);
    await page.getByRole('radio').filter({ hasText: /12/ }).first().click();
    await page.getByRole('button', { name: ES ? /Comprar y volver a esta clase/ : /Buy and come back to this class/ }).click();
    await page.waitForURL(/#\/app\/pay\/product\/pack12$/, { timeout: 10000 }).catch(() => {});
    check(`RS-03 [${tag}] buying the pack for a class opens its bank-transfer payment (no Wompi stand-in)`, page.url().endsWith('/app/pay/product/pack12'));
    // A link from outside (a fresh load) with a hostile return goes to the same payment and never leaves the app.
    const outside = await ctx.newPage();
    outside.on('pageerror', (e) => errors.push(String(e)));
    await outside.goto(`${server.base}#/app/plans?plan=pack12&next=${encodeURIComponent('https://evil.test/')}`);
    await outside.waitForURL(/#\/app\/pay\/product\/pack12$/, { timeout: 10000 }).catch(() => {});
    check(`RS-03 [${tag}] a hostile return link is ignored`, outside.url().startsWith('http://127.0.0.1') && outside.url().endsWith('/app/pay/product/pack12'), outside.url());
    await outside.close();
    await page.goto(`${server.base}#/app/plans`);
    check(`RS-03 [${tag}] the plans page lists the packs from the product master`, await seen(page.getByRole('button', { name: ES ? /Elegir|Comprar/ : /Choose|Buy/ })));

    // PG-03 / J1: a held single class booked outside reception hours: "the clock starts at" its opening, plus the receipt upload.
    const fresh = await readDb(page), fdb = fresh.db ?? fresh;
    const opensAt = now + 9.75 * 3600e3, open = new Date(opensAt + 15 * 60e3).toISOString();
    fdb.bookings = fdb.bookings.filter((b) => !(b.user_id === USER && b.session_id === other.id));
    fdb.bookings.push({ ...saved[0], id: 'bkg_h4_held', session_id: other.id, status: 'held', paid_with: 'single', payment_method: 'transfer', hold_until: open, policy_hold_minutes: 15, hold_frozen_at: null, created_at: new Date(now).toISOString() });
    await writeDb(page, fresh);
    await page.goto(`${server.base}#/app/booking/bkg_h4_held`);
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
