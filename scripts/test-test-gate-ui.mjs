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
const ACCOUNTS = { [USER]: { emails: [{ id: 'ea_member', email: EMAIL, verified: true }], primary: 'ea_member' } };
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
    res.writeHead(200, { 'content-type': 'application/json' });
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

  // 5. The control: without the cookie the same call meets the gate, so it was the cookie that let it through.
  await ctx.clearCookies();
  const without = await page.evaluate(async (tenant) => {
    const res = await fetch(`/api/cos/t/${tenant}/me`, { credentials: 'same-origin' });
    return { status: res.status, body: await res.json().catch(() => null) };
  }, TENANT);
  check('without the cookie the same call answers the gate\'s 401', without.status === 401 && without.body?.error === 'test_gate', JSON.stringify(without));
} finally {
  check('no page threw', errors.length === 0, errors.join(' | '));
  await browser.close();
  web.close(); cos.close();
}
done();
process.exit(process.exitCode ?? 0);
