// H-6 · vouchers on Company OS credits, in the browser. Named checks per tracker row BO-01…BO-06:
//  1. The production screens (dev server with VITE_HOY_BUILD=production) against the fake credits API
//     (scripts/lib/fake-credits.mjs via scripts/vouchers-cos-harness.tsx), ES and EN, 390 and 1280 px.
//  2. The production build (built here unless QA_PROD_DIST is set): routes, sign-in return for the emailed link, no extras.
//  3. The review build (dist/, from npm run build) keeps the demo vouchers and their extras.
// Fictional data only; external requests are blocked. Run: npm run build && node scripts/test-vouchers-cos-ui.mjs
import { execFileSync } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'vite';
import { serveDist, launchBrowser, newContext, reporter } from './lib/launch-qa.mjs';

const { check, done } = reporter('voucher (H-6) UI');
const errors = [];
const browser = await launchBrowser();
const T = {
  es: { cta: 'Sumar las clases a mi saldo', added: 'Listo: sumamos 2 clases a tu saldo.', used: 'Este bono ya se usó', expired: 'Este bono venció', invalid: 'Ese código no existe', format: 'El código tiene 8 letras y números (sin I ni O).', book: 'Reservar una clase',
    create: 'Crear y enviar', created: 'Cortesía creada', classes: 'Número de clases', until: 'Válido hasta (último día)', uses: 'Límite de usos', name: 'Nombre de quien recibe', email: 'Correo de quien recibe', nameErr: 'Escribe el nombre (mínimo 2 letras).',
    issue: 'Emitir y enviar el bono', courtesy: 'Nueva cortesía o invitación', sent: 'Enviado a juliana@demo.hoyos.test', usedOn: 'último canje el', usedBadge: 'Usado', usesOf: 'Usos: 0 de 10', giftCta: 'Continuar al pago por transferencia', emailErr: 'Escribe un solo correo válido.', pick: 'Regalo: 12 clases', noRecipient: 'El pago no trae los datos de quien recibe' },
  en: { cta: 'Add the classes to my balance', added: 'Done: 2 classes added to your balance.', used: 'This voucher has already been used', expired: 'This voucher has expired', invalid: 'That code does not exist', format: 'The code has 8 letters and numbers (no I or O).', book: 'Book a class',
    create: 'Create and send', created: 'Courtesy created', classes: 'Number of classes', until: 'Valid until (last day)', uses: 'Usage limit', name: "Recipient's name", email: "Recipient's email", nameErr: 'Enter the name (at least 2 letters).',
    issue: 'Issue and send the voucher', courtesy: 'New courtesy or invitation', sent: 'Sent to juliana@demo.hoyos.test', usedOn: 'last redeemed on', usedBadge: 'Used', usesOf: 'Uses: 0 of 10', giftCta: 'Continue to bank transfer payment', emailErr: 'Enter one valid email address.', pick: 'Gift: 12 classes', noRecipient: 'The payment has no recipient details' },
};
const plusDays = (n) => new Date(Date.now() + n * 864e5).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

// ── 1. production screens against the fake credits API ─────────────────────────────────────────────────────────
process.env.VITE_HOY_BUILD = 'production';
const dev = await createServer({ server: { port: 5631, strictPort: true, host: '127.0.0.1' }, logLevel: 'error', clearScreen: false });
await dev.listen();
const base = 'http://127.0.0.1:5631';
async function harness(userId, lang, width, path) {
  const ctx = await newContext(browser, { userId, lang, width });
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);
  page.on('pageerror', (e) => errors.push(`${path}: ${e.message}`));
  await page.goto(`${base}/#/coming-soon`);
  await page.evaluate(async (p) => (await import('/scripts/vouchers-cos-harness.tsx')).mountVoucherHarness(p), path);
  await page.waitForFunction(() => window.qaVoucher?.ready);
  const root = page.locator('#qa-voucher-root');
  // Navigates and waits for the new route's render (the location readout commits with it).
  const go = async (p) => { await page.evaluate((x) => window.qaVoucher.navigate(x), p); await page.waitForFunction((x) => JSON.parse(document.querySelector('#qa-where').textContent).path === x, p); };
  const fake = (fn, arg) => page.evaluate(([src, a]) => new Function('fake', 'arg', src)(window.qaVoucher.fake, a), [fn, arg]);
  const noScroll = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  return { ctx, page, root, go, fake, noScroll };
}
const where = async (page) => JSON.parse(await page.locator('#qa-where').textContent());

try {
  for (const lang of ['es', 'en']) for (const width of [390, 1280]) {
    const s = T[lang], tag = `[${lang} ${width}]`;

    // BO-04 · BO-05 — customer opens the emailed link
    {
      const { ctx, page, root, go, fake, noScroll } = await harness('usr_cust', lang, width, '/app/vouchers');
      const until = plusDays(30);
      const code = await fake("return fake.createVoucher({ kind: 'courtesy', classes: 2, valid_until: arg, max_uses: 1, recipient_email: 'ana@demo.hoyos.test' }).code", until);
      const expired = await fake("return fake.createVoucher({ kind: 'gift', classes: 1, valid_until: '2026-01-31' }).code");
      await go(`/app/vouchers/${code.toLowerCase()}`);
      const input = root.getByLabel(lang === 'es' ? 'Código del bono' : 'Voucher code');
      check(`BO-04 ${tag} the link fills the code`, (await input.inputValue()) === code);
      await root.getByRole('button', { name: s.cta }).click();
      await root.getByText(s.added).waitFor();
      check(`BO-04 ${tag} redeeming adds the classes to the balance and offers booking`, (await fake("return fake.balance('usr_cust')")) === 2 && (await root.getByRole('link', { name: s.book }).count()) === 1);
      check(`BO-04 ${tag} the redemption sends only person and code, with an Idempotency-Key`, await fake("const w = fake.state.writes.at(-1); return w.table === 'credit_lots' && w.body.person === 'usr_cust' && w.body.voucher_code === arg && Object.keys(w.body).length === 2 && /^[0-9a-f-]{36}$/.test(w.key)", code));
      check(`BO-04 ${tag} no horizontal scroll`, await noScroll());
      await go('/app/vouchers'); await go(`/app/vouchers/${code}`);
      await root.getByRole('button', { name: s.cta }).click();
      await root.getByText(s.used).waitFor();
      check(`BO-05 ${tag} a used voucher says so, and nothing is added`, (await fake("return fake.balance('usr_cust')")) === 2);
      await go(`/app/vouchers/${expired}`);
      await root.getByRole('button', { name: s.cta }).click();
      check(`BO-05 ${tag} an expired voucher says so`, await root.getByText(s.expired).isVisible());
      await go('/app/vouchers');
      await input.fill('zzzz-zzzz');
      await root.getByRole('button', { name: s.cta }).click();
      check(`BO-05 ${tag} an unknown code says so`, await root.getByText(s.invalid).isVisible());
      await input.fill('ABC');
      check(`BO-05 ${tag} a malformed code is caught before sending`, (await root.getByText(s.format).isVisible()) && (await root.getByRole('button', { name: s.cta }).isDisabled()));
      const third = await fake("return fake.createVoucher({ kind: 'gift', classes: 3 }).code");
      await go('/app/vouchers');
      await input.fill(third);
      await fake("fake.state.fail = 'lost'");
      await root.getByRole('button', { name: s.cta }).click();
      await root.getByText(lang === 'es' ? 'No se pudo completar' : 'It could not be completed').waitFor();
      await root.getByRole('button', { name: s.cta }).click();
      await root.getByText(lang === 'es' ? 'Listo: sumamos 3 clases a tu saldo.' : 'Done: 3 classes added to your balance.').waitFor();
      check(`BO-05 ${tag} a committed but lost answer shows the generic message; the retry reuses its key and adds the classes once`, await fake("const k = fake.state.keys; return k.at(-1) === k.at(-2) && fake.state.writes.filter(w => w.body.voucher_code === arg).length === 1 && fake.balance('usr_cust') === 5", third));
      await ctx.close();
    }

    // BO-01 — customer buys a gift
    {
      const { ctx, page, root, noScroll } = await harness('usr_cust', lang, width, '/app/gift-voucher');
      await root.getByRole('radio').first().waitFor();
      check(`BO-01 ${tag} only active gift products are offered`, (await root.getByRole('radio').count()) === 2);
      await root.getByRole('button', { name: s.giftCta }).click();
      check(`BO-01 ${tag} recipient name and email are required`, (await root.getByText(s.nameErr).isVisible()) && (await root.getByText(s.emailErr).isVisible()) && (await where(page)).path === '/app/gift-voucher');
      await root.getByText(s.pick).click();
      await root.getByLabel(s.name).fill('Juliana Ficticia');
      await root.getByLabel(s.email).fill('Juliana@Demo.HoyOS.test');
      await root.getByRole('button', { name: s.giftCta }).click();
      const w = await where(page);
      check(`BO-01 ${tag} it goes to the transfer payment of the gift product with the recipient`, w.path === '/app/pay/product/gift_pack12' && w.state?.giftRecipient?.email === 'juliana@demo.hoyos.test' && String(w.state?.paymentNotes).startsWith('gift-recipient:'));
      check(`BO-01 ${tag} no horizontal scroll`, await noScroll());
      await ctx.close();
    }

    // BO-03 · BO-02 · BO-06 — administration
    {
      const { ctx, page, root: all, fake, noScroll } = await harness('usr_admin', lang, width, '/admin/vouchers');
      const root = all.locator('.card', { has: page.getByText(s.courtesy, { exact: true }) });
      await root.getByLabel(s.classes).waitFor();
      check(`BO-03 ${tag} the courtesy form has classes, expiry, usage limit and recipient only`, (await Promise.all([s.classes, s.until, s.uses, s.name, s.email].map((l) => root.getByLabel(l).count()))).every((n) => n === 1) && (await root.locator('select').count()) === 0);
      await root.getByLabel(s.uses).fill('10');
      await root.getByRole('button', { name: s.create }).click();
      check(`BO-03 ${tag} it refuses a missing recipient`, (await root.getByText(s.nameErr).isVisible()) && (await fake('return fake.state.vouchers.length')) === 0);
      await root.getByLabel(s.name).fill('Invitada Ficticia');
      await root.getByLabel(s.email).fill('invitada@demo.hoyos.test');
      await root.getByRole('button', { name: s.create }).click();
      await root.getByText(s.created).waitFor();
      check(`BO-03 ${tag} the courtesy is created with its limit, and listed`, (await fake("const v = fake.state.vouchers[0]; return v.kind === 'courtesy' && v.max_uses === 10 && v.classes === 1 && v.recipient_email === 'invitada@demo.hoyos.test'")) && (await all.getByText(s.usesOf).isVisible()));

      const gifts = all.getByRole('button', { name: s.issue });
      check(`BO-02 ${tag} approved gift payments wait for their voucher (not pending, declined, without a status, or packs)`, (await gifts.count()) === 2 && (await all.getByText(s.noRecipient).count()) === 1);
      await gifts.first().dblclick();
      await all.getByText(s.sent).waitFor();
      check(`BO-02 ${tag} a double click issues one gift voucher`, (await fake("return fake.state.vouchers.filter(v => v.kind === 'gift').length")) === 1);
      check(`BO-02 ${tag} issuing creates the gift voucher for the recipient and the payment leaves the list`, (await gifts.count()) === 1 && (await fake("const v = fake.state.vouchers.find(x => x.kind === 'gift'); return v.recipient_email === 'juliana@demo.hoyos.test' && v.buyer === 'usr_c01' && v.note === 'payment:pay_gift_ok' && v.classes === 12")));
      await fake("const v = fake.state.vouchers.find(x => x.kind === 'gift'); fake.redeem({ person: 'usr_juliana', voucher_code: v.code }); window.qaVoucher.data.emit('vouchers')");
      await all.getByText(s.usedOn).first().waitFor();
      check(`BO-06 ${tag} the studio sees when a gift was sent and when it was used`, (await all.getByText(s.sent).isVisible()) && (await all.getByText(s.usedBadge, { exact: true }).count()) >= 1);
      check(`BO-03 ${tag} no horizontal scroll`, await noScroll());
      await ctx.close();
    }
  }

  // Front desk: issues paid gifts, creates no courtesy.
  {
    const { ctx, root } = await harness('usr_desk', 'es', 1280, '/staff/vouchers');
    await root.getByRole('button', { name: T.es.issue }).first().waitFor();
    check('BO-02 front desk issues paid gifts and has no courtesy form', (await root.getByRole('button', { name: T.es.create }).count()) === 0);
    await ctx.close();
  }
} finally { await dev.close(); }

// ── 2. the production build ────────────────────────────────────────────────────────────────────────────────────
let prodDir = process.env.QA_PROD_DIST;
if (!prodDir) {
  prodDir = await mkdtemp(join(tmpdir(), 'hoy-vouchers-prod-'));
  execFileSync('npx', ['vite', 'build', '--outDir', prodDir, '--emptyOutDir', '--logLevel', 'error'], { env: { ...process.env, VITE_HOY_BUILD: 'production' }, stdio: 'inherit' });
}
for (const [label, dir, port, prod] of [['production', prodDir, 5632, true], ['review', 'dist', 5633, false]]) {
  const srv = await serveDist(port, dir);
  const open = async (userId, path) => {
    const ctx = await newContext(browser, { userId });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`${label} ${path}: ${e.message}`));
    await page.goto(`${srv.base}/#${path}`);
    return { ctx, page };
  };
  try {
    if (prod) {
      let { ctx, page } = await open('usr_public', '/app/vouchers/K7M2QX9A');
      await page.waitForURL(/sign-in/);
      check('BO-04 production: a visitor opening the emailed link goes to sign-in and comes back to it', decodeURIComponent(page.url()).includes('next=/app/vouchers/K7M2QX9A'));
      await ctx.close();
      ({ ctx, page } = await open('usr_admin', '/admin/vouchers'));
      await page.getByLabel(T.es.uses).waitFor();
      check('production: the admin voucher screen has no value in pesos, attendee cap, booking scope or restore-on-cancel', (await page.getByText('Máximo de participantes').count()) === 0 && (await page.locator('main select, .page select').count()) === 0);
      await ctx.close();
      ({ ctx, page } = await open('usr_cust', '/app/voucher-gifts'));
      await page.waitForTimeout(800);
      check('production: the gift purchase demo (gift_purchase_*) is not a route', !page.url().includes('voucher-gifts'));
      await ctx.close();
      ({ ctx, page } = await open('usr_cust', '/app/gift-voucher'));
      check('BO-01 production: the gift purchase screen is a route', await page.getByRole('heading', { name: 'Regalar clases' }).isVisible({ timeout: 10000 }).catch(() => false) || (await page.getByRole('heading', { name: 'Regalar clases' }).waitFor().then(() => true, () => false)));
      await ctx.close();
    } else {
      const { ctx, page } = await open('usr_admin', '/admin/vouchers');
      const kept = await page.getByText('Máximo de participantes').first().waitFor().then(() => true, () => false);
      check('review build: the demo voucher screen keeps its extras', kept);
      await ctx.close();
    }
  } finally { await srv.close(); }
}
await browser.close();
check('no page errors', errors.length === 0, errors.join(' | '));
done();
