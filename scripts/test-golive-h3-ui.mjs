// Hoy go-live, lane H3, in the browser on the PRODUCTION build, a fake Clerk (scripts/fixtures/fake-clerk.js) and a fake
// Company OS with the real `/query` row shape. Fictional data only. The logic half is scripts/test-golive-h3.mjs.
// - Class schedule (AD-01): a draft without a class type can't be published; with one it saves the slug and publishes.
// - Plans: a new public product gets a card on the website and in the app and reaches its purchase; audience, private,
//   inactive and no-credit single products stay out; a used trial hides a second trial; a gift goes to the gift page;
//   hostile product text shows as text.
// - /coming-soon: public before go-live; once live a visitor and a non-admin go to the site, the Super Admin sees it, and
//   the Hub's card still opens it. The first paint: the landing never flashes while the launch settings are read, and a
//   failed or unanswered read doesn't wait for ever.
// - Buying: a pack and a gift through to the stored payment and its receipt.
// Run: npm run build:production && QA_PROD_DIST=dist node scripts/test-golive-h3-ui.mjs
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import { launchBrowser, reporter } from './lib/launch-qa.mjs';
import { cosFilter } from './lib/cos-filter.mjs';

const { check, done } = reporter('Go-live lane H3 (UI)');
const isProd = (dir) => existsSync(join(dir, 'index.html')) && readdirSync(join(dir, 'assets')).filter((f) => f.endsWith('.js')).some((f) => readFileSync(join(dir, 'assets', f), 'utf8').includes('clerk-js'));
const PROD = resolve(process.env.QA_PROD_DIST ?? 'dist');
if (!isProd(PROD)) { console.error(`${PROD} is not a production build: run npm run build:production (or set QA_PROD_DIST)`); process.exit(1); }

const TENANT = 'hoy-h3';
const HOST = 'fake.clerk.accounts.dev';
const PK = `pk_test_${Buffer.from(`${HOST}$`).toString('base64')}`;
const FAKE_CLERK = readFileSync(new URL('./fixtures/fake-clerk.js', import.meta.url), 'utf8');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.woff2': 'font/woff2' };
const PORT = Number(process.env.QA_PORT ?? 5243);

const PEOPLE = {
  user_owner: { name: 'Olga Dueña', person: 'per_owner', keys: ['super_admin'], superAdmin: true },
  user_admin: { name: 'Mateo Admin', person: 'per_admin', keys: ['administrator'] },
  user_cust: { name: 'Lucía Prueba', person: 'per_cust', keys: ['member'] },
  user_coord: { name: 'Clara Coordina', person: 'per_coord', keys: ['booking_manager'] },
};
const ACCOUNTS = Object.fromEntries(Object.keys(PEOPLE).map((u) => [u, { emails: [{ id: `ea_${u}`, email: `${u.slice(5)}@example.test`, verified: true }], primary: `ea_${u}` }]));

const rec = (id, data) => ({ id, data, orgUnitId: null, createdAt: '2026-10-20T15:00:00.000Z', updatedAt: '2026-10-20T15:00:00.000Z' });
const HOSTILE = '<img src=x onerror="window.__hacked=1">Plan raro';
const product = (key, data) => rec(`prod_${key}`, { key, name: `Plan ${key}`, kind: 'pack', price: 300000, credits: 6, validity_days: 60, active: true, ...data });
let world;
function reset({ live = false, trialPaid = false, config = 'ok' } = {}) {
  const m = (rows) => new Map(rows.map((r) => [r.id, r]));
  world = {
    live, config, seq: 0, log: [], uploads: 0,
    person: m([rec('per_owner', { name: 'Olga Dueña', user: 'user_owner' }), rec('per_admin', { name: 'Mateo Admin', user: 'user_admin' }), rec('per_cust', { name: 'Lucía Prueba', user: 'user_cust', email: 'cust@example.test' }), rec('per_ana', { name: 'Ana Fictional' }), rec('per_coord', { name: 'Clara Coordina', user: 'user_coord' })]),
    member: m([rec('mem_cust', { person: 'per_cust', status: 'active', price_audience: 'general', user: 'user_cust' })]),
    resource: m([rec('res_big', { name: 'Sala Grande', kind: 'room', capacity: 16 })]),
    coach: m([rec('co_ana', { person: 'per_ana', kind: 'teacher', active: true })]),
    schedule: m([rec('sch_draft', { title: 'Borrador mañana', kind: 'class', weekday: 1, start_time: '07:00', duration_minutes: 50, resource: 'res_big', coach: 'co_ana', capacity: 16, spots_enabled: true, valid_from: '2026-11-09', valid_until: null, active: false }),
      rec('sch_live_notype', { title: 'Publicada sin tipo', kind: 'class', weekday: 2, start_time: '08:00', duration_minutes: 50, resource: 'res_big', coach: 'co_ana', capacity: 16, spots_enabled: true, valid_from: '2026-11-09', valid_until: null, active: true })]),
    occurrence: new Map(),
    product: m([
      product('pack12', { name: 'Paquete de 12 clases', credits: 12, price: 600000 }),
      product('pack6', { name: 'Paquete de 6 clases', freezable: true }),
      product('trial_b', { name: 'Prueba de amigos', kind: 'trial', credits: 1, price: 20000 }),
      product('gift_b', { name: 'Regalo de 2 clases', kind: 'gift', credits: 2, price: 100000 }),
      product('gift_pack12', { name: 'Tarjeta de regalo · paquete de 12 clases', kind: 'gift', credits: 12, price: 600000 }),
      product('raro', { name: HOSTILE }),
      product('aff2', { name: 'QA solo afiliados', audience: 'affiliate' }),
      product('priv2', { name: 'QA privada dos', kind: 'private' }),
      product('off2', { name: 'QA retirado', active: false }),
      product('single0', { name: 'QA sin clases', kind: 'single', credits: 0 }),
    ]),
    payment: m(trialPaid ? [rec('pay_trial', { person: 'per_cust', product: 'prod_trial_b', status: 'pending', amount: 20000, method: 'transfer', date: '2026-11-01', concept: 'Prueba' })] : []),
  };
}
const userOf = (req) => /^Bearer fake\.([^.]+)\.[^.]+$/.exec(req.headers.authorization ?? '')?.[1] ?? null;
const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
const readBody = (req) => new Promise((r) => { let s = ''; req.on('data', (c) => { s += c; }); req.on('end', () => { try { r(JSON.parse(s || '{}')); } catch { r({}); } }); });
const withInclude = (r, include) => {
  const out = structuredClone(r);
  for (const inc of include ?? []) {
    const target = { person: 'person', schedule: 'schedule', coach: 'coach' }[inc.field], t = target && world[target].get(out.data[inc.field]);
    if (t) out.data[inc.as ?? inc.field] = { id: t.id, ...Object.fromEntries(Object.entries(t.data).filter(([k]) => !inc.fields || inc.fields.includes(k))) };
  }
  return out;
};
/** What a signed-out visitor reads (the public_site policy): products of the public kinds that are active. */
const publicRows = (entity, rows) => {
  if (entity !== 'product') return ['schedule', 'occurrence', 'resource', 'coach'].includes(entity) ? rows : [];
  return rows.filter((r) => r.data.active === true && ['trial', 'single', 'pack', 'gift'].includes(r.data.kind));
};
reset();
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://127.0.0.1').pathname;
  // A file's upload link (the storage's signed PUT in real life).
  if (path === '/fake-upload' && req.method === 'PUT') { req.resume(); req.on('end', () => { world.uploads++; res.writeHead(200); res.end(); }); return; }
  if (path === '/app-config.json' && world.config === 'hang') return; // never answers
  if (path === '/app-config.json' && world.config === 'fail') return json(res, 500, { error: 'unavailable' });
  if (path === '/app-config.json' && world.config === 'slow') await new Promise((r) => setTimeout(r, 900));
  if (path === '/app-config.json') return json(res, 200, { tenant: TENANT, apiBase: '/api/cos', clerkPublishableKey: PK, environment: 'test', launch: { siteLive: world.live } });
  if (path.startsWith(`/api/cos/t/${TENANT}/`)) {
    const user = userOf(req), route = path.slice(`/api/cos/t/${TENANT}`.length), p = PEOPLE[user];
    const body = req.method === 'GET' ? null : await readBody(req);
    world.log.push({ user, method: req.method, route, body });
    if (route === '/query') {
      if (body.aggregate || !world[body.entity]) return json(res, 200, { data: [] });
      try {
        const all = [...world[body.entity].values()].filter((r) => cosFilter(r, body.filter, user)).map((r) => withInclude(r, body.include));
        const rows = user ? all : publicRows(body.entity, all);
        return json(res, 200, { data: rows.slice(body.offset ?? 0, (body.offset ?? 0) + (body.limit ?? 100)) });
      } catch (e) { return json(res, e.status ?? 400, { error: e.code ?? 'invalid_query', message: e.message }); }
    }
    if (!user) return json(res, 401, { error: 'unauthorized' });
    if (route === '/me') return p ? json(res, 200, { tenant: { slug: TENANT, timezone: 'America/Bogota' }, user: { id: user, name: p.name, email: `${user.slice(5)}@example.test` }, roleKeys: p.keys, isSuperAdmin: !!p.superAdmin, caps: [], entities: [] }) : json(res, 403, { error: 'forbidden' });
    if (route === '/signup' && req.method === 'GET') return json(res, 200, { enabled: true, consents: [], personFields: [], facetFields: [], registered: true });
    if (route === '/files' && req.method === 'POST') { const id = `file_${++world.seq}`; return json(res, 201, { file: { id, data: { status: 'pending' } }, uploadUrl: `${BASE}/fake-upload` }); }
    if (/^\/files\/[^/]+\/confirm$/.test(route)) return json(res, 200, { file: { id: route.split('/')[2], data: { status: 'ready' } } });
    if (route === '/batch') {
      const ids = body.ops.map((o) => {
        if (o.op === 'create') { const id = `${o.entity}_${++world.seq}`; world[o.entity]?.set(id, rec(id, { ...o.data })); return id; }
        const r = world[o.entity]?.get(o.id); if (r) Object.assign(r.data, o.data); return o.id;
      });
      return json(res, 200, { ids });
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
async function open(email = null) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  await ctx.route(`https://${HOST}/npm/@clerk/clerk-js@*/dist/clerk.browser.js`, (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_CLERK }));
  await ctx.addInitScript(({ accounts, pk }) => {
    window.__fakeClerkConfig = { accounts, publishableKey: pk };
    // First paint: everything the page ever showed, not only where it settled.
    window.__painted = { landing: false, waiting: false };
    new MutationObserver(() => { if (document.querySelector('.coming-soon')) window.__painted.landing = true; if (document.querySelector('[data-launch-wait]')) window.__painted.waiting = true; }).observe(document, { childList: true, subtree: true });
    if (!sessionStorage.getItem('qa-init')) { sessionStorage.setItem('qa-init', '1'); localStorage.setItem('hoyos.lang', 'es'); }
  }, { accounts: ACCOUNTS, pk: PK });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`[${scenario}] ${String(e.stack ?? e.message).split('\n').slice(0, 6).join(' ⏎ ')}`));
  if (email) {
    await page.goto(`${BASE}/#/auth/sign-in`);
    await page.waitForTimeout(800);
    await page.locator('[data-step="email"] input').fill(email);
    await page.locator('[data-step="email"] button[type=submit]').click();
    await page.locator('[data-step="code"]').waitFor({ timeout: 5000 });
    await page.locator('[data-step="code"] input').fill('424242');
    await page.locator('[data-step="code"] button[type=submit]').click();
    await page.waitForTimeout(1500);
  }
  return { ctx, page };
}
const go = async (page, path) => { await page.goto(`${BASE}/#${path}`); await page.waitForTimeout(1200); return route(page); };
const card = (page, key) => page.locator(`[data-generic-plan="${key}"]`);
const text = (page) => page.locator('body').innerText();
const painted = (page) => page.evaluate(() => window.__painted);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
/** The transfer payment's own form: a receipt image and Send. Returns the payment it stored. */
const payByTransfer = async (page) => {
  await page.locator('input[name=receipt]').setInputFiles({ name: 'comprobante.png', mimeType: 'image/png', buffer: PNG });
  await page.getByRole('button', { name: 'Enviar comprobante' }).click();
  await page.waitForTimeout(1200);
  return [...world.payment.values()].at(-1)?.data ?? null;
};

try {
  // ── /coming-soon before and after go-live ─────────────────────────────────────────────────────────────────────
  scenario = 'coming soon, before'; reset();
  let { ctx, page } = await open();
  await go(page, '/coming-soon');
  check('before go-live: a visitor sees Coming Soon', (await page.locator('.coming-soon').count()) === 1, route(page));
  await ctx.close();

  scenario = 'coming soon, live visitor'; reset({ live: true });
  ({ ctx, page } = await open());
  await go(page, '/coming-soon');
  check('live: a visitor is sent to the site', route(page).startsWith('/site') && (await page.locator('.coming-soon').count()) === 0, route(page));
  await ctx.close();

  scenario = 'coming soon, live customer'; reset({ live: true });
  ({ ctx, page } = await open('cust@example.test'));
  await go(page, '/coming-soon');
  check('live: a customer is sent to the site', route(page).startsWith('/site'), route(page));
  await ctx.close();

  scenario = 'coming soon, live administrator'; reset({ live: true });
  ({ ctx, page } = await open('admin@example.test'));
  await go(page, '/coming-soon');
  check('live: Administration without Super Admin is sent to the site', route(page).startsWith('/site'), route(page));
  await ctx.close();

  scenario = 'coming soon, live super admin'; reset({ live: true });
  ({ ctx, page } = await open('owner@example.test'));
  await go(page, '/coming-soon');
  check('live: the Super Admin still sees it', route(page) === '/coming-soon' && (await page.locator('.coming-soon').count()) === 1, route(page));
  await go(page, '/hub');
  const hubCard = page.locator('.hub-card').filter({ has: page.locator('code').filter({ hasText: /^\/coming-soon$/ }) }).first();
  await hubCard.getByRole('button').first().click({ timeout: 5000 }).catch(() => hubCard.getByRole('link').first().click({ timeout: 3000 }).catch(() => {}));
  await page.waitForTimeout(1000);
  check('live: the Hub\'s card still opens it', route(page) === '/coming-soon' && (await page.locator('.coming-soon').count()) === 1, route(page));
  await ctx.close();

  // ── first paint: the launch settings' read decides before anything shows ───────────────────────────────────────
  for (const path of ['/', '/coming-soon']) {
    scenario = `first paint, live, ${path}`; reset({ live: true, config: 'slow' });
    ({ ctx, page } = await open());
    await page.goto(`${BASE}/#${path}`);
    await page.locator('[data-launch-wait]').waitFor({ timeout: 3000 }).catch(() => {});
    check(`live, slow settings, ${path}: the wait says it is loading, it is not a blank page`, /Cargando/.test(await page.locator('[data-launch-wait]').innerText().catch(() => '')));
    await page.waitForTimeout(1800);
    const seen = await painted(page);
    check(`live, slow settings, ${path}: the landing never paints, the loading state does, then the site`, !seen.landing && seen.waiting && route(page).startsWith('/site'), `${JSON.stringify(seen)} ${route(page)}`);
    await ctx.close();
  }
  scenario = 'first paint, before go-live'; reset({ config: 'slow' });
  ({ ctx, page } = await open());
  await page.goto(`${BASE}/`);
  await page.locator('.coming-soon').waitFor({ timeout: 4000 }).catch(() => {});
  check('before go-live, slow settings: the landing shows once they answer', (await page.locator('.coming-soon').count()) === 1, await page.url());
  await ctx.close();
  scenario = 'first paint, failed read'; reset({ config: 'fail' });
  ({ ctx, page } = await open());
  await page.goto(`${BASE}/`);
  await page.locator('.coming-soon').waitFor({ timeout: 4000 }).catch(() => {});
  check('a failed settings read does not wait for ever: the landing shows', (await page.locator('.coming-soon').count()) === 1);
  await ctx.close();
  scenario = 'first paint, read never answers'; reset({ config: 'hang' });
  ({ ctx, page } = await open());
  await page.goto(`${BASE}/`);
  await page.locator('.coming-soon').waitFor({ timeout: 8000 }).catch(() => {});
  check('a settings read that never answers ends at the time limit: the landing shows', (await page.locator('.coming-soon').count()) === 1);
  await ctx.close();

  // ── Plans on the website ──────────────────────────────────────────────────────────────────────────────────────
  scenario = 'plans, website'; reset({ live: true });
  ({ ctx, page } = await open());
  await go(page, '/site/plans');
  check('site: a new public pack has a card, with its name and price', /Paquete de 6 clases/.test(await card(page, 'pack6').innerText().catch(() => '')) && /300\.000/.test(await card(page, 'pack6').innerText().catch(() => '')), await card(page, 'pack6').innerText().catch(() => 'missing'));
  check('site: a second trial and a new gift have cards', (await card(page, 'trial_b').count()) === 1 && (await card(page, 'gift_b').count()) === 1);
  check('site: audience, private, inactive and no-credit products have none', await (async () => { for (const k of ['aff2', 'priv2', 'off2', 'single0']) if (await card(page, k).count()) return false; return !/QA solo afiliados|QA privada dos|QA retirado|QA sin clases/.test(await text(page)); })());
  check('site: the fixed list\'s pack has no second card', (await card(page, 'pack12').count()) === 0);
  check('site: the page copes with the fixed trial and single missing from the master', (await page.locator('.plans-pass').count()) === 0 && (await card(page, 'pack6').count()) === 1 && errors.length === 0, errors.join(' '));
  check('site: hostile product text shows as text', (await card(page, 'raro').innerText().catch(() => '')).includes('<img src=x') && !(await page.evaluate(() => window.__hacked === 1)));
  await card(page, 'pack6').getByRole('button').first().click();
  await page.waitForTimeout(800);
  check('site: signed out, buying goes through sign-in keeping the plan', route(page).startsWith('/auth/sign-in') && route(page).includes('/app/plans?plan=pack6'), route(page));
  await ctx.close();

  // ── Plans in the app ──────────────────────────────────────────────────────────────────────────────────────────
  scenario = 'plans, app'; reset();
  ({ ctx, page } = await open('cust@example.test'));
  await go(page, '/app/plans');
  check('app: a new public pack and a second trial have cards', (await card(page, 'pack6').count()) === 1 && (await card(page, 'trial_b').count()) === 1, (await text(page)).slice(0, 400));
  check('app: audience, private, inactive and no-credit products have none', await (async () => { for (const k of ['aff2', 'priv2', 'off2', 'single0']) if (await card(page, k).count()) return false; return true; })());
  await card(page, 'pack6').getByRole('button').first().click();
  await page.waitForTimeout(1200);
  check('app: buying the new pack opens its transfer payment', route(page) === '/app/pay/product/pack6' && /Paquete de 6 clases/.test(await text(page)), route(page));
  const bought = await payByTransfer(page);
  check('app: the pack is really bought: a pending payment of that product at its price, for no booking', bought?.product === 'prod_pack6' && bought?.amount === 300000 && bought?.status === 'pending' && bought?.person === 'per_cust' && !('for_entity' in bought) && !('notes' in bought), JSON.stringify(bought));
  check('app: …with its receipt uploaded', world.uploads === 1 && world.log.some((l) => l.route === '/files' && l.body?.ownerId && l.body?.kind === 'receipt'), `${world.uploads}`);
  await go(page, '/app/plans');
  await card(page, 'gift_b').getByRole('button').first().click();
  await page.waitForTimeout(1200);
  check('app: a gift goes to the gift page, that gift chosen', route(page).startsWith('/app/gift-voucher') && /Regalo de 2 clases/.test(await page.getByRole('radio', { checked: true }).locator('xpath=ancestor::label[1]').innerText().catch(() => '')), route(page));
  await page.getByLabel('Nombre de quien recibe').fill('Juliana Ficticia');
  await page.getByLabel('Correo de quien recibe').fill('Juliana@Example.Test');
  await page.getByRole('button', { name: 'Continuar al pago por transferencia' }).click();
  await page.waitForTimeout(1200);
  check('app: the gift continues to its transfer payment', route(page) === '/app/pay/product/gift_b', route(page));
  const gifted = await payByTransfer(page);
  check('app: the gift is really bought: that product at its price, for no booking, naming the recipient', gifted?.product === 'prod_gift_b' && gifted?.amount === 100000 && !('for_entity' in gifted) && gifted?.notes === `gift-recipient:${JSON.stringify({ name: 'Juliana Ficticia', email: 'juliana@example.test' })}`, JSON.stringify(gifted));
  await go(page, '/app/plans?plan=pack6');
  await page.waitForTimeout(800);
  check('app: ?plan=<new key> (the way back from sign-in) opens its payment', route(page).startsWith('/app/pay/product/pack6'), route(page));
  await go(page, '/app/plans?plan=gift_b');
  await page.waitForTimeout(800);
  check('app: ?plan=<new gift> opens the gift page', route(page).startsWith('/app/gift-voucher'), route(page));
  await go(page, '/app/pay/product/single0');
  check('app: a no-credit single opened by link takes no payment and points to the schedule', (await page.locator('.notice a[href*="/app/schedule"]').count()) === 1 && (await page.locator('input[type=file]').count()) === 0, (await text(page)).slice(0, 300));
  await ctx.close();

  scenario = 'plans, trial used'; reset({ trialPaid: true });
  ({ ctx, page } = await open('cust@example.test'));
  await go(page, '/app/plans');
  await page.waitForTimeout(800);
  check('app: with a trial payment on record, the second trial has no card; the pack still does', (await card(page, 'trial_b').count()) === 0 && (await card(page, 'pack6').count()) === 1);
  await ctx.close();

  // ── Class type in Class schedule ──────────────────────────────────────────────────────────────────────────────
  scenario = 'class type'; reset();
  ({ ctx, page } = await open('admin@example.test'));
  await go(page, '/admin/class-schedule');
  const row = page.locator('[data-schedule="sch_draft"]');
  check('a draft without a class type says so, and Publish is off', /Sin tipo de clase/.test(await row.innerText().catch(() => '')) && (await row.getByRole('button', { name: 'Publicar' }).isDisabled().catch(() => false)), await row.innerText().catch(() => 'missing'));
  check('a published row without a type says its dates can\'t be booked', /no se pueden reservar/.test(await page.locator('[data-schedule="sch_live_notype"] [data-type-hint]').innerText().catch(() => '')));
  await row.getByRole('button', { name: 'Editar' }).click();
  // As a person does it: the toggle's real input has no size (Toggle.css), so its visible label takes the click.
  await page.locator('label.toggle').filter({ hasText: 'Publicada' }).click();
  await page.waitForTimeout(200);
  check('the form\'s Published toggle is on', await page.getByRole('switch', { name: 'Publicada' }).isChecked());
  check('published without a type: the form says so and Save is off', /Elige el tipo de clase/.test(await text(page)) && (await page.getByRole('button', { name: 'Guardar' }).isDisabled()));
  await page.getByLabel('Tipo de clase').selectOption('pulso');
  await page.waitForTimeout(200);
  await page.getByRole('button', { name: 'Guardar' }).click();
  await page.waitForTimeout(1000);
  const saved = world.schedule.get('sch_draft').data;
  check('saved with the slug the recipe\'s select holds', saved.modality === 'pulso', JSON.stringify(saved));
  check('…and it publishes', saved.active === true, JSON.stringify(saved));
  check('the row now names its class type', /Pulso/.test(await page.locator('[data-schedule="sch_draft"]').innerText().catch(() => '')));
  await ctx.close();

  // ── Teachers tab: Administration edits; the Coordinator sees teachers and keeps classes and rooms ────────────────
  scenario = 'teachers, administration'; reset();
  ({ ctx, page } = await open('admin@example.test'));
  await go(page, '/admin/class-schedule');
  await page.getByText('Profesores', { exact: true }).first().click();
  await page.waitForTimeout(500);
  let pane = page.locator('.stack').filter({ hasText: 'Ana Fictional' }).last();
  check('Administration: New and Edit are on a teacher', (await pane.getByRole('button', { name: 'Editar' }).count()) === 1 && (await page.getByRole('button', { name: 'Nueva' }).count()) === 1);
  await pane.getByRole('button', { name: 'Editar' }).click();
  await page.waitForTimeout(300);
  check('Administration: the form offers bio and specialties', (await page.getByLabel(/bio/i).count()) >= 1 && (await page.getByRole('group', { name: /especialidades/i }).count()) === 1, (await text(page)).slice(0, 500));
  await ctx.close();

  scenario = 'teachers, coordinator'; reset();
  ({ ctx, page } = await open('coord@example.test'));
  const coordAt = await go(page, '/admin/class-schedule');
  check('Coordinator: opens Class schedule', coordAt === '/admin/class-schedule', coordAt);
  check('Coordinator: classes stay editable: New, Edit, and a row\'s controls', (await page.getByRole('button', { name: 'Nueva' }).count()) === 1 && (await page.locator('[data-schedule="sch_draft"]').getByRole('button', { name: 'Editar' }).count()) === 1);
  await page.getByText('Salones', { exact: true }).first().click();
  await page.waitForTimeout(400);
  check('Coordinator: rooms stay editable', (await page.getByRole('button', { name: 'Nueva' }).count()) === 1 && (await page.getByRole('button', { name: 'Editar' }).count()) === 1);
  await page.getByText('Profesores', { exact: true }).first().click();
  await page.waitForTimeout(500);
  check('Coordinator: still sees the teachers', /Ana Fictional/.test(await text(page)), (await text(page)).slice(0, 400));
  check('Coordinator: no New or Edit on the Teachers tab, so no bio, specialties or photo', (await page.getByRole('button', { name: 'Nueva' }).count()) === 0 && (await page.getByRole('button', { name: 'Editar' }).count()) === 0 && (await page.getByLabel(/bio/i).count()) === 0);
  await ctx.close();

  check('no page errors', errors.length === 0, errors.join('\n'));
} catch (e) {
  check(`no crash [${scenario}]`, false, String(e.stack ?? e));
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
done();
