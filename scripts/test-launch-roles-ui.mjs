// PL-05 — "Customer, Front desk and Administration see and do only what the approved permissions matrix states",
// including Q-13: reception records an expense but sees no income. Browser checks on the built app with fictional demo
// users: which launch routes each role opens or is refused, the income figures each role sees, and the S-11 reception
// expense form end to end. Saves the S-11 captures (ES/EN, 390/1280) the hub map needs.
// The matrix below is the launch reading of docs/roles.md + Q-13; client checks do not prove server authorization.
// Run: npm run build && node scripts/test-launch-roles-ui.mjs
import { mkdir } from 'node:fs/promises';
import { serveDist, launchBrowser, newContext, reporter } from './lib/launch-qa.mjs';

const { check, done } = reporter('PL-05');
const USERS = { customer: 'usr_c01', front_desk: 'usr_desk', admin: 'usr_admin', public: 'usr_public' };
// route → roles that may open it (the rest must be refused).
const MATRIX = {
  '/app': ['customer'], '/app/schedule': ['customer'], '/app/plans': ['customer'], '/app/classes': ['customer'], '/app/history': ['customer'],
  '/staff': ['front_desk', 'admin'], '/staff/checkin': ['front_desk', 'admin'], '/staff/register': ['front_desk', 'admin'], '/staff/expense': ['front_desk', 'admin'],
  '/admin/crm': ['front_desk', 'admin'],
  '/admin': ['admin'], '/admin/finance': ['admin'], '/admin/finance/expenses': ['admin'], '/admin/settings': ['admin'], '/admin/class-schedule': ['admin'],
  // Role Matrix tab rows that differed from the route roles before the matrix was enforced:
  '/manual': ['front_desk', 'admin'], '/docs': ['front_desk', 'admin'], '/admin/whatsapp': ['admin'], '/admin/emails': ['admin'],
  '/admin/vouchers': ['admin'], '/admin/content': ['admin'], '/staff/transfers': ['front_desk', 'admin'], '/staff/inbox': ['front_desk', 'admin'], '/staff/rooms': ['front_desk', 'admin'],
  '/site': ['customer', 'front_desk', 'admin', 'public'], '/site/plans': ['customer', 'front_desk', 'admin', 'public'],
};

const srv = await serveDist(5323);
const browser = await launchBrowser();
const errors = [];
const route = (page) => new URL(page.url()).hash.slice(1);
async function open(role, path, opts = {}) {
  const ctx = await newContext(browser, { userId: USERS[role], ...opts });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${role} ${path}: ${e.message}`));
  await page.clock.install({ time: new Date('2026-10-28T15:00:00Z') });
  await page.goto(`${srv.base}/#${path}`);
  await page.waitForTimeout(1200);
  return { ctx, page };
}

try {
  // 1. route matrix
  for (const role of Object.keys(USERS)) {
    const ctx = await newContext(browser, { userId: USERS[role] });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`${role}: ${e.message}`));
    const wrong = [];
    for (const [path, allowed] of Object.entries(MATRIX)) {
      await page.goto(`${srv.base}/#${path}`); await page.waitForTimeout(500);
      const refused = /^\/(no-access|auth\/sign-in)/.test(route(page));
      if (allowed.includes(role) === refused) wrong.push(`${path} ${refused ? 'refused' : 'opened'}`);
    }
    check(`PL-05 ${role}: opens exactly its launch routes (${Object.keys(MATRIX).length} checked)`, wrong.length === 0, wrong.join(', '));
    await ctx.close();
  }

  // 2. Q-13 income visibility
  let { ctx, page } = await open('front_desk', '/staff');
  await page.locator('.stat-tile, .stattile, [class*="stat"]').first().waitFor().catch(() => {});
  const deskHome = await page.locator('main').innerText();
  check('PL-05 Q-13 the reception home shows no money total', !/\$\s?\d{1,3}(\.\d{3})+/.test(deskHome), deskHome.match(/\$\s?\d{1,3}(\.\d{3})+/)?.[0]);
  check('PL-05 Q-13 the reception home shows the payments waiting for review instead', /Pagos por revisar/i.test(deskHome));
  await ctx.close();
  ({ ctx, page } = await open('admin', '/staff'));
  check('PL-05 administration still sees today\'s takings on the staff home', /\$\s?\d/.test(await page.locator('main').innerText()));
  await ctx.close();
  ({ ctx, page } = await open('front_desk', '/admin/crm/usr_c01'));
  const crm = await page.locator('main').innerText();
  const ltvCard = crm.match(/Valor total \(LTV\)\s*\n\s*([^\n]+)/i)?.[1] ?? '';
  check('PL-05 Q-13 reception does not see a member\'s lifetime value', ltvCard.trim() === '—', ltvCard);
  await ctx.close();

  // 3. S-11 reception expense: record one, then the ledger stays closed
  ({ ctx, page } = await open('front_desk', '/staff/expense'));
  await page.locator('[data-desk-expense-form]').waitFor();
  const form = page.locator('[data-desk-expense-form]');
  await form.getByRole('button').last().click();
  check('S-11 an empty form is refused with field errors', (await page.getByText('Escribe el concepto').count()) > 0);
  await form.getByLabel(/Concepto/).fill('Papel higiénico (FICTICIO)');
  await form.getByLabel(/Valor/).fill('18000');
  await form.getByRole('button').last().click();
  await page.getByText('Gasto registrado.').waitFor({ timeout: 10000 }).catch(() => {});
  check('PL-05 Q-13 reception records an expense from S-11', (await page.getByText('Gasto registrado.').count()) === 1);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('hoyos.db.v1')).db.expenses.filter((e) => e.concept === 'Papel higiénico (FICTICIO)'));
  check('S-11 the expense is stored once, dated and paid today, by the desk user', stored.length === 1 && stored[0].amount === 18000 && stored[0].created_by === 'usr_desk' && stored[0].paid_on === '2026-10-28');
  check('PL-05 Q-13 S-11 shows no ledger, list or totals', (await page.locator('main table, main [role="table"]').count()) === 0 && !/Total/.test(await page.locator('main').innerText()));
  await form.getByLabel(/Concepto/).fill('Arriendo bodega (FICTICIO)');
  await form.getByLabel(/Tipo/).selectOption('fixed');
  await form.getByLabel(/Valor/).fill('250000');
  await form.getByRole('button').last().click();
  await page.waitForTimeout(800);
  const fixed = await page.evaluate(() => JSON.parse(localStorage.getItem('hoyos.db.v1')).db.expenses.filter((e) => e.concept === 'Arriendo bodega (FICTICIO)'));
  check('PL-05 Q-13 reception records a fixed expense too', fixed.length === 1 && fixed[0].kind === 'fixed');
  await form.getByLabel(/Concepto/).fill('<script>alert(1)</script>');
  await form.getByLabel(/Valor/).fill('900000000');
  await form.getByRole('button').last().click();
  check('PL-07 S-11 an out-of-range amount is refused', (await page.getByText(/entre 1 y 5\.000\.000/).count()) > 0);
  check('PL-07 S-11 the concept field is length-bounded', (await form.getByLabel(/Concepto/).getAttribute('maxlength')) === '120');
  await page.goto(`${srv.base}/#/admin/finance/expenses`); await page.waitForTimeout(800);
  check('PL-05 Q-13 reception is refused the expense ledger', route(page).startsWith('/no-access'));
  await ctx.close();

  // 4. S-11 captures for the hub map and docs
  await mkdir('docs/screenshots/S-11', { recursive: true });
  for (const lang of ['es', 'en']) for (const width of [390, 1280]) {
    ({ ctx, page } = await open('front_desk', '/staff/expense', { lang, width }));
    await page.locator('[data-desk-expense-form]').waitFor();
    await page.screenshot({ path: `docs/screenshots/S-11/${lang}-${width}.jpg`, quality: 72, type: 'jpeg', animations: 'disabled', fullPage: true });
    await ctx.close();
  }
  check('S-11 captures saved (es/en × 390/1280)', true);
} finally {
  check('no page threw while testing PL-05', errors.length === 0, errors.slice(0, 5).join(' | '));
  await browser.close(); await srv.close();
}
done();
