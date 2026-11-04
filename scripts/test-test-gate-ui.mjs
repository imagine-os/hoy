// The test site's passphrase gate in a real browser (Company OS playbook rule D5), on the PRODUCTION build behind the REAL
// Hoy server with the gate on: the passphrase page, then the app, then a signed-in call that reaches a fake Company OS.
// It proves what the Node test can't: the browser accepts the `Secure` cookie (localhost counts as secure) and the app's
// own calls carry it (`credentials: 'same-origin'`). fake-clerk.js stands in for Clerk. Fictional data only.
// Run: npm run build:production && npm ci --prefix server && QA_PROD_DIST=dist node scripts/test-test-gate-ui.mjs
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { launchBrowser, reporter } from './lib/launch-qa.mjs';
import { createHandler, createHoyServer } from '../server/app.mjs';
import { loadConfig } from '../server/config.mjs';

const { check, done } = reporter('test gate in the browser');
const DIST = resolve(process.env.QA_PROD_DIST ?? 'dist');
if (!existsSync(join(DIST, 'index.html'))) { console.error(`${DIST}/index.html missing: run npm run build:production first`); process.exit(1); }

const TENANT = 'hoy-test';
const HOST = 'fake.clerk.accounts.dev';
const PK = `pk_test_${Buffer.from(`${HOST}$`).toString('base64')}`;
const FAKE_CLERK = readFileSync(new URL('./fixtures/fake-clerk.js', import.meta.url), 'utf8');
const PASS = 'correct horse battery';
const USER = 'user_member';
const EMAIL = 'member@example.test';
const NEW_USER = 'user_new';
const NEW_EMAIL = 'nueva@example.test';
const ACCOUNTS = {
  [USER]: { emails: [{ id: 'ea_member', email: EMAIL, verified: true }], primary: 'ea_member' },
  [NEW_USER]: { emails: [{ id: 'ea_new', email: NEW_EMAIL, verified: true }], primary: 'ea_new' },
};
const SIGNUP = { enabled: true, consents: [{ document: 'terms', version: '2026-10-01' }, { document: 'privacy', version: '2026-10-01' }], personFields: ['name', 'phone'], facetFields: ['emergency_contact_name', 'emergency_contact_phone'] };
const PORT = Number(process.env.QA_PORT ?? 5197);
// localhost, not 127.0.0.1: Chromium takes a Secure cookie over plain http only on localhost.
const BASE = `http://localhost:${PORT}`;

// ── the fake Company OS ─────────────────────────────────────────────────────────────────────────────────────────
const seen = [];
const cos = createServer((req, res) => {
  req.resume();
  req.on('end', () => {
    const path = new URL(req.url, 'http://cos').pathname.replace(`/t/${TENANT}`, '');
    seen.push({ method: req.method, path, headers: req.headers });
    const isNew = /^Bearer fake\.user_new\./.test(req.headers.authorization ?? '');
    if (path === '/me' && isNew) { res.writeHead(403, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ error: 'account_not_invited' })); }
    res.writeHead(200, { 'content-type': 'application/json' });
    if (path === '/signup' && req.method === 'GET') return res.end(JSON.stringify(SIGNUP));
    if (path === '/me') return res.end(JSON.stringify({ tenant: { slug: TENANT }, user: { id: USER, name: 'Ana Cliente', email: EMAIL }, roleKeys: ['member'], isSuperAdmin: false, caps: [], entities: [] }));
    return res.end(JSON.stringify({ data: [] }));
  });
});
await new Promise((r) => cos.listen(0, '127.0.0.1', r));

// ── the real Hoy server, gate on ────────────────────────────────────────────────────────────────────────────────
const config = loadConfig({
  COMPANY_OS_URL: `http://127.0.0.1:${cos.address().port}`, COMPANY_OS_TENANT: TENANT, CLERK_SECRET_KEY: 'sk_test_example',
  CLERK_PUBLISHABLE_KEY: PK, HOY_ENV: 'test', DIST_DIR: DIST, SITE_LIVE: 'true',
  TEST_GATE_PASSPHRASE: PASS, COOKIE_SIGNING_SECRET: 's'.repeat(64), APP_URL: BASE,
});
const verifySession = async (token) => {
  const user = /^fake\.([^.]+)\.[^.]+$/.exec(token)?.[1];
  if (!user) throw new Error('invalid');
  return { userId: user };
};
const web = createHoyServer(await createHandler(config, { verifySession, log: () => {} }));
await new Promise((r) => web.listen(PORT, '127.0.0.1', r));

const browser = await launchBrowser();
const errors = [];
const answers = [];
const until = async (fn, ms = 10_000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await new Promise((r) => setTimeout(r, 100)); } return false; };
const route = (page) => decodeURIComponent(new URL(page.url()).hash.slice(1));

try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  await ctx.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  await ctx.route(`https://${HOST}/npm/@clerk/clerk-js@*/dist/clerk.browser.js`, (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_CLERK }));
  await ctx.addInitScript(({ accounts, pk }) => {
    window.__fakeClerkConfig = { accounts, publishableKey: pk };
    if (!sessionStorage.getItem('qa-init')) { sessionStorage.setItem('qa-init', '1'); localStorage.setItem('hoyos.lang', 'es'); }
  }, { accounts: ACCOUNTS, pk: PK });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', async (r) => { if (r.url().startsWith(BASE)) answers.push({ path: new URL(r.url()).pathname, status: r.status(), body: r.url().includes('/api/') ? await r.text().catch(() => '') : '' }); });

  // 1. The passphrase page: nothing of the app.
  const first = await page.goto(`${BASE}/#/auth/sign-in`);
  check('the first visit answers 401', first?.status() === 401, String(first?.status()));
  check('it shows the passphrase form', (await page.locator('form[action="/test-gate"] input[name="passphrase"]').count()) === 1);
  check('it says noindex', first?.headers()['x-robots-tag'] === 'noindex, nofollow');
  check('no app bundle was served', !answers.some((a) => a.path.startsWith('/assets/')), JSON.stringify(answers));

  // 2. A wrong passphrase: the form again, no cookie.
  await page.locator('input[name="passphrase"]').fill('not the passphrase');
  await page.locator('form[action="/test-gate"] button[type="submit"]').click();
  await page.locator('[role="alert"]').waitFor({ timeout: 5000 }).catch(() => {});
  check('a wrong passphrase says so', (await page.locator('[role="alert"]').count()) === 1);
  check('a wrong passphrase sets no cookie', !(await ctx.cookies()).some((c) => c.name === 'hoy_test_gate'));

  // 3. The right one: the cookie, as the browser took it, and the app.
  await page.locator('input[name="passphrase"]').fill(PASS);
  await page.locator('form[action="/test-gate"] button[type="submit"]').click();
  await page.waitForURL(`${BASE}/**`, { timeout: 5000 }).catch(() => {});
  await until(async () => new URL(page.url()).pathname === '/');
  check('the right passphrase goes on to the site', new URL(page.url()).pathname === '/', page.url());
  const cookie = (await ctx.cookies()).find((c) => c.name === 'hoy_test_gate');
  check('the browser keeps the cookie: HttpOnly, Secure, SameSite=Lax', cookie?.httpOnly === true && cookie?.secure === true && cookie?.sameSite === 'Lax', JSON.stringify({ ...cookie, value: undefined }));
  check('the page\'s script can\'t read it', !(await page.evaluate(() => document.cookie)).includes('hoy_test_gate'));
  check('the app loads', await until(() => page.evaluate(() => (document.querySelector('#root')?.childElementCount ?? 0) > 0)));
  check('the app\'s bundle is served', answers.some((a) => a.path.startsWith('/assets/') && a.status === 200));
  check('the public settings answer', answers.some((a) => a.path === '/app-config.json' && a.status === 200));

  // 4. Sign in: the app's own call carries the cookie and reaches Company OS, with the bearer and without the cookie.
  await page.goto(`${BASE}/#/auth/sign-in`);
  await page.locator('[data-step="email"] input').waitFor({ timeout: 10_000 }).catch(() => {});
  await page.locator('[data-step="email"] input').fill(EMAIL);
  await page.locator('[data-step="email"] button[type=submit]').click();
  await page.locator('[data-step="code"]').waitFor({ timeout: 5000 }).catch(() => {});
  await page.locator('[data-step="code"] input').fill('424242');
  await page.locator('[data-step="code"] button[type=submit]').click();
  const me = () => seen.filter((s) => s.path === '/me');
  check('a signed-in call reaches the fake Company OS', await until(() => me().length > 0));
  check('it went with the session\'s bearer', me().every((s) => s.headers.authorization === `Bearer fake.${USER}.sess_1` || /^Bearer fake\.user_member\.sess_\d+$/.test(s.headers.authorization ?? '')), JSON.stringify(me().map((s) => s.headers.authorization)));
  check('the gate\'s cookie never reaches Company OS', seen.every((s) => !s.headers.cookie));
  check('the customer lands in the app', await until(() => route(page).startsWith('/app')), route(page));
  const refused = answers.filter((a) => a.path.startsWith('/api/') && a.body.includes('test_gate'));
  check('no call of the app met the gate', refused.length === 0, JSON.stringify(refused));

  // 5. The cookie ends while the app is open: the app's own next read meets the gate. The page reloads onto the passphrase
  // form (a poll would do it within 20 s; moving to another screen does it now), and the Clerk session survives.
  await ctx.clearCookies();
  answers.length = 0;
  const seenBefore = me().length;
  await page.goto(`${BASE}/#/app/history`);
  const form = page.locator('form[action="/test-gate"] input[name="passphrase"]');
  check('the app\'s own read meets the gate and the page lands on the passphrase form', await until(async () => (await form.count().catch(() => 0)) === 1, 30_000), page.url());
  // The app reloads on this answer, which can discard the body before it can be read here: the status comes from the app's
  // own call, the body from the same path asked directly without a cookie.
  const gatedRead = answers.find((a) => a.path.startsWith('/api/') && a.status === 401);
  const direct = gatedRead ? await fetch(`${BASE}${gatedRead.path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }).then(async (r) => ({ status: r.status, body: await r.text() })) : null;
  check('that read was answered test_gate', !!direct && direct.status === 401 && direct.body.includes('test_gate'), JSON.stringify({ gatedRead, direct, answers: answers.slice(0, 5) }));
  const clerkState = () => page.evaluate(() => JSON.parse(sessionStorage.getItem('fake-clerk-state') ?? 'null')?.active?.userId ?? null);
  check('the Clerk session is still there behind the form', (await clerkState().catch(() => null)) === USER);
  await form.fill(PASS);
  await page.locator('form[action="/test-gate"] button[type="submit"]').click();
  check('after the passphrase the same person is signed in, without signing in again', await until(() => me().length > seenBefore), String(me().length));
  check('and is not asked to sign in', (await page.locator('[data-step="email"]').count()) === 0 && (await clerkState().catch(() => null)) === USER);
  await ctx.close();

  // 6. A write that meets the gate: the form stays, with what was typed and the copy, and the page does not reload. The
  // gate's answer is played here, on the one call, so no read can reload the page first. (The sign-up form: cosRequest.ts.)
  const writer = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  await writer.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  await writer.route(`https://${HOST}/npm/@clerk/clerk-js@*/dist/clerk.browser.js`, (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_CLERK }));
  await writer.addInitScript(({ accounts, pk }) => {
    window.__fakeClerkConfig = { accounts, publishableKey: pk };
    if (!sessionStorage.getItem('qa-init')) { sessionStorage.setItem('qa-init', '1'); localStorage.setItem('hoyos.lang', 'es'); }
  }, { accounts: ACCOUNTS, pk: PK });
  const second = await writer.newPage();
  second.on('pageerror', (e) => errors.push(e.message));
  await second.goto(`${BASE}/#/auth/sign-in`);
  await second.locator('input[name="passphrase"]').fill(PASS);
  await second.locator('form[action="/test-gate"] button[type="submit"]').click();
  await until(async () => new URL(second.url()).pathname === '/');
  await second.goto(`${BASE}/#/auth/sign-in`);
  await second.locator('[data-step="email"] input').waitFor({ timeout: 10_000 }).catch(() => {});
  await second.locator('[data-step="email"] input').fill(NEW_EMAIL);
  await second.locator('[data-step="email"] button[type=submit]').click();
  await second.locator('[data-step="code"]').waitFor({ timeout: 5000 }).catch(() => {});
  await second.locator('[data-step="code"] input').fill('424242');
  await second.locator('[data-step="code"] button[type=submit]').click();
  const register = second.locator('[data-register]');
  await register.waitFor({ timeout: 10_000 }).catch(() => {});
  check('a new login gets the sign-up form', (await register.count()) === 1, second.url());
  const inputs = register.locator('input:not([type=checkbox])');
  await inputs.nth(0).fill('Nueva Prueba');
  await inputs.nth(1).fill('+57 300 555 0199');
  await inputs.nth(2).fill('QA Contacto');
  await inputs.nth(3).fill('+57 300 555 0198');
  await register.locator('input[type=checkbox]').check();
  let gatedWrites = 0;
  await second.route(`**/api/cos/t/${TENANT}/signup`, (r) => {
    if (r.request().method() !== 'POST') return r.continue();
    gatedWrites++;
    return r.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'test_gate' }) });
  });
  await second.evaluate(() => { window.__notReloaded = true; });
  await register.locator('button[type=submit]').click();
  check('the write went out and met the gate', await until(() => gatedWrites > 0));
  check('the form says to reload', await until(async () => /Recarga la página/.test(await register.innerText().catch(() => ''))), await register.innerText().catch(() => ''));
  await second.waitForTimeout(1500);
  check('the page did not reload', (await second.evaluate(() => window.__notReloaded === true).catch(() => false)) === true);
  check('what was typed is still there', (await inputs.nth(0).inputValue().catch(() => '')) === 'Nueva Prueba');
  check('the person is still signed in', (await second.evaluate(() => JSON.parse(sessionStorage.getItem('fake-clerk-state') ?? 'null')?.active?.userId ?? null).catch(() => null)) === NEW_USER);
  await writer.close();
} finally {
  check('no page threw', errors.length === 0, errors.join(' | '));
  await browser.close();
  web.close(); cos.close();
}
done();
process.exit(process.exitCode ?? 0);
