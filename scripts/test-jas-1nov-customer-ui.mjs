// Hoy programme hoy-jas-1nov, lane B (customer and identity), in the browser on the PRODUCTION build (VITE_HOY_BUILD=production).
// Like test-auth-production-ui.mjs, the test plays the Hoy server (dist + /app-config.json + a fake Company OS) and serves
// scripts/fixtures/fake-clerk.js in place of Clerk's CDN script. The fake Company OS answers /me, /signup and /query with
// real response shapes (`{ data: [{ id, data: {...}, createdAt }] }`, docs/integration-guide.md); like Company OS, a
// sign-up that would create a person without a name is refused 400 `validation` (Company-OS signup.ts). Fictional only.
// - enrolment name: a nameless login is asked for its name (2+ characters, no "@"), the POST carries it; a named staff
//   login's enrolment is unchanged; hostile inputs (an HTML name is stored and shown as text, an over-long one is cut);
// - C-01d: after "Continue for now" the customer area opens, but checkout, gift purchase and Plans show "record your
//   consent to book" with Retry, which reruns the consent step and then opens the page;
// - RES-02: the greeting names the person (own person row), never the email; no demo announcement in production;
// - PRO-05: the Santa María pack shows in the app's Plans only for an affiliate member facet;
// - RES-01: the week grid shows Sunday at 1024 and 768 px; the chosen day survives a refetch and Back.
// Run: npm run build:production && node scripts/test-jas-1nov-customer-ui.mjs   (QA_PROD_DIST=<dir> to test another dir)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import { launchBrowser, reporter } from './lib/launch-qa.mjs';

const { check, done } = reporter('hoy-jas-1nov customer (production build)');
const DIST = resolve(process.env.QA_PROD_DIST ?? 'dist');
const TENANT = 'hoy-test';
const HOST = 'fake.clerk.accounts.dev';
const PK = `pk_test_${Buffer.from(`${HOST}$`).toString('base64')}`;
const FAKE_CLERK = readFileSync(new URL('./fixtures/fake-clerk.js', import.meta.url), 'utf8');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.woff2': 'font/woff2' };

if (!existsSync(join(DIST, 'index.html'))) { console.error(`${DIST}/index.html missing: run npm run build:production first`); process.exit(1); }
const entry = readdirSync(join(DIST, 'assets')).filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(DIST, 'assets', f), 'utf8')).join('\n');
if (!entry.includes('clerk-js')) { console.error(`${DIST} is not a production build (no Clerk): run npm run build:production`); process.exit(1); }

// ── the fake Hoy server + Company OS ────────────────────────────────────────────────────────────────────────────
const CONSENTS = [{ document: 'terms', version: '2026-10-01' }, { document: 'privacy', version: '2026-10-01' }];
const at = '2026-10-01T10:00:00.000Z';
const PRODUCTS = [
  { id: 'prd_pack12', data: { key: 'pack12', name: 'Paquete de 12 clases', kind: 'pack', price: 540000, credits: 12, validity_days: 90, active: true, freezable: true, audience: null, valid_from: '2026-01-01', valid_until: null }, createdAt: at, updatedAt: at },
  { id: 'prd_pack12_smtc', data: { key: 'pack12_smtc', name: 'Paquete de 12 clases · Santa María', kind: 'pack', price: 480000, credits: 12, validity_days: 90, active: true, freezable: true, audience: 'affiliate', valid_from: '2026-01-01', valid_until: null }, createdAt: at, updatedAt: at },
  { id: 'prd_trial', data: { key: 'trial', name: 'Clase de prueba', kind: 'trial', price: 30000, credits: 1, validity_days: 30, active: true, freezable: false, audience: null, valid_from: '2026-01-01', valid_until: null }, createdAt: at, updatedAt: at },
];
const api = {};
const userOf = (req) => /^Bearer fake\.([^.]+)\.[^.]+$/.exec(req.headers.authorization ?? '')?.[1] ?? null;
const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
const bodyOf = (req) => new Promise((r) => { let s = ''; req.on('data', (c) => { s += c; }); req.on('end', () => { try { r(JSON.parse(s || 'null')); } catch { r(null); } }); });
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://127.0.0.1').pathname;
  if (path === '/app-config.json') return json(res, 200, { tenant: TENANT, apiBase: '/api/cos', clerkPublishableKey: PK, environment: 'test' });
  if (path.startsWith(`/api/cos/t/${TENANT}/`)) {
    const user = userOf(req);
    if (!user) return json(res, 401, { error: 'unauthorized' });
    const route = path.slice(`/api/cos/t/${TENANT}`.length);
    const m = api.members[user];
    if (route === '/me') return m ? json(res, 200, { tenant: { slug: TENANT }, user: { id: user, name: m.name, email: m.email }, roleKeys: m.roleKeys, isSuperAdmin: false, caps: [], entities: [] }) : json(res, 403, { error: 'no access to this tenant' });
    if (route === '/signup' && req.method === 'GET') {
      const registered = !!(m?.roleKeys.includes('member') && m.registered);
      return json(res, 200, { enabled: true, consents: CONSENTS, personFields: ['name', 'phone'], facetFields: [], registered });
    }
    if (route === '/signup' && req.method === 'POST') {
      const body = await bodyOf(req);
      api.signups.push({ user, body });
      if (m?.roleKeys.includes('member') && m.registered) return json(res, 409, { error: 'already_registered' });
      if (api.emailLinked) return json(res, 409, { error: 'email_linked_to_other_login', message: 'a person with this email is linked to another login' });
      const missing = CONSENTS.filter((c) => !body?.consents?.some((x) => x.document === c.document && x.version === c.version));
      if (missing.length) return json(res, 422, { error: 'consent_required', details: { required: CONSENTS } });
      // Company OS (signup.ts:258): the person it creates needs a name. A login with no person name and none sent: 400.
      const name = typeof body?.person?.name === 'string' ? body.person.name : '';
      if (api.rejectName || (!m?.personName && !name)) return json(res, 400, { error: 'validation', message: 'person.name is required' });
      if (!m.roleKeys.includes('member')) m.roleKeys.push('member');
      m.registered = true;
      if (!m.personName) m.personName = name;
      return json(res, 201, { userId: user, personId: `per_${user}`, facetId: `mem_${user}` });
    }
    if (route === '/query' && req.method === 'POST') {
      const spec = (await bodyOf(req)) ?? {};
      if (spec.entity === 'person') return json(res, 200, { data: m ? [{ id: `per_${user}`, data: { name: m.personName ?? null, email: m.email, user }, createdAt: at, updatedAt: at }] : [] });
      if (spec.entity === 'member') return json(res, 200, { data: m?.roleKeys.includes('member') ? [{ id: `mem_${user}`, data: { person: `per_${user}`, status: 'active', price_audience: m.audience ?? 'general', joined_at: '2026-10-01' }, createdAt: at, updatedAt: at }] : [] });
      if (spec.entity === 'product') return json(res, 200, { data: PRODUCTS });
      return json(res, 200, { data: [] });
    }
    return json(res, 404, { error: 'not_found' });
  }
  try {
    let file = resolve(DIST, '.' + decodeURIComponent(path));
    if (file !== DIST && !file.startsWith(DIST + sep)) { res.writeHead(403); return res.end(); }
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' }); res.end(await readFile(file));
  } catch { res.writeHead(404); res.end('Not found'); }
});
const PORT = Number(process.env.QA_PORT ?? 5341);
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${PORT}`;

// Fictional Clerk accounts. The fake Clerk users carry no first/last name: the name comes from /me (null = nameless).
const acct = (id, email) => ({ emails: [{ id: `ea_${id}`, email, verified: true }], primary: `ea_${id}` });
const ACCOUNTS = {
  user_noname: acct('noname', 'sinnombre@example.test'),
  user_long: acct('long', 'largo@example.test'),
  user_reject: acct('reject', 'rechazo@example.test'),
  user_desk: acct('desk', 'recepcion@example.test'),
  user_nonamecust: acct('nonamecust', 'clientesin@example.test'),
  user_deskcust: acct('deskcust', 'mostrador@example.test'),
  user_ana: acct('ana', 'ana@example.test'),
  user_quiet: acct('quiet', 'callada@example.test'),
  user_affil: acct('affil', 'afiliada@example.test'),
};
const MEMBERS = () => ({
  // Email-code staff logins with no name in Clerk or Company OS (Jas's 1 Nov "no profile" reports).
  user_noname: { name: null, email: 'sinnombre@example.test', roleKeys: ['front_desk'] },
  user_long: { name: null, email: 'largo@example.test', roleKeys: ['front_desk'] },
  user_reject: { name: null, email: 'rechazo@example.test', roleKeys: ['front_desk'] },
  // A named staff login (unchanged: never asked).
  user_desk: { name: 'Rita Recepción', email: 'recepcion@example.test', roleKeys: ['front_desk'], personName: 'Rita Recepción' },
  // A desk-invited customer with no name who never signed up (the consent step asks for the name too).
  user_nonamecust: { name: null, email: 'clientesin@example.test', roleKeys: ['member'], registered: false },
  user_deskcust: { name: 'Dora Mostrador', email: 'mostrador@example.test', roleKeys: ['member'], registered: false, personName: 'Dora Mostrador' },
  // Registered customers: the person row's name differs from the login's; a nameless one; an affiliate.
  user_ana: { name: 'Ana Prueba', email: 'ana@example.test', roleKeys: ['member'], registered: true, personName: 'Anita Persona' },
  user_quiet: { name: null, email: 'callada@example.test', roleKeys: ['member'], registered: true, personName: null },
  user_affil: { name: 'Alba Afiliada', email: 'afiliada@example.test', roleKeys: ['member'], registered: true, personName: 'Alba Afiliada', audience: 'affiliate' },
});

const browser = await launchBrowser();
const errors = [];
async function open(path = '/', { lang = 'es', width = 1280 } = {}) {
  api.members = MEMBERS(); api.signups = []; api.emailLinked = false; api.rejectName = false;
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  await ctx.route(`https://${HOST}/npm/@clerk/clerk-js@*/dist/clerk.browser.js`, (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_CLERK }));
  await ctx.addInitScript(({ accounts, pk, lang }) => {
    window.__fakeClerkConfig = { accounts, publishableKey: pk };
    if (!sessionStorage.getItem('qa-init')) { sessionStorage.setItem('qa-init', '1'); localStorage.setItem('hoyos.lang', lang); }
  }, { accounts: ACCOUNTS, pk: PK, lang });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${path}: ${e.message}`));
  await page.goto(`${BASE}/#${path}`);
  await page.waitForTimeout(800);
  return { ctx, page };
}
const route = (page) => decodeURIComponent(new URL(page.url()).hash.slice(1));
async function signIn(page, email) {
  await page.locator('[data-step="email"] input').fill(email);
  await page.locator('[data-step="email"] button[type=submit]').click();
  await page.locator('[data-step="code"]').waitFor({ timeout: 5000 });
  await page.locator('[data-step="code"] input').fill('424242');
  await page.locator('[data-step="code"] button[type=submit]').click();
  await page.waitForTimeout(1200);
}
const stepOf = (page) => page.locator('[data-enrol-customer="consent"]');
/** The consent step: optionally type a name, tick the box, continue. */
async function submitStep(page, name) {
  const step = stepOf(page);
  await step.waitFor({ timeout: 5000 });
  if (name != null) await step.locator('[data-enrol-name] input').fill(name);
  const box = step.locator('input[type=checkbox]');
  if (await box.count()) await box.check();
  await step.locator('button[type=submit]').click();
  await page.waitForTimeout(1200);
}
const text = (page, sel = 'body') => page.locator(sel).first().innerText().catch(() => '');

let ctx, page;
try {
  // ── 1 · a nameless staff login is asked for its name; refusals on screen; the POST carries it ───────────────────
  ({ ctx, page } = await open('/auth/sign-in'));
  await signIn(page, 'sinnombre@example.test');
  await page.goto(`${BASE}/#/app`); await page.waitForTimeout(1200);
  check('name: a nameless login\'s consent step shows the required name field', (await stepOf(page).locator('[data-enrol-name] input').count()) === 1, route(page));
  await submitStep(page, '');
  check('name: an empty name is refused on screen, nothing sent', /Escribe tu nombre/.test(await text(page, '[data-enrol-customer]')) && api.signups.length === 0);
  await submitStep(page, 'L');
  check('name: a one-character name is refused on screen, nothing sent', /Escribe tu nombre/.test(await text(page, '[data-enrol-customer]')) && api.signups.length === 0);
  await submitStep(page, 'lu@example.test');
  check('name: a name with "@" is refused on screen, nothing sent', /no tu correo/.test(await text(page, '[data-enrol-customer]')) && api.signups.length === 0);
  const hostile = '<b>Lu</b> Nueva';
  await submitStep(page, hostile);
  const sent = api.signups.at(-1);
  check('name: the POST body carries the typed name, as text (hostile HTML unchanged)', sent?.user === 'user_noname' && sent.body.person?.name === hostile && JSON.stringify(sent.body.consents) === JSON.stringify(CONSENTS), JSON.stringify(sent));
  check('name: …then the customer app opens as a customer', (await page.locator('.appshell').count()) === 1 && (await page.locator('[data-enrol-customer]').count()) === 0 && JSON.stringify(api.members.user_noname.roleKeys) === '["front_desk","member"]', route(page));
  const greet = page.locator('.cust-greeting').first();
  check('hostile: the stored HTML name is shown as text in the greeting (no element made from it)', /<b>Lu<\/b>/.test(await greet.innerText().catch(() => '')) && (await greet.locator('b').count()) === 0, await greet.innerText().catch(() => ''));
  await ctx.close();

  // ── over-long name: cut at the limit ───────────────────────────────────────────────────────────────────────────
  ({ ctx, page } = await open('/auth/sign-in'));
  await signIn(page, 'largo@example.test');
  await page.goto(`${BASE}/#/app`); await page.waitForTimeout(1200);
  const long = 'Ana '.repeat(80).trim();
  await submitStep(page, long);
  const longSent = api.signups.at(-1)?.body.person?.name ?? '';
  check('hostile: an over-long name is cut at 200 characters (SIGNUP_FORM_LIMITS.name)', longSent.length > 0 && longSent.length <= 200 && long.startsWith(longSent.trim()), String(longSent.length));
  await ctx.close();

  // ── Company OS refuses the name (400 validation): the field says so ────────────────────────────────────────────
  ({ ctx, page } = await open('/auth/sign-in'));
  await signIn(page, 'rechazo@example.test');
  await page.goto(`${BASE}/#/app`); await page.waitForTimeout(1200);
  api.rejectName = true;
  await submitStep(page, 'Rocío Rechazo');
  check('name: a 400 validation points at the name field (the step stays, the field explains), no raw code', (await stepOf(page).locator('[data-enrol-name] input').count()) === 1 && /Revisa tu nombre/.test(await text(page, '[data-enrol-customer]')) && !/validation/.test(await text(page, '[data-enrol-customer]')), await text(page, '[data-enrol-customer]'));
  api.rejectName = false;
  await submitStep(page, 'Rocío Rechazo');
  check('name: …corrected and sent again, the customer app opens', (await page.locator('.appshell').count()) === 1 && api.signups.at(-1)?.body.person?.name === 'Rocío Rechazo', route(page));
  await ctx.close();

  // ── unchanged: a named staff login is never asked ──────────────────────────────────────────────────────────────
  ({ ctx, page } = await open('/auth/sign-in'));
  await signIn(page, 'recepcion@example.test');
  await page.goto(`${BASE}/#/app`); await page.waitForTimeout(1200);
  check('unchanged: a named staff login\'s step has no name field', (await stepOf(page).count()) === 1 && (await stepOf(page).locator('[data-enrol-name]').count()) === 0);
  await submitStep(page, null);
  check('unchanged: …and sends its own name', api.signups.at(-1)?.body.person?.name === 'Rita Recepción' && (await page.locator('.appshell').count()) === 1, JSON.stringify(api.signups.at(-1)));
  await ctx.close();

  // ── the consent step (a customer who never signed up) asks for a missing name too ─────────────────────────────
  ({ ctx, page } = await open('/auth/sign-in'));
  await signIn(page, 'clientesin@example.test');
  await page.goto(`${BASE}/#/app`); await page.waitForTimeout(1200);
  check('name: a nameless customer\'s consent step asks for the name', (await stepOf(page).locator('[data-enrol-name] input').count()) === 1);
  await submitStep(page, 'Celia Cliente');
  check('name: …and the consent sign-up carries it', api.signups.at(-1)?.user === 'user_nonamecust' && api.signups.at(-1)?.body.person?.name === 'Celia Cliente' && (await page.locator('.appshell').count()) === 1, JSON.stringify(api.signups.at(-1)));
  await ctx.close();

  // ── 2 · C-01d: after "Continue for now" ───────────────────────────────────────────────────────────────────────
  ({ ctx, page } = await open('/auth/sign-in'));
  await signIn(page, 'mostrador@example.test');
  await page.goto(`${BASE}/#/app`); await page.waitForTimeout(1200);
  api.emailLinked = true;
  await submitStep(page, null);
  await page.locator('[data-enrol-customer] [data-consent-later]').click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(800);
  check('C-01d: "Continue for now" opens the customer area', (await page.locator('.appshell').count()) === 1 && (await page.locator('[data-enrol-customer]').count()) === 0, route(page));
  for (const p of ['/app/history', '/app/classes', '/app/account']) {
    await page.goto(`${BASE}/#${p}`); await page.waitForTimeout(900);
    check(`C-01d: ${p} (existing bookings, balance, account) opens`, (await page.locator('.appshell').count()) === 1 && (await page.locator('[data-enrol-customer]').count()) === 0 && route(page) === p, route(page));
  }
  for (const p of ['/app/checkout/occ_1', '/app/gift-voucher', '/app/plans']) {
    await page.goto(`${BASE}/#${p}`); await page.waitForTimeout(900);
    const hold = page.locator('[data-consent-hold]');
    check(`C-01d: ${p} shows "record your consent to book" with Retry`, (await hold.count()) === 1 && /consentimiento/i.test(await hold.innerText().catch(() => '')) && (await hold.locator('[data-consent-retry]').count()) === 1, route(page));
  }
  await page.goto(`${BASE}/#/app/checkout/occ_1`); await page.waitForTimeout(900);
  api.emailLinked = false;
  await page.locator('[data-consent-hold] [data-consent-retry]').click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(1200);
  check('C-01d: Retry reruns the consent step', (await stepOf(page).count()) === 1, route(page));
  await submitStep(page, null).catch(() => {});
  check('C-01d: …and once recorded, booking opens (no notice)', route(page) === '/app/checkout/occ_1' && (await page.locator('[data-consent-hold]').count()) === 0 && (await page.locator('[data-enrol-customer]').count()) === 0 && api.members.user_deskcust.registered === true, route(page));
  await ctx.close();

  // ── 9 · RES-02: greeting and announcement ─────────────────────────────────────────────────────────────────────
  for (const lang of ['es', 'en']) {
    ({ ctx, page } = await open('/auth/sign-in', { lang }));
    await signIn(page, 'ana@example.test');
    await page.goto(`${BASE}/#/app`); await page.waitForTimeout(1500);
    const g = await text(page, '.cust-greeting');
    check(`RES-02 (${lang}): the greeting uses the person row's name`, (lang === 'es' ? /Hola, Anita/ : /Hi, Anita/).test(g), g);
    const body = await text(page, 'main');
    check(`RES-02 (${lang}): no demo announcement in the production home`, !/Aviso del estudio|Studio announcement|al aire libre|outdoors/.test(body), body.slice(0, 300));
    await ctx.close();
  }
  ({ ctx, page } = await open('/auth/sign-in'));
  await signIn(page, 'callada@example.test');
  await page.goto(`${BASE}/#/app`); await page.waitForTimeout(1500);
  const quiet = await text(page, '.cust-greeting');
  check('RES-02: a nameless login is greeted without its email', quiet.length > 0 && !/@/.test(quiet) && !/callada/.test(quiet), quiet);
  await ctx.close();

  // ── 5 · PRO-05: the affiliate pack in the app's Plans ─────────────────────────────────────────────────────────
  for (const [email, affiliate] of [['ana@example.test', false], ['afiliada@example.test', true]]) {
    ({ ctx, page } = await open('/auth/sign-in'));
    await signIn(page, email);
    await page.goto(`${BASE}/#/app/plans`); await page.waitForTimeout(1800);
    const plansText = await text(page, '.cust-plans');
    check(`PRO-05: ${affiliate ? 'an affiliate sees' : 'a non-affiliate does not see'} the Santa María pack in the app`, /Paquete de 12 clases/.test(plansText) && /Santa María/.test(plansText) === affiliate, plansText.slice(0, 300));
    await ctx.close();
  }

  // ── 8 · RES-01: week grid columns; the day survives a refetch and Back ───────────────────────────────────────
  for (const width of [1024, 768]) {
    ({ ctx, page } = await open('/auth/sign-in', { width }));
    await signIn(page, 'ana@example.test');
    await page.goto(`${BASE}/#/app/schedule/week`); await page.waitForTimeout(1500);
    const seen = await page.evaluate(() => {
      const win = document.querySelector('.calendar-window')?.getBoundingClientRect();
      const cells = [...document.querySelectorAll('.calendar-grid .calendar-column, .calendar-strip .calendar-strip-day')];
      return { n: cells.length, inside: !!win && cells.length === 7 && cells.every((c) => { const r = c.getBoundingClientRect(); return r.left >= win.left - 1 && r.right <= win.right + 1; }), overflow: document.documentElement.scrollWidth - innerWidth };
    });
    check(`RES-01 ${width}px: the week shows all seven days, Sunday not cut`, seen.inside && seen.overflow <= 0, JSON.stringify(seen));
    await ctx.close();
  }
  ({ ctx, page } = await open('/auth/sign-in'));
  await signIn(page, 'ana@example.test');
  await page.goto(`${BASE}/#/app/schedule`); await page.waitForTimeout(1500);
  await page.locator('.calendar-arrows button').nth(1).click(); await page.waitForTimeout(300);
  await page.locator('.calendar-arrows button').nth(1).click(); await page.waitForTimeout(300);
  const chosen = await text(page, '.calendar-period h2');
  check('RES-01: the chosen day is in the URL query', /[?&]day=\d{4}-\d{2}-\d{2}/.test(route(page)), route(page));
  await page.waitForTimeout(22_000); // one live-updates poll (20 s) refetches the schedule
  check('RES-01: after a refetch the chosen day stays', (await text(page, '.calendar-period h2')) === chosen, `${chosen} → ${await text(page, '.calendar-period h2')}`);
  await page.goto(`${BASE}/#/app/more`); await page.waitForTimeout(800);
  await page.goBack(); await page.waitForTimeout(1500);
  check('RES-01: Back returns to the same day', (await text(page, '.calendar-period h2')) === chosen, `${chosen} → ${await text(page, '.calendar-period h2')}`);
  await ctx.close();

  check('no page errors', errors.length === 0, errors.slice(0, 5).join(' | '));
} finally {
  await browser.close();
  server.close();
  done();
}
