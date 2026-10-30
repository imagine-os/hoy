// H-2 sign-in rows in the browser, on the PRODUCTION build (VITE_HOY_BUILD=production): CU-01…CU-04, PL-03, PL-04.
// The built bundle runs unchanged. The test plays the Hoy server (dist + /app-config.json + a fake Company OS
// /me and /signup) and serves scripts/fixtures/fake-clerk.js in place of Clerk's CDN script, so no real Clerk,
// Company OS or email is touched and nothing in the bundle can be switched to a fake. Fictional accounts only.
// Checks ES and EN, 390 and 1280 wide. Client checks shape the screens; Company OS and the Hoy server enforce access.
// Run: npm run build:production && node scripts/test-auth-production-ui.mjs   (QA_PROD_DIST=<dir> to test another dir)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import { launchBrowser, reporter } from './lib/launch-qa.mjs';

const { check, done } = reporter('H-2 production sign-in');
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
const api = { members: {}, signupEnabled: true, meStatus: null, signups: [], consents: [{ document: 'terms', version: '2026-10-01' }, { document: 'privacy', version: '2026-10-01' }] };
const userOf = (req) => /^Bearer fake\.([^.]+)\.[^.]+$/.exec(req.headers.authorization ?? '')?.[1] ?? null;
const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://127.0.0.1').pathname;
  if (path === '/app-config.json') return json(res, 200, { tenant: TENANT, apiBase: '/api/cos', clerkPublishableKey: PK, environment: 'test' });
  if (path.startsWith(`/api/cos/t/${TENANT}/`)) {
    const user = userOf(req);
    if (!user) return json(res, 401, { error: 'unauthorized' });
    const route = path.slice(`/api/cos/t/${TENANT}`.length);
    if (route === '/me') {
      if (api.meStatus) return json(res, api.meStatus, { error: 'server_error' });
      const m = api.members[user];
      return m ? json(res, 200, { tenant: { slug: TENANT }, user: { id: user, name: m.name, email: m.email }, roleKeys: m.roleKeys, isSuperAdmin: false, caps: [], entities: [] }) : json(res, 403, { error: 'no access to this tenant' });
    }
    if (route === '/signup' && req.method === 'GET') return json(res, 200, api.signupEnabled ? { enabled: true, consents: api.consents, personFields: ['name', 'phone'], facetFields: ['emergency_contact_name', 'emergency_contact_phone'] } : { enabled: false });
    if (route === '/signup' && req.method === 'POST') {
      const body = JSON.parse(await new Promise((r) => { let s = ''; req.on('data', (c) => { s += c; }); req.on('end', () => r(s)); }));
      api.signups.push({ user, body });
      if (api.members[user]) return json(res, 409, { error: 'already_registered' });
      const missing = api.consents.filter((c) => !body.consents?.some((x) => x.document === c.document && x.version === c.version));
      if (missing.length) return json(res, 422, { error: 'consent_required', details: { required: api.consents } });
      api.members[user] = { name: body.person.name, email: 'nueva@example.test', roleKeys: ['member'] };
      return json(res, 201, { userId: user, personId: 'per_1', facetId: 'mem_1' });
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
await new Promise((r) => server.listen(5331, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:5331';

// Fictional Clerk accounts (user id → emails) and their Company OS membership.
const ACCOUNTS = {
  user_ana: { emails: [{ id: 'ea_ana', email: 'ana@example.test', verified: true }], primary: 'ea_ana' },
  user_desk: { emails: [{ id: 'ea_desk', email: 'recepcion@example.test', verified: true }], primary: 'ea_desk' },
  user_admin: { emails: [{ id: 'ea_admin', email: 'admin@example.test', verified: true }], primary: 'ea_admin' },
};
const MEMBERS = () => ({
  user_ana: { name: 'Ana Prueba', email: 'ana@example.test', roleKeys: ['member'] },
  user_desk: { name: 'Rita Recepción', email: 'recepcion@example.test', roleKeys: ['front_desk'] },
  user_admin: { name: 'Olga Admin', email: 'admin@example.test', roleKeys: ['administrator'] },
});

const browser = await launchBrowser();
const errors = [];
async function open(path = '/', { lang = 'es', width = 1280, clerk = true } = {}) {
  api.members = MEMBERS(); api.meStatus = null; api.signupEnabled = true; api.signups = [];
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  // Playwright tries the last route added first: everything outside is blocked, except Clerk's script (the fake).
  // `clerk: false` blocks Clerk's script too (a CDN outage or a blocker).
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  if (clerk) await ctx.route(`https://${HOST}/npm/@clerk/clerk-js@*/dist/clerk.browser.js`, (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_CLERK }));
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
const calls = (page) => page.evaluate(() => window.__fakeClerk?.calls ?? []);
async function signIn(page, email) {
  await page.locator('[data-step="email"] input').fill(email);
  await page.locator('[data-step="email"] button[type=submit]').click();
  await page.locator('[data-step="code"]').waitFor({ timeout: 5000 });
  await page.locator('[data-step="code"] input').fill('424242');
  await page.locator('[data-step="code"] button[type=submit]').click();
  await page.waitForTimeout(1200);
}

try {
  // ── PL-04: a visitor who pastes a private route is sent to sign-in (with the safe return) ────────────────────
  let { ctx, page } = await open('/app/plans');
  check('PL-04 a visitor on /app/plans is sent to sign-in, keeping the return', route(page) === '/auth/sign-in?next=/app/plans', route(page));
  for (const p of ['/staff', '/admin/settings', '/app/access']) {
    await page.goto(`${BASE}/#${p}`); await page.waitForTimeout(500);
    check(`PL-04 a visitor on ${p} is sent to sign-in`, route(page).startsWith('/auth/sign-in'), route(page));
  }
  // ── PL-03: no review tools in production ──────────────────────────────────────────────────────────────────────
  for (const p of ['/hub', '/dev', '/dev/components', '/docs', '/manual', '/teach', '/app/state/empty', '/auth/recover', '/auth/locked', '/admin/tables']) {
    await page.goto(`${BASE}/#${p}`); await page.waitForTimeout(400);
    check(`PL-03 ${p} does not exist in production`, !route(page).startsWith(p), route(page));
  }
  await page.goto(`${BASE}/#/auth/sign-in`); await page.waitForTimeout(800);
  const signInText = await page.locator('body').innerText();
  check('PL-03 sign-in has no demo user list or demo note', !/Usuarios demo|Demo users|demo\.hoyos\.test|Sofía|Juliana/.test(signInText));
  check('PL-03 no persona switcher or spec chip on the page', (await page.locator('#rs-user, .specchip, [data-demo-signin]').count()) === 0);
  check('PL-03 no agent manifest (window.__hoyos) in production', await page.evaluate(() => typeof window.__hoyos === 'undefined'));
  check('CU-03 sign-in offers the email code and Google', (await page.locator('[data-step="email"] input[type=email]').count()) === 1 && /Continuar con Google/.test(signInText));
  check('CU-03 no password field (code or Google only)', (await page.locator('input[type=password]').count()) === 0);
  await ctx.close();

  // ── CU-03: email code, wrong code, success → the member's home (customer, with next) ─────────────────────────
  ({ ctx, page } = await open('/auth/sign-in?next=/app/plans'));
  await page.locator('[data-step="email"] input').fill('no es correo');
  await page.locator('[data-step="email"] button[type=submit]').click();
  check('CU-03 an invalid email is refused before calling Clerk', /Escribe un correo válido/.test(await page.locator('main').innerText()) && !(await calls(page)).some((c) => c[0] === 'signIn.create'));
  await page.locator('[data-step="email"] input').fill('ana@example.test');
  await page.locator('[data-step="email"] button[type=submit]').click();
  await page.locator('[data-step="code"]').waitFor({ timeout: 5000 });
  check('CU-03 a known email gets a sign-in code (Clerk email_code)', (await calls(page)).some((c) => c[0] === 'signIn.prepare' && c[1] === 'email_code'));
  await page.locator('[data-step="code"] input').fill('000000');
  await page.locator('[data-step="code"] button[type=submit]').click();
  await page.waitForTimeout(400);
  check('CU-03 a wrong code says so and does not sign in', /El código no es correcto/.test(await page.locator('main').innerText()) && route(page).startsWith('/auth/sign-in'));
  await page.locator('[data-step="code"] input').fill('424242');
  await page.locator('[data-step="code"] button[type=submit]').click();
  await page.waitForTimeout(1500);
  check('CU-03 the right code signs the customer in and follows next', route(page) === '/app/plans', route(page));
  // ── CU-04: the access page, then sign out completely ─────────────────────────────────────────────────────────
  await page.goto(`${BASE}/#/app/access`); await page.waitForTimeout(800);
  check('CU-04 the access page shows the sign-in email', (await page.locator('[data-current-email]').innerText()) === 'ana@example.test');
  check('CU-04 no self-serve email change (the studio changes it in Company OS)', (await page.locator('[data-access-page] input').count()) === 0 && /escríbenos/i.test(await page.locator('[data-access-page]').innerText()));
  await page.evaluate(() => { sessionStorage.setItem('hoyos.pendingPass', 'pln_1'); localStorage.setItem('hoyos.schedule.filters', '{}'); });
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await page.waitForTimeout(1000);
  check('CU-04 sign-out ends the Clerk session', (await calls(page)).some((c) => c[0] === 'signOut') && await page.evaluate(() => window.__fakeClerk.state.active === null));
  check('CU-04 after sign-out the visitor is on sign-in', route(page).startsWith('/auth/sign-in'), route(page));
  check('CU-04 sign-out leaves nothing of the previous person in this browser (language kept)', await page.evaluate(() => sessionStorage.getItem('hoyos.pendingPass') === null && localStorage.getItem('hoyos.schedule.filters') === null && localStorage.getItem('hoyos.lang') === 'es'));
  await page.goto(`${BASE}/#/app`); await page.waitForTimeout(600);
  check('CU-04 a private page after sign-out goes back to sign-in', route(page).startsWith('/auth/sign-in'), route(page));
  await ctx.close();

  // ── CU-03: lockout after repeated failures (Clerk attack protection) ─────────────────────────────────────────
  ({ ctx, page } = await open('/auth/sign-in'));
  await page.evaluate(() => { window.__fakeClerk.lock = true; });
  await page.locator('[data-step="email"] input').fill('ana@example.test');
  await page.locator('[data-step="email"] button[type=submit]').click();
  await page.locator('[data-step="code"]').waitFor({ timeout: 5000 });
  await page.locator('[data-step="code"] input').fill('424242');
  await page.locator('[data-step="code"] button[type=submit]').click();
  await page.waitForTimeout(400);
  check('CU-03 a locked account is told to wait (no sign-in)', /bloqueamos el acceso un tiempo/.test(await page.locator('main').innerText()) && route(page).startsWith('/auth/sign-in'));
  await page.evaluate(() => { window.__fakeClerk.lock = false; });
  // Google: leaves for Clerk's OAuth with a return on this origin.
  await page.locator('[data-step="code"]').getByRole('button', { name: 'Usar otro correo' }).click();
  await page.getByRole('button', { name: 'Continuar con Google' }).click();
  await page.waitForTimeout(300);
  const google = (await calls(page)).find((c) => c[0] === 'signIn.google');
  check('CU-03 Google sign-in returns to #/auth/callback on this origin', !!google && google[1].startsWith(`${BASE}/#/auth/callback?back=`), JSON.stringify(google));
  await ctx.close();

  // The return from Google: a fresh page load on #/auth/callback. Its first render comes before /app-config.json, when
  // there is no ClerkProvider yet; the page must wait for it instead of crashing into a blank screen.
  ({ ctx, page } = await open('/auth/callback?back=%2Fauth%2Fsign-in'));
  await page.waitForTimeout(800);
  const callbackErrors = errors.filter((e) => e.startsWith('/auth/callback'));
  check('CU-03 the Google return page loads without an error and finishes the sign-in with Clerk',
    callbackErrors.length === 0 && (await calls(page)).some((c) => c[0] === 'handleRedirectCallback'), JSON.stringify({ callbackErrors, calls: await calls(page) }));
  await ctx.close();

  // ── CU-01 / CU-02: a new person: Clerk code, then the studio's sign-up form, then the app ───────────────────
  ({ ctx, page } = await open('/auth/sign-up?next=/app/checkout/cls_1', { width: 390 }));
  await signIn(page, 'nueva@example.test');
  check('CU-01 a new email creates the Clerk account with a code (no password)', (await calls(page)).some((c) => c[0] === 'signUp.attempt'));
  await page.locator('[data-register]').waitFor({ timeout: 5000 }).catch(() => {});
  check('CU-01 a Clerk session that is not a member yet must complete the studio sign-up', (await page.locator('[data-register]').count()) === 1 && route(page).startsWith('/auth/sign-up'), route(page));
  await page.goto(`${BASE}/#/app/checkout/cls_1`); await page.waitForTimeout(800);
  check('CU-01 no guest booking: checkout sends a non-member to finish sign-up', route(page).startsWith('/auth/sign-up'), route(page));
  await page.locator('[data-register] button[type=submit]').click();
  const reg = await page.locator('[data-register]').innerText();
  check('CU-01 name, WhatsApp and emergency contact are required', (reg.match(/Este campo es obligatorio/g) ?? []).length >= 2 && /Escribe un número con indicativo/.test(reg));
  check('CU-02 consent is required', /Necesitamos tu consentimiento/.test(reg) && api.signups.length === 0);
  check('CU-02 the documents show their versions', /Versión 2026-10-01/.test(reg));
  const inputs = page.locator('[data-register] input:not([type=checkbox])');
  await inputs.nth(0).fill('Nueva Prueba');
  await inputs.nth(1).fill('+57 300 555 0199');
  await inputs.nth(2).fill('Contacto Prueba');
  await inputs.nth(3).fill('+57 300 555 0198');
  await page.locator('[data-register] input[type=checkbox]').check();
  await page.locator('[data-register] button[type=submit]').click();
  await page.waitForTimeout(1500);
  const sent = api.signups[0]?.body;
  check('CU-01 sign-up posts name and WhatsApp to Company OS', sent?.person?.name === 'Nueva Prueba' && sent?.person?.phone === '+573005550199', JSON.stringify(sent));
  check('CU-01 the email is not sent by the browser (Company OS uses the verified one)', !!sent && !JSON.stringify(sent).includes('@'));
  check('CU-02 the accepted documents and versions are sent', JSON.stringify(sent?.consents) === JSON.stringify(api.consents));
  check('CU-01 after sign-up the customer lands on the class they chose', route(page) === '/app/checkout/cls_1', route(page));
  await ctx.close();

  // CU-02: the documents changed while the form was open → asked to accept the new version.
  ({ ctx, page } = await open('/auth/sign-up'));
  await signIn(page, 'otra@example.test');
  await page.locator('[data-register]').waitFor({ timeout: 5000 });
  api.consents = [{ document: 'terms', version: '2026-11-01' }, { document: 'privacy', version: '2026-10-01' }];
  const fields = page.locator('[data-register] input:not([type=checkbox])');
  await fields.nth(0).fill('Otra Prueba'); await fields.nth(1).fill('+57 300 555 0197'); await fields.nth(2).fill('Contacto'); await fields.nth(3).fill('+57 300 555 0196');
  await page.locator('[data-register] input[type=checkbox]').check();
  await page.locator('[data-register] button[type=submit]').click();
  await page.waitForTimeout(1000);
  check('CU-02 changed documents: told to accept the current version, box unticked', /Los documentos legales cambiaron/.test(await page.locator('main').innerText()) && !(await page.locator('[data-register] input[type=checkbox]').isChecked()) && /Versión 2026-11-01/.test(await page.locator('[data-register]').innerText()));
  api.consents = [{ document: 'terms', version: '2026-10-01' }, { document: 'privacy', version: '2026-10-01' }];
  await ctx.close();

  // Sign-up closed by the studio.
  ({ ctx, page } = await open('/auth/sign-up'));
  api.signupEnabled = false;
  await signIn(page, 'cerrado@example.test');
  await page.waitForTimeout(500);
  check('CU-01 sign-up closed: says so (no form)', /El registro en línea está cerrado/.test(await page.locator('main').innerText()) && (await page.locator('[data-register]').count()) === 0);
  await ctx.close();

  // ── PL-04: staff roles from /me; the launch matrix; no persona switcher; sign out from the staff shell ───────
  ({ ctx, page } = await open('/auth/sign-in'));
  await signIn(page, 'recepcion@example.test');
  check('PL-04 front desk (from /me) lands on the staff home', route(page) === '/staff', route(page));
  await page.goto(`${BASE}/#/admin/settings`); await page.waitForTimeout(800);
  check('PL-04 front desk is refused administration settings', route(page).startsWith('/no-access'), route(page));
  const noAccess = await page.locator('body').innerText();
  check('PL-03 the no-access page has no hub or persona switcher', !/Ir al hub|usuario demo/i.test(noAccess) && (await page.locator('#rs-user').count()) === 0 && /Esta zona no es para tu cuenta/.test(noAccess));
  await page.goto(`${BASE}/#/app`); await page.waitForTimeout(800);
  check('PL-04 front desk does not open the customer app', route(page).startsWith('/no-access'), route(page));
  await page.goto(`${BASE}/#/staff`); await page.waitForTimeout(1000);
  check('PL-03 the staff shell shows the account and a sign-out button, not a persona list', (await page.locator('[data-account-chip]').count()) > 0 && (await page.locator('#rs-user').count()) === 0);
  await page.locator('[data-account-chip] button').first().click();
  await page.waitForTimeout(1000);
  check('CU-04 staff sign-out ends the session and leaves the private page', await page.evaluate(() => window.__fakeClerk.state.active === null) && route(page).startsWith('/auth/sign-in'), route(page));
  await ctx.close();

  ({ ctx, page } = await open('/auth/sign-in'));
  await signIn(page, 'admin@example.test');
  check('PL-04 administration (from /me) lands on the admin home', route(page) === '/admin', route(page));
  await page.goto(`${BASE}/#/admin/settings`); await page.waitForTimeout(800);
  check('PL-04 administration opens settings', route(page) === '/admin/settings', route(page));
  const nav = await page.locator('nav, aside').allInnerTexts();
  check('PL-03 the admin menu lists no non-launch area (WhatsApp, payroll, tables, integrations, dev, hub)', !/WhatsApp|Nómina|Tablas|Integraciones|Herramientas dev|\bHub\b/i.test(nav.join('\n')), nav.join(' | ').slice(0, 300));
  await ctx.close();

  // ── PL-04: /me failing is an error with a retry, never a guessed role ────────────────────────────────────────
  ({ ctx, page } = await open('/auth/sign-in'));
  api.meStatus = 502;
  await signIn(page, 'ana@example.test');
  check('PL-04 /me down: an error with retry, not the app', (await page.locator('[data-session-problem="error"]').count()) === 1 && route(page).startsWith('/auth/sign-in'));
  api.meStatus = null;
  await page.getByRole('button', { name: 'Reintentar' }).click();
  await page.waitForTimeout(1200);
  check('PL-04 retry after /me recovers signs the customer in', route(page) === '/app', route(page));
  await ctx.close();

  // ── Clerk never loads: sign-in and private routes say so with a retry instead of spinning ─────────────────────
  ({ ctx, page } = await open('/auth/sign-in', { clerk: false }));
  await page.locator('[data-session-problem="error"]').waitFor({ timeout: 15000 }).catch(() => {});
  check('PL-04 Clerk blocked: sign-in shows the error with a retry (no endless spinner)', (await page.locator('[data-session-problem="error"]').count()) === 1 && (await page.getByRole('button', { name: 'Reintentar' }).count()) === 1);
  await page.goto(`${BASE}/#/staff`); await page.waitForTimeout(800);
  await page.locator('[data-session-problem="error"]').waitFor({ timeout: 15000 }).catch(() => {});
  check('PL-04 Clerk blocked: a private route ends on the sign-in error, not a spinner', route(page).startsWith('/auth/sign-in') && (await page.locator('[data-session-problem="error"]').count()) === 1, route(page));
  // Clerk's own loader reports its failure as an uncaught rejection: expected here, not a page error of the app.
  for (let i = errors.length - 1; i >= 0; i--) if (/failed_to_load_clerk_js/.test(errors[i])) errors.splice(i, 1);
  check('PL-04 Clerk blocked: the website still opens', await (async () => { await page.goto(`${BASE}/#/site`); await page.waitForTimeout(1500); return (await page.locator('[aria-busy="true"]').count()) === 0 && route(page).startsWith('/site'); })(), route(page));
  await ctx.close();
  for (let i = errors.length - 1; i >= 0; i--) if (/failed_to_load_clerk_js/.test(errors[i])) errors.splice(i, 1);

  // ── CU-04: a session that ends outside the app (another tab, expiry) leaves no traces either ─────────────────
  ({ ctx, page } = await open('/auth/sign-in'));
  await signIn(page, 'ana@example.test');
  await page.evaluate(() => { sessionStorage.setItem('hoyos.pendingPass', 'pln_1'); localStorage.setItem('hoyos.schedule.filters', '{}'); });
  await page.evaluate(() => window.Clerk.signOut()); // Clerk's own sign-out, as another tab's would arrive: not the app's button
  await page.waitForTimeout(1000);
  check('CU-04 a session ended elsewhere clears the previous person\'s traces (language kept)', await page.evaluate(() => sessionStorage.getItem('hoyos.pendingPass') === null && localStorage.getItem('hoyos.schedule.filters') === null && localStorage.getItem('hoyos.lang') === 'es'));
  await ctx.close();

  // ── English and desktop/mobile ───────────────────────────────────────────────────────────────────────────────
  for (const width of [390, 1280]) {
    ({ ctx, page } = await open('/auth/sign-in', { lang: 'en', width }));
    const text = await page.locator('main').innerText();
    check(`EN ${width}: sign-in in English`, /We email you a code/.test(text) && /Continue with Google/.test(text) && !/⟨/.test(text));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(`${width}: no horizontal scroll on sign-in`, overflow <= 0, String(overflow));
    await ctx.close();
  }

  check('no page errors', errors.length === 0, errors.slice(0, 5).join(' | '));
} finally {
  await browser.close();
  server.close();
  done();
}
