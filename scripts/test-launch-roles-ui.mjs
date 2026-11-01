// Hoy all-roles (lane C) — "every one of Hoy's 11 roles signs in to its own home" on the PRODUCTION build
// (VITE_HOY_BUILD=production): each role signs in through a fake Clerk, Company OS `/me` (faked here, fictional people)
// gives it its role key, and it must land on its home, see its own menu, and be refused another role's screens. A
// visitor (public) gets the website and is sent to sign-in from private pages. The customer home shows the active
// pack and the admin dashboard counts customers with an active pack (memberships → packs, R-05).
// Then, when dist/ is the review build, the PL-05 checks on the review build (demo users, MockProvider): the launch
// matrix for the four launch columns and the S-11 reception expense (Q-13), unchanged.
// Client checks shape the screens; Company OS and the Hoy server enforce access.
// Run: npm run build:production && cp -R dist /tmp/prod && npm run build && QA_PROD_DIST=/tmp/prod node scripts/test-launch-roles-ui.mjs
//      (QA_PROD_DIST defaults to dist/ when that is a production build; the review half then says it skipped)
import { createServer } from 'node:http';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import { serveDist, launchBrowser, newContext, reporter } from './lib/launch-qa.mjs';

const { check, done } = reporter('11 roles');
const isProd = (dir) => existsSync(join(dir, 'index.html')) && readdirSync(join(dir, 'assets')).filter((f) => f.endsWith('.js')).some((f) => readFileSync(join(dir, 'assets', f), 'utf8').includes('clerk-js'));
const PROD = resolve(process.env.QA_PROD_DIST ?? 'dist');
if (!isProd(PROD)) { console.error(`${PROD} is not a production build: run npm run build:production (or set QA_PROD_DIST)`); process.exit(1); }
const REVIEW = resolve('dist');
const reviewBuilt = existsSync(join(REVIEW, 'index.html')) && !isProd(REVIEW);

const TENANT = 'hoy-test';
const HOST = 'fake.clerk.accounts.dev';
const PK = `pk_test_${Buffer.from(`${HOST}$`).toString('base64')}`;
const FAKE_CLERK = readFileSync(new URL('./fixtures/fake-clerk.js', import.meta.url), 'utf8');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.woff2': 'font/woff2' };
const TODAY = '2026-10-28';

// One fictional person per role: the Company OS role keys /me answers (Hoy's recipe), the home and the menu entry it
// must see, and screens of other roles it must be refused.
const ROLES = {
  super_admin: { keys: ['super_admin'], superAdmin: true, home: '/admin', opens: ['/admin/settings', '/staff/checkin', '/teach', '/dev', '/admin/finance'], refused: [] },
  admin: { keys: ['administrator', 'super_admin'], superAdmin: true, home: '/admin', opens: ['/admin/settings', '/staff/checkin', '/teach'], refused: ['/dev', '/app'] },
  coordinator: { keys: ['booking_manager'], home: '/staff', opens: ['/staff/checkin', '/admin/crm', '/teach'], refused: ['/admin/finance', '/staff/expense', '/app', '/dev'] },
  front_desk: { keys: ['front_desk'], home: '/staff', opens: ['/staff/checkin', '/staff/expense'], refused: ['/admin/settings', '/admin', '/teach', '/app'] },
  finance: { keys: ['treasurer'], home: '/admin', opens: ['/admin/finance'], refused: ['/staff/checkin', '/staff/expense', '/app', '/dev'] },
  teacher: { keys: ['coach'], home: '/teach', opens: [], refused: ['/staff/checkin', '/admin', '/admin/finance', '/dev'] },
  maintenance: { keys: ['maintenance'], home: '/staff', opens: [], refused: ['/admin', '/staff/checkin', '/admin/finance', '/app'] },
  marketing: { keys: ['marketing'], home: '/admin/content', opens: ['/admin/crm', '/admin/emails'], refused: ['/admin/finance', '/admin/settings', '/staff/checkin', '/app'] },
  developer: { keys: ['developer'], home: '/dev', opens: [], refused: ['/admin', '/admin/finance', '/staff/checkin', '/app'] },
  customer: { keys: ['member'], home: '/app', opens: ['/app/plans'], refused: ['/staff', '/admin', '/teach', '/dev'] },
};
const ACCOUNTS = Object.fromEntries(Object.keys(ROLES).map((r) => [`user_${r}`, { emails: [{ id: `ea_${r}`, email: `${r}@example.test`, verified: true }], primary: `ea_${r}` }]));

// ── the fake Hoy server + Company OS ────────────────────────────────────────────────────────────────────────────
const userOf = (req) => /^Bearer fake\.([^.]+)\.[^.]+$/.exec(req.headers.authorization ?? '')?.[1] ?? null;
const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
const readBody = (req) => new Promise((r) => { let s = ''; req.on('data', (c) => { s += c; }); req.on('end', () => { try { r(JSON.parse(s || '{}')); } catch { r({}); } }); });
const roleOfUser = (user) => user?.startsWith('user_') ? user.slice(5) : null;
// Credits for the customer (an 8-class pack to 31 Dec) and two other customers (one with classes, one used up).
const LOTS = [
  { id: 'lot_c1', data: { person: 'per_customer', source: 'purchase', product: 'prd_pack', valid_from: '2026-10-01', valid_until: '2026-12-31', frozen_from: null, frozen_until: null, voucher: null } },
  { id: 'lot_c2', data: { person: 'per_other', source: 'purchase', product: 'prd_pack', valid_from: '2026-10-01', valid_until: '2026-12-31', frozen_from: null, frozen_until: null, voucher: null } },
  { id: 'lot_c3', data: { person: 'per_done', source: 'purchase', product: 'prd_pack', valid_from: '2026-09-01', valid_until: '2026-11-30', frozen_from: null, frozen_until: null, voucher: null } },
];
const LEFT = [{ lot: 'lot_c1', left: 8 }, { lot: 'lot_c2', left: 3 }, { lot: 'lot_c3', left: 0 }];
const queries = [];
function answerQuery(user, q) {
  queries.push({ user, entity: q.entity, aggregate: !!q.aggregate });
  const role = roleOfUser(user);
  if (q.entity === 'person') return [{ id: `per_${role}`, data: { name: `${role} Prueba`, user, email: `${role}@example.test` }, createdAt: '2026-10-01T10:00:00Z' }];
  if (q.entity === 'credit_lot') return role === 'customer' ? LOTS.filter((l) => l.data.person === 'per_customer') : LOTS;
  if (q.entity === 'credit_entry' && q.aggregate) return role === 'customer' ? LEFT.filter((l) => l.lot === 'lot_c1') : LEFT;
  if (q.entity === 'credit_entry') {
    const mine = role === 'customer';
    return mine ? [{ id: 'ce_grant', data: { person: 'per_customer', delta: 8, reason: 'grant', lot: { id: 'lot_c1', source: 'purchase', valid_until: '2026-12-31', product: 'prd_pack', payment: null, freezable: true } }, createdAt: '2026-10-01T10:00:00Z' }] : [];
  }
  return [];
}
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://127.0.0.1').pathname;
  if (path === '/app-config.json') return json(res, 200, { tenant: TENANT, apiBase: '/api/cos', clerkPublishableKey: PK, environment: 'test' });
  if (path.startsWith(`/api/cos/t/${TENANT}/`)) {
    const user = userOf(req);
    if (!user) return json(res, 401, { error: 'unauthorized' });
    const role = roleOfUser(user);
    const route = path.slice(`/api/cos/t/${TENANT}`.length);
    if (route === '/me') {
      const r = ROLES[role];
      return r ? json(res, 200, { tenant: { slug: TENANT, timezone: 'America/Bogota' }, user: { id: user, name: `${role} Prueba`, email: `${role}@example.test` }, roleKeys: r.keys, isSuperAdmin: !!r.superAdmin, caps: [], entities: [] }) : json(res, 403, { error: 'no access to this tenant' });
    }
    if (route === '/query' && req.method === 'POST') return json(res, 200, { data: answerQuery(user, await readBody(req)) });
    if (route === '/batch' && req.method === 'POST') return json(res, 200, { results: [] });
    if (req.method === 'GET' && route.startsWith('/api/')) return json(res, 200, { data: [] });
    if (req.method === 'GET') return json(res, 404, { error: 'not_found' });
    return json(res, 403, { error: 'forbidden' });
  }
  try {
    let file = resolve(PROD, '.' + decodeURIComponent(path));
    if (file !== PROD && !file.startsWith(PROD + sep)) { res.writeHead(403); return res.end(); }
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' }); res.end(await readFile(file));
  } catch { res.writeHead(404); res.end('Not found'); }
});
await new Promise((r) => server.listen(5193, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:5193';

const browser = await launchBrowser();
const errors = [];
const route = (page) => decodeURIComponent(new URL(page.url()).hash.slice(1));
async function openProd(path, { width = 1280, lang = 'es' } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  await ctx.route(`https://${HOST}/npm/@clerk/clerk-js@*/dist/clerk.browser.js`, (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_CLERK }));
  await ctx.addInitScript(({ accounts, pk, lang }) => {
    window.__fakeClerkConfig = { accounts, publishableKey: pk };
    if (!sessionStorage.getItem('qa-init')) { sessionStorage.setItem('qa-init', '1'); localStorage.setItem('hoyos.lang', lang); }
  }, { accounts: ACCOUNTS, pk: PK, lang });
  const page = await ctx.newPage();
  await page.clock.install({ time: new Date(`${TODAY}T15:00:00Z`) });
  page.on('pageerror', (e) => errors.push(`${path}: ${e.message}`));
  await page.goto(`${BASE}/#${path}`);
  await page.waitForTimeout(800);
  return { ctx, page };
}
async function signIn(page, email) {
  await page.locator('[data-step="email"] input').fill(email);
  await page.locator('[data-step="email"] button[type=submit]').click();
  await page.locator('[data-step="code"]').waitFor({ timeout: 5000 });
  await page.locator('[data-step="code"] input').fill('424242');
  await page.locator('[data-step="code"] button[type=submit]').click();
  await page.waitForTimeout(1500);
}
const go = async (page, path) => { await page.goto(`${BASE}/#${path}`); await page.waitForTimeout(700); return route(page); };
const refusedAt = (r) => r.startsWith('/no-access') || r.startsWith('/auth/sign-in');
// The menu: links in the shell's navigation (sidebar, top bar or bottom dock), as hash paths.
const menu = (page) => page.evaluate(() => [...document.querySelectorAll('nav a[href], aside a[href], header a[href]')].map((a) => decodeURIComponent((a.getAttribute('href') || '').replace(/^.*#/, ''))));

try {
  for (const [role, r] of Object.entries(ROLES)) {
    const { ctx, page } = await openProd('/auth/sign-in');
    await signIn(page, `${role}@example.test`);
    check(`${role}: signs in and lands on its home ${r.home}`, route(page) === r.home, route(page));
    check(`${role}: the home renders (no sign-in, no error screen, no endless spinner)`, (await page.locator('[data-session-problem]').count()) === 0 && (await page.locator('main').count()) > 0 && (await page.locator('[aria-busy="true"]').count()) === 0);
    const links = await menu(page);
    check(`${role}: its menu links its home`, links.includes(r.home), links.join(' '));
    const foreign = Object.values(ROLES).map((x) => x.home).filter((h) => h !== r.home && r.refused.includes(h));
    check(`${role}: its menu links no screen it is refused`, !links.some((l) => r.refused.includes(l)), links.filter((l) => r.refused.includes(l)).join(' ') + ` (foreign homes ${foreign.join(' ')})`);
    for (const p of r.opens) { const at = await go(page, p); check(`${role}: opens ${p}`, at === p, at); }
    // Changed on purpose (lane Y2; owner 2026-11-01, review round 2): a studio login on a customer page is enrolled as a
    // customer there instead of the no-access page; the customer screens stay closed (no customer shell) until it is.
    for (const p of r.refused) {
      const at = await go(page, p);
      const joinOffer = p.startsWith('/app') && at === p && (await page.locator('[data-enrol-customer]').count()) === 1 && (await page.locator('.appshell').count()) === 0;
      check(`${role}: is refused ${p}${joinOffer ? ' (enrolment as a customer)' : ''}`, refusedAt(at) || joinOffer, at);
    }
    if (role === 'customer') {
      await go(page, '/app');
      await page.locator('[data-plan-card]').first().waitFor({ timeout: 5000 }).catch(() => {});
      const card = await page.locator('[data-plan-card]').first().innerText().catch(() => '');
      check('C-01 the customer home shows the active pack: classes left and expiry (from credits, not memberships)', /8/.test(card) && /31/.test(card) && /dic/i.test(card), card);
      check('C-01 the home does not tell a pack holder they have no package', !/Aún no tienes paquete/.test(await page.locator('main').innerText()));
    }
    if (role === 'admin') {
      await go(page, '/admin');
      await page.waitForTimeout(800);
      const tile = await page.locator('[data-members-tile]').first().innerText().catch(() => '');
      check('M-01 the dashboard counts customers with an active pack (2 of 3)', /\b2\b/.test(tile), tile);
      check('M-01 the dashboard reads credit lots and their balances, not memberships', queries.some((q) => q.user === 'user_admin' && q.entity === 'credit_lot') && queries.some((q) => q.user === 'user_admin' && q.entity === 'credit_entry' && q.aggregate) && !queries.some((q) => /membership/.test(q.entity)));
    }
    await ctx.close();
  }

  // public: the website opens, private screens send the visitor to sign-in
  const { ctx, page } = await openProd('/site');
  check('public: the website opens signed out', route(page).startsWith('/site'), route(page));
  for (const p of ['/app', '/staff', '/admin', '/teach', '/dev']) { const at = await go(page, p); check(`public: ${p} sends the visitor to sign-in`, at.startsWith('/auth/sign-in'), at); }
  await ctx.close();
  check('no page threw on the production build', errors.length === 0, errors.slice(0, 5).join(' | '));
} finally {
  await browser.close();
  server.close();
}

// ── review build: PL-05 (unchanged) ─────────────────────────────────────────────────────────────────────────────
if (!reviewBuilt) console.log('note review build checks skipped: dist/ is not a review build (npm run build)');
else await reviewChecks();
done();

async function reviewChecks() {
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
}
