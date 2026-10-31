// Sign-in, sign-up and sign-out on the PRODUCTION build against the REAL Clerk (its development instance, the one the
// test environment uses). test-auth-production-ui.mjs covers the same screens on a fake Clerk; this one catches what
// only the real clerk-js does (its sign-out navigation, bot protection, its script and its API).
// Two modes:
// - default: Company OS is an in-memory fake here (`/me`, `/signup`, `/app-config.json`): nothing is written to any
//   database. Serves the local production build (QA_PROD_DIST or dist/).
// - `--real-api`: the deployed TEST site (test-hoy: its Hoy server, its real Company OS, Clerk's development
//   instance), so sign-up is proven end to end: a new QA user signs up, lands on /app, and Company OS says it is a
//   customer (`member`, a `self_signup` member record). Afterwards its Company OS records (membership, person, member)
//   are removed through the API as a test-hoy Administration login, then the Clerk user; a failed removal is logged
//   with what was left behind (scripts/lib/real-signup.mjs). Refuses a site that says it is production or uses
//   another Clerk instance. Needs, besides the Clerk keys:
//     HOY_TEST_URL             the test site's origin, e.g. https://<test-hoy domain> (https; http only for localhost)
//     HOY_CLEANUP_ADMIN_EMAIL  a test-hoy Administration login (holds the tenant Super Admin role) in the same Clerk
//                              development instance; the run opens a short Clerk session for it (Backend API
//                              `POST /sessions`, development instances only) to remove the QA records, then revokes it
// - Accounts are Clerk test addresses (`qa-<run>+clerk_test@example.com`, code 424242): Clerk sends no email.
// - Clerk's bot protection is passed with a Clerk testing token (Backend API), as Clerk documents for tests.
// - Every Clerk user this run creates is deleted at the end, even when a check fails; users a crashed run left
//   behind (older than 30 minutes) are deleted at the start.
// Keys: CLERK_SECRET_KEY (sk_test_…) and CLERK_PUBLISHABLE_KEY (pk_test_…), the test environment's. Without them it
// says it skipped (pull requests from forks get no secrets); a live key is refused.
// Every value comes from the process environment; this script reads no file of secrets.
// Run: npm run build:production && CLERK_SECRET_KEY=… CLERK_PUBLISHABLE_KEY=… node scripts/test-auth-real-clerk.mjs
//      CLERK_SECRET_KEY=… CLERK_PUBLISHABLE_KEY=… HOY_TEST_URL=https://… HOY_CLEANUP_ADMIN_EMAIL=… \
//        node scripts/test-auth-real-clerk.mjs --real-api
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import { launchBrowser, reporter } from './lib/launch-qa.mjs';
import { QA_EMAIL, checkTestSite, cosOver, findSignup, realApiOptions, removeSignup, removeStaleSignups } from './lib/real-signup.mjs';

let MODE;
try { MODE = realApiOptions(process.argv.slice(2), process.env); } catch (e) { console.error(`Real Clerk sign-in: ${e.message}`); process.exit(1); }
const REAL = MODE.mode === 'real-api';
const SECRET = process.env.CLERK_SECRET_KEY ?? '';
const PK = process.env.CLERK_PUBLISHABLE_KEY ?? '';
// The real-API mode is always asked for on purpose: without its keys it fails instead of passing as "skipped".
if ((!SECRET || !PK) && REAL) { console.error('Real Clerk sign-up on the test site: needs CLERK_SECRET_KEY and CLERK_PUBLISHABLE_KEY (the test environment\'s)'); process.exit(1); }
if (!SECRET || !PK) { console.log('Real Clerk sign-in: skipped (no Clerk key in this run)'); process.exit(0); }
if (!/^sk_test_./.test(SECRET) || !/^pk_test_./.test(PK)) { console.error('Real Clerk sign-in: needs the Clerk development keys (sk_test_… and pk_test_…), never live ones'); process.exit(1); }
const DIST = resolve(process.env.QA_PROD_DIST ?? 'dist');
if (!REAL && !existsSync(join(DIST, 'index.html'))) { console.error(`${DIST}/index.html missing: run npm run build:production first`); process.exit(1); }

const report = reporter(REAL ? 'Real Clerk sign-up on the test site' : 'Real Clerk sign-in');
const done = report.done;
// On GitHub, a failed check is also an annotation, so its reason shows on the run's summary page.
const annotate = (text) => process.env.GITHUB_ACTIONS && text && console.log(`::error title=Real Clerk sign-in::${text.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')}`);
const check = (label, ok, detail = '') => { report.check(label, ok, detail); if (!ok) annotate(detail ? `${label} — ${detail}` : label); };
// A browser step: on failure, also say what the screen and Clerk said at that moment.
const step = async (label, ok, detail = '') => { check(label, ok, detail); if (!ok) await diagnose(); };
const PORT = 5332;
const BASE = REAL ? MODE.baseUrl : `http://localhost:${PORT}`;
let TENANT = 'hoy-qa'; // real-api: the site's own tenant, from its /app-config.json
const FAPI = Buffer.from(PK.slice('pk_test_'.length), 'base64').toString('utf8').replace(/\$$/, '');
const RUN = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const EMAIL = `qa-${RUN}+clerk_test@example.com`;
const CODE = '424242';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.woff2': 'font/woff2' };

// ── Clerk Backend API: the testing token and the clean-up ──────────────────────────────────────────────────────
async function clerkApi(method, path, body) {
  const headers = { Authorization: `Bearer ${SECRET}` };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`https://api.clerk.com/v1${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  if (!res.ok) throw new Error(`Clerk ${method} ${path.split('?')[0]}: ${res.status}`);
  return res.status === 204 ? null : res.json();
}
const usersWith = async (query) => (await clerkApi('GET', `/users?limit=100&${query}`)) ?? [];
const isQaUser = (u) => (u.email_addresses ?? []).some((e) => QA_EMAIL.test(e.email_address));
async function deleteUsers(users) { for (const u of users) await clerkApi('DELETE', `/users/${u.id}`); return users.length; }

// ── real-api: Company OS as the test site's Administration (only to check the QA user and remove it) ─────────────
// A short Clerk session for the clean-up login (Backend API, development instances only), a fresh session token per
// call through the Hoy server (`/api/cos/t/<tenant>`), revoked at the end.
let adminSession = null;
async function adminCos() {
  if (!adminSession) {
    const found = (await usersWith(`email_address=${encodeURIComponent(MODE.adminEmail)}`)) ?? [];
    if (found.length !== 1) throw new Error(`HOY_CLEANUP_ADMIN_EMAIL matches ${found.length} Clerk users in this instance (needs exactly 1)`);
    adminSession = await clerkApi('POST', '/sessions', { user_id: found[0].id });
  }
  const token = async () => (await clerkApi('POST', `/sessions/${adminSession.id}/tokens`, {})).jwt;
  return cosOver({ apiRoot: `${BASE}/api/cos/t/${encodeURIComponent(TENANT)}`, token });
}
async function endAdminSession() {
  if (!adminSession) return;
  try { await clerkApi('POST', `/sessions/${adminSession.id}/revoke`, {}); }
  catch (e) { console.log(`  could not revoke the clean-up session (${e.message}); it expires on its own`); }
  adminSession = null;
}

// ── The fake Hoy server + Company OS (in memory) ───────────────────────────────────────────────────────────────
const members = {}; // Clerk user id → { name }
const signupConfig = { enabled: true, consents: [{ document: 'terms', version: '2026-10-01' }, { document: 'privacy', version: '2026-10-01' }], personFields: ['name', 'phone'], facetFields: ['emergency_contact_name', 'emergency_contact_phone'] };
// The token is Clerk's session JWT; this fake only reads who it names (the real Company OS verifies it).
const userOf = (req) => {
  const jwt = /^Bearer ([^.\s]+)\.([^.\s]+)\.[^.\s]+$/.exec(req.headers.authorization ?? '');
  try { return jwt ? JSON.parse(Buffer.from(jwt[2], 'base64url').toString('utf8')).sub ?? null : null; } catch { return null; }
};
const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
const server = createServer(async (req, res) => {
  const path = new URL(req.url, BASE).pathname;
  if (path === '/app-config.json') return json(res, 200, { tenant: TENANT, apiBase: '/api/cos', clerkPublishableKey: PK, environment: 'test' });
  if (path.startsWith(`/api/cos/t/${TENANT}/`)) {
    const user = userOf(req);
    if (!user) return json(res, 401, { error: 'unauthorized' });
    const route = path.slice(`/api/cos/t/${TENANT}`.length);
    if (route === '/me') {
      const m = members[user];
      return m ? json(res, 200, { tenant: { slug: TENANT }, user: { id: user, name: m.name, email: EMAIL }, roleKeys: ['member'], isSuperAdmin: false, caps: [], entities: [] }) : json(res, 403, { error: 'no access to this tenant' });
    }
    if (route === '/signup' && req.method === 'GET') return json(res, 200, signupConfig);
    if (route === '/signup' && req.method === 'POST') {
      const body = JSON.parse(await new Promise((r) => { let s = ''; req.on('data', (c) => { s += c; }); req.on('end', () => r(s)); }));
      if (members[user]) return json(res, 409, { error: 'already_registered' });
      members[user] = { name: body.person?.name ?? '' };
      return json(res, 201, { userId: user, personId: 'per_qa', facetId: 'mem_qa' });
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

const route = (page) => decodeURIComponent(new URL(page.url()).hash.slice(1));
const signedOutForm = async (page) => route(page).startsWith('/auth/sign-in') && (await page.locator('[data-step="email"] input').count()) === 1
  && (await page.locator('[data-session-problem]').count()) === 0 && (await page.locator('[aria-busy="true"]').count()) === 0;
const settle = (page, ms = 1500) => page.waitForTimeout(ms);
async function waitFor(page, fn, timeout = 20_000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await fn()) return true; await page.waitForTimeout(250); }
  return false;
}
async function emailCode(page, email) {
  await page.locator('[data-step="email"] input').fill(email);
  await page.locator('[data-step="email"] button[type=submit]').click();
  await page.locator('[data-step="code"]').waitFor({ timeout: 20_000 });
  await page.locator('[data-step="code"] input').fill(CODE);
  await page.locator('[data-step="code"] button[type=submit]').click();
}

let browser;
let page;
const errors = [];
const clerkFailures = []; // Clerk frontend API answers that were not 2xx: method, path, status, error codes
const consoleErrors = [];
let captchaOffLogged = false;
const markBypass = (o) => { if (o && typeof o === 'object' && o.object === 'client') o.captcha_bypass = true; };
// What the screen and Clerk said when a step stopped: printed (and annotated) so a CI failure explains itself.
async function diagnose() {
  try {
    const lines = [];
    const one = (s) => String(s).replace(/\s+/g, ' ').slice(0, 300); // one line each: nothing reads as a workflow command
    try { const text = await page?.locator('[data-identity]').first().innerText({ timeout: 2000 }); if (text) lines.push(`screen: ${one(text)}`); } catch { /* no screen */ }
    try { if (page) lines.push(`route: ${one(route(page))}`); } catch { /* malformed hash */ }
    for (const f of clerkFailures.slice(-6)) lines.push(`clerk: ${one(f)}`);
    for (const c of consoleErrors.filter((t) => !/status of 422/.test(t)).slice(-6)) lines.push(`console: ${one(c)}`);
    if (!lines.length) return;
    console.log(lines.map((l) => `  ${l}`).join('\n'));
    annotate(lines.join('\n'));
  } catch { /* a diagnosis never stops the clean-up */ }
}
try {
  const stale = (await usersWith('query=clerk_test')).filter((u) => isQaUser(u) && Date.now() - u.created_at > 30 * 60_000);
  if (stale.length) console.log(`  removed ${await deleteUsers(stale)} Clerk test user(s) a previous run left behind`);
  const { token } = await clerkApi('POST', '/testing_tokens');
  if (process.env.GITHUB_ACTIONS) console.log(`::add-mask::${token}`);
  if (REAL) {
    // The site's public settings: a test environment on this Clerk instance, and its tenant.
    const res = await fetch(`${BASE}/app-config.json`, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`${BASE}/app-config.json answered ${res.status}`);
    const site = checkTestSite(await res.json(), PK);
    TENANT = site.tenant;
    console.log(`  test site ${BASE}: tenant ${TENANT}, SITE_LIVE ${site.siteLive ? 'on (/ opens /site)' : 'off (/ shows Coming Soon)'}`);
    const staleCos = await removeStaleSignups(await adminCos());
    if (staleCos) console.log(`  removed the Company OS records of ${staleCos} QA sign-up(s) a previous run left behind`);
  } else await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  // Clerk's frontend API takes the testing token on every request, and its answers say bot protection is bypassed
  // (what @clerk/testing's setupClerkTestingToken does): otherwise sign-up runs Clerk's CAPTCHA, which fails headless.
  await ctx.route(`https://${FAPI}/v1/**`, async (r) => {
    const url = new URL(r.request().url());
    url.searchParams.set('__clerk_testing_token', token);
    // A page load to Clerk (its /v1/client/touch on sign-out) is a real navigation with redirects: let it through.
    if (r.request().isNavigationRequest()) return r.continue({ url: url.toString() });
    const res = await r.fetch({ url: url.toString(), maxRedirects: 0 });
    let body;
    try { body = await res.json(); } catch { return r.fulfill({ response: res }); }
    // The app signs a new email in first and falls back to sign-up on `form_identifier_not_found`: expected, not news.
    const codes = (body?.errors ?? []).map((e) => e.code).join(',');
    if (res.status() >= 400 && codes !== 'form_identifier_not_found') {
      clerkFailures.push(`${r.request().method()} ${url.pathname} → ${res.status()}${codes ? ` ${codes}` : ''}`);
    }
    // clerk-js skips its CAPTCHA only when the client it holds says so: mark every client object it receives. And in
    // case no client arrives to mark (a fresh browser), the environment says CAPTCHA is off; the testing token already
    // satisfies Clerk's server.
    markBypass(body?.response); markBypass(body?.client); markBypass(body?.meta?.client);
    if (url.pathname === '/v1/environment') {
      const signUp = (body?.user_settings ?? body?.response?.user_settings)?.sign_up;
      if (signUp && typeof signUp === 'object') {
        signUp.captcha_enabled = false;
        if (!captchaOffLogged) { captchaOffLogged = true; console.log('  (Clerk environment: CAPTCHA off for this test browser)'); }
      }
    }
    return r.fulfill({ response: res, json: body });
  });
  await ctx.addInitScript(() => { if (!sessionStorage.getItem('qa-init')) { sessionStorage.setItem('qa-init', '1'); localStorage.setItem('hoyos.lang', 'es'); } });
  page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${route(page)}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });

  // 1. Coming Soon → sign-in (the test site may be live, `/` = the website: then sign-in is opened directly)
  if (REAL) {
    await page.goto(`${BASE}/#/auth/sign-in`);
    await step('the test site\'s sign-in form opens (real Clerk loaded)', await waitFor(page, () => signedOutForm(page)), route(page));
  } else {
    await page.goto(`${BASE}/#/`);
    await page.locator('.coming-soon-login').click();
    await step('Coming Soon "Entrar" opens the sign-in form (real Clerk loaded)', await waitFor(page, () => signedOutForm(page)), route(page));
  }

  // 2. A new account: the code, then the studio's sign-up form
  await emailCode(page, EMAIL);
  await step('a new email gets a Clerk account and the studio sign-up form', await waitFor(page, async () => (await page.locator('[data-register]').count()) === 1), route(page));
  const inputs = page.locator('[data-register] input:not([type=checkbox])');
  await inputs.nth(0).fill('QA Prueba');
  await inputs.nth(1).fill('+57 300 555 0199');
  await inputs.nth(2).fill('QA Contacto');
  await inputs.nth(3).fill('+57 300 555 0198');
  await page.locator('[data-register] input[type=checkbox]').check();
  await page.locator('[data-register] button[type=submit]').click();
  await step('after the studio sign-up the customer is in the app', await waitFor(page, async () => route(page).startsWith('/app')), route(page));
  if (REAL) {
    // What Company OS itself says about the new login: its own /me (with the browser's session), and the records.
    const me = await page.evaluate(async (tenant) => {
      const token = await window.Clerk?.session?.getToken();
      const res = await fetch(`/api/cos/t/${encodeURIComponent(tenant)}/me`, { headers: { authorization: `Bearer ${token}` } });
      return { status: res.status, body: await res.json().catch(() => null) };
    }, TENANT);
    check('Company OS /me: the new login is a customer (member) and nothing else', me.status === 200 && JSON.stringify(me.body?.roleKeys) === '["member"]' && me.body?.isSuperAdmin === false, JSON.stringify({ status: me.status, roleKeys: me.body?.roleKeys }));
    const found = await findSignup(await adminCos(), EMAIL);
    check('Company OS holds one person and one self_signup member record for the new login', found.personIds.length === 1 && found.members.length === 1 && found.members[0].source === 'self_signup', JSON.stringify({ people: found.personIds.length, members: found.members }));
  }

  // 3. Sign out from the access page
  await page.goto(`${BASE}/#/app/access`); await settle(page);
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await step('sign-out ends on the sign-in form (no spinner, no error)', await waitFor(page, () => signedOutForm(page), 15_000), route(page));

  // 4. Sign in again with the same address
  await emailCode(page, EMAIL);
  await step('the same email signs back in to the app', await waitFor(page, async () => route(page).startsWith('/app')), route(page));

  // 5. Sign out from "Más"
  await page.goto(`${BASE}/#/app/more`); await settle(page);
  await page.getByText('Cerrar sesión', { exact: true }).first().click();
  await step('sign-out from "Más" ends on the sign-in form (no spinner, no error)', await waitFor(page, () => signedOutForm(page), 15_000), route(page));

  check('no page errors', errors.length === 0, errors.slice(0, 5).join(' | '));

  // 6. Google: the button reaches Google (the account step itself can't be automated)
  await page.getByRole('button', { name: 'Continuar con Google' }).click();
  await step('"Continuar con Google" reaches Google\'s sign-in', await waitFor(page, async () => /(^|\.)google\.com$/.test(new URL(page.url()).hostname)), page.url().split('?')[0]);
} catch (e) {
  await step(`ran to the end (${String(e?.message ?? e).split('\n')[0]})`, false);
} finally {
  await browser?.close();
  if (!REAL) server.close();
  if (REAL) {
    // Company OS first (the records name the login), then Clerk; each says what it left behind.
    try {
      const out = await removeSignup(await adminCos(), EMAIL);
      check('the Company OS records this run created are removed (membership, person, member)', out.left.length === 0 && !out.refused, out.left.join(', '));
    } catch (e) { check(`Company OS clean-up (${e.message}); LEFT BEHIND: the records of ${EMAIL}, remove by hand as a Super Admin`, false); }
    await endAdminSession();
  }
  try {
    const left = (await usersWith(`email_address=${encodeURIComponent(EMAIL)}`)).filter(isQaUser);
    await deleteUsers(left);
    check('the Clerk test user this run created is deleted', (await usersWith(`email_address=${encodeURIComponent(EMAIL)}`)).length === 0);
  } catch (e) { check(`clean-up (${e.message})`, false); }
  done();
}
