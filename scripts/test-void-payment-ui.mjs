// Hoy go-live, the payment void in the browser on the PRODUCTION build, a fake Clerk (scripts/fixtures/fake-clerk.js) and a
// fake Company OS with the real `/query` row shape and the void contract (Company OS payments and credits void settings):
// - only a Super Admin gets Void, on Finance, the member's payments tab and the staff receipt, on approved payments;
// - a reason is required; the write is the contract's; each refusal has words; the row stays as it was;
// - a voided receipt reads voided: with the reason for staff, without it for the customer.
// The rules themselves are Company OS's; its own suites prove them. Fictional data only.
// Run: npm run build:production && QA_PROD_DIST=dist node scripts/test-void-payment-ui.mjs
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import { launchBrowser, reporter } from './lib/launch-qa.mjs';
import { cosFilter } from './lib/cos-filter.mjs';

const { check, done } = reporter('Payment void (UI)');
const isProd = (dir) => existsSync(join(dir, 'index.html')) && readdirSync(join(dir, 'assets')).filter((f) => f.endsWith('.js')).some((f) => readFileSync(join(dir, 'assets', f), 'utf8').includes('clerk-js'));
const PROD = resolve(process.env.QA_PROD_DIST ?? 'dist');
if (!isProd(PROD)) { console.error(`${PROD} is not a production build: run npm run build:production (or set QA_PROD_DIST)`); process.exit(1); }

const TENANT = 'hoy-void';
const HOST = 'fake.clerk.accounts.dev';
const PK = `pk_test_${Buffer.from(`${HOST}$`).toString('base64')}`;
const FAKE_CLERK = readFileSync(new URL('./fixtures/fake-clerk.js', import.meta.url), 'utf8');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml' };
const TODAY = '2026-11-05';
const PORT = Number(process.env.QA_PORT ?? 5237);

const PEOPLE = {
  // Administration that also holds Super Admin (AD-04): the session's role resolves to admin first.
  user_sa: { name: 'Mateo Super', keys: ['administrator', 'super_admin'], superAdmin: true },
  user_adm: { name: 'Alba Administración', keys: ['administrator'] },
  user_fin: { name: 'Fina Tesorera', keys: ['treasurer'] },
  user_desk: { name: 'Rosa Recepción', keys: ['front_desk'] },
  user_cust: { name: 'Carla Cliente', keys: ['member'] },
  // A Super Admin who works as Super Admin: the only kind that may view as another role.
  user_pure: { name: 'Sol Super', keys: ['super_admin'], superAdmin: true },
  // Administration and Super Admin who also takes classes (one email, owner 2026-11-01).
  user_both: { name: 'Berta Ambas', keys: ['administrator', 'super_admin', 'member'], superAdmin: true },
  user_deskcust: { name: 'Dora Mostrador', keys: ['front_desk', 'member'] },
};
const ACCOUNTS = Object.fromEntries(Object.keys(PEOPLE).map((u) => [u, { emails: [{ id: `ea_${u}`, email: `${u.slice(5)}@example.test`, verified: true }], primary: `ea_${u}` }]));

const rec = (id, data) => ({ id, data, orgUnitId: null, createdAt: `${TODAY}T14:00:00.000Z`, updatedAt: `${TODAY}T14:00:00.000Z`, createdBy: 'user_desk' });
const REFUSE = { pay_used: 'void_classes_used', pay_booking: 'void_booking_active', pay_gift: 'void_gift_issued' };
let world;
function reset() {
  const m = (rows) => new Map(rows.map((r) => [r.id, r]));
  const pay = (id, person, status = 'approved') => rec(id, { person, product: 'prod_pack', amount: 600000, method: 'cash', provider: 'manual', status, date: TODAY, concept: 'Paquete', approved_at: status === 'approved' ? `${TODAY}T14:00:00.000Z` : null });
  const inv = (id, payment, number, person) => rec(id, { kind: 'receipt', number, payment, person, product: 'prod_pack', total: 600000, issued_at: `${TODAY}T14:00:00.000Z` });
  world = {
    person: m([
      rec('per_cust', { name: 'Carla Cliente', email: 'cust@example.test', user: 'user_cust' }), rec('per_used', { name: 'Uma Usada', email: 'u@example.test' }), rec('per_book', { name: 'Berta Reserva', email: 'b@example.test' }),
      rec('per_gift', { name: 'Gina Regalo', email: 'g@example.test' }), rec('per_stale', { name: 'Sara Cambio', email: 's@example.test' }), rec('per_pend', { name: 'Pia Pendiente', email: 'p@example.test' }), rec('per_tab', { name: 'Tita Pestaña', email: 't@example.test' }), rec('per_fin', { name: 'Fina Tesorera', email: 'fin@example.test', user: 'user_fin' }), rec('per_desk', { name: 'Rosa Recepción', email: 'desk@example.test', user: 'user_desk' }), rec('per_ref', { name: 'Rita Cambio', email: 'r@example.test' }), rec('per_lost', { name: 'Lina Perdida', email: 'l@example.test' }), rec('per_dbl', { name: 'Dani Doble', email: 'd@example.test' }),
      rec('per_both', { name: 'Berta Ambas', email: 'both@example.test', user: 'user_both' }), rec('per_deskcust', { name: 'Dora Mostrador', email: 'deskcust@example.test', user: 'user_deskcust' }),
    ]),
    product: m([rec('prod_pack', { key: 'pack', name: 'Paquete', kind: 'pack', price: 600000, credits: 12, active: true })]),
    payment: m([pay('pay_ok', 'per_cust'), pay('pay_used', 'per_used'), pay('pay_booking', 'per_book'), pay('pay_gift', 'per_gift'), pay('pay_stale', 'per_stale'), pay('pay_pend', 'per_pend', 'pending'), pay('pay_tab', 'per_tab'), pay('pay_ref', 'per_ref'), pay('pay_lost', 'per_lost'), pay('pay_dbl', 'per_dbl'), pay('pay_both', 'per_both'), pay('pay_dc', 'per_deskcust'),
      { ...pay('pay_both_v', 'per_both', 'voided'), data: { ...pay('pay_both_v', 'per_both', 'voided').data, status_reason: 'Motivo interno' } }]),
    invoice: m([inv('inv_ok', 'pay_ok', 41, 'per_cust'), inv('inv_tab', 'pay_tab', 42, 'per_tab'), inv('inv_used', 'pay_used', 43, 'per_used'), inv('inv_both', 'pay_both', 44, 'per_both'), inv('inv_dc', 'pay_dc', 45, 'per_deskcust'),
      { ...inv('inv_both_v', 'pay_both_v', 46, 'per_both'), data: { ...inv('inv_both_v', 'pay_both_v', 46, 'per_both').data, voided_at: `${TODAY}T15:00:00.000Z`, void_reason: 'Motivo interno' } }]),
    // Carla's classes: a voided pack (+12, then the void's -12) and a live single, for the movements list.
    credit_lot: m([rec('lot_v', { person: 'per_cust', source: 'purchase', product: 'prod_pack', payment: 'pay_ok', quantity: 12, valid_until: '2027-02-01', voided_at: `${TODAY}T15:00:00.000Z` }), rec('lot_live', { person: 'per_cust', source: 'courtesy', quantity: 1, valid_until: '2027-03-01' })]),
    credit_entry: m([rec('ce_g', { person: 'per_cust', lot: 'lot_v', delta: 12, reason: 'grant' }), rec('ce_v', { person: 'per_cust', lot: 'lot_v', delta: -12, reason: 'void' }), rec('ce_l', { person: 'per_cust', lot: 'lot_live', delta: 1, reason: 'grant' })]),
    keys: new Map(), applied: [], lost: false,
    log: [],
  };
}
const userOf = (req) => /^Bearer fake\.([^.]+)\.[^.]+$/.exec(req.headers.authorization ?? '')?.[1] ?? null;
const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(body === undefined ? '' : JSON.stringify(body)); };
const readBody = (req) => new Promise((r) => { let s = ''; req.on('data', (c) => { s += c; }); req.on('end', () => { try { r(JSON.parse(s || '{}')); } catch { r({}); } }); });
reset();
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://127.0.0.1').pathname;
  if (path === '/app-config.json') return json(res, 200, { tenant: TENANT, apiBase: '/api/cos', clerkPublishableKey: PK, environment: 'test' });
  if (path.startsWith(`/api/cos/t/${TENANT}/`)) {
    const user = userOf(req);
    if (!user) return json(res, 401, { error: 'unauthorized' });
    const route = path.slice(`/api/cos/t/${TENANT}`.length), p = PEOPLE[user];
    const body = req.method === 'GET' ? null : await readBody(req);
    if (route === '/me') return p ? json(res, 200, { tenant: { slug: TENANT, timezone: 'America/Bogota' }, user: { id: user, name: p.name, email: `${user.slice(5)}@example.test` }, roleKeys: p.keys, isSuperAdmin: !!p.superAdmin, caps: [], entities: [] }) : json(res, 403, { error: 'forbidden' });
    if (route === '/signup') return json(res, 200, { enabled: true, consents: [], personFields: [], facetFields: [], registered: true });
    if (route === '/query') {
      if (body.aggregate || !world[body.entity]) return json(res, 200, { data: [] });
      try {
        const rows = [...world[body.entity].values()].filter((r) => cosFilter(r, body.filter, user)).map((r) => {
          // `include` replaces `data[field]` with the embedded `{ id, …fields }` (integration guide, "include"): only the fields asked for.
          const out = structuredClone(r);
          for (const inc of body.include ?? []) {
            const t = { lot: world.credit_lot }[inc.field]?.get(out.data[inc.field]);
            if (t) out.data[inc.as ?? inc.field] = { id: t.id, ...Object.fromEntries(Object.entries(t.data).filter(([k]) => !inc.fields || inc.fields.includes(k))) };
          }
          return out;
        });
        return json(res, 200, { data: rows.slice(body.offset ?? 0, (body.offset ?? 0) + (body.limit ?? 100)) });
      } catch (e) { return json(res, e.status ?? 400, { error: e.code ?? 'invalid_query' }); }
    }
    if (route === '/batch') {
      const key = req.headers['idempotency-key'] ?? null;
      world.log.push({ user, ops: body.ops, key });
      // ADR 0040: the same key answers the first answer, without writing again.
      if (key && world.keys.has(key)) return world.lost ? json(res, 503, { error: 'upstream_unavailable' }) : json(res, 200, world.keys.get(key));
      for (const [i, o] of body.ops.entries()) {
        const r = world[o.entity]?.get(o.id);
        if (!r) return json(res, 404, { error: 'not found', opIndex: i });
        if (o.ifMatch && r.data[o.ifMatch.field] !== o.ifMatch.value) return json(res, 409, { error: 'ifMatch mismatch', message: 'ifMatch mismatch', opIndex: i });
        if (o.entity === 'payment' && o.data?.status === 'voided') {
          if (!PEOPLE[user]?.superAdmin) return json(res, 403, { error: 'write_forbidden', opIndex: i });
          if (!String(o.data.status_reason ?? '').trim()) return json(res, 422, { error: 'reason_required', opIndex: i });
          if (REFUSE[o.id]) return json(res, 422, { error: REFUSE[o.id], opIndex: i });
          Object.assign(r.data, o.data);
          world.applied.push(o.id);
          for (const v of world.invoice.values()) if (v.data.payment === o.id) Object.assign(v.data, { voided_at: `${TODAY}T15:00:00.000Z`, void_reason: o.data.status_reason });
        }
      }
      const answer = { ids: body.ops.map((o) => o.id) };
      if (key) world.keys.set(key, answer);
      // Written, but the answer is lost on the way back.
      if (world.lost) return json(res, 503, { error: 'upstream_unavailable' });
      return json(res, 200, answer);
    }
    const one = /^\/api\/(\w+)\/([^/]+)$/.exec(route);
    if (one && req.method === 'GET') { const r = world[one[1]]?.get(decodeURIComponent(one[2])); return r ? json(res, 200, { data: r }) : json(res, 404, { error: 'not found' }); }
    if (/^\/modules\/[^/]+\/settings$/.test(route)) return json(res, 200, { module: route.split('/')[2], settings: {} });
    if (route === '/members') return json(res, 200, { members: Object.entries(PEOPLE).map(([id, u]) => ({ id, name: u.name, email: `${id}@example.test` })) });
    // The directory view-as samples a person from (`loadViewAsSample`): without a holder, the page says nobody has the role.
    if (route === '/admin/users') return json(res, 200, { users: Object.entries(PEOPLE).map(([u, x], i) => ({ userId: u, email: `${u}@example.test`, name: x.name, signedUp: true, memberships: x.keys.map((k, j) => ({ membershipId: `m_${i}_${j}`, roleKey: k })) })) });
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
async function signedIn(email, lang = 'es') {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  await ctx.route(`https://${HOST}/npm/@clerk/clerk-js@*/dist/clerk.browser.js`, (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_CLERK }));
  await ctx.addInitScript(({ accounts, pk, lang }) => {
    window.__fakeClerkConfig = { accounts, publishableKey: pk };
    if (!sessionStorage.getItem('qa-init')) { sessionStorage.setItem('qa-init', '1'); localStorage.setItem('hoyos.lang', lang); }
  }, { accounts: ACCOUNTS, pk: PK, lang });
  const page = await ctx.newPage();
  await page.clock.install({ time: new Date(`${TODAY}T15:00:00Z`) });
  page.on('pageerror', (e) => errors.push(`[${scenario}] ${String(e.stack ?? e.message).split('\n').slice(0, 6).join(' ⏎ ')}`));
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
const go = async (page, path) => { await page.goto(`${BASE}/#${path}`); await page.waitForTimeout(1300); };
const row = (page, name) => page.locator('tr', { hasText: name });
const VOID = 'button[data-void-payment]';
const drawer = (page) => page.getByRole('dialog');
const submit = (page) => drawer(page).locator('button[data-void-confirm]').click({ timeout: 3000 });
const batches = () => world.log;
// The refusal itself, never the drawer's other notices.
const refusal = (page) => drawer(page).locator('[data-void-refusal]');
const said = (page) => refusal(page).innerText({ timeout: 3000 }).catch(() => '');

try {
  // ── Finance as Super Admin: reason required, the contract's write ─────────────────────────────────────────
  scenario = 'finance'; reset();
  let { ctx, page } = await signedIn('sa@example.test');
  await go(page, '/admin/finance');
  check('Finance: a Super Admin (role resolves to admin) sees Void on an approved payment', (await row(page, 'Carla Cliente').locator(VOID).count()) === 1, (await page.locator('body').innerText()).slice(0, 400));
  check('Finance: no Void on a pending payment', (await row(page, 'Pia Pendiente').locator(VOID).count()) === 0);
  await row(page, 'Carla Cliente').locator(VOID).click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(300);
  await submit(page).catch(() => {});
  await page.waitForTimeout(300);
  check('Void without a reason: the screen asks for one, nothing is sent', /motivo/i.test(await said(page)) && /3/.test(await said(page)) && batches().length === 0, JSON.stringify(batches()));
  await drawer(page).locator('input[name="void-reason"]').fill('Registrado por error');
  await submit(page).catch(() => {});
  await page.waitForTimeout(1200);
  const sent = batches()[0];
  check('Void sends the contract\'s write, with a key', !!sent?.key && JSON.stringify(sent?.ops) === JSON.stringify([{ op: 'update', entity: 'payment', id: 'pay_ok', data: { status: 'voided', status_reason: 'Registrado por error' }, ifMatch: { field: 'status', value: 'approved' } }]), JSON.stringify(sent));
  check('Finance: the row now reads Anulado, and offers no Void', /Anulado/.test(await row(page, 'Carla Cliente').innerText().catch(() => '')) && (await row(page, 'Carla Cliente').locator(VOID).count()) === 0);

  // ── Each refusal has words, and the row stays ─────────────────────────────────────────────────────────────
  scenario = 'refusals';
  for (const [name, words] of [['Uma Usada', /ya se usó/i], ['Berta Reserva', /reserva/i], ['Gina Regalo', /regalo/i]]) {
    await row(page, name).locator(VOID).click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(300);
    await drawer(page).locator('input[name="void-reason"]').fill('Registrado por error').catch(() => {});
    await submit(page).catch(() => {});
    await page.waitForTimeout(600);
    const line = await said(page);
    check(`${name}: the refusal is in words, no code`, words.test(line) && !/void_/.test(line), line);
    await drawer(page).locator('button[data-void-back]').click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(300);
    check(`${name}: the payment still reads as it was, Void still offered`, (await row(page, name).locator(VOID).count()) === 1);
  }
  // A stale screen: someone else voided it after this screen read it.
  scenario = 'stale, already voided';
  await row(page, 'Sara Cambio').locator(VOID).click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(300);
  Object.assign(world.payment.get('pay_stale').data, { status: 'voided', status_reason: 'Primero' });
  await drawer(page).locator('input[name="void-reason"]').fill('Segundo').catch(() => {});
  await submit(page).catch(() => {});
  await page.waitForTimeout(800);
  const already = await drawer(page).locator('.void-already').innerText({ timeout: 3000 }).catch(() => '');
  check('Already voided: reads as done, and says the new reason was not saved', /ya estaba anulado/i.test(already) && /no se guardó/i.test(already), already);
  check('Already voided: the first reason stands', world.payment.get('pay_stale').data.status_reason === 'Primero');
  await drawer(page).locator('button[data-void-back]').click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(1200);
  check('Already voided: on closing, the row reads Anulado and offers no Void', /Anulado/.test(await row(page, 'Sara Cambio').innerText().catch(() => '')) && (await row(page, 'Sara Cambio').locator(VOID).count()) === 0);
  // The status changed to something else.
  scenario = 'stale, changed';
  await row(page, 'Rita Cambio').locator(VOID).click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(300);
  world.payment.get('pay_ref').data.status = 'refunded';
  await drawer(page).locator('input[name="void-reason"]').fill('Registrado por error').catch(() => {});
  await submit(page).catch(() => {});
  await page.waitForTimeout(800);
  check('The status changed meanwhile: the screen says so', /cambió|actualiza/i.test(await said(page)));
  await drawer(page).locator('button[data-void-back]').click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(1200);
  check('The status changed meanwhile: on closing, the row refreshes and offers no Void', (await row(page, 'Rita Cambio').locator(VOID).count()) === 0 && (await row(page, 'Rita Cambio').count()) >= 1);
  await ctx.close();

  // ── The answer is lost: the form locks, a retry reuses the key, one void ───────────────────────────────────
  scenario = 'lost answer'; reset();
  ({ ctx, page } = await signedIn('sa@example.test'));
  await go(page, '/admin/finance');
  await row(page, 'Lina Perdida').locator(VOID).click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(300);
  await drawer(page).locator('input[name="void-reason"]').fill('Registrado por error').catch(() => {});
  world.lost = true;
  await submit(page).catch(() => {});
  await drawer(page).locator('.void-uncertain').waitFor({ timeout: 15000 }).catch(() => {});
  check('503: the screen says the outcome is unknown, as an alert', (await drawer(page).locator('.void-uncertain[role="alert"]').count()) === 1 && (await refusal(page).count()) === 0);
  check('503: the reason is locked', await drawer(page).locator('input[name="void-reason"]').isDisabled().catch(() => false));
  const firstKey = batches()[0]?.key;
  world.lost = false;
  await submit(page).catch(() => {});
  await page.waitForTimeout(1200);
  check('Retry after 503: every attempt carried the same key, and it was written once', !!firstKey && batches().every((b) => b.key === firstKey) && JSON.stringify(world.applied) === '["pay_lost"]', JSON.stringify({ log: batches().map((b) => b.key), applied: world.applied }));
  check('Retry after 503: the form closes and the row reads Anulado', (await drawer(page).count()) === 0 && /Anulado/.test(await row(page, 'Lina Perdida').innerText().catch(() => '')));

  // ── A double click ────────────────────────────────────────────────────────────────────────────────────────
  scenario = 'double click'; world.log.length = 0; world.applied.length = 0;
  await row(page, 'Dani Doble').locator(VOID).click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(300);
  await drawer(page).locator('input[name="void-reason"]').fill('Registrado por error').catch(() => {});
  await drawer(page).locator('button[data-void-confirm]').dblclick({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(1200);
  check('A double click voids once, with one request', JSON.stringify(world.applied) === '["pay_dbl"]' && batches().length === 1, JSON.stringify(batches()));
  await ctx.close();

  // ── A Super Admin viewing as another role ─────────────────────────────────────────────────────────────────
  scenario = 'view as'; reset();
  ({ ctx, page } = await signedIn('pure@example.test'));
  await go(page, '/admin/finance');
  check('A Super Admin not viewing as anyone sees Void', (await row(page, 'Carla Cliente').locator(VOID).count()) === 1);
  await page.evaluate(() => sessionStorage.setItem('hoyos.viewAs', 'finance'));
  await page.reload();
  await page.waitForTimeout(2000);
  await go(page, '/admin/finance');
  check('Viewing as Finance: the banner shows and the payment is listed', (await page.locator('[data-view-as-banner]').count()) === 1 && (await row(page, 'Carla Cliente').count()) >= 1, (await page.locator('body').innerText()).slice(0, 300));
  check('Viewing as Finance: no Void', (await page.locator(VOID).count()) === 0);
  await page.evaluate(() => sessionStorage.setItem('hoyos.viewAs', 'front_desk'));
  await page.reload();
  await page.waitForTimeout(2000);
  await go(page, '/staff/receipts/pay_ok');
  check('Viewing as the desk: the staff receipt shows, no Void', (await page.locator('[data-view-as-banner]').count()) === 1 && (await page.locator('[data-testid="nota-de-compra"]').count()) === 1 && (await page.locator(VOID).count()) === 0);
  await ctx.close();

  // ── Staff who also hold customer, on their own receipt ────────────────────────────────────────────────────
  scenario = 'staff and customer'; reset();
  ({ ctx, page } = await signedIn('both@example.test'));
  await go(page, '/app/receipts/pay_both');
  check('Administration with Super Admin and customer, on /app/receipts: their receipt shows, no Void on it', (await page.locator('[data-testid="nota-de-compra"]').count()) === 1 && (await page.locator(VOID).count()) === 0, (await page.locator('body').innerText()).slice(0, 300));
  await go(page, '/app/receipts/pay_both_v');
  const ownMark = await page.locator('[data-testid="receipt-voided"]').innerText({ timeout: 3000 }).catch(() => '');
  check('…and a voided one there reads voided, without the reason', /anulada/i.test(ownMark) && !(await page.locator('body').innerText()).includes('Motivo interno'), ownMark);
  await go(page, '/admin/finance');
  check('…while on Finance the same login still gets Void', (await row(page, 'Carla Cliente').locator(VOID).count()) === 1);
  await ctx.close();
  ({ ctx, page } = await signedIn('deskcust@example.test'));
  await go(page, '/app/receipts/pay_dc');
  check('The desk who also takes classes: their receipt shows, no Void', (await page.locator('[data-testid="nota-de-compra"]').count()) === 1 && (await page.locator(VOID).count()) === 0);
  await ctx.close();

  // ── The member's classes after a void ─────────────────────────────────────────────────────────────────────
  scenario = 'passes'; reset();
  ({ ctx, page } = await signedIn('cust@example.test'));
  await go(page, '/app/classes');
  const rows = page.locator('.cust-ledger-row');
  const voidRow = await rows.filter({ hasText: 'Anulación' }).first().innerText({ timeout: 3000 }).catch(() => '');
  check('/app/classes: the void reads Anulación, no raw key', /-12/.test(voidRow) && !(await page.locator('body').innerText()).includes('⟨'), (await page.locator('body').innerText()).slice(0, 400));
  check('/app/classes: the voided lot\'s grant row has no validity badge', (await rows.filter({ hasText: '+12' }).count()) === 1 && !/hasta/.test(await rows.filter({ hasText: '+12' }).first().innerText().catch(() => 'hasta')));
  check('/app/classes: a live lot still shows its validity', /hasta/.test(await rows.filter({ hasText: '+1' }).filter({ hasNotText: '+12' }).first().innerText().catch(() => '')));
  await ctx.close();

  // ── The member's payments tab ─────────────────────────────────────────────────────────────────────────────
  scenario = 'member tab'; reset();
  ({ ctx, page } = await signedIn('sa@example.test'));
  await go(page, '/admin/crm/per_tab');
  await page.getByText('Pagos', { exact: true }).first().click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(600);
  check('Member\'s payments tab: a Super Admin sees Void', (await page.locator(VOID).count()) === 1, (await page.locator('body').innerText()).slice(0, 400));
  await page.locator(VOID).first().click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(300);
  await drawer(page).locator('input[name="void-reason"]').fill('Cliente equivocado').catch(() => {});
  await submit(page).catch(() => {});
  await page.waitForTimeout(1200);
  check('Member\'s payments tab: the payment reads Anulado after the void', /Anulado/.test(await page.locator('tr', { hasText: 'Paquete' }).first().innerText().catch(() => '')) && world.payment.get('pay_tab').data.status === 'voided');
  await ctx.close();

  // ── The staff receipt ─────────────────────────────────────────────────────────────────────────────────────
  scenario = 'staff receipt'; reset();
  ({ ctx, page } = await signedIn('sa@example.test'));
  await go(page, '/staff/receipts/pay_ok');
  check('Staff receipt: a Super Admin sees Void', (await page.locator(VOID).count()) === 1, (await page.locator('body').innerText()).slice(0, 400));
  await page.locator(VOID).click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(300);
  await drawer(page).locator('input[name="void-reason"]').fill('<img src=x onerror=alert(1)>').catch(() => {});
  await submit(page).catch(() => {});
  await page.waitForTimeout(1200);
  const mark = await page.locator('[data-testid="receipt-voided"]').innerText().catch(() => '');
  check('Staff receipt: reads voided, with the reason as plain text', /anulada/i.test(mark) && mark.includes('<img src=x onerror=alert(1)>'), mark);
  check('Staff receipt: keeps its number, and offers no second Void', /41/.test(await page.locator('[data-testid="nota-de-compra"]').innerText().catch(() => '')) && (await page.locator(VOID).count()) === 0);
  await ctx.close();

  // ── The customer's receipt: voided, no reason ─────────────────────────────────────────────────────────────
  scenario = 'customer';
  ({ ctx, page } = await signedIn('cust@example.test'));
  await go(page, '/app/receipts');
  check('My purchase notes: the voided payment reads Anulado and still opens its note', /Anulado/.test(await page.locator('body').innerText()) && (await page.locator('a[href="#/app/receipts/pay_ok"]').count()) === 1);
  await go(page, '/app/receipts/pay_ok');
  const customerMark = await page.locator('[data-testid="receipt-voided"]').innerText().catch(() => '');
  check('Customer\'s receipt: reads voided, without the reason, and has no Void', /anulada/i.test(customerMark) && !(await page.locator('body').innerText()).includes('onerror') && (await page.locator(VOID).count()) === 0, customerMark);
  await ctx.close();
  ({ ctx, page } = await signedIn('cust@example.test', 'en'));
  await go(page, '/app/receipts/pay_ok');
  check('Customer\'s receipt in English reads voided', /voided/i.test(await page.locator('[data-testid="receipt-voided"]').innerText().catch(() => '')));
  await ctx.close();

  // ── Nobody else gets it ───────────────────────────────────────────────────────────────────────────────────
  scenario = 'other roles'; reset();
  for (const [who, email] of [['Administration without Super Admin', 'adm@example.test'], ['Finance', 'fin@example.test']]) {
    ({ ctx, page } = await signedIn(email));
    await go(page, '/admin/finance');
    check(`${who}: Finance lists the payment, no Void`, (await row(page, 'Carla Cliente').count()) >= 1 && (await page.locator(VOID).count()) === 0);
    await go(page, '/admin/crm/per_tab');
    await page.getByText('Pagos', { exact: true }).first().click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(600);
    check(`${who}: the member's payments tab lists the payment, no Void`, (await page.locator('tr', { hasText: 'Paquete' }).count()) >= 1 && (await page.locator(VOID).count()) === 0, (await page.locator('body').innerText()).slice(0, 300));
    await ctx.close();
  }
  ({ ctx, page } = await signedIn('desk@example.test'));
  await go(page, '/staff/receipts/pay_ok');
  check('Front desk: the staff receipt shows, no Void', (await page.locator('[data-testid="nota-de-compra"]').count()) === 1 && (await page.locator(VOID).count()) === 0);
  await ctx.close();
  check('No page threw', errors.length === 0, errors.join('\n'));
} finally {
  await browser.close();
  server.close();
}
done();
