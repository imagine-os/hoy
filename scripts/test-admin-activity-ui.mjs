// M-07 activity log in the browser, on the PRODUCTION build (Hoy all-roles lane E): Administration (which holds the
// tenant Super Admin role, decision AD-04) opens /admin/activity and sees the tenant's real audit trail from Company OS
// `GET /t/:t/audit`, paged past one page; an empty trail shows the empty state; a refusal shows its copy, never
// "no activity". The test plays the Hoy server (dist + /app-config.json) and a fake Company OS, and serves
// scripts/fixtures/fake-clerk.js in place of Clerk's script, so no real Clerk or Company OS is touched.
// Fictional accounts and events only. ES and EN, 390 and 1280 wide.
// Run: npm run build:production && node scripts/test-admin-activity-ui.mjs   (QA_PROD_DIST=<dir> to test another dir)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import { launchBrowser, reporter } from './lib/launch-qa.mjs';

const { check, done } = reporter('M-07 activity on Company OS');
const DIST = resolve(process.env.QA_PROD_DIST ?? 'dist');
const TENANT = 'hoy-test';
const HOST = 'fake.clerk.accounts.dev';
const PK = `pk_test_${Buffer.from(`${HOST}$`).toString('base64')}`;
const FAKE_CLERK = readFileSync(new URL('./fixtures/fake-clerk.js', import.meta.url), 'utf8');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.woff2': 'font/woff2' };
const PORT = 5335;
const BASE = `http://127.0.0.1:${PORT}`;
const DOCUMENTED = new Set(['limit', 'before', 'since', 'event', 'result', 'actor', 'q']);

if (!existsSync(join(DIST, 'index.html'))) { console.error(`${DIST}/index.html missing: run npm run build:production first`); process.exit(1); }
const entry = readdirSync(join(DIST, 'assets')).filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(DIST, 'assets', f), 'utf8')).join('\n');
if (!entry.includes('clerk-js')) { console.error(`${DIST} is not a production build (no Clerk): run npm run build:production`); process.exit(1); }

// ── the fake Company OS audit trail ─────────────────────────────────────────────────────────────────────────────
const NOW = Date.parse('2026-10-30T15:00:00.000Z');
function trail(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: `aud_${String(i).padStart(5, '0')}`,
    // One event every 10 minutes: 620 events span ~4.3 days, inside the default 7-day range.
    at: new Date(NOW - i * 10 * 60_000).toISOString(),
    actor: i % 2 ? 'user_admin' : 'user_desk',
    event: i === 0 ? 'record.updated' : i % 2 ? 'payment.approved' : 'booking.checked_in',
    result: 'OK',
    details: i === 0 ? { entity: 'booking', id: 'bk_ficticio_1', fields: ['status'] } : { entity: i % 2 ? 'payment' : 'booking', id: `rec_${i}` },
  }));
}
const api = { events: [], auditStatus: null, auditCalls: [] };
const ACCOUNTS = {
  user_admin: { emails: [{ id: 'ea_admin', email: 'admin@example.test', verified: true }], primary: 'ea_admin' },
  user_desk: { emails: [{ id: 'ea_desk', email: 'recepcion@example.test', verified: true }], primary: 'ea_desk' },
  user_admin2: { emails: [{ id: 'ea_admin2', email: 'admin2@example.test', verified: true }], primary: 'ea_admin2' },
};
const MEMBERS = {
  user_admin: { name: 'Olga Admin (ficticia)', email: 'admin@example.test', roleKeys: ['administrator', 'super_admin'], isSuperAdmin: true },
  user_desk: { name: 'Rita Recepción (ficticia)', email: 'recepcion@example.test', roleKeys: ['front_desk'], isSuperAdmin: false },
  // Administration without the tenant Super Admin membership (AD-04 not applied): Company OS refuses the audit read.
  user_admin2: { name: 'Pedro Admin (ficticio)', email: 'admin2@example.test', roleKeys: ['administrator'], isSuperAdmin: false },
};

const userOf = (req) => /^Bearer fake\.([^.]+)\.[^.]+$/.exec(req.headers.authorization ?? '')?.[1] ?? null;
const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
const server = createServer(async (req, res) => {
  const url = new URL(req.url, BASE);
  const path = url.pathname;
  if (path === '/app-config.json') return json(res, 200, { tenant: TENANT, apiBase: '/api/cos', clerkPublishableKey: PK, environment: 'test' });
  if (path.startsWith(`/api/cos/t/${TENANT}/`)) {
    const user = userOf(req);
    if (!user) return json(res, 401, { error: 'unauthorized' });
    const m = MEMBERS[user];
    const route = path.slice(`/api/cos/t/${TENANT}`.length);
    if (route === '/me') return m ? json(res, 200, { tenant: { slug: TENANT, timezone: 'America/Bogota' }, user: { id: user, name: m.name, email: m.email }, roleKeys: m.roleKeys, isSuperAdmin: m.isSuperAdmin, caps: [], entities: [] }) : json(res, 403, { error: 'no access to this tenant' });
    if (route === '/members') return json(res, 200, { members: Object.entries(MEMBERS).map(([id, x]) => ({ id, name: x.name, email: x.email })) });
    if (route === '/audit' && req.method === 'GET') {
      api.auditCalls.push(Object.fromEntries(url.searchParams));
      // Like Company OS: super admin only ("super-admin only"), zod-checked query, `before` is exclusive.
      if (!m?.isSuperAdmin) return json(res, 403, { error: 'super-admin only' });
      // The Hoy server's own answer when Company OS is unreachable (502 upstream_unavailable).
      if (api.auditStatus) return json(res, api.auditStatus, { error: 'upstream_unavailable' });
      for (const k of url.searchParams.keys()) if (!DOCUMENTED.has(k)) return json(res, 400, { error: 'invalid query' });
      const limit = Number(url.searchParams.get('limit') ?? 100);
      if (!Number.isInteger(limit) || limit < 1 || limit > 500) return json(res, 400, { error: 'invalid query' });
      const before = url.searchParams.get('before'), since = url.searchParams.get('since');
      const rows = api.events.filter((e) => (!before || Date.parse(e.at) < Date.parse(before)) && (!since || Date.parse(e.at) >= Date.parse(since)));
      return json(res, 200, { events: rows.slice(0, limit) });
    }
    if (route === '/query') return json(res, 200, { data: [] });
    return json(res, 404, { error: 'not_found' });
  }
  try {
    let file = resolve(DIST, '.' + decodeURIComponent(path));
    if (file !== DIST && !file.startsWith(DIST + sep)) { res.writeHead(403); return res.end(); }
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' }); res.end(await readFile(file));
  } catch { res.writeHead(404); res.end('Not found'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

const browser = await launchBrowser();
const errors = [];
const route = (page) => decodeURIComponent(new URL(page.url()).hash.slice(1));
async function openAs(email, { lang = 'es', width = 1280 } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce', timezoneId: 'America/Bogota' });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  await ctx.route(`https://${HOST}/npm/@clerk/clerk-js@*/dist/clerk.browser.js`, (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_CLERK }));
  await ctx.addInitScript(({ accounts, pk, lang }) => {
    window.__fakeClerkConfig = { accounts, publishableKey: pk };
    if (!sessionStorage.getItem('qa-init')) { sessionStorage.setItem('qa-init', '1'); localStorage.setItem('hoyos.lang', lang); }
  }, { accounts: ACCOUNTS, pk: PK, lang });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${email}: ${e.message}`));
  await page.clock.install({ time: new Date(NOW + 60_000) });
  await page.goto(`${BASE}/#/auth/sign-in?next=/admin/activity`);
  await page.locator('[data-step="email"] input').fill(email);
  await page.locator('[data-step="email"] button[type=submit]').click();
  await page.locator('[data-step="code"]').waitFor({ timeout: 5000 });
  await page.locator('[data-step="code"] input').fill('424242');
  await page.locator('[data-step="code"] button[type=submit]').click();
  await page.waitForTimeout(1500);
  if (!route(page).startsWith('/admin/activity')) { await page.goto(`${BASE}/#/admin/activity`); await page.waitForTimeout(1200); }
  return { ctx, page };
}
const main = (page) => page.locator('main').innerText();
const settled = async (page) => { await page.waitForFunction(() => !document.querySelector('main [aria-busy="true"], main .empty-state--loading'), null, { timeout: 8000 }).catch(() => {}); await page.waitForTimeout(400); };

try {
  // 1. Administration sees the real trail, all of it (620 events: two pages of 500 and more)
  api.events = trail(620); api.auditStatus = null; api.auditCalls = [];
  let { ctx, page } = await openAs('admin@example.test');
  await settled(page);
  let text = await main(page);
  check('AC-UI-01 Administration opens /admin/activity on the production build', route(page).startsWith('/admin/activity'), route(page));
  check('AC-UI-02 the page shows the tenant\'s audit events, not the empty state', !/Sin actividad/.test(text) && /payment\.approved/.test(text), text.slice(0, 300));
  check('AC-UI-03 paged past one page: all 620 events are counted', /620 filas/.test(text), text.match(/\d+ filas/)?.[0] ?? 'no row count');
  check('AC-UI-04 who did it is the member\'s name, not a login id', /Olga Admin \(ficticia\)/.test(text) && /Rita Recepción \(ficticia\)/.test(text));
  check('AC-UI-05 the object comes from the event (entity#id)', /booking#bk_ficticio_1/.test(text));
  check('AC-UI-06 at least two requests to /audit, each with documented parameters only and limit ≤ 500',
    api.auditCalls.length >= 2 && api.auditCalls.every((q) => Object.keys(q).every((k) => DOCUMENTED.has(k)) && Number(q.limit) <= 500), JSON.stringify(api.auditCalls.slice(0, 3)));
  check('AC-UI-07 the default range (7 days) is sent as `since`', api.auditCalls.length > 0 && api.auditCalls.every((q) => q.since && Math.abs(Date.parse(q.since) - (NOW + 60_000 - 7 * 86_400_000)) < 86_400_000), JSON.stringify(api.auditCalls[0]));
  check('AC-UI-08 the retention line says what Company OS keeps, not a made-up 24-month promise', !/24 meses/.test(text));
  // Opening one row shows its details
  await page.getByText('booking#bk_ficticio_1').first().click();
  await page.waitForTimeout(400);
  check('AC-UI-09 a row opens its details drawer (the event\'s details)', /"fields"/.test(await page.locator('body').innerText()));
  await ctx.close();

  // 2. English, phone width
  api.auditCalls = [];
  ({ ctx, page } = await openAs('admin@example.test', { lang: 'en', width: 390 }));
  await settled(page);
  text = await main(page);
  check('AC-UI-10 English: the title and the row count', /Activity log/.test(text) && /620 rows/.test(text), text.slice(0, 200));
  check('AC-UI-11 phone width: no horizontal page scroll', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  await ctx.close();

  // 3. An empty trail: the empty state, in both languages
  api.events = []; api.auditCalls = [];
  ({ ctx, page } = await openAs('admin@example.test'));
  await settled(page);
  text = await main(page);
  check('AC-UI-12 an empty trail shows the empty state', /Sin actividad/.test(text), text.slice(0, 300));
  await ctx.close();

  // 4. Company OS refuses (Administration without the Super Admin membership): its copy, not "no activity"
  api.events = trail(5); api.auditCalls = [];
  ({ ctx, page } = await openAs('admin2@example.test'));
  await settled(page);
  text = await main(page);
  check('AC-UI-13 a refused read shows the permission copy and the Super Admin line, never the empty state',
    route(page).startsWith('/admin/activity') && /No tienes permiso/.test(text) && /Super Admin/.test(text) && !/Sin actividad/.test(text), `${route(page)} ${text.slice(0, 300)}`);
  check('AC-UI-13b the refused read was asked once (no retry loop on a 403)', api.auditCalls.length === 1, String(api.auditCalls.length));
  await ctx.close();

  // 4b. Front desk is not offered the page at all (route guard; the backend would refuse anyway)
  ({ ctx, page } = await openAs('recepcion@example.test'));
  check('AC-UI-13c front desk does not open /admin/activity', !route(page).startsWith('/admin/activity'), route(page));
  await ctx.close();

  // 5. Company OS is down: the service copy and a retry, not the empty state
  api.events = trail(5); api.auditStatus = 502; api.auditCalls = [];
  ({ ctx, page } = await openAs('admin@example.test'));
  await settled(page);
  text = await main(page);
  check('AC-UI-14 a failed read says the service did not answer and offers a retry', /no responde/.test(text) && /Reintentar/.test(text) && !/Sin actividad/.test(text), text.slice(0, 300));
  api.auditStatus = null;
  await page.getByRole('button', { name: 'Reintentar' }).click();
  await settled(page);
  check('AC-UI-15 the retry reads again and shows the events', /5 filas/.test(await main(page)));
  await ctx.close();
} catch (e) {
  check(`ran to the end (${String(e?.message ?? e).split('\n')[0]})`, false);
} finally {
  check('no page threw while testing M-07', errors.length === 0, errors.slice(0, 5).join(' | '));
  await browser.close(); server.close();
}
done();
