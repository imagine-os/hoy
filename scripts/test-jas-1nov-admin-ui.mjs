// Hoy, Jas's 1 Nov acceptance walkthrough, lane A (administration and front desk), in the browser on the PRODUCTION
// build, a fake Clerk (scripts/fixtures/fake-clerk.js) and a fake Company OS whose `/query` rows have the real shape
// `{ id, data: {…fields}, orgUnitId, createdAt, updatedAt }` (Company OS integration guide §1; IN-160). Fictional data.
// - ADM-01 / ADM-02: Class schedule shows each class's name, day and time, teacher, room and "N mats"; Upcoming dates
//   renders, with Cancel class on a scheduled date and none on a cancelled one; the cancel note says a separately paid
//   class goes back to the balance.
// - Error boundary: a page that throws (a malformed date row) shows the error card with Retry and Home; the menu works.
// - ADM-04: a super admin login with no person record saves the payment settings; a refused save says why in words.
// - FIN-01: the desk expense has a paid-on date (today by default); a past day is sent; a future one is refused by the
//   server and the screen says why.
// - Finance has no Refunded card and no Refunded chip.
// - PRO-02: the product master's confirmation and errors show next to the form; a product created today with a price
//   from today shows that price.
// Run: npm run build:production && QA_PROD_DIST=dist node scripts/test-jas-1nov-admin-ui.mjs
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import { launchBrowser, reporter } from './lib/launch-qa.mjs';
import { cosFilter } from './lib/cos-filter.mjs';

const { check, done } = reporter('Jas 1 Nov, lane A (UI)');
const isProd = (dir) => existsSync(join(dir, 'index.html')) && readdirSync(join(dir, 'assets')).filter((f) => f.endsWith('.js')).some((f) => readFileSync(join(dir, 'assets', f), 'utf8').includes('clerk-js'));
const PROD = resolve(process.env.QA_PROD_DIST ?? 'dist');
if (!isProd(PROD)) { console.error(`${PROD} is not a production build: run npm run build:production (or set QA_PROD_DIST)`); process.exit(1); }

const TENANT = 'hoy-jas1';
const HOST = 'fake.clerk.accounts.dev';
const PK = `pk_test_${Buffer.from(`${HOST}$`).toString('base64')}`;
const FAKE_CLERK = readFileSync(new URL('./fixtures/fake-clerk.js', import.meta.url), 'utf8');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.woff2': 'font/woff2' };
// A Monday; the browser clock is pinned to 10:00 in Medellín (15:00 UTC) that day.
const TODAY = '2026-11-02';
const shiftDay = (day, n) => { const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const PORT = Number(process.env.QA_PORT ?? 5231);

const PEOPLE = {
  user_admin: { name: 'Mateo Admin', person: 'per_admin', keys: ['administrator', 'super_admin'], superAdmin: true },
  // Jas's case: a super admin login whose person record was never created (a nameless email-code login).
  user_sa: { name: '', person: null, keys: ['super_admin'], superAdmin: true },
  user_desk: { name: 'Rosa Recepción', person: 'per_desk', keys: ['front_desk'] },
};
const ACCOUNTS = Object.fromEntries(Object.keys(PEOPLE).map((u) => [u, { emails: [{ id: `ea_${u}`, email: `${u.slice(5)}@example.test`, verified: true }], primary: `ea_${u}` }]));

// ── the fake Hoy server + Company OS ────────────────────────────────────────────────────────────────────────────
/** A record as `/query` returns it. */
const rec = (id, data) => ({ id, data, orgUnitId: null, createdAt: '2026-10-20T15:00:00.000Z', updatedAt: '2026-10-20T15:00:00.000Z' });
let world;
// The evening case: 2 Nov, 20:30 in Bogotá, already 3 Nov in UTC.
const EVENING = '2026-11-03T01:30:00Z';
function reset({ hostileOccurrence = false, refuseSettings = false, deskSale = false } = {}) {
  const m = (rows) => new Map(rows.map((r) => [r.id, r]));
  world = {
    person: m([rec('per_admin', { name: 'Mateo Admin', user: 'user_admin' }), rec('per_desk', { name: 'Rosa Recepción', user: 'user_desk' }), rec('per_ana', { name: 'Ana Fictional', email: 'ana@example.test' }),
      ...(deskSale ? [rec('per_lucia', { name: 'Lucía Prueba', email: 'lucia@example.test', phone: '+57 300 000 0042' })] : [])]),
    resource: m([rec('res_big', { name: 'Sala Grande', kind: 'room', capacity: 16 })]),
    coach: m([rec('co_ana', { person: 'per_ana', kind: 'teacher', active: true })]),
    schedule: m([rec('sch_pulso', { title: 'Pulso mañana', kind: 'class', weekday: 1, start_time: '07:00', duration_minutes: 50, resource: 'res_big', coach: 'co_ana', capacity: 16, spots_enabled: true, valid_from: '2026-10-01', valid_until: null, active: true })]),
    occurrence: m([
      rec('oc_open', { title: 'Pulso mañana', starts_at: '2026-11-03T12:00:00.000Z', ends_at: '2026-11-03T12:50:00.000Z', status: 'scheduled', booked_count: 3, capacity: 16, coach: 'co_ana', resource: 'res_big', schedule: 'sch_pulso' }),
      rec('oc_off', { title: 'Fuerza tarde', starts_at: '2026-11-04T23:00:00.000Z', ends_at: '2026-11-04T23:50:00.000Z', status: 'cancelled', booked_count: 0, capacity: 16, coach: 'co_ana', resource: 'res_big', schedule: 'sch_pulso', cancel_reason: 'Ficticio' }),
      // Tonight (2 Nov in Bogotá): one class started at 19:00, one starts at 21:00.
      ...(deskSale ? [
        rec('oc_1900', { title: 'Noche temprana', starts_at: '2026-11-03T00:00:00.000Z', ends_at: '2026-11-03T00:50:00.000Z', status: 'scheduled', booked_count: 2, capacity: 16, coach: 'co_ana', resource: 'res_big', schedule: 'sch_pulso' }),
        rec('oc_2100', { title: 'Noche tardía', starts_at: '2026-11-03T02:00:00.000Z', ends_at: '2026-11-03T02:50:00.000Z', status: 'scheduled', booked_count: 1, capacity: 16, coach: 'co_ana', resource: 'res_big', schedule: 'sch_pulso' }),
      ] : []),
      // A malformed start that still falls inside the page's 14-day window (the fake compares it as Company OS would, as
      // text), so the row reaches Upcoming dates and its date formatting throws (Invalid Date → RangeError).
      ...(hostileOccurrence ? [rec('oc_bad', { title: 'Fila rota', starts_at: '2026-11-05T99:99:00Z', status: 'scheduled', booked_count: 0, capacity: 16, coach: 'co_ana', resource: 'res_big' })] : []),
    ]),
    setting: new Map(), expense: new Map(),
    product: m(deskSale ? [rec('prod_trial', { key: 'trial', name: 'Clase de prueba', kind: 'trial', price: 30000, credits: 1, active: true }), rec('prod_pack', { key: 'pack_8', name: 'Paquete 8 clases', kind: 'pack', price: 200000, credits: 8, active: true })] : []),
    // Lucía already had her trial: a trial lot and its grant entry (credits).
    credit_lot: m(deskSale ? [rec('lot_trial', { person: 'per_lucia', source: 'trial', product: 'prod_trial', quantity: 1 })] : []),
    credit_entry: m(deskSale ? [rec('ce_trial', { lot: 'lot_trial', person: 'per_lucia', delta: 1, reason: 'grant' })] : []),
    refuseSettings, log: [], seq: 0,
  };
}
const userOf = (req) => /^Bearer fake\.([^.]+)\.[^.]+$/.exec(req.headers.authorization ?? '')?.[1] ?? null;
const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(body === undefined ? '' : JSON.stringify(body)); };
const readBody = (req) => new Promise((r) => { let s = ''; req.on('data', (c) => { s += c; }); req.on('end', () => { try { r(JSON.parse(s || '{}')); } catch { r({}); } }); });
const put = (entity, data) => { const id = `${entity}_${++world.seq}`; world[entity].set(id, rec(id, { ...data })); return world[entity].get(id); };
// Company OS filters, strictly: an unknown operator is a 400, never "every row" (scripts/lib/cos-filter.mjs).
const matches = (r, f, user) => cosFilter(r, f, user);
/** `include` replaces `data[field]` with the embedded `{ id, …fields }` (integration guide, "include"). */
const withInclude = (r, include) => {
  const out = structuredClone(r);
  for (const inc of include ?? []) {
    const target = { person: 'person', lot: 'credit_lot', schedule: 'schedule', coach: 'coach' }[inc.field], t = target && world[target].get(out.data[inc.field]);
    if (t) out.data[inc.as ?? inc.field] = { id: t.id, ...Object.fromEntries(Object.entries(t.data).filter(([k]) => !inc.fields || inc.fields.includes(k))) };
  }
  return out;
};
reset();
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://127.0.0.1').pathname;
  if (path === '/app-config.json') return json(res, 200, { tenant: TENANT, apiBase: '/api/cos', clerkPublishableKey: PK, environment: 'test' });
  if (path.startsWith(`/api/cos/t/${TENANT}/`)) {
    const user = userOf(req);
    if (!user) return json(res, 401, { error: 'unauthorized' });
    const route = path.slice(`/api/cos/t/${TENANT}`.length), p = PEOPLE[user];
    const body = req.method === 'GET' ? null : await readBody(req);
    world.log.push({ user, method: req.method, route, body });
    if (route === '/me') return p ? json(res, 200, { tenant: { slug: TENANT, timezone: 'America/Bogota' }, user: { id: user, name: p.name, email: `${user.slice(5)}@example.test` }, roleKeys: p.keys, isSuperAdmin: !!p.superAdmin, caps: [], entities: [] }) : json(res, 403, { error: 'forbidden' });
    if (route === '/query') {
      if (body.aggregate || !world[body.entity]) return json(res, 200, { data: [] });
      let rows;
      try { rows = [...world[body.entity].values()].filter((r) => matches(r, body.filter, user)).map((r) => withInclude(r, body.include)); world.log.push({ user, answered: body.entity, n: rows.length }); }
      catch (e) { world.log.push({ user, refused: e.message, body }); return json(res, e.status ?? 400, { error: e.code ?? 'invalid_query', message: e.message }); }
      return json(res, 200, { data: rows.slice(body.offset ?? 0, (body.offset ?? 0) + (body.limit ?? 100)) });
    }
    if (route === '/batch') {
      if (world.refuseSettings && body.ops.some((o) => o.entity === 'setting')) return json(res, 403, { error: 'forbidden' });
      // Company OS payments 2.8.0: another active row of this key covers the period.
      const clash = body.ops.findIndex((o) => o.entity === 'product' && o.data?.key === 'pack_solapado');
      if (clash >= 0) return json(res, 422, { error: 'product_period_overlap', opIndex: clash });
      const ids = body.ops.map((o) => {
        if (o.op === 'create') return world[o.entity] ? put(o.entity, o.data).id : `${o.entity}_${++world.seq}`;
        const r = world[o.entity]?.get(o.id); if (r) Object.assign(r.data, o.data); return o.id;
      });
      return json(res, 200, { ids });
    }
    if (route === '/api/expense' && req.method === 'POST') {
      // Company OS expenses rules: `paid_on`, when set, is no later than today in the tenant's timezone.
      if (body.paid_on && body.paid_on > TODAY) return json(res, 422, { error: 'invalid_date', message: "paid_on can't be after today" });
      return json(res, 201, { data: put('expense', body) });
    }
    const setting = /^\/api\/setting(?:\/([^/]+))?$/.exec(route);
    if (setting && req.method !== 'GET') {
      if (world.refuseSettings) return json(res, 403, { error: 'forbidden' });
      if (req.method === 'POST') return json(res, 201, { data: put('setting', body) });
      const r = world.setting.get(setting[1]); if (r) Object.assign(r.data, body);
      return json(res, 200, { data: r });
    }
    if (/^\/modules\/[^/]+\/settings$/.test(route)) return json(res, 200, { module: route.split('/')[2], settings: {} });
    if (route === '/members') return json(res, 200, { members: [] });
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
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${PORT}`;

const browser = await launchBrowser();
const errors = [];
let scenario = 'start';
const route = (page) => decodeURIComponent(new URL(page.url()).hash.slice(1));
async function signedIn(email, { trackErrors = true, at = `${TODAY}T15:00:00Z` } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  await ctx.route(`https://${HOST}/npm/@clerk/clerk-js@*/dist/clerk.browser.js`, (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_CLERK }));
  await ctx.addInitScript(({ accounts, pk }) => {
    window.__fakeClerkConfig = { accounts, publishableKey: pk };
    if (!sessionStorage.getItem('qa-init')) { sessionStorage.setItem('qa-init', '1'); localStorage.setItem('hoyos.lang', 'es'); }
  }, { accounts: ACCOUNTS, pk: PK });
  const page = await ctx.newPage();
  await page.clock.install({ time: new Date(at) });
  if (trackErrors) page.on('pageerror', (e) => errors.push(`[${scenario}] ${String(e.stack ?? e.message).split('\n').slice(0, 6).join(' ⏎ ')}`));
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
const tab = (page, name) => page.getByRole('button', { name, exact: true }).first().click({ timeout: 3000 }).catch(() => page.getByText(name, { exact: true }).first().click({ timeout: 3000 }).catch(() => {}));

try {
  // ── ADM-01 / ADM-02: Class schedule from wrapped rows ──────────────────────────────────────────────────────────
  scenario = 'class schedule'; reset();
  let { ctx, page } = await signedIn('admin@example.test');
  let at = await go(page, '/admin/class-schedule');
  check('admin opens Class schedule', at === '/admin/class-schedule', at);
  let body = await text(page);
  check('Classes: the class name shows', /Pulso mañana/.test(body), body.slice(0, 500));
  check('Classes: its day and time show ("lunes · 07:00")', /lunes · 07:00/i.test(body), body.slice(0, 500));
  check('Classes: the teacher (included person) and the room show, with "16 tapetes"', /Ana Fictional · Sala Grande · 16 tapetes/.test(body), body.slice(0, 500));
  check('Classes: a published class reads "Publicada"', /Publicada/.test(body));
  await tab(page, 'Próximas fechas');
  await page.waitForTimeout(600);
  body = await text(page);
  check('Upcoming dates renders (no crash): both dates are listed', /Pulso mañana/.test(body) && /Fuerza tarde/.test(body) && (await page.locator('[data-route-error]').count()) === 0, body.slice(0, 600));
  const open = page.locator('[data-occurrence="oc_open"]'), off = page.locator('[data-occurrence="oc_off"]');
  check('Upcoming dates: the scheduled date shows its teacher, room and 3/16', /Ana Fictional · Sala Grande · 3\/16/.test(await open.innerText().catch(() => '')), await open.innerText().catch(() => 'missing'));
  check('Upcoming dates: Cancel class shows on the scheduled date', (await open.getByRole('button', { name: 'Cancelar clase' }).count()) === 1);
  check('Upcoming dates: no Cancel class on the cancelled date, which reads "Cancelada"', (await off.getByRole('button', { name: 'Cancelar clase' }).count()) === 0 && /Cancelada/.test(await off.innerText().catch(() => '')));
  await open.getByRole('button', { name: 'Cancelar clase' }).click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(300);
  const note = await open.innerText().catch(() => '');
  check('Cancel note: a separately paid class is returned to the balance (no "contact them to reschedule")', /saldo/.test(note) && !/reprogramar/.test(note), note);
  await ctx.close();

  // ── Error boundary: a page that throws keeps the shell and its menu ───────────────────────────────────────────
  scenario = 'error boundary'; reset({ hostileOccurrence: true });
  ({ ctx, page } = await signedIn('admin@example.test', { trackErrors: false }));
  await go(page, '/admin/class-schedule');
  await tab(page, 'Próximas fechas');
  await page.waitForTimeout(600);
  const card = page.locator('[data-route-error]');
  check('a page that throws shows the error card', (await card.count()) === 1, (await text(page)).slice(0, 400));
  check('the error card offers Retry and Home', (await card.getByRole('button', { name: 'Reintentar' }).count()) === 1 && (await card.getByText('Ir al inicio').count()) >= 1, await card.innerText().catch(() => 'missing'));
  check('the app shell stays around the card (the sidebar menu is there)', (await page.locator('a[href$="#/admin/finance"]').count()) >= 1);
  // Retry mounts the page again from scratch: it opens on its first tab (Classes), and the same bad row on Upcoming
  // dates throws again, so the card comes back instead of a blank screen.
  await card.getByRole('button', { name: 'Reintentar' }).click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(600);
  check('Retry renders the page again (its Classes tab shows, the card is gone)', (await page.locator('[data-route-error]').count()) === 0 && (await page.locator('[data-schedule="sch_pulso"]').count()) === 1, (await text(page)).slice(0, 400));
  await tab(page, 'Próximas fechas');
  await page.waitForTimeout(600);
  check('…and the same bad row shows the card again, not a blank screen', (await page.locator('[data-route-error]').count()) === 1);
  // A visible menu entry other than the current page (folded menu groups keep their links hidden).
  const other = page.locator('.deskshell-side a.deskshell-link:not(.is-active):visible').first();
  const href = await other.getAttribute('href', { timeout: 3000 }).catch(() => null);
  await other.click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(1200);
  check('the menu still works: another page opens from the sidebar and the card is gone', !!href && route(page) === href.replace(/^.*#/, '') && route(page) !== '/admin/class-schedule' && (await page.locator('[data-route-error]').count()) === 0, `${href} → ${route(page)}`);
  // Home from the card opens the role's home (Administration: /admin).
  await go(page, '/admin/class-schedule');
  await tab(page, 'Próximas fechas');
  await page.waitForTimeout(600);
  await page.locator('[data-route-error]').getByText('Ir al inicio').click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(1200);
  check('Home on the card opens the role\'s home and the card is gone', route(page) === '/admin' && (await page.locator('[data-route-error]').count()) === 0, route(page));
  await ctx.close();

  // ── Error boundary: a page whose code fails to download; Retry reloads the page ──────────────────────────────
  scenario = 'chunk retry'; reset();
  ({ ctx, page } = await signedIn('admin@example.test', { trackErrors: false }));
  await go(page, '/admin');
  const loaded = new Set(await page.evaluate(() => performance.getEntriesByType('resource').map((e) => e.name)));
  const blockNew = (r) => (loaded.has(r.request().url()) ? r.continue() : r.abort());
  await page.route(/\/assets\/.*\.(js|css)$/, blockNew);
  await go(page, '/admin/class-schedule');
  check('a page whose code fails to download shows the error card', (await page.locator('[data-route-error]').count()) === 1, (await text(page)).slice(0, 300));
  await page.unroute(/\/assets\/.*\.(js|css)$/, blockNew);
  const reloaded = page.waitForEvent('load', { timeout: 8000 }).then(() => true, () => false);
  await page.locator('[data-route-error]').getByRole('button', { name: 'Reintentar' }).click({ timeout: 3000 }).catch(() => {});
  check('Retry after a failed download reloads the page', await reloaded);
  await page.waitForTimeout(1500);
  check('…and the page then opens (the class shows, no card)', /Pulso mañana/.test(await text(page)) && (await page.locator('[data-route-error]').count()) === 0, (await text(page)).slice(0, 300));
  await ctx.close();

  // ── PRO-04 desk + REC-06, in the evening (2 Nov 20:30 in Bogotá, 3 Nov in UTC) ─────────────────────────────────
  scenario = 'desk sale (evening)'; reset({ deskSale: true });
  ({ ctx, page } = await signedIn('desk@example.test', { at: EVENING }));
  at = await go(page, '/staff/register');
  check('front desk opens the desk sale', at === '/staff/register', at);
  // The products and tonight's classes come from three reads each: wait for them before choosing anything.
  const what = page.locator('select[aria-label="Qué compra"]');
  const ready = await what.locator('option[value="prod_trial"]').waitFor({ state: 'attached', timeout: 8000 }).then(() => true, () => false);
  const answered = (entity) => world.log.filter((l) => l.answered === entity).map((l) => l.n).join(',') || 'not asked';
  check('the desk sale lists the products (fake answered)', ready, `products: ${answered('product')} · occurrences: ${answered('occurrence')} · card: ${await page.locator('[data-route-error]').count()} · ${(await text(page)).slice(0, 500)}`);
  await what.selectOption('prod_trial').catch(() => {});
  await page.getByRole('button', { name: 'Ya es cliente', exact: true }).click({ timeout: 3000 }).catch(() => {});
  await page.getByPlaceholder('Buscar por nombre, WhatsApp o email…').fill('Lucía').catch(() => {});
  await page.locator('.register-candidate').first().click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const trialOption = what.locator('option[value="prod_trial"]');
  check('a customer who used the trial: the trial is greyed out, with the reason', (await trialOption.isDisabled().catch(() => false)) && /ya usó su clase de prueba/.test(await trialOption.textContent().catch(() => '') ?? ''), await trialOption.textContent().catch(() => 'missing'));
  check('…a pack stays on sale', !(await what.locator('option[value="prod_pack"]').isDisabled().catch(() => true)));
  check('…and the trial chosen before her shows the note to choose another product', /ya usó su clase de prueba \(o tiene una pendiente de pago\)/.test(await page.locator('[role=note]').allInnerTexts().then((x) => x.join(' ')).catch(() => '')));
  const classes = await page.getByLabel('Check-in a la clase', { exact: true }).locator('option').allTextContents().catch(() => []);
  check('Sell and check in (evening): the 21:00 class is offered, the 19:00 one that started is not', classes.some((o) => /Noche tardía/.test(o)) && !classes.some((o) => /Noche temprana/.test(o)), classes.join(' | '));
  at = await go(page, '/staff/expense');
  const eveningPaidOn = await page.locator('[data-desk-expense-form]').getByLabel('Pagado el', { exact: false }).inputValue().catch(() => 'missing');
  check('Record expense (evening): the paid-on date defaults to the studio day, not the UTC one', eveningPaidOn === TODAY, eveningPaidOn);
  // Review r1: a check-in class chosen by link (or before it started) that has started drops out with a note.
  at = await go(page, '/staff/register?session=oc_1900');
  const startedNote = page.locator('[data-desk-session-started]');
  const noteShown = await startedNote.waitFor({ timeout: 8000 }).then(() => true, () => false);
  check('REC-06 r1: a chosen class that has started shows "choose another or sell without check-in"', noteShown && /ya empezó/.test(await startedNote.innerText().catch(() => '')) && /sin check-in/.test(await startedNote.innerText().catch(() => '')), (await text(page)).slice(0, 400));
  check('no fake query was refused for an unknown filter operator', !world.log.some((l) => l.refused), JSON.stringify(world.log.filter((l) => l.refused)).slice(0, 400));
  await ctx.close();

  // ── ADM-04: payment settings by a super admin with no person record ───────────────────────────────────────────
  scenario = 'payment settings'; reset();
  ({ ctx, page } = await signedIn('sa@example.test'));
  at = await go(page, '/admin/settings/payments');
  check('super admin (no person) opens Settings › Payments', at === '/admin/settings/payments', at);
  let payCard = page.locator('.card', { hasText: 'Cuenta de consignación' }).first();
  await payCard.getByLabel('Banco', { exact: true }).fill('BANCO FICTICIO').catch(() => {});
  await payCard.getByRole('button', { name: 'Guardar', exact: true }).click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(1500);
  let cardText = await payCard.innerText().catch(() => '');
  check('the save reaches Company OS (one /batch with the setting)', world.log.some((l) => l.route === '/batch' && l.body.ops.some((o) => o.entity === 'setting')), JSON.stringify(world.log.filter((l) => l.method !== 'GET' && l.route !== '/query').map((l) => l.route)));
  check('the card says "Guardado", not "not confirmed"', /Guardado/.test(cardText) && !/No se confirmó/.test(cardText), cardText.slice(0, 400));
  check('the setting holds the bank name', [...world.setting.values()].some((r) => r.data.value?.payments?.bankName === 'BANCO FICTICIO'));
  await ctx.close();

  scenario = 'payment settings refused'; reset({ refuseSettings: true });
  ({ ctx, page } = await signedIn('sa@example.test'));
  await go(page, '/admin/settings/payments');
  payCard = page.locator('.card', { hasText: 'Cuenta de consignación' }).first();
  await payCard.getByLabel('Banco', { exact: true }).fill('BANCO FICTICIO').catch(() => {});
  await payCard.getByRole('button', { name: 'Guardar', exact: true }).click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(1500);
  cardText = await payCard.innerText().catch(() => '');
  check('a refused save says why in words (the code\'s copy), not the generic "not confirmed" and never the code', /No tienes permiso para hacer esto/.test(cardText) && !/No se confirmó/.test(cardText) && !/\bforbidden\b/.test(cardText), cardText.slice(0, 400));
  await ctx.close();

  // ── FIN-01: the desk expense's paid-on date ───────────────────────────────────────────────────────────────────
  scenario = 'desk expense'; reset();
  ({ ctx, page } = await signedIn('desk@example.test'));
  at = await go(page, '/staff/expense');
  check('front desk opens Record expense', at === '/staff/expense', at);
  const form = page.locator('[data-desk-expense-form]');
  check('the Record expense form is shown', (await form.count()) === 1, `${(await text(page)).slice(0, 400)} | errors: ${errors.join(' | ').slice(0, 600)}`);
  // A required field's label ends in " *" (Field), so labels are matched by their start, as for Concepto and Valor.
  const paidOn = form.getByLabel('Pagado el', { exact: false });
  check('the paid-on date field is there and defaults to today', (await paidOn.inputValue().catch(() => '')) === TODAY, await paidOn.inputValue().catch(() => 'missing'));
  const fill = async (day) => {
    await form.getByLabel('Concepto', { exact: false }).fill('Jabón ficticio').catch(() => {});
    await form.getByLabel('Valor', { exact: false }).fill('20000').catch(() => {});
    await paidOn.fill(day).catch(() => {});
    await form.getByRole('button', { name: 'Guardar gasto' }).click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(1200);
  };
  const past = shiftDay(TODAY, -3);
  await fill(past);
  const sent = world.log.find((l) => l.route === '/api/expense' && l.method === 'POST');
  check('a past paid-on date is kept and sent', sent?.body?.paid_on === past, JSON.stringify(sent?.body ?? null));
  check('…and the screen says it was recorded', /Gasto registrado/.test(await form.innerText().catch(() => '')));
  await fill(shiftDay(TODAY, 2));
  const refused = await form.innerText().catch(() => '');
  check('a future date is refused by the server and the screen says why (invalid_date copy)', /Revisa la fecha/.test(refused) && !/invalid_date/.test(refused), refused.slice(0, 400));
  check('nothing is stored for the future date', ![...world.expense.values()].some((r) => r.data.paid_on > TODAY));
  await ctx.close();

  // ── Finance: no Refunded card, no Refunded chip ───────────────────────────────────────────────────────────────
  scenario = 'finance'; reset();
  ({ ctx, page } = await signedIn('admin@example.test'));
  at = await go(page, '/admin/finance');
  check('admin opens Finance', at === '/admin/finance', at);
  body = await text(page);
  check('Finance still shows its figures and filters ("Pendientes")', /Pendientes/.test(body), body.slice(0, 400));
  check('no Refunded card', (await page.getByText('Reembolsado', { exact: true }).count()) === 0);
  check('no Refunded filter chip', (await page.getByText('Reembolsadas', { exact: true }).count()) === 0);
  await ctx.close();

  // ── PRO-02: the product master's feedback sits next to the form ───────────────────────────────────────────────
  scenario = 'product master'; reset();
  ({ ctx, page } = await signedIn('admin@example.test'));
  at = await go(page, '/admin/products');
  check('admin opens the product master', at === '/admin/products', at);
  const create = async (key, name) => {
    await page.getByRole('button', { name: 'Nuevo producto' }).first().click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(300);
    const editor = page.locator('[data-product-editor]');
    await editor.locator('input[name=key]').fill(key).catch(() => {});
    await editor.locator('input[name=name]').fill(name).catch(() => {});
    await editor.locator('input[name=price]').fill('100000').catch(() => {});
    await editor.locator('input[name=credits]').fill('4').catch(() => {});
    await editor.getByRole('button', { name: 'Guardar', exact: true }).click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(1200);
    return editor;
  };
  let editor = await create('pack_qa', 'Pack QA ficticio');
  const stored = [...world.product.values()].find((r) => r.data.key === 'pack_qa');
  check('the product is created with a price from today', stored?.data.valid_from === TODAY, JSON.stringify(stored?.data ?? null));
  check('the confirmation shows next to the form (inside the editor area)', (await editor.getByText('Producto guardado.').count()) === 1, await editor.innerText().catch(() => 'missing'));
  check('…and nowhere else on the page', (await page.getByText('Producto guardado.').count()) === 1);
  const cardQa = page.locator('[data-testid="product-pack_qa"]');
  const cardQaText = await cardQa.innerText().catch(() => '');
  check('a product created today with a price from today shows that price, not "Sin precio vigente hoy"', /100\.000/.test(cardQaText) && !/Sin precio vigente hoy/.test(cardQaText), cardQaText);
  editor = await create('pack_solapado', 'Pack solapado ficticio');
  const editorText = await editor.innerText().catch(() => '');
  check('a refusal (product_period_overlap) shows next to the form, in words', /cubre parte de esas fechas/.test(editorText) && !/product_period_overlap/.test(editorText), editorText.slice(0, 500));
  check('…and not at the top of the page', (await page.getByText(/cubre parte de esas fechas/).count()) === 1);
  await ctx.close();

  check('no page threw (outside the error-boundary case)', errors.length === 0, errors.slice(0, 5).join(' | '));
} finally {
  await browser.close();
  server.close();
}
done();
