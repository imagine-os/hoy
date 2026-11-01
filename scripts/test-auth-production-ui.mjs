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
// The staff enrolment switch the build was made with (src/config/launch.ts CUSTOMER_AUTO_ENROL_STAFF, default off):
// QA_AUTO_ENROL=on for a build with VITE_CUSTOMER_AUTO_ENROL_STAFF=true.
const AUTO = process.env.QA_AUTO_ENROL === 'on';
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
      // Company OS (ADR 0038 amendment 2026-11-01): a login already in the studio gains the Customer role once.
      if (api.members[user]?.roleKeys.includes('member') || api.joinConflict) return json(res, 409, { error: 'already_registered' });
      // r2co contract (review round 2): the login's verified email is on a person linked to another login.
      if (api.emailLinked) return json(res, 409, { error: 'email_linked_to_other_login', message: 'a person with this email is linked to another login' });
      if (api.duplicatePerson) return json(res, 422, { error: 'duplicate_person_user', message: 'person is linked to another user' });
      // Lane review: an answer the client can't act on (empty consent list) and a 201 that /me never reflects (the tenant's
      // sign-up role isn't the customer role): the enrolment must stop, not loop.
      if (api.consentEmpty) return json(res, 422, { error: 'consent_required', details: { required: [] } });
      if (api.phantomSignup) return json(res, 201, { userId: user, personId: 'per_x', facetId: 'mem_x' });
      const missing = api.consents.filter((c) => !body.consents?.some((x) => x.document === c.document && x.version === c.version));
      if (missing.length) return json(res, 422, { error: 'consent_required', details: { required: api.consents } });
      if (api.members[user]) api.members[user].roleKeys.push('member');
      else api.members[user] = { name: body.person.name, email: 'nueva@example.test', roleKeys: ['member'] };
      // Review round 2: the sign-up commits but its answer is lost on the way (a slow phone connection).
      if (api.loseAnswer) { api.loseAnswer = false; req.socket.destroy(); return; }
      return json(res, 201, { userId: user, personId: api.members[user].roleKeys.length > 1 ? 'per_staff' : 'per_1', facetId: 'mem_1' });
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
  user_both: { emails: [{ id: 'ea_both', email: 'ambas@example.test', verified: true }], primary: 'ea_both' },
  user_coach: { emails: [{ id: 'ea_coach', email: 'profe@example.test', verified: true }], primary: 'ea_coach' },
};
const MEMBERS = () => ({
  user_ana: { name: 'Ana Prueba', email: 'ana@example.test', roleKeys: ['member'] },
  user_desk: { name: 'Rita Recepción', email: 'recepcion@example.test', roleKeys: ['front_desk'] },
  user_admin: { name: 'Olga Admin', email: 'admin@example.test', roleKeys: ['administrator'] },
  // Administration who also takes classes, on one email (owner 2026-11-01).
  user_both: { name: 'Bea Ambas', email: 'ambas@example.test', roleKeys: ['administrator', 'member'] },
  // A teacher only (Company OS coach): the customer routes also allow the teacher role.
  user_coach: { name: 'Teo Profe', email: 'profe@example.test', roleKeys: ['coach'] },
});

const browser = await launchBrowser();
const errors = [];
async function open(path = '/', { lang = 'es', width = 1280, clerk = true } = {}) {
  api.members = MEMBERS(); api.meStatus = null; api.signupEnabled = true; api.signups = []; api.joinConflict = false; api.emailLinked = false; api.duplicatePerson = false; api.loseAnswer = false; api.consentEmpty = false; api.phantomSignup = false;
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
// Signed out for real: the sign-in form, not a spinner and not the session-problem screen (H-2 test environment:
// Clerk's sign-out left a hash-routed app "loading" and then on "service did not answer").
const signedOutForm = async (page) => route(page).startsWith('/auth/sign-in') && (await page.locator('[data-step="email"] input').count()) === 1
  && (await page.locator('[data-session-problem]').count()) === 0 && (await page.locator('[aria-busy="true"]').count()) === 0;
/** The automatic enrolment's consent step: tick the box and continue. */
async function acceptAndContinue(page) {
  const step = page.locator('[data-enrol-customer="consent"]');
  await step.waitFor({ timeout: 5000 });
  await step.locator('input[type=checkbox]').check();
  await step.locator('button[type=submit]').click();
  await page.waitForTimeout(1200);
}
/** The enrolment's notice: Retry starts it again (back to the consent step). */
async function retry(page) {
  await page.locator('[data-enrol-customer="notice"] button').click();
  await page.waitForTimeout(800);
}
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
  // `/teach` and `/dev` are role homes since Hoy all-roles (lane C): only those pages ship, not the rest of their areas.
  // `/hub` ships for super admins since lane D (scripts/test-view-as-ui.mjs): a visitor is sent to sign-in there.
  for (const p of ['/dev/components', '/dev/api-keys', '/teach/payroll', '/app/state/empty', '/auth/recover', '/auth/locked', '/admin/tables']) {
    await page.goto(`${BASE}/#${p}`); await page.waitForTimeout(400);
    check(`PL-03 ${p} does not exist in production`, !route(page).startsWith(p), route(page));
  }
  // The manual, the docs and the kanban ship for the super admin since lane Y3 (scripts/test-view-as-ui.mjs).
  for (const p of ['/docs', '/manual', '/dev/knowledgebase']) {
    await page.goto(`${BASE}/#${p}`); await page.waitForTimeout(400);
    check(`PL-03 a visitor on ${p} is sent to sign-in`, route(page).startsWith('/auth/sign-in'), route(page));
  }
  await page.goto(`${BASE}/#/auth/sign-in`); await page.waitForTimeout(800);
  const signInText = await page.locator('body').innerText();
  check('PL-03 sign-in has no demo user list or demo note', !/Usuarios demo|Demo users|demo\.hoyos\.test|Sofía|Juliana/.test(signInText));
  check('PL-03 no persona switcher or spec chip on the page', (await page.locator('#rs-user, .specchip, [data-demo-signin]').count()) === 0);
  check('PL-03 no agent manifest (window.__hoyos) in production', await page.evaluate(() => typeof window.__hoyos === 'undefined'));
  check('CU-01 sign-in carries the element Clerk\'s bot protection draws in (#clerk-captcha)', (await page.locator('#clerk-captcha').count()) === 1);
  await page.goto(`${BASE}/#/auth/sign-up`); await page.waitForTimeout(500);
  check('CU-01 sign-up carries #clerk-captcha too', (await page.locator('#clerk-captcha').count()) === 1);
  // ── Coming Soon: "Entrar" opens sign-in (owner, 30 Oct) ──────────────────────────────────────────────────────
  await page.goto(`${BASE}/#/`); await page.waitForTimeout(800);
  await page.locator('.coming-soon-login').click(); await page.waitForTimeout(800);
  check('Coming Soon "Entrar" opens the sign-in form', route(page).startsWith('/auth/sign-in') && (await page.locator('[data-step="email"] input').count()) === 1, route(page));
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
  check('CU-04 after sign-out the sign-in form shows (no spinner, no error)', await signedOutForm(page), route(page));
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

  // Review round 2 (r2hoy): a new login's sign-up whose answer is lost goes on after the retry's 409 (it went through).
  ({ ctx, page } = await open('/auth/sign-up?next=/app/plans'));
  await signIn(page, 'perdida@example.test');
  await page.locator('[data-register]').waitFor({ timeout: 5000 });
  {
    const f = page.locator('[data-register] input:not([type=checkbox])');
    await f.nth(0).fill('Perdida Prueba'); await f.nth(1).fill('+57 300 555 0191'); await f.nth(2).fill('Contacto'); await f.nth(3).fill('+57 300 555 0192');
    await page.locator('[data-register] input[type=checkbox]').check();
    api.loseAnswer = true;
    await page.locator('[data-register] button[type=submit]').click(); await page.waitForTimeout(1500);
    if (await page.locator('[data-register]').count()) { await page.locator('[data-register] button[type=submit]').click(); await page.waitForTimeout(1500); }
    check('r2 sign-up: a lost answer, then 409 already_registered with /me holding the customer role → on to the return', route(page) === '/app/plans' && (await page.locator('[data-register]').count()) === 0, route(page));
  }
  await ctx.close();

  // Review round 2 (r2co contract): a new login whose verified email is on a person another login holds.
  ({ ctx, page } = await open('/auth/sign-up'));
  await signIn(page, 'compartido@example.test');
  await page.locator('[data-register]').waitFor({ timeout: 5000 });
  {
    const f = page.locator('[data-register] input:not([type=checkbox])');
    await f.nth(0).fill('Compartido Prueba'); await f.nth(1).fill('+57 300 555 0193'); await f.nth(2).fill('Contacto'); await f.nth(3).fill('+57 300 555 0194');
    await page.locator('[data-register] input[type=checkbox]').check();
    api.emailLinked = true;
    await page.locator('[data-register] button[type=submit]').click(); await page.waitForTimeout(1200);
    const text = await page.locator('main').innerText();
    check('r2 sign-up: email linked to another login → "write to the studio", stays on the form, no code', /otra cuenta/i.test(text) && !/email_linked_to_other_login/.test(text) && (await page.locator('[data-register]').count()) === 1 && route(page).startsWith('/auth/sign-up'), text.slice(0, 300));
  }
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
  // Changed on purpose (owner 2026-11-01, review round 2): every registered login is a customer. A studio login that
  // isn't a customer yet is enrolled automatically on its first customer page: no "Join" page, no form; the only step is
  // the documents every customer accepts once. (This replaced Y2's "Join as a customer" offer and its checks.)
  if (AUTO) {
    const step = page.locator('[data-enrol-customer="consent"]');
    await step.waitFor({ timeout: 5000 }).catch(() => {});
    const text = await page.locator('main, body').first().innerText();
    check('enrol: front desk on the customer app sees only the consent step (no Join page, no form, no customer screens yet)', route(page) === '/app' && (await step.count()) === 1 && (await step.locator('[data-consent-step]').count()) === 1 && (await step.locator('input:not([type=checkbox])').count()) === 0 && (await page.locator('.appshell').count()) === 0, route(page));
    check('enrol: no "Join" wording anywhere on the page', !/Únete|Unirme|Join as a customer|\bJoin\b/i.test(text), text.slice(0, 300));
    check('enrol: the consent step shows the documents\' versions', /Versión 2026-10-01/.test(await step.innerText()));
    const before = api.signups.length;
    await step.locator('button[type=submit]').click(); await page.waitForTimeout(500);
    check('enrol: continuing without accepting asks for the consent and sends nothing', /Necesitamos tu consentimiento/.test(await step.innerText()) && api.signups.length === before);
    // already_registered while /me still lacks the customer role (a race, another path): a conflict, never success.
    api.joinConflict = true;
    await acceptAndContinue(page);
    const conflict = await page.locator('[data-enrol-customer]').innerText();
    check('enrol: 409 already_registered with /me lacking the customer role → contact the studio; nothing else changes', /Escríbele a administración/.test(conflict) && JSON.stringify(api.members.user_desk.roleKeys) === '["front_desk"]' && (await page.locator('.appshell').count()) === 0 && route(page) === '/app', conflict.slice(0, 200));
    api.joinConflict = false;
    // r2co contract: the login's email is on a person another login holds.
    api.emailLinked = true;
    await retry(page); await acceptAndContinue(page);
    const linked = await page.locator('[data-enrol-customer]').innerText();
    check('r2 enrol: email linked to another login → "write to the studio", never success', /otra cuenta/i.test(linked) && /administración/i.test(linked) && JSON.stringify(api.members.user_desk.roleKeys) === '["front_desk"]' && (await page.locator('.appshell').count()) === 0, linked.slice(0, 300));
    check('r2 L4 enrol: no raw code on the screen', !/email_linked_to_other_login|already_registered|\(http_/.test(linked));
    api.emailLinked = false; api.duplicatePerson = true;
    await retry(page); await acceptAndContinue(page);
    const dup = await page.locator('[data-enrol-customer]').innerText();
    check('r2 L4 enrol: duplicate_person_user → the studio fixes the link (no code, no "crear tu cuenta")', /administración/i.test(dup) && !/duplicate_person_user|Revisa los datos marcados|crear tu cuenta/i.test(dup), dup.slice(0, 300));
    api.duplicatePerson = false;
    // Idempotent (M1, review2-hoy): the enrolment commits but its answer is lost; the retry gets 409 already_registered,
    // /me now lists the customer role, so the page goes on as a customer, never an error.
    api.loseAnswer = true;
    await retry(page); await acceptAndContinue(page);
    if (await page.locator('[data-enrol-customer="notice"]').count()) { await retry(page); await acceptAndContinue(page); }
    const sent = api.signups.at(-1)?.body;
    check('r2 M1 enrol: a lost answer, then 409 already_registered with /me holding the customer role → the customer page, no error', JSON.stringify(api.members.user_desk.roleKeys) === '["front_desk","member"]' && (await page.locator('[data-enrol-customer]').count()) === 0 && (await page.locator('.appshell').count()) === 1 && route(page) === '/app', `${route(page)} ${api.signups.length}`);
    check('enrol: the sign-up sends the accepted documents and nothing to fill in (no phone, no facet)', JSON.stringify(sent?.consents) === JSON.stringify(api.consents) && !sent?.person?.phone && JSON.stringify(sent?.facet) === '{}', JSON.stringify(sent));
  } else {
    // The switch is off (default, owner question C-01): a staff login is not enrolled; the customer page stays closed.
    await page.waitForTimeout(400);
    check('switch OFF: front desk on the customer app is not enrolled (no step, no sign-up sent, no customer screens)', (await page.locator('[data-enrol-customer]').count()) === 0 && api.signups.length === 0 && (await page.locator('.appshell').count()) === 0 && JSON.stringify(api.members.user_desk.roleKeys) === '["front_desk"]', route(page));
    check('switch OFF: no "Join" wording either', !/Únete|Unirme|\bJoin\b/i.test(await page.locator('body').innerText()));
  }
  await page.goto(`${BASE}/#/staff`); await page.waitForTimeout(1000);
  check('PL-03 the staff shell shows the account and a sign-out button, not a persona list', (await page.locator('[data-account-chip]').count()) > 0 && (await page.locator('#rs-user').count()) === 0);
  await page.locator('[data-account-chip] button').first().click();
  await page.waitForTimeout(1000);
  check('CU-04 staff sign-out ends the session and leaves the private page', await page.evaluate(() => window.__fakeClerk.state.active === null) && route(page).startsWith('/auth/sign-in'), route(page));
  check('CU-04 after staff sign-out the sign-in form shows (no spinner, no error)', await signedOutForm(page), route(page));
  await ctx.close();

  ({ ctx, page } = await open('/auth/sign-in'));
  await signIn(page, 'admin@example.test');
  check('PL-04 administration (from /me) lands on the admin home', route(page) === '/admin', route(page));
  await page.goto(`${BASE}/#/admin/settings`); await page.waitForTimeout(800);
  check('PL-04 administration opens settings', route(page) === '/admin/settings', route(page));
  const nav = await page.locator('nav, aside').allInnerTexts();
  check('PL-03 the admin menu lists no non-launch area (WhatsApp, payroll, tables, integrations, dev, hub)', !/WhatsApp|Nómina|Tablas|Integraciones|Herramientas dev|\bHub\b/i.test(nav.join('\n')), nav.join(' | ').slice(0, 300));
  await page.goto(`${BASE}/#/admin`); await page.waitForTimeout(1000);
  await page.locator('[data-account-chip] button').first().click();
  await page.waitForTimeout(1000);
  check('CU-04 administration sign-out ends on the sign-in form (no spinner, no error)', await page.evaluate(() => window.__fakeClerk.state.active === null) && await signedOutForm(page), route(page));
  await ctx.close();

  // ── Y2: Administration who is also a customer goes straight into booking and payment (one email) ─────────────
  ({ ctx, page } = await open('/auth/sign-in'));
  await signIn(page, 'ambas@example.test');
  check('Y2 Administration + customer lands on the admin home (the primary role keeps its home)', route(page) === '/admin', route(page));
  check('Y2 the admin menu has a "My classes" link to the customer area', (await page.locator('[data-my-classes]').count()) === 1 && /Mis clases/.test(await page.locator('[data-my-classes]').innerText()) && (await page.locator('[data-my-classes]').getAttribute('href'))?.endsWith('#/app'));
  await page.goto(`${BASE}/#/site/plans`); await page.waitForTimeout(1200);
  await page.getByRole('button', { name: 'Regalar' }).first().click(); await page.waitForTimeout(800);
  check('Y2 Give a gift goes straight to the gift purchase (no sign-in, no dashboard)', route(page) === '/app/gift-voucher', route(page));
  check('Y2 …and opens it as a customer (the customer app, no enrolment step)', (await page.locator('.appshell').count()) === 1 && (await page.locator('[data-enrol-customer]').count()) === 0);
  check('Y2 the customer app offers the way back to the admin home', (await page.locator('[data-primary-home]').count()) === 1 && (await page.locator('[data-primary-home]').getAttribute('href'))?.endsWith('#/admin'));
  await page.goto(`${BASE}/#/app/plans`); await page.waitForTimeout(800);
  check('Y2 the plans page opens for Administration + customer', route(page) === '/app/plans' && (await page.locator('.appshell').count()) === 1, route(page));
  await page.goto(`${BASE}/#/auth/sign-in?next=${encodeURIComponent('/app/plans?plan=pack12')}`); await page.waitForTimeout(800);
  // The plans page takes a chosen plan straight on to its payment.
  check('Y2 an /app return is honoured for a login holding the customer role (on to the payment)', route(page).startsWith('/app/pay/') && (await page.locator('.appshell').count()) === 1, route(page));
  await page.goto(`${BASE}/#/admin/settings`); await page.waitForTimeout(800);
  check('Y2 the admin screens still open as Administration', route(page) === '/admin/settings', route(page));
  await ctx.close();

  // Owner 2026-11-01: a tenant with no documents to accept enrols a studio login with no step at all.
  ({ ctx, page } = await open('/auth/sign-in'));
  {
    const saved = api.consents;
    api.consents = [];
    await signIn(page, 'recepcion@example.test');
    await page.goto(`${BASE}/#/app`); await page.waitForTimeout(1500);
    check('enrol: no documents → the customer app opens straight away (one sign-up, no step shown)', route(page) === '/app' && (await page.locator('.appshell').count()) === 1 && (await page.locator('[data-enrol-customer]').count()) === 0 && api.signups.length === 1 && JSON.stringify(api.members.user_desk.roleKeys) === '["front_desk","member"]', `${route(page)} ${api.signups.length}`);
    api.consents = saved;
  }
  await ctx.close();

  if (AUTO) {
    // Lane review: a teacher-only login (the customer routes also allow the teacher role) is enrolled too, not shown the
    // customer screens as a teacher whose purchases Company OS refuses.
    ({ ctx, page } = await open('/auth/sign-in'));
    await signIn(page, 'profe@example.test');
    await page.goto(`${BASE}/#/app/plans`); await page.waitForTimeout(1200);
    check('enrol: a teacher-only login on a customer page gets the consent step', (await page.locator('[data-enrol-customer="consent"]').count()) === 1, route(page));
    if (await page.locator('[data-enrol-customer="consent"]').count()) await acceptAndContinue(page);
    check('enrol: …and then holds both roles', JSON.stringify(api.members.user_coach.roleKeys) === '["coach","member"]', JSON.stringify(api.members.user_coach.roleKeys));
    await ctx.close();

    // Lane review: answers the enrolment can't act on stop with a notice (no loop, no stuck step).
    ({ ctx, page } = await open('/auth/sign-in'));
    {
      const saved = api.consents;
      api.consents = []; api.phantomSignup = true;
      await signIn(page, 'recepcion@example.test');
      await page.goto(`${BASE}/#/app`); await page.waitForTimeout(4000);
      check('enrol: a 201 that /me never reflects stops after at most 2 automatic tries, with a notice', api.signups.length <= 2 && (await page.locator('[data-enrol-customer="notice"]').count()) === 1, `${api.signups.length} ${route(page)}`);
      api.phantomSignup = false; api.consentEmpty = true;
      await page.locator('[data-enrol-customer="notice"] button').click(); await page.waitForTimeout(1500);
      check('enrol: consent_required with no documents to show ends on a notice with Retry, not an empty step', (await page.locator('[data-enrol-customer="notice"]').count()) === 1 && (await page.locator('[data-enrol-customer="consent"]').count()) === 0, route(page));
      api.consentEmpty = false; api.consents = saved;
    }
    await ctx.close();

    // ── Owner 2026-11-01: Administration who isn't a customer yet buys a gift; the app enrols the same login ─────────
    ({ ctx, page } = await open('/auth/sign-in'));
    await signIn(page, 'admin@example.test');
    await page.goto(`${BASE}/#/site/plans`); await page.waitForTimeout(1200);
    await page.getByRole('button', { name: 'Regalar' }).first().click(); await page.waitForTimeout(800);
    check('Y2 Give a gift (signed in, not a customer) goes to the gift page, not the dashboard', route(page) === '/app/gift-voucher', route(page));
    check('enrol: the gift page asks only for the documents (no form, no Join wording)', (await page.locator('[data-enrol-customer="consent"]').count()) === 1 && (await page.locator('[data-enrol-customer] input:not([type=checkbox])').count()) === 0 && !/Únete|Unirme|\bJoin\b/i.test(await page.locator('[data-enrol-customer]').innerText()));
    await acceptAndContinue(page);
    const joined = api.signups.at(-1);
    check('enrol: the studio sign-up is posted for the same login, with its name and the accepted documents', joined?.user === 'user_admin' && joined.body.person?.name === 'Olga Admin' && JSON.stringify(joined.body.consents) === JSON.stringify(api.consents), JSON.stringify(joined));
    check('enrol: afterwards the same login holds both roles', JSON.stringify(api.members.user_admin.roleKeys) === '["administrator","member"]');
    check('enrol: the gift purchase then opens as a customer (same page)', route(page) === '/app/gift-voucher' && (await page.locator('[data-enrol-customer]').count()) === 0 && (await page.locator('.appshell').count()) === 1, route(page));
    await page.goto(`${BASE}/#/admin`); await page.waitForTimeout(800);
    check('enrol: Administration keeps its home and gains "My classes"', route(page) === '/admin' && (await page.locator('[data-my-classes]').count()) === 1, route(page));
    await ctx.close();
  } else {
    // The switch is off: Administration who isn't a customer yet is not enrolled from a purchase either.
    ({ ctx, page } = await open('/auth/sign-in'));
    await signIn(page, 'admin@example.test');
    await page.goto(`${BASE}/#/site/plans`); await page.waitForTimeout(1200);
    await page.getByRole('button', { name: 'Regalar' }).first().click(); await page.waitForTimeout(1000);
    check('switch OFF: Give a gift for Administration (not a customer) enrols nothing and sends no sign-up', (await page.locator('[data-enrol-customer]').count()) === 0 && api.signups.length === 0 && JSON.stringify(api.members.user_admin.roleKeys) === '["administrator"]', route(page));
    await ctx.close();
    // A teacher-only login: the customer routes allow the teacher role, so it sees them as a teacher, not enrolled.
    ({ ctx, page } = await open('/auth/sign-in'));
    await signIn(page, 'profe@example.test');
    await page.goto(`${BASE}/#/app/plans`); await page.waitForTimeout(1200);
    check('switch OFF: a teacher-only login is not enrolled', (await page.locator('[data-enrol-customer]').count()) === 0 && api.signups.length === 0 && JSON.stringify(api.members.user_coach.roleKeys) === '["coach"]', route(page));
    await ctx.close();
  }

  // ── Y2: a signed-out visitor still goes through sign-in, keeping the purchase ─────────────────────────────────
  ({ ctx, page } = await open('/site/plans'));
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: 'Regalar' }).first().click(); await page.waitForTimeout(800);
  check('Y2 signed out, Give a gift goes to sign-in with the return', route(page) === '/auth/sign-in?next=/app/gift-voucher', route(page));
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
  await page.evaluate(() => window.Clerk.setActive({ session: null })); // as another tab's sign-out arrives (clerk-js: setActive, no navigation)
  await page.waitForTimeout(1000);
  check('CU-04 a session ended elsewhere ends on the sign-in form (no spinner, no error)', await signedOutForm(page), route(page));
  check('CU-04 a session ended elsewhere clears the previous person\'s traces (language kept)', await page.evaluate(() => sessionStorage.getItem('hoyos.pendingPass') === null && localStorage.getItem('hoyos.schedule.filters') === null && localStorage.getItem('hoyos.lang') === 'es'));
  await ctx.close();

  // ── CU-04: a Clerk stuck mid-navigation after having loaded reloads once instead of showing the error ───────
  ({ ctx, page } = await open('/auth/sign-in'));
  await signIn(page, 'ana@example.test');
  await page.evaluate(() => { window.__fakeClerk.ignoreRouter = true; }); // Clerk navigates by itself and waits for an unload
  await page.goto(`${BASE}/#/app/access`); await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  let recovered = false;
  for (const end = Date.now() + 30_000; !recovered && Date.now() < end;) { await page.waitForTimeout(500); recovered = await signedOutForm(page).catch(() => false); }
  check('CU-04 a Clerk stuck after sign-out reloads and ends on the sign-in form (no error)', recovered && await page.evaluate(() => window.__fakeClerk.state.active === null), route(page));
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
