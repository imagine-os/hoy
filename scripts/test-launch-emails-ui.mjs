// H-9 — /admin/emails in both builds. Review: the M-04 workbench as before. Production (VITE_HOY_BUILD=production): the
// launch emails with Company OS's delivery status only — no local send, no simulated "sent", no status made up when
// Company OS isn't connected. Builds both into temp dirs unless QA_DIST / QA_PROD_DIST name built ones.
// Production has no demo persona (H-2): the test plays the Hoy server like test-auth-production-ui.mjs (dist,
// /app-config.json, a fake Company OS /me and /query) and serves scripts/fixtures/fake-clerk.js in place of Clerk's
// CDN script, then signs in as a fictional administrator. Nothing real is touched.
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, rm, readFile, stat } from 'node:fs/promises';
import { readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';
import { serveDist, launchBrowser, newContext, reporter } from './lib/launch-qa.mjs';

const { check, done } = reporter('launch emails UI');
const temps = [];
async function dist(envName, production) {
  if (process.env[envName]) return process.env[envName];
  const dir = await mkdtemp(join(tmpdir(), production ? 'hoy-emails-prod-' : 'hoy-emails-review-'));
  temps.push(dir);
  execFileSync('npx', ['vite', 'build', '--outDir', dir, '--emptyOutDir', '--logLevel', 'error'],
    { env: { ...process.env, VITE_HOY_BUILD: production ? 'production' : '' }, stdio: 'inherit' });
  // The same pruning as npm run build:production, so the test sees what production serves.
  if (production) execFileSync('node', ['scripts/prune-production.mjs', dir], { stdio: 'inherit' });
  return dir;
}

const SIMULATED = /Simulación LOCAL|Registrar simulación local|LOCAL simulation|Record local simulation|Simulado local/;
const STATUS_WORDS = /\b(Enviado|Entregado|En cola|Programado|Falló|Rebotado|No enviado|Sent|Delivered|Queued|Scheduled|Failed|Bounced|Not sent)\b/;

// ── the fake Hoy server for the production build (as in test-auth-production-ui.mjs) ──────────────────────────────
const TENANT = 'hoy-test', HOST = 'fake.clerk.accounts.dev';
const PK = `pk_test_${Buffer.from(`${HOST}$`).toString('base64')}`;
const FAKE_CLERK = readFileSync(new URL('./fixtures/fake-clerk.js', import.meta.url), 'utf8');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.woff2': 'font/woff2' };
const ACCOUNTS = { user_admin: { emails: [{ id: 'ea_admin', email: 'admin@example.test', verified: true }], primary: 'ea_admin' } };
const MEMBERS = { user_admin: { name: 'Olga Admin', email: 'admin@example.test', roleKeys: ['administrator'] } };
/** One fictional comms_log row, served if the build reads delivery status from Company OS (`POST /query`). */
const LOG_ROW = { id: 'log_1', created_at: '2026-11-01T13:00:00Z', data: { channel: 'email', message_key: 'booking_released', address: 'ana@example.test', status: 'bounced', error: null } };
const queries = [];

async function serveProduction(port, dir) {
  const DIST = resolve(dir);
  const entry = readdirSync(join(DIST, 'assets')).filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(DIST, 'assets', f), 'utf8')).join('\n');
  if (!entry.includes('clerk-js')) throw new Error(`${DIST} is not a production build (no Clerk)`);
  const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
  const server = createServer(async (req, res) => {
    const path = new URL(req.url, 'http://127.0.0.1').pathname;
    if (path === '/app-config.json') return json(res, 200, { tenant: TENANT, apiBase: '/api/cos', clerkPublishableKey: PK, environment: 'test' });
    if (path.startsWith(`/api/cos/t/${TENANT}/`)) {
      const user = /^Bearer fake\.([^.]+)\.[^.]+$/.exec(req.headers.authorization ?? '')?.[1] ?? null;
      if (!user) return json(res, 401, { error: 'unauthorized' });
      const route = path.slice(`/api/cos/t/${TENANT}`.length), m = MEMBERS[user];
      if (route === '/me') return m ? json(res, 200, { tenant: { slug: TENANT }, user: { id: user, name: m.name, email: m.email }, roleKeys: m.roleKeys, isSuperAdmin: false, caps: [], entities: [] }) : json(res, 403, { error: 'no access to this tenant' });
      if (route === '/query' && req.method === 'POST') {
        const body = JSON.parse(await new Promise((r) => { let s = ''; req.on('data', (c) => { s += c; }); req.on('end', () => r(s)); }));
        queries.push(body);
        return json(res, 200, { data: body.entity === 'comms_log' ? [LOG_ROW] : [] });
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
  await new Promise((r) => server.listen(port, '127.0.0.1', r));
  return { base: `http://127.0.0.1:${port}`, close: () => new Promise((r) => server.close(r)) };
}

/** A production context: external requests blocked except Clerk's script, which is the fake. */
async function productionContext(browser, lang) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  await ctx.route(`https://${HOST}/npm/@clerk/clerk-js@*/dist/clerk.browser.js`, (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_CLERK }));
  await ctx.addInitScript(({ accounts, pk, lang }) => {
    window.__fakeClerkConfig = { accounts, publishableKey: pk };
    if (!sessionStorage.getItem('qa-init')) { sessionStorage.setItem('qa-init', '1'); localStorage.setItem('hoyos.lang', lang); }
  }, { accounts: ACCOUNTS, pk: PK, lang });
  return ctx;
}

async function signIn(page, base, email) {
  await page.goto(`${base}/#/auth/sign-in`);
  await page.locator('[data-step="email"] input').waitFor({ timeout: 15000 });
  await page.locator('[data-step="email"] input').fill(email);
  await page.locator('[data-step="email"] button[type=submit]').click();
  await page.locator('[data-step="code"]').waitFor({ timeout: 5000 });
  await page.locator('[data-step="code"] input').fill('424242');
  await page.locator('[data-step="code"] button[type=submit]').click();
  await page.waitForTimeout(1200);
}

const browser = await launchBrowser();
try {
  for (const [label, production, port] of [['review', false, 4391], ['production', true, 4392]]) {
    const dir = await dist(production ? 'QA_PROD_DIST' : 'QA_DIST', production);
    const server = production ? await serveProduction(port, dir) : await serveDist(port, dir);
    try {
      for (const lang of ['es', 'en']) {
        const ctx = production ? await productionContext(browser, lang) : await newContext(browser, { userId: 'usr_admin', lang });
        const page = await ctx.newPage();
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        if (production) {
          await signIn(page, server.base, 'admin@example.test');
          check(`production ${lang}: the fictional administrator is signed in (admin home)`, decodeURIComponent(new URL(page.url()).hash.slice(1)) === '/admin', page.url());
        }
        await page.goto(`${server.base}/#/admin/emails`);
        await page.waitForSelector(production ? '[data-launch-emails]' : '.emails, .empty-state, h1', { timeout: 15000 });
        await page.waitForTimeout(500);
        const text = await page.locator('main, body').first().innerText();
        if (!production) {
          check(`review ${lang}: the M-04 workbench is unchanged (local simulation notice, no launch page)`, SIMULATED.test(text) && (await page.locator('[data-launch-emails]').count()) === 0);
        } else {
          check(`production ${lang}: the launch emails page renders`, (await page.locator('[data-launch-email]').count()) === 13);
          check(`production ${lang}: no local send or simulated status`, !SIMULATED.test(text) && (await page.getByRole('button', { name: /prueba|test/i }).count()) === 0, text.match(SIMULATED)?.[0]);
          // Without the Company OS read seam the page says there is no status; with it, it shows exactly what Company OS
          // reported (the one fictional "bounced" row) and nothing else.
          const delivery = await page.getByRole('region', { name: /Estado de entrega|Delivery status/ }).innerText();
          const unavailable = (await page.locator('[data-delivery="unavailable"]').count()) === 1;
          check(`production ${lang}: delivery status is Company OS's or none (never invented)`, unavailable
            ? !STATUS_WORDS.test(delivery)
            : queries.some((q) => q.entity === 'comms_log') && /Rebotado|Bounced/.test(delivery) && !/Enviado|Entregado|Sent\b|Delivered/.test(delivery), delivery.slice(0, 200));
          check(`production ${lang}: blocked emails say so`, (await page.locator('[data-launch-email="receipt_uploaded_team"]').innerText()).match(/Aún no se envía|Not sent yet/) !== null
            && (await page.locator('[data-launch-email="class_cancelled"]').innerText()).match(/Aún no se envía|Not sent yet/) === null);
          await page.locator('[data-launch-email="booking_released"] button').click();
          const preview = await page.locator('[data-launch-email="booking_released"] .emailpreview').innerText();
          check(`production ${lang}: the preview is the Spanish copy with sample data, every placeholder filled`, /Hola Valentina/.test(preview) && !/\{\{|\{brand\}/.test(preview));
          check(`production ${lang}: no missing string keys`, !/⟨[\w.]+⟩/.test(text));
        }
        check(`${label} ${lang}: no page errors`, errors.length === 0, errors.join(' | '));
        await ctx.close();
      }
    } finally { await server.close(); }
  }
} finally {
  await browser.close();
  for (const d of temps) await rm(d, { recursive: true, force: true });
}
done();
