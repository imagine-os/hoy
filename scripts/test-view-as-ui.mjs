// Hoy all-roles (lane D) — the Hub and "view as" on the PRODUCTION build (VITE_HOY_BUILD=production), on a fake Clerk
// (scripts/fixtures/fake-clerk.js) and a fake Company OS (fictional people, nothing real):
// - a super admin opens /hub and views the studio as another role: the role's home and menu, the banner, and that
//   role's data through a sample person chosen by membership (an active coach for Teacher, the first member for
//   Customer); view-as survives a reload of the tab and ends with "Exit" or sign-out;
// - while viewing as, nothing but reads reaches Company OS;
// - an Administration login (which also holds the backend super_admin membership, AD-04), a front desk login and a
//   visitor can't open /hub, and a view-as value planted in sessionStorage changes nothing for them;
// - one real write (a settings Save, viewing as admin) is refused in the browser with its copy (L8, review round 1);
// - a role nobody holds shows an explicit empty state, never the super admin's own data (L2, review round 1).
// Lane Y3 (Hoy test-fixes): the Hub is Justin's HubPage, hooked to real data:
// - its look ships (brand band, session bar, bands, cards, previews); "Entrar como {first name}" and the persona
//   dropdown name the real person holding each role (the one view-as samples); no demo persona anywhere;
// - live previews (at most 3) run in frames under their own `?as=`: a frame's view-as never touches the parent's,
//   every frame is read-only and hides the banner; a planted `?as=` is ignored outside a frame and for a non-super admin;
// - Report a problem submits the forms module's `problem_report`; the Construction & testing band (manual, source
//   documents, docs, kanban) opens for the super admin only; the wireframe toggle is session-only and resets on sign-out.
// Run: npm run build:production && QA_PROD_DIST=dist node scripts/test-view-as-ui.mjs
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import { launchBrowser, reporter } from './lib/launch-qa.mjs';

const { check, done } = reporter('view-as');
const isProd = (dir) => existsSync(join(dir, 'index.html')) && readdirSync(join(dir, 'assets')).filter((f) => f.endsWith('.js')).some((f) => readFileSync(join(dir, 'assets', f), 'utf8').includes('clerk-js'));
const PROD = resolve(process.env.QA_PROD_DIST ?? 'dist');
if (!isProd(PROD)) { console.error(`${PROD} is not a production build: run npm run build:production (or set QA_PROD_DIST)`); process.exit(1); }

const TENANT = 'hoy-test';
const HOST = 'fake.clerk.accounts.dev';
const PK = `pk_test_${Buffer.from(`${HOST}$`).toString('base64')}`;
const FAKE_CLERK = readFileSync(new URL('./fixtures/fake-clerk.js', import.meta.url), 'utf8');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.woff2': 'font/woff2' };
const TODAY = '2026-10-28';

// Fictional logins: who signs in (super, admin, desk) and the people a view-as may sample.
const PEOPLE = {
  user_super: { name: 'Aaron Super', person: 'per_super', keys: ['super_admin'], superAdmin: true },
  user_admin: { name: 'Mateo Admin', person: 'per_admin', keys: ['administrator', 'super_admin'], superAdmin: true },
  user_desk: { name: 'Camilo Desk', person: 'per_desk', keys: ['front_desk'] },
  user_coach_b: { name: 'Beatriz Coach', person: 'per_coach_b', keys: ['coach'] },
  user_coach_c: { name: 'Carlos Coach', person: 'per_coach_c', keys: ['coach'] },
  user_cust_z: { name: 'Zoe Cliente', person: 'per_cust_z', keys: ['member'] },
  user_cust_a: { name: 'Ana Cliente', person: 'per_cust_a', keys: ['member'] },
};
const COACHES = [{ id: 'co_b', data: { person: 'per_coach_b', kind: 'teacher', active: false } }, { id: 'co_c', data: { person: 'per_coach_c', kind: 'teacher', active: true } }];
const LOTS = [
  { id: 'lot_a', data: { person: 'per_cust_a', source: 'purchase', product: 'prd_pack', valid_from: '2026-10-01', valid_until: '2026-12-31', frozen_from: null, frozen_until: null, voucher: null } },
  { id: 'lot_z', data: { person: 'per_cust_z', source: 'purchase', product: 'prd_pack', valid_from: '2026-10-01', valid_until: '2026-11-15', frozen_from: null, frozen_until: null, voucher: null } },
];
const LEFT = { lot_a: 8, lot_z: 2 };
const ACCOUNTS = Object.fromEntries(['user_super', 'user_admin', 'user_desk'].map((u) => [u, { emails: [{ id: `ea_${u}`, email: `${u.slice(5)}@example.test`, verified: true }], primary: `ea_${u}` }]));

// ── the fake Hoy server + Company OS ────────────────────────────────────────────────────────────────────────────
const userOf = (req) => /^Bearer fake\.([^.]+)\.[^.]+$/.exec(req.headers.authorization ?? '')?.[1] ?? null;
const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
const readBody = (req) => new Promise((r) => { let s = ''; req.on('data', (c) => { s += c; }); req.on('end', () => { try { r(JSON.parse(s || '{}')); } catch { r({}); } }); });
const values = (f, field) => !f || typeof f !== 'object' ? [] : [...(f.and ?? []), ...(f.or ?? [])].flatMap((x) => values(x, field)).concat(f.field === field ? [].concat(f.value) : []);
const PORT = Number(process.env.QA_PORT ?? 5194);
let log = [];
let failForm = 0; // the next N problem reports answer 422 unknown_form
let failDirectory = 0; // review round 2, L2: the next N directory reads answer 503
function answerQuery(user, q) {
  log.push({ user, kind: 'query', entity: q.entity, filter: JSON.stringify(q.filter ?? null), aggregate: !!q.aggregate });
  if (q.entity === 'person') {
    const users = values(q.filter, 'user').map((v) => (v && typeof v === 'object' && v.$me ? user : v));
    return Object.entries(PEOPLE).filter(([u]) => users.includes(u)).map(([u, p]) => ({ id: p.person, data: { name: p.name, user: u, email: `${u}@example.test` }, createdAt: '2026-10-01T10:00:00Z' }));
  }
  if (q.entity === 'coach') {
    const persons = values(q.filter, 'person');
    const active = values(q.filter, 'active');
    return COACHES.filter((c) => (!persons.length || persons.includes(c.data.person)) && (!active.length || active.includes(c.data.active)));
  }
  if (q.entity === 'credit_lot') { const persons = values(q.filter, 'person'); return persons.length ? LOTS.filter((l) => persons.includes(l.data.person)) : LOTS; }
  if (q.entity === 'credit_entry' && q.aggregate) return Object.entries(LEFT).map(([lot, left]) => ({ lot, left }));
  if (q.entity === 'credit_entry') {
    const persons = values(q.filter, 'person');
    return LOTS.filter((l) => persons.includes(l.data.person)).map((l) => ({ id: `ce_${l.id}`, data: { person: l.data.person, delta: LEFT[l.id], reason: 'grant', lot: { id: l.id, source: 'purchase', valid_until: l.data.valid_until, product: 'prd_pack', payment: null, freezable: true } }, createdAt: '2026-10-01T10:00:00Z' }));
  }
  return [];
}
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://127.0.0.1').pathname;
  if (path === '/app-config.json') return json(res, 200, { tenant: TENANT, apiBase: '/api/cos', clerkPublishableKey: PK, environment: 'test' });
  if (path.startsWith(`/api/cos/t/${TENANT}/`)) {
    const user = userOf(req);
    if (!user) return json(res, 401, { error: 'unauthorized' });
    const route = path.slice(`/api/cos/t/${TENANT}`.length);
    const p = PEOPLE[user];
    if (req.method === 'POST' && route === '/forms/problem_report/submissions') {
      const body = await readBody(req);
      log.push({ user, kind: 'form', body });
      if (failForm > 0) { failForm--; return json(res, 422, { error: 'unknown_form' }); }
      return json(res, 200, { outcome: 'created' });
    }
    if (req.method !== 'GET' && route !== '/query') { log.push({ user, kind: 'write', method: req.method, route }); return json(res, 200, { data: { id: 'x' } }); }
    if (route === '/me') return p ? json(res, 200, { tenant: { slug: TENANT, timezone: 'America/Bogota' }, user: { id: user, name: p.name, email: `${user}@example.test` }, roleKeys: p.keys, isSuperAdmin: !!p.superAdmin, caps: [], entities: [] }) : json(res, 403, { error: 'no access to this tenant' });
    if (route === '/admin/users') {
      log.push({ user, kind: 'directory' });
      if (!p?.superAdmin) return json(res, 403, { error: 'super admin only' });
      if (failDirectory > 0) { failDirectory--; return json(res, 503, { error: 'unavailable' }); }
      return json(res, 200, { users: Object.entries(PEOPLE).map(([u, x], i) => ({ userId: u, email: `${u}@example.test`, name: x.name, signedUp: true, memberships: x.keys.map((k, j) => ({ membershipId: `m_${i}_${j}`, roleKey: k })) })) });
    }
    if (route === '/query') return json(res, 200, { data: answerQuery(user, await readBody(req)) });
    if (route.startsWith('/api/')) return json(res, 200, { data: [] });
    return json(res, 404, { error: 'not_found' });
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
const route = (page) => decodeURIComponent(new URL(page.url()).hash.slice(1));
async function open(path = '/auth/sign-in', { liveFrames = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  // Live previews stay off under automation (deterministic captures); this context turns them on, as for a person.
  if (liveFrames) await ctx.addInitScript(() => { Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false }); });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  await ctx.route(`https://${HOST}/npm/@clerk/clerk-js@*/dist/clerk.browser.js`, (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_CLERK }));
  await ctx.addInitScript(({ accounts, pk }) => {
    window.__fakeClerkConfig = { accounts, publishableKey: pk };
    if (!sessionStorage.getItem('qa-init')) { sessionStorage.setItem('qa-init', '1'); localStorage.setItem('hoyos.lang', 'es'); }
  }, { accounts: ACCOUNTS, pk: PK });
  const page = await ctx.newPage();
  await page.clock.install({ time: new Date(`${TODAY}T15:00:00Z`) });
  page.on('pageerror', (e) => errors.push(`${path}: ${e.message}`));
  await page.goto(`${BASE}/#${path}`);
  await page.waitForTimeout(800);
  return { ctx, page };
}
async function signIn(page, email) {
  await page.locator('[data-step="email"] input').fill(email);
  await page.locator('[data-step="email"] button[type=submit]').click();
  await page.locator('[data-step="code"]').waitFor({ timeout: 5000 });
  await page.locator('[data-step="code"] input').fill('424242');
  await page.locator('[data-step="code"] button[type=submit]').click();
  await page.waitForTimeout(1500);
}
const go = async (page, path) => { await page.goto(`${BASE}/#${path}`); await page.waitForTimeout(900); return route(page); };
const refusedAt = (r) => r.startsWith('/no-access') || r.startsWith('/auth/sign-in');
const menu = (page) => page.evaluate(() => [...document.querySelectorAll('nav a[href], aside a[href], header a[href]')].map((a) => decodeURIComponent((a.getAttribute('href') || '').replace(/^.*#/, ''))));
const stored = (page) => page.evaluate(() => sessionStorage.getItem('hoyos.viewAs'));
const banner = (page) => page.locator('[data-view-as-banner]');
const bannerText = async (page) => ((await banner(page).count()) ? await banner(page).first().innerText() : '');
const writes = () => log.filter((l) => l.kind === 'write');
// A missing control fails its checks instead of ending the run (the red run lists every failing check).
// From the Hub: a card's "Entrar como {name}" (customer, teacher, front desk, admin…) or, for any role, the persona dropdown.
const viewAs = async (page, role) => { await page.locator('select[data-hub-persona]').selectOption(role, { timeout: 3000 }).catch(() => {}); await page.waitForTimeout(2000); };
const enterCard = async (page, role) => { await page.locator(`button[data-view-as="${role}"]`).first().click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(2000); };
const forms = () => log.filter((l) => l.kind === 'form');
const skin = (page) => page.evaluate(() => document.documentElement.dataset.skin ?? '');
const exit = async (page) => { await banner(page).getByRole('button', { name: /Salir/ }).click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(1500); };

try {
  // ── a super admin: Justin's Hub with real people ───────────────────────────────────────────────────────────────
  let { ctx, page } = await open();
  await signIn(page, 'super@example.test');
  check('super admin signs in to the admin home', route(page) === '/admin', route(page));
  log = [];
  let at = await go(page, '/hub');
  check('super admin opens /hub in production', at === '/hub', at);
  await page.locator('.hub').waitFor({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1500);
  check('Justin\'s Hub renders: brand band, hero, session bar ("Estás probando como"), the bands and the stat strip', (await page.locator('.hub .hub-brandband').count()) === 1 && (await page.locator('.hub-hero h1').count()) === 1 && /Estás probando como/.test(await page.locator('.hub-sessionbar').innerText().catch(() => '')) && (await page.locator('#hub-band-outside, #hub-band-team, #hub-band-build, #hub-band-tools').count()) === 4 && (await page.locator('.hub-stats').count()) === 1);
  check('…without the staff shell (layout auto, a full page)', (await page.locator('.deskshell, .appshell').count()) === 0);
  check('…with its cards, statuses, "Estás aquí" and route lines', (await page.locator('.hub-card').count()) >= 15 && (await page.locator('.hub-card-meta code').count()) >= 15 && /Estás aquí/.test(await page.locator('.hub-main').innerText().catch(() => '')));
  check('the people come from the directory (GET /admin/users, read once)', log.filter((l) => l.kind === 'directory' && l.user === 'user_super').length === 1, String(log.filter((l) => l.kind === 'directory').length));
  const cardButton = async (role) => (await page.locator(`button[data-view-as="${role}"]`).first().innerText().catch(() => '')).trim();
  check('"Entrar como {first name}": the real person holding each role (the one view-as samples)', (await cardButton('customer')) === 'Entrar como Ana' && (await cardButton('teacher')) === 'Entrar como Carlos' && (await cardButton('front_desk')) === 'Entrar como Camilo' && (await cardButton('admin')) === 'Entrar como Mateo', `${await cardButton('customer')} / ${await cardButton('teacher')} / ${await cardButton('front_desk')} / ${await cardButton('admin')}`);
  const options = await page.locator('select[data-hub-persona] option').evaluateAll((els) => els.map((e) => ({ value: e.value, text: e.textContent, disabled: e.disabled })));
  const opt = (v) => options.find((o) => o.value === v)?.text ?? '';
  check('the persona dropdown lists the 9 viewable roles, each with its real person', options.filter((o) => o.value).map((o) => o.value).sort().join(',') === 'admin,coordinator,customer,developer,finance,front_desk,maintenance,marketing,teacher' && /Ana Cliente/.test(opt('customer')) && /Carlos Coach/.test(opt('teacher')) && /Camilo Desk/.test(opt('front_desk')) && /Mateo Admin/.test(opt('admin')), options.map((o) => `${o.value}=${o.text}`).join(' | '));
  check('…the signed-in super admin is the first entry, and a role nobody holds says so (not selectable)', /Aaron Super/.test(options[0]?.text ?? '') && options[0]?.value === '' && options.find((o) => o.value === 'maintenance')?.disabled === true && /nadie/i.test(opt('maintenance')), `${options[0]?.text} / ${opt('maintenance')}`);
  const hubText = await page.locator('.hub').innerText({ timeout: 3000 }).catch(() => '');
  check('the Hub shows no demo persona and no demo-data copy', !/\bSofía\b|\bJuliana\b|Mateo Arango|[Uu]suario demo|[Dd]emo user|datos demo/.test(hubText), hubText.slice(0, 200));
  check('no live preview frames under automation (deterministic captures)', (await page.locator('iframe').count()) === 0);
  check('the Construction & testing band: manual, source documents, docs and kanban', ['manual', 'sources', 'docs', 'kb'].every((k) => hubText.includes({ manual: 'Manual de operaciones', sources: 'Documentos fuente', docs: 'Documentación y changelog', kb: 'Kanban y knowledgebase' }[k])));
  check('the wireframe toggle is there for the super admin', (await page.locator('.hub-head-tools input[role=switch]').count()) >= 1);
  check('no view-as banner before viewing as', (await banner(page).count()) === 0);
  check('the Hub sent nothing but reads', writes().length === 0 && forms().length === 0, writes().map((w) => `${w.method} ${w.route}`).join(', '));

  // ── Report a problem: the forms module's problem_report ───────────────────────────────────────────────────────
  log = [];
  await page.locator('.hub-sessionbar').getByRole('button', { name: /Reportar un problema/ }).click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(500);
  const drawer = page.getByRole('dialog');
  await drawer.locator('input').first().fill('El botón de reservar no responde').catch(() => {});
  await drawer.locator('textarea').first().fill('Paso 1: abrir el horario.\nPaso 2: tocar Reservar.').catch(() => {});
  failForm = 1;
  await drawer.locator('button[type=submit]').click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(1000);
  const refusedText = await drawer.innerText().catch(() => '');
  check('Report a problem: a refusal is said in words (no raw code), the text stays', !/unknown_form|\b422\b/.test(refusedText) && /No pudimos enviar/.test(refusedText) && (await drawer.locator('input').first().inputValue().catch(() => '')) === 'El botón de reservar no responde', refusedText.slice(0, 300));
  await drawer.locator('button[type=submit]').click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(1000);
  const sentText = await drawer.innerText().catch(() => '');
  const report = forms().at(-1)?.body;
  check('Report a problem submits problem_report with the summary, details, screen and the person\'s email', forms().length === 2 && report?.email === 'user_super@example.test' && report?.answers?.summary === 'El botón de reservar no responde' && /Paso 2/.test(report?.answers?.details ?? '') && report?.answers?.route === '#/hub' && report?.placement === 'hub' && !('viewing_as' in (report?.answers ?? {})), JSON.stringify(report));
  check('…and says it was sent', /enviado/i.test(sentText), sentText.slice(0, 200));
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(300);

  // ── the wireframe toggle: super admin, this tab only, reset on sign-out ────────────────────────────────────────
  await page.locator('.hub-head-tools label').filter({ hasText: 'Wireframe' }).click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(400);
  check('wireframe on: the whole page switches skin', (await skin(page)) === 'wireframe', await skin(page));
  check('…kept for this tab only (sessionStorage), never in the remembered theme', await page.evaluate(() => sessionStorage.getItem('hoyos.skin') === 'wireframe' && !/wireframe/.test(localStorage.getItem('hoyos.theme') ?? '')));
  await page.reload(); await page.waitForTimeout(2000);
  check('…and survives a reload of the tab', (await skin(page)) === 'wireframe', await skin(page));
  await page.locator('.hub-head-tools label').filter({ hasText: 'Wireframe' }).click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(400);
  check('wireframe off again', (await skin(page)) === 'styled', await skin(page));

  // ── the Construction & testing band opens for the super admin ─────────────────────────────────────────────────
  for (const [path, marker] of [['/manual', /Manual/], ['/docs', /Documentación|Changelog/], ['/docs/source', /Documentos fuente|fuente/i], ['/dev/knowledgebase', /Kanban|Backlog/]]) {
    at = await go(page, path);
    const text = await page.locator('main').first().innerText().catch(() => '');
    check(`super admin opens ${path} in production, with its content`, at === path && marker.test(text), `${at} ${text.slice(0, 120)}`);
  }
  // A planted `?as=` outside a frame is not a view-as, even for the super admin.
  log = [];
  at = await go(page, '/app?as=customer');
  check('a planted ?as= outside a frame changes nothing for the super admin (no view-as, no banner, no sample read)', (await stored(page)) === null && (await banner(page).count()) === 0 && !log.some((l) => l.kind === 'directory'), `${at} ${await stored(page)}`);
  await go(page, '/hub');

  // ── view as customer: role, home, banner, data ─────────────────────────────────────────────────────────────────
  log = [];
  await enterCard(page, 'customer');
  check('"Entrar como Ana" (the customer card) views as customer and lands on the customer home', route(page) === '/app', route(page));
  check('view-as is kept in sessionStorage (hoyos.viewAs)', (await stored(page)) === 'customer', String(await stored(page)));
  let b = await bannerText(page);
  check('the banner says who is being viewed: role and sample person (the first member by name)', /Cliente/.test(b) && /Ana Cliente/.test(b) && /Salir/.test(b), b);
  check('the sample was chosen from the directory by membership (GET /admin/users)', log.some((l) => l.kind === 'directory' && l.user === 'user_super'));
  await page.locator('[data-plan-card]').first().waitFor({ timeout: 5000 }).catch(() => {});
  const card = await page.locator('[data-plan-card]').first().innerText().catch(() => '');
  check('the data is the sample person\'s: Ana\'s pack (8 classes to 31 Dec)', /8/.test(card) && /31/.test(card), card);
  // The customer's own reads (credits, payments, bookings) filter by the person: the sample's, never the super admin's.
  const mine = log.filter((l) => l.kind === 'query' && /"field":"person","op":"eq"/.test(l.filter));
  check('"my" reads ask for the sample person, not the super admin', mine.length > 0 && mine.every((l) => l.filter.includes('per_cust_a') && !l.filter.includes('per_super')), mine.map((l) => `${l.entity} ${l.filter}`).join(' | '));
  const links = await menu(page);
  check('the menu is the customer\'s (no Hub, no admin)', !links.includes('/hub') && !links.some((l) => l.startsWith('/admin')), links.join(' '));
  at = await go(page, '/admin/settings');
  check('viewing as customer: an admin screen is refused, as for a customer', refusedAt(at), at);
  at = await go(page, '/hub');
  check('viewing as customer: /hub is refused (exit first)', refusedAt(at), at);
  check('the banner stays on the no-access page', (await banner(page).count()) === 1);

  // ── reload keeps it (same tab) ─────────────────────────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/#/app`); await page.reload(); await page.waitForTimeout(2000);
  check('a reload of the tab keeps viewing as customer', route(page) === '/app' && /Ana Cliente/.test(await bannerText(page)), `${route(page)} ${await bannerText(page)}`);

  // ── exit, then view as teacher ─────────────────────────────────────────────────────────────────────────────────
  await exit(page);
  check('Exit goes back to the Hub as super admin, banner gone, sessionStorage cleared', route(page) === '/hub' && (await banner(page).count()) === 0 && (await stored(page)) === null, `${route(page)} ${await stored(page)}`);
  log = [];
  await viewAs(page, 'teacher');
  check('view as teacher lands on the teacher home', route(page) === '/teach', route(page));
  b = await bannerText(page);
  check('teacher sample: the first ACTIVE coach (Carlos), not the inactive one who sorts first (Beatriz)', /Carlos Coach/.test(b) && !/Beatriz/.test(b), b);
  check('viewing as teacher: front desk check-in is refused, as for a teacher', refusedAt(await go(page, '/staff/checkin')), route(page));

  // ── L8: one real write attempted while viewing as: refused in the browser, with its copy ─────────────────────────
  await go(page, '/teach');
  await exit(page);
  log = [];
  await viewAs(page, 'admin');
  await go(page, '/admin/settings');
  const section = page.locator('[data-settings-section]').filter({ has: page.locator('input[type=text]:not([disabled]), input:not([type]):not([disabled])') }).first();
  await section.locator('input[type=text]:not([disabled]), input:not([type]):not([disabled])').first().fill('Cambio de prueba').catch(() => {});
  await section.locator('[data-settings-save]').click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const said = await section.innerText().catch(() => '');
  check('L8 viewing as admin, a settings Save is attempted and refused with the view-as copy', /solo lectura/.test(said) && /Ver como/.test(said), said.slice(0, 300));
  check('L8 …and that write never reached Company OS', writes().length === 0, writes().map((w) => `${w.method} ${w.route}`).join(', '));
  await exit(page);

  // ── L2: a role nobody holds: an explicit empty state, never the super admin's own data ──────────────────────────
  log = [];
  await viewAs(page, 'maintenance');
  b = await bannerText(page);
  check('L2 view as a role nobody holds: the banner says so', /Mantenimiento/.test(b) && /sin persona de ejemplo/.test(b), b);
  check('L2 …the screens are replaced by an empty state that explains it', (await page.locator('[data-view-as-empty]').count()) === 1, (await page.locator('main').innerText().catch(() => '')).slice(0, 200));
  check('L2 …and nothing is read as the super admin\'s own person', !log.some((l) => l.kind === 'query' && /per_super/.test(l.filter)), log.filter((l) => l.kind === 'query').map((l) => `${l.entity} ${l.filter}`).join(' | '));
  await exit(page);

  // ── review round 2, L2: a failed directory read is said as a failure with a retry, never "nobody holds this role" ──
  failDirectory = 1;
  await viewAs(page, 'front_desk');
  const failedText = await page.locator('main').innerText().catch(() => '');
  check('L2r2 a failed sample read shows a failure state, not the "nobody holds" empty state', (await page.locator('[data-view-as-failed]').count()) === 1 && (await page.locator('[data-view-as-empty]').count()) === 0 && !/Nadie tiene el rol/.test(failedText), failedText.slice(0, 300));
  check('L2r2 …it says why in words (no raw code)', /No pudimos/.test(failedText) && !/view_as_|unavailable|\b503\b/.test(failedText), failedText.slice(0, 300));
  await page.locator('[data-view-as-retry]').click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(2000);
  check('L2r2 …and Retry reads again and finds the person', /Camilo Desk/.test(await bannerText(page)) && (await page.locator('[data-view-as-failed]').count()) === 0, await bannerText(page));
  await exit(page);

  // ── view as front desk, then sign out from the staff shell ─────────────────────────────────────────────────────
  await viewAs(page, 'front_desk');
  check('view as front desk lands on the staff home', route(page) === '/staff', route(page));
  check('front desk sample: the person holding front_desk', /Camilo Desk/.test(await bannerText(page)), await bannerText(page));
  check('nothing but reads reached Company OS while viewing as', writes().length === 0, writes().map((w) => `${w.method} ${w.route}`).join(', '));
  await page.locator('[data-account-chip] button').first().click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(1500);
  check('sign-out while viewing as ends the session', await page.evaluate(() => window.__fakeClerk.state.active === null) && route(page).startsWith('/auth/sign-in'), route(page));
  check('sign-out wipes view-as from sessionStorage', (await stored(page)) === null);
  await page.goto(`${BASE}/#/auth/sign-in`); await page.waitForTimeout(800);
  await signIn(page, 'super@example.test').catch(() => {});
  check('signing in again is the super admin, not the viewed role (no banner)', route(page) === '/admin' && (await banner(page).count()) === 0 && (await stored(page)) === null, `${route(page)} ${await bannerText(page)}`);
  check('…and the Hub opens again', (await go(page, '/hub')) === '/hub');
  // The wireframe toggle resets on sign-out: on, then sign out from the staff shell, then sign in again.
  await page.locator('.hub-head-tools label').filter({ hasText: 'Wireframe' }).click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(400);
  check('wireframe on before signing out', (await skin(page)) === 'wireframe');
  await go(page, '/admin');
  await page.locator('[data-account-chip] button').first().click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(1500);
  check('wireframe resets on sign-out (styled skin, nothing kept in the tab)', (await skin(page)) === 'styled' && await page.evaluate(() => sessionStorage.getItem('hoyos.skin') === null), await skin(page));
  await page.goto(`${BASE}/#/auth/sign-in`); await page.waitForTimeout(800);
  await signIn(page, 'super@example.test').catch(() => {});
  check('…and signing in again starts styled', route(page) === '/admin' && (await skin(page)) === 'styled', `${route(page)} ${await skin(page)}`);

  // ── a session that ends outside the app (another tab, expiry): view-as does not outlive it ─────────────────────
  await viewAs(page, 'customer');
  check('viewing as customer again', (await stored(page)) === 'customer' && (await banner(page).count()) === 1);
  await page.evaluate(async () => { await window.Clerk?.signOut?.(); });
  await page.waitForTimeout(1500);
  if (await page.evaluate(() => window.__fakeClerk.state.active !== null)) { await page.evaluate(() => { window.__fakeClerk.state.active = null; sessionStorage.setItem('fake-clerk-state', JSON.stringify(window.__fakeClerk.state)); }); await page.reload(); await page.waitForTimeout(1500); }
  check('a session ended outside the app leaves no view-as in the tab (writes are not stuck read-only)', (await stored(page)) === null, String(await stored(page)));
  await page.goto(`${BASE}/#/auth/sign-in`); await page.waitForTimeout(800);
  await signIn(page, 'super@example.test').catch(() => {});
  check('…and the super admin signs back in without view-as', route(page) === '/admin' && (await banner(page).count()) === 0 && (await stored(page)) === null, `${route(page)} ${await stored(page)}`);
  await ctx.close();

  // ── Administration (AD-04: also a backend super_admin) and front desk can't ───────────────────────────────────
  for (const [who, home] of [['admin', '/admin'], ['desk', '/staff']]) {
    ({ ctx, page } = await open());
    await signIn(page, `${who}@example.test`);
    check(`${who}: signs in to ${home}`, route(page) === home, route(page));
    check(`${who}: the menu has no Hub`, !(await menu(page)).includes('/hub'));
    at = await go(page, '/hub');
    check(`${who}: /hub is refused`, refusedAt(at), at);
    log = [];
    await page.evaluate(() => sessionStorage.setItem('hoyos.viewAs', 'customer'));
    await page.goto(`${BASE}/#${home}`); await page.reload(); await page.waitForTimeout(2000);
    check(`${who}: a view-as planted in sessionStorage changes nothing (same home, no banner)`, route(page) === home && (await banner(page).count()) === 0, `${route(page)} ${await bannerText(page)}`);
    check(`${who}: the planted value is removed`, (await stored(page)) === null);
    check(`${who}: no directory read for a sample`, !log.some((l) => l.kind === 'directory'));
    if (who === 'admin') check('admin: still opens its own screens (settings)', (await go(page, '/admin/settings')) === '/admin/settings');
    for (const p of ['/manual', '/docs', '/docs/source', '/dev/knowledgebase']) check(`${who}: ${p} is refused (super admin only in production)`, refusedAt(await go(page, p)), route(page));
    // A wireframe skin planted in the tab is not theirs: the session resets it.
    await page.evaluate(() => sessionStorage.setItem('hoyos.skin', 'wireframe'));
    await page.reload(); await page.waitForTimeout(1500);
    check(`${who}: a planted wireframe skin is reset (super admin only)`, (await skin(page)) === 'styled', await skin(page));
    // A planted `?as=` in a frame: ignored for anyone but a real super admin.
    log = [];
    await go(page, home);
    await page.evaluate(() => { const f = document.createElement('iframe'); f.id = 'qa-frame'; f.src = `${location.pathname}#/app?as=customer&lang=es&theme=light&dev=0&live=0`; f.style.width = '800px'; f.style.height = '600px'; document.body.appendChild(f); });
    await page.waitForTimeout(3000);
    const planted = await (await page.$('#qa-frame'))?.contentFrame();
    const plantedRoute = planted ? decodeURIComponent(new URL(planted.url()).hash.slice(1)) : '';
    check(`${who}: a planted ?as=customer in a frame is ignored (not the customer home, no sample read)`, !!planted && !plantedRoute.startsWith('/app?') && !log.some((l) => l.kind === 'directory'), plantedRoute);
    check(`${who}: …and that frame is read-only too`, planted ? (await planted.evaluate(async () => (await fetch(`/api/cos/t/hoy-test/batch`, { method: 'POST', body: '{}' })).status)) === 403 && writes().length === 0 : false);
    if (who === 'desk') check('desk: still refused an admin screen', refusedAt(await go(page, '/admin/settings')));
    await ctx.close();
  }

  // ── live previews: frames under their own view-as, read-only, never touching the parent ───────────────────────
  ({ ctx, page } = await open('/auth/sign-in', { liveFrames: true }));
  await signIn(page, 'super@example.test');
  await go(page, '/hub');
  log = [];
  await page.locator('#hub-band-outside').scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(6000);
  const frameEls = await page.locator('iframe').evaluateAll((els) => els.map((e) => e.getAttribute('src') ?? ''));
  check('live previews run as frames, at most 3 at once', frameEls.length >= 1 && frameEls.length <= 3, frameEls.join(' | '));
  const appFrame = await (await page.$('iframe[src*="#/app?as=customer"]'))?.contentFrame();
  check('the customer app preview runs as customer (?as=customer)', !!appFrame, frameEls.join(' | '));
  if (appFrame) {
    const inside = await appFrame.evaluate(() => ({ route: decodeURIComponent(location.hash.slice(1)), viewAs: sessionStorage.getItem('hoyos.viewAs'), banner: [...document.querySelectorAll('[data-view-as-banner]')].some((b) => b.getBoundingClientRect().height > 0) }));
    check('…inside it, the customer home with the sample person (view-as in the frame only)', inside.route.startsWith('/app') && inside.viewAs === 'customer' && log.some((l) => l.kind === 'query' && /per_cust_a/.test(l.filter)), JSON.stringify(inside));
    check('…and the frame hides the view-as banner', inside.banner === false);
    const status = await appFrame.evaluate(async () => (await fetch('/api/cos/t/hoy-test/batch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"ops":[]}' })).status);
    check('a frame is read-only: a write from inside it is refused unsent', status === 403 && writes().length === 0, String(status));
  }
  for (const f of page.frames().filter((x) => x !== page.mainFrame())) {
    const ro = await f.evaluate(() => sessionStorage.getItem('hoyos.viewAs')).catch(() => null);
    check(`frame ${new URL(f.url()).hash.split('?')[0]}: read-only (keeps a view-as value)`, typeof ro === 'string' && ro.length > 0, String(ro));
  }
  check('the parent\'s view-as is untouched by its frames (none stored, no banner, still the Hub)', (await stored(page)) === null && (await banner(page).count()) === 0 && route(page) === '/hub' && (await page.locator('.hub').count()) === 1, `${await stored(page)} ${route(page)}`);
  check('nothing but reads reached Company OS from the Hub and its frames', writes().length === 0, writes().map((w) => `${w.method} ${w.route}`).join(', '));
  await ctx.close();

  // ── a visitor ──────────────────────────────────────────────────────────────────────────────────────────────────
  ({ ctx, page } = await open('/site'));
  at = await go(page, '/hub');
  check('a visitor on /hub is sent to sign-in', at.startsWith('/auth/sign-in'), at);
  await ctx.close();
  check('no page threw', errors.length === 0, errors.slice(0, 5).join(' | '));
} finally {
  await browser.close();
  server.close();
}
done();
