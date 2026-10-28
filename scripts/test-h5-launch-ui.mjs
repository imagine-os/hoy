// H-5 launch screens in a browser (ES/EN × 390/1280): the transfer pay screen (PG-01/02/09), the pending list and
// review (PG-04/05/06/07), the Nota de compra (PG-08), the report (PG-10), the product master (PR-01/02/05) and the
// booking rules (AD-04). Renders scripts/h5-launch-harness.tsx against the in-memory Company OS stand-in.
// Run: node scripts/test-h5-launch-ui.mjs   (CHROMIUM_PATH picks the browser; QA_OUTPUT the screenshot folder)
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { launchBrowser } from './lib/launch-qa.mjs';

const out = process.env.QA_OUTPUT ?? 'qa/h5-launch', temp = await mkdtemp(join(tmpdir(), 'hoy-h5-ui-'));
await mkdir(out, { recursive: true });
await build({
  entryPoints: { harness: 'scripts/h5-launch-harness.tsx', styles: 'scripts/h5-launch-styles.css' }, bundle: true, format: 'iife', outdir: temp, logLevel: 'silent', jsx: 'automatic',
  loader: { '.css': 'css', '.woff2': 'empty', '.png': 'empty', '.jpg': 'empty', '.svg': 'empty' }, define: { 'import.meta.env': '{"VITE_HOY_BUILD":"review","DEV":false,"BASE_URL":"/"}', 'process.env.NODE_ENV': '"production"' },
});
await writeFile(join(temp, 'index.html'), '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="harness.css"></head><body><div id="root"></div><script src="harness.js"></script></body></html>');
const url = pathToFileURL(join(temp, 'index.html')).href;
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

const browser = await launchBrowser();
const checks = [], errors = [];
const open = async (lang, width, sessionUser, page, path, cosUser) => {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  await ctx.route(/^https?:\/\//, (r) => r.abort());
  await ctx.addInitScript(({ lang, sessionUser }) => { localStorage.setItem('hoyos.lang', lang); localStorage.setItem('hoyos.session', JSON.stringify({ userId: sessionUser, devMode: false, viewAs: null })); }, { lang, sessionUser });
  const p = await ctx.newPage(); p.setDefaultTimeout(15000);
  p.on('pageerror', (e) => errors.push(`${lang}/${width}/${page}: ${e.message}`));
  await p.goto(url);
  await p.evaluate(({ page, path, cosUser }) => { const h = window.H5; window.H5.mount(page, path.replace(':held', h.heldId), cosUser); }, { page, path, cosUser });
  return { p, ctx };
};
const sane = async (p, label) => {
  const text = await p.locator('#root').innerText();
  assert(!text.includes('⟨'), `${label}: missing string key`);
  assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${label}: horizontal overflow`);
};
const t = (lang, es, en) => (lang === 'es' ? es : en);

try {
  for (const lang of ['es', 'en']) for (const width of [390, 1280]) {
    const tag = `${lang}-${width}`;
    // PG-01 / PG-02 / PG-09 — customer pays a held booking by transfer; a double click makes one payment
    {
      const { p, ctx } = await open(lang, width, 'usr_cust', 'pay', '/app/pay/booking/:held', 'usr_cust');
      await p.getByTestId('amount-due').waitFor();
      assert((await p.getByTestId('amount-due').innerText()).includes('55.000') || (await p.getByTestId('amount-due').innerText()).includes('55,000'));
      await sane(p, `${tag} pay`); await p.screenshot({ path: `${out}/${tag}-pay.jpg`, fullPage: true });
      await p.locator('input[type=file]').setInputFiles({ name: 'comprobante.png', mimeType: 'image/png', buffer: PNG });
      const send = p.getByRole('button', { name: t(lang, 'Enviar comprobante', 'Send receipt') });
      await send.dblclick();
      await p.getByText(t(lang, 'Comprobante recibido', 'Receipt received'), { exact: false }).waitFor();
      const n = await p.evaluate(() => window.H5.cos.db.payment.filter((x) => x.data.status === 'pending').length);
      const files = await p.evaluate(() => window.H5.cos.db.file.filter((f) => f.data.status === 'ready').length);
      assert.equal(n, 1, 'double click → one pending payment'); assert.equal(files, 1, 'one receipt image');
      await p.screenshot({ path: `${out}/${tag}-pay-sent.jpg`, fullPage: true });
      checks.push(`${tag} PG-01/02/09 pay screen: amount, upload, double click → 1 payment + 1 image`);
      // PG-05 / PG-04 — the desk reviews it in the same fake server
      await p.evaluate(() => { document.getElementById('root').remove(); const d = document.createElement('div'); d.id = 'root'; document.body.append(d); localStorage.setItem('hoyos.session', JSON.stringify({ userId: 'usr_desk', devMode: false, viewAs: null })); });
      await ctx.close();
    }
    {
      const { p, ctx } = await open(lang, width, 'usr_desk', 'queue', '/staff/transfers', 'usr_desk');
      // seed a transfer with a receipt directly for this context (each context has its own fake)
      await p.evaluate(async () => {
        const c = window.H5.cos; c.as('usr_cust');
        const prod = c.db.product.find((x) => x.data.key === 'single');
        const { ids } = await c.request('POST', '/batch', { ops: [{ op: 'create', entity: 'payment', data: { person: c.db.person[0].id, product: prod.id, amount: 55000, method: 'transfer', reference: 'R1', status: 'pending', date: '2026-11-01', for_entity: 'booking', for_id: window.H5.heldId } }] }, { idempotencyKey: 'seed-key-0001' });
        const { file, uploadUrl } = await c.request('POST', '/files', { ownerEntity: 'payment', ownerId: ids[0], kind: 'receipt', filename: 'r.png', mime: 'image/png', sizeBytes: 12 });
        await c.put(uploadUrl, { body: new Uint8Array([137, 80, 78, 71]) }); await c.request('POST', `/files/${file.id}/confirm`); c.as('usr_desk');
      });
      await p.getByRole('button', { name: t(lang, 'Reintentar', 'Retry') }).click().catch(() => {});
      await p.getByTestId('pending-item').first().waitFor();
      // a reload picks the seeded payment up (the page polls every 20 s; force it)
      await p.evaluate(() => window.dispatchEvent(new Event('focus')));
      await p.waitForTimeout(50);
      await sane(p, `${tag} queue`); await p.screenshot({ path: `${out}/${tag}-queue.jpg`, fullPage: true });
      const items = await p.getByTestId('pending-item').count();
      assert(items >= 1, 'pending list shows items');
      checks.push(`${tag} PG-05 pending list renders (${items} items)`);
      // PG-07 / PG-06 — record the desk hold's payment
      const record = p.getByRole('button', { name: t(lang, 'Registrar pago', 'Record payment') }).first();
      await record.click();
      const dialog = p.getByRole('dialog');
      await dialog.getByRole('button', { name: t(lang, 'Registrar pago', 'Record payment') }).dblclick();
      await p.getByText(t(lang, 'Pago registrado por Diego Desk', 'Payment recorded by Diego Desk'), { exact: false }).waitFor();
      const desk = await p.evaluate(() => window.H5.cos.db.payment.filter((x) => x.data.method === 'cash' && x.data.status === 'approved').length);
      assert.equal(desk, 1, 'desk double click → one approved payment');
      await p.screenshot({ path: `${out}/${tag}-desk-saved.jpg`, fullPage: true });
      checks.push(`${tag} PG-06/07 desk payment for the held booking, double click → 1 payment, "recorded by" shown`);
      await ctx.close();
    }
    // PG-04 — review with an amount that differs: reason required, then confirm
    {
      const { p, ctx } = await open(lang, width, 'usr_desk', 'queue', '/staff/transfers', 'usr_desk');
      await p.evaluate(async () => {
        const c = window.H5.cos; c.as('usr_cust');
        const prod = c.db.product.find((x) => x.data.key === 'pack12');
        const { ids } = await c.request('POST', '/batch', { ops: [{ op: 'create', entity: 'payment', data: { person: c.db.person[0].id, product: prod.id, amount: 600000, method: 'transfer', reference: 'R2', status: 'pending', date: '2026-11-01' } }] }, { idempotencyKey: 'seed-key-0002' });
        const { file, uploadUrl } = await c.request('POST', '/files', { ownerEntity: 'payment', ownerId: ids[0], kind: 'receipt', filename: 'r.png', mime: 'image/png', sizeBytes: 12 });
        await c.put(uploadUrl, { body: new Uint8Array([137, 80, 78, 71]) }); await c.request('POST', `/files/${file.id}/confirm`); c.as('usr_desk');
        window.H5.paid = ids[0];
      });
      await p.evaluate(() => window.H5.mount('queue', '/staff/transfers', 'usr_desk'));
      await p.getByRole('button', { name: t(lang, 'Revisar', 'Review') }).first().click();
      const d = p.getByRole('dialog');
      await d.getByRole('img').waitFor();
      await d.getByRole('checkbox').check();
      await d.getByLabel(t(lang, 'Valor recibido (COP)', 'Amount received (COP)')).fill('590000');
      await d.getByText(t(lang, 'El valor recibido es distinto', 'The amount received differs'), { exact: false }).waitFor();
      await d.getByRole('button', { name: t(lang, 'Confirmar pago', 'Confirm payment') }).click();
      await d.getByText(t(lang, 'Escribe un motivo (nuevo)', 'Write a (new) reason'), { exact: false }).waitFor();
      await sane(p, `${tag} review`); await p.screenshot({ path: `${out}/${tag}-review-reason.jpg`, fullPage: true });
      await d.getByLabel(t(lang, 'Motivo', 'Reason'), { exact: false }).fill('Faltaron 10.000; acordado');
      await d.getByRole('button', { name: t(lang, 'Confirmar pago', 'Confirm payment') }).click();
      await p.getByText(t(lang, 'Pago confirmado', 'Payment confirmed'), { exact: false }).waitFor();
      const pay = await p.evaluate(() => window.H5.cos.db.payment.find((x) => x.id === window.H5.paid).data);
      assert.equal(pay.status, 'approved'); assert.equal(pay.amount, 590000); assert.equal(pay.price_override_reason, 'Faltaron 10.000; acordado'); assert.equal(pay.approved_by, 'usr_desk');
      checks.push(`${tag} PG-04 receipt image opens, differing amount needs a reason, approval records amount/reason/confirmer`);
      // PG-08 — the Nota de compra for it
      await p.evaluate(() => window.H5.mount('staffReceipt', `/staff/receipts/${window.H5.paid}`, 'usr_desk'));
      await p.getByTestId('nota-de-compra').waitFor();
      const note = await p.getByTestId('nota-de-compra').innerText();
      assert(note.includes(t(lang, 'Nota de compra n.º 1', 'Purchase note no. 1'))); assert(note.includes(t(lang, 'Sin IVA', 'No VAT')));
      await sane(p, `${tag} receipt`); await p.screenshot({ path: `${out}/${tag}-nota-de-compra.jpg`, fullPage: true });
      checks.push(`${tag} PG-08 Nota de compra n.º 1, no VAT`);
      // PG-10 — the report lists it
      await p.evaluate(() => { window.H5.cos.db.payment.forEach((x) => { x.data.date = new Date().toISOString().slice(0, 10); }); window.H5.mount('report', '/admin/payments/report', 'usr_admin'); });
      await p.getByTestId('report-summary').waitFor();
      assert((await p.getByTestId('report-summary').innerText()).startsWith('1'));
      await sane(p, `${tag} report`); await p.screenshot({ path: `${out}/${tag}-report.jpg`, fullPage: true });
      checks.push(`${tag} PG-10 report shows the confirmed payment`);
      await ctx.close();
    }
    // PR-01 / PR-02 — product master: new price from a date; front desk read-only
    {
      const { p, ctx } = await open(lang, width, 'usr_admin', 'products', '/admin/products', 'usr_admin');
      await p.getByTestId('product-pack12').waitFor();
      await sane(p, `${tag} products`); await p.screenshot({ path: `${out}/${tag}-products.jpg`, fullPage: true });
      await p.getByTestId('product-pack12').getByRole('button', { name: t(lang, 'Nuevo precio desde una fecha', 'New price from a date') }).click();
      await p.locator('input[name=price]').fill('650000'); await p.locator('input[name=from]').fill('2027-01-01');
      await p.getByRole('button', { name: t(lang, 'Guardar', 'Save'), exact: true }).click();
      await p.getByRole('status').filter({ hasText: t(lang, 'Producto guardado', 'Product saved') }).waitFor();
      assert.equal(await p.getByTestId('product-pack12').getByTestId('price-period').count(), 2, 'history keeps both periods');
      await p.screenshot({ path: `${out}/${tag}-products-new-price.jpg`, fullPage: true });
      checks.push(`${tag} PR-01/02 new price period saved, history shows both`);
      await ctx.close();
      const desk = await open(lang, width, 'usr_desk', 'products', '/admin/products', 'usr_desk');
      await desk.p.getByTestId('product-pack12').waitFor();
      assert.equal(await desk.p.getByRole('button', { name: t(lang, 'Nuevo producto', 'New product') }).count(), 0);
      assert.equal(await desk.p.getByRole('button', { name: t(lang, 'Editar borrador', 'Edit draft') }).count(), 0);
      assert(await desk.p.getByText(t(lang, 'Vista de solo lectura', 'Read-only view'), { exact: false }).isVisible());
      checks.push(`${tag} PR-01 front desk sees the master read-only`);
      await desk.ctx.close();
    }
    // AD-04 — booking rules (hold minutes, move window); reception hours stay on H-7's panel
    {
      const { p, ctx } = await open(lang, width, 'usr_super', 'policies', '/admin/settings/booking-policies', 'usr_admin');
      await p.getByTestId('booking-policies').waitFor();
      await p.evaluate(() => { window.H5.cos.settings.review_hours = 'mon-fri 08:00-20:00'; });
      await p.locator('input[name=reschedule_hours]').fill('24');
      await p.locator('input[name=hold_minutes_transfer]').fill('20');
      await sane(p, `${tag} policies`); await p.screenshot({ path: `${out}/${tag}-policies.jpg`, fullPage: true });
      await p.getByRole('button', { name: t(lang, 'Guardar reglas', 'Save rules') }).click();
      await p.getByRole('status').filter({ hasText: t(lang, 'Reglas guardadas', 'Rules saved') }).waitFor();
      const s = await p.evaluate(() => window.H5.cos.settings);
      assert.equal(s.reschedule_hours, 24); assert.equal(s.hold_minutes_transfer, 20); assert.equal(s.review_hours, 'mon-fri 08:00-20:00');
      checks.push(`${tag} AD-04 hold minutes and move window saved; reception hours untouched`);
      await ctx.close();
    }
  }
  assert.deepEqual(errors, []);
  await writeFile(`${out}/results.json`, JSON.stringify({ checks, errors }, null, 2));
  console.log(checks.map((c) => `ok   ${c}`).join('\n'));
  console.log(`\n${checks.length} H-5 UI checks passed`);
} catch (e) {
  console.error('FAIL', e?.message ?? e, errors);
  process.exitCode = 1;
} finally { await browser.close(); await rm(temp, { recursive: true, force: true }); }
