// Review round 1 (Hoy all-roles), in the browser on the PRODUCTION build, a fake Clerk (scripts/fixtures/fake-clerk.js)
// and a fake Company OS (fictional people and dates only):
// - M3/M5: Settings › Hours keeps the holiday and special hours (`hours_override`) next to the reception hours. The
//   coordinator's holiday saves once the recipe grants it (and says, in words, that the bookings closed days are
//   Administration's); without the grant the refusal is a sentence, never the code. Administration's save puts the day
//   in bookings `review_closed_dates` before it says "saved", keeping the closed days set in Reception hours.
// - L6: a refused settings save stops the spinner and says why.
// Run: npm run build:production && QA_PROD_DIST=dist node scripts/test-r1-ui.mjs
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import { launchBrowser, reporter } from './lib/launch-qa.mjs';

const { check, done } = reporter('round-1 fixes (UI)');
const isProd = (dir) => existsSync(join(dir, 'index.html')) && readdirSync(join(dir, 'assets')).filter((f) => f.endsWith('.js')).some((f) => readFileSync(join(dir, 'assets', f), 'utf8').includes('clerk-js'));
const PROD = resolve(process.env.QA_PROD_DIST ?? 'dist');
if (!isProd(PROD)) { console.error(`${PROD} is not a production build: run npm run build:production (or set QA_PROD_DIST)`); process.exit(1); }

const TENANT = 'hoy-r1';
const HOST = 'fake.clerk.accounts.dev';
const PK = `pk_test_${Buffer.from(`${HOST}$`).toString('base64')}`;
const FAKE_CLERK = readFileSync(new URL('./fixtures/fake-clerk.js', import.meta.url), 'utf8');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.woff2': 'font/woff2' };
const TODAY = '2026-11-03';

const PEOPLE = {
  user_admin: { name: 'Mateo Admin', person: 'per_admin', keys: ['administrator', 'super_admin'], superAdmin: true },
  user_coord: { name: 'Clara Coordina', person: 'per_coord', keys: ['booking_manager'] },
};
const ACCOUNTS = Object.fromEntries(Object.keys(PEOPLE).map((u) => [u, { emails: [{ id: `ea_${u}`, email: `${u.slice(5)}@example.test`, verified: true }], primary: `ea_${u}` }]));

// ── the fake Hoy server + Company OS ────────────────────────────────────────────────────────────────────────────
let world;
function reset({ hoursWriters = ['administrator', 'booking_manager'], refuseSettings = false } = {}) {
  world = { hours: new Map(), bookings: { review_hours: 'mon-sat 08:00-20:00', review_closed_dates: '2026-12-31' }, hoursWriters, refuseSettings, log: [], seq: 0 };
}
reset();
const userOf = (req) => /^Bearer fake\.([^.]+)\.[^.]+$/.exec(req.headers.authorization ?? '')?.[1] ?? null;
const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(body === undefined ? '' : JSON.stringify(body)); };
const readBody = (req) => new Promise((r) => { let s = ''; req.on('data', (c) => { s += c; }); req.on('end', () => { try { r(JSON.parse(s || '{}')); } catch { r({}); } }); });
const rec = (id, data) => ({ id, data, createdBy: 'user_admin', createdAt: '2026-10-01T10:00:00Z', updatedAt: '2026-10-01T10:00:00Z' });
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://127.0.0.1').pathname;
  if (path === '/app-config.json') return json(res, 200, { tenant: TENANT, apiBase: '/api/cos', clerkPublishableKey: PK, environment: 'test' });
  if (path.startsWith(`/api/cos/t/${TENANT}/`)) {
    const user = userOf(req);
    if (!user) return json(res, 401, { error: 'unauthorized' });
    const route = path.slice(`/api/cos/t/${TENANT}`.length);
    const p = PEOPLE[user];
    const body = req.method === 'GET' ? null : await readBody(req);
    world.log.push({ user, method: req.method, route, body });
    if (route === '/me') return p ? json(res, 200, { tenant: { slug: TENANT, timezone: 'America/Bogota' }, user: { id: user, name: p.name, email: `${user}@example.test` }, roleKeys: p.keys, isSuperAdmin: !!p.superAdmin, caps: [], entities: [] }) : json(res, 403, { error: 'forbidden' });
    if (route === '/modules/bookings/settings') {
      if (!p?.superAdmin) return json(res, 403, { error: 'forbidden', message: 'only a Super Admin can change module settings' });
      if (req.method === 'PATCH') Object.assign(world.bookings, body.settings);
      return json(res, 200, { module: 'bookings', settings: { ...world.bookings } });
    }
    if (route === '/query') {
      if (body.entity === 'person') return json(res, 200, { data: Object.entries(PEOPLE).map(([u, x]) => rec(x.person, { name: x.name, user: u, email: `${u}@example.test` })) });
      if (body.entity === 'hours_override') return json(res, 200, { data: [...world.hours.values()] });
      return json(res, 200, { data: [] });
    }
    const hours = /^\/api\/hours_override(?:\/([^/]+))?$/.exec(route);
    if (hours) {
      if (req.method !== 'GET' && !world.hoursWriters.includes(p.keys[0])) return json(res, 403, { error: 'forbidden' });
      if (req.method === 'POST') { const id = `ho_${++world.seq}`; world.hours.set(id, rec(id, body)); return json(res, 201, { data: world.hours.get(id) }); }
      const r = world.hours.get(hours[1]);
      if (!r) return json(res, 404, { error: 'not_found' });
      if (req.method === 'PATCH') { Object.assign(r.data, body); return json(res, 200, { data: r }); }
      if (req.method === 'DELETE') { world.hours.delete(hours[1]); return json(res, 204); }
      return json(res, 200, { data: r });
    }
    if (route === '/batch' || /^\/api\/setting/.test(route)) {
      if (world.refuseSettings) return json(res, 403, { error: 'forbidden' });
      return json(res, 200, route === '/batch' ? { ids: body.ops.map((_, i) => `set_${i}`) } : { data: rec('set_1', body) });
    }
    if (req.method === 'GET' && route.startsWith('/api/')) return json(res, 200, { data: [] });
    if (route === '/admin/users') return json(res, 200, { users: [] });
    return json(res, req.method === 'GET' ? 200 : 404, req.method === 'GET' ? { data: [] } : { error: 'not_found' });
  }
  try {
    let file = resolve(PROD, '.' + decodeURIComponent(path));
    if (file !== PROD && !file.startsWith(PROD + sep)) { res.writeHead(403); return res.end(); }
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' }); res.end(await readFile(file));
  } catch { res.writeHead(404); res.end('Not found'); }
});
await new Promise((r) => server.listen(5221, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:5221';

const browser = await launchBrowser();
const errors = [];
const route = (page) => decodeURIComponent(new URL(page.url()).hash.slice(1));
async function signedIn(email) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  await ctx.route(`https://${HOST}/npm/@clerk/clerk-js@*/dist/clerk.browser.js`, (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_CLERK }));
  await ctx.addInitScript(({ accounts, pk }) => {
    window.__fakeClerkConfig = { accounts, publishableKey: pk };
    if (!sessionStorage.getItem('qa-init')) { sessionStorage.setItem('qa-init', '1'); localStorage.setItem('hoyos.lang', 'es'); }
  }, { accounts: ACCOUNTS, pk: PK });
  const page = await ctx.newPage();
  await page.clock.install({ time: new Date(`${TODAY}T15:00:00Z`) });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${BASE}/#/auth/sign-in`);
  await page.waitForTimeout(800);
  await page.locator('[data-step="email"] input').fill(email);
  await page.locator('[data-step="email"] button[type=submit]').click();
  await page.locator('[data-step="code"]').waitFor({ timeout: 5000 });
  await page.locator('[data-step="code"] input').fill('424242');
  await page.locator('[data-step="code"] button[type=submit]').click();
  await page.waitForTimeout(1500);
  return { ctx, page };
}
const go = async (page, path) => { await page.goto(`${BASE}/#${path}`); await page.waitForTimeout(1200); return route(page); };
const text = (page) => page.locator('body').innerText();
/** Adds one closed holiday through the drawer; a missing control fails the checks, not the run. */
async function addHoliday(page, date, label) {
  await page.locator('[data-hours-add]').first().click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(400);
  const drawer = page.locator('[data-hours-drawer]');
  await drawer.locator('input[type=date]').first().fill(date).catch(() => {});
  await drawer.locator('input[type=date]').nth(1).fill(date).catch(() => {});
  await drawer.locator('[data-hours-label-es]').fill(label).catch(() => {});
  await page.locator('[data-hours-save]').click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

try {
  // ── Administration: holiday hours in production, synced to bookings before "saved" ──────────────────────────────
  reset();
  let { ctx, page } = await signedIn('admin@example.test');
  let at = await go(page, '/admin/settings/hours');
  check('admin opens Settings › Hours', at === '/admin/settings/hours', at);
  check('production shows the reception hours and the holiday and special hours together', (await page.locator('[data-holiday-hours]').count()) === 1 && /Recepci/.test(await text(page)), (await text(page)).slice(0, 300));
  check('production shows no Google Business column (not connected at launch)', !/Google/.test(await page.locator('[data-holiday-hours]').innerText().catch(() => '')));
  await addHoliday(page, '2026-11-16', 'Independencia de Cartagena');
  check('admin: the holiday is saved in Company OS', [...world.hours.values()].some((h) => h.data.start_date === '2026-11-16' && h.data.closed === true), JSON.stringify([...world.hours.values()]));
  check('admin: bookings closed dates hold it, and keep the one set in Reception hours (merge, not replace)', world.bookings.review_closed_dates === '2026-11-16, 2026-12-31', world.bookings.review_closed_dates);
  check('admin: the screen says saved', /Excepción guardada/.test(await text(page)));
  await ctx.close();

  // ── the coordinator, with the recipe grant ──────────────────────────────────────────────────────────────────────
  reset();
  ({ ctx, page } = await signedIn('coord@example.test'));
  at = await go(page, '/admin/settings/hours');
  check('coordinator opens Settings › Hours', at === '/admin/settings/hours', at);
  await addHoliday(page, '2026-11-16', 'Independencia de Cartagena');
  check('coordinator (grant in place): the holiday saves', [...world.hours.values()].some((h) => h.data.start_date === '2026-11-16'));
  let body = await text(page);
  check('coordinator: the screen says it saved, and that the bookings closed days are Administration\'s (words, no code)', /Se guardó/.test(body) && /Administración/.test(body) && !/closed_dates_|forbidden/.test(body), body.slice(0, 600));
  check('coordinator: no module settings write was attempted', !world.log.some((l) => l.route === '/modules/bookings/settings' && l.method === 'PATCH'));
  await ctx.close();

  // ── the coordinator, without the grant ─────────────────────────────────────────────────────────────────────────
  reset({ hoursWriters: ['administrator'] });
  ({ ctx, page } = await signedIn('coord@example.test'));
  await go(page, '/admin/settings/hours');
  await addHoliday(page, '2026-11-16', 'Independencia de Cartagena');
  body = await text(page);
  check('coordinator (no grant): nothing saved', world.hours.size === 0);
  check('coordinator (no grant): the refusal is the copy (“No tienes permiso…”), never the raw code', /No tienes permiso para hacer esto/.test(body) && !/\bforbidden\b/.test(body), body.slice(0, 600));
  await ctx.close();

  // ── L6: a refused settings save stops the spinner and says why ─────────────────────────────────────────────────
  reset({ refuseSettings: true });
  ({ ctx, page } = await signedIn('admin@example.test'));
  await go(page, '/admin/settings');
  const section = page.locator('[data-settings-section]').filter({ has: page.locator('input[type=text], input:not([type])') }).first();
  await section.locator('input[type=text], input:not([type])').first().fill('Texto de prueba').catch(() => {});
  await section.locator('[data-settings-save]').click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(1500);
  check('L6: after a refused save the button is not stuck on saving', (await section.locator('[data-settings-save][aria-busy="true"], [data-settings-save] .spinner').count()) === 0 && (await section.locator('[data-settings-save]').count()) === 1);
  check('L6: the section says why, in words', /No tienes permiso para hacer esto/.test(await section.innerText().catch(() => '')), await section.innerText().catch(() => ''));
  await ctx.close();
  check('no page threw', errors.length === 0, errors.slice(0, 5).join(' | '));
} finally {
  await browser.close();
  server.close();
}
done();
