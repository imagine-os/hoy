// Hoy programme hoy-jas-1nov, lane B (customer and identity), in the browser on the PRODUCTION build (VITE_HOY_BUILD=production).
// Like test-auth-production-ui.mjs, the test plays the Hoy server (dist + /app-config.json + a fake Company OS) and serves
// scripts/fixtures/fake-clerk.js in place of Clerk's CDN script. The fake Company OS answers /me, /signup and /query with
// real response shapes (`{ data: [{ id, data: {...}, createdAt }] }`, docs/integration-guide.md); like Company OS, a
// sign-up that would create a person without a name is refused 400 `validation` (Company-OS signup.ts). Fictional only.
// - enrolment name: a nameless login is asked for its name (2+ characters, no "@"), the POST carries it; a named staff
//   login's enrolment is unchanged; hostile inputs (an HTML name is stored and shown as text, an over-long one is cut);
// - C-01d: after "Continue for now" the customer area opens, but checkout, gift purchase and Plans show "record your
//   consent to book" with Retry, which reruns the consent step and then opens the page;
// - RES-02: the greeting names the person (own person row), never the email; no demo announcement in production;
// - PRO-05: the Santa María pack shows in the app's Plans only for an affiliate member facet;
// - RES-01: the week grid shows Sunday at 1024 and 768 px; the chosen day survives a refetch and Back.
// - C-01d (owner 2026-11-03): the deferral survives a reload; the change sheet's move mode shows the hold and sends
//   nothing, while cancelling the booking still works.
// - review r2: an existing pending product payment stays payable while held; the gift purchase button is disabled while
//   held; the consent step after Retry offers "Continue for now"; only a validation naming the name field blames the name.
// - review r1: cancelling from /app/booking/:id/change lands on /app/booking/:id with the notice (the route boundary keeps
//   the page mounted across the path change); Buy more's pack rows are disabled while the consent hold is on.
// Run: npm run build:production && node scripts/test-jas-1nov-customer-ui.mjs   (QA_PROD_DIST=<dir> to test another dir)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import { launchBrowser, reporter } from './lib/launch-qa.mjs';
import { routeOf } from './lib/site-route.mjs';

const { check, done } = reporter('hoy-jas-1nov customer (production build)');
const DIST = resolve(process.env.QA_PROD_DIST ?? 'dist');
const TENANT = 'hoy-test';
const HOST = 'fake.clerk.accounts.dev';
const PK = `pk_test_${Buffer.from(`${HOST}$`).toString('base64')}`;
const FAKE_CLERK = readFileSync(new URL('./fixtures/fake-clerk.js', import.meta.url), 'utf8');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.woff2': 'font/woff2' };

if (!existsSync(join(DIST, 'index.html'))) { console.error(`${DIST}/index.html missing: run npm run build:production first`); process.exit(1); }
const entry = readdirSync(join(DIST, 'assets')).filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(DIST, 'assets', f), 'utf8')).join('\n');
if (!entry.includes('clerk-js')) { console.error(`${DIST} is not a production build (no Clerk): run npm run build:production`); process.exit(1); }

// ── the fake Hoy server + Company OS ────────────────────────────────────────────────────────────────────────────
const CONSENTS = [{ document: 'terms', version: '2026-10-01' }, { document: 'privacy', version: '2026-10-01' }];
const at = '2026-10-01T10:00:00.000Z';
const PRODUCTS = [
  { id: 'prd_pack12', data: { key: 'pack12', name: 'Paquete de 12 clases', kind: 'pack', price: 540000, credits: 12, validity_days: 90, active: true, freezable: true, audience: null, valid_from: '2026-01-01', valid_until: null }, createdAt: at, updatedAt: at },
  { id: 'prd_pack12_smtc', data: { key: 'pack12_smtc', name: 'Paquete de 12 clases · Santa María', kind: 'pack', price: 480000, credits: 12, validity_days: 90, active: true, freezable: true, audience: 'affiliate', valid_from: '2026-01-01', valid_until: null }, createdAt: at, updatedAt: at },
  { id: 'prd_trial', data: { key: 'trial', name: 'Clase de prueba', kind: 'trial', price: 30000, credits: 1, validity_days: 30, active: true, freezable: false, audience: null, valid_from: '2026-01-01', valid_until: null }, createdAt: at, updatedAt: at },
  { id: 'prd_single', data: { key: 'single', name: 'Clase individual', kind: 'single', price: 45000, credits: 1, validity_days: 30, active: true, freezable: false, audience: null, valid_from: '2026-01-01', valid_until: null }, createdAt: at, updatedAt: at },
];
const iso = (ms) => new Date(Date.now() + ms).toISOString();
/** A class tomorrow (`/query` occurrence); `booked` is the server's count. */
const occurrence = (booked) => ({ id: 'occ_9', data: { title: 'Pulso', starts_at: iso(26 * 3600_000), ends_at: iso(27 * 3600_000), capacity: 15, booked_count: booked, status: api.calendarCancelled ? 'cancelled' : 'scheduled', resource: null, coach: null, schedule: null }, createdAt: at, updatedAt: at });
const api = {};
const userOf = (req) => /^Bearer fake\.([^.]+)\.[^.]+$/.exec(req.headers.authorization ?? '')?.[1] ?? null;
const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
const bodyOf = (req) => new Promise((r) => { let s = ''; req.on('data', (c) => { s += c; }); req.on('end', () => { try { r(JSON.parse(s || 'null')); } catch { r(null); } }); });
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://127.0.0.1').pathname;
  if (path === '/app-config.json') return json(res, 200, { tenant: TENANT, apiBase: '/api/cos', clerkPublishableKey: PK, environment: 'test' });
  if (path.startsWith(`/api/cos/t/${TENANT}/`)) {
    const user = userOf(req);
    if (!user) return json(res, 401, { error: 'unauthorized' });
    const route = path.slice(`/api/cos/t/${TENANT}`.length);
    const m = api.members[user];
    if (route === '/me') return m ? json(res, 200, { tenant: { slug: TENANT }, user: { id: user, name: m.name, email: m.email }, roleKeys: m.roleKeys, isSuperAdmin: false, caps: [], entities: [] }) : json(res, 403, { error: 'no access to this tenant' });
    if (route === '/signup' && req.method === 'GET') {
      const registered = !!(m?.roleKeys.includes('member') && m.registered);
      return json(res, 200, { enabled: true, consents: CONSENTS, personFields: api.noNameField ? ['phone'] : ['name', 'phone'], facetFields: [], registered });
    }
    if (route === '/signup' && req.method === 'POST') {
      const body = await bodyOf(req);
      api.signups.push({ user, body });
      if (m?.roleKeys.includes('member') && m.registered) return json(res, 409, { error: 'already_registered' });
      if (api.emailLinked) return json(res, 409, { error: 'email_linked_to_other_login', message: 'a person with this email is linked to another login' });
      if (api.duplicatePerson) return json(res, 422, { error: 'duplicate_person_user', message: 'person is linked to another user' });
      const missing = CONSENTS.filter((c) => !body?.consents?.some((x) => x.document === c.document && x.version === c.version));
      if (missing.length) return json(res, 422, { error: 'consent_required', details: { required: CONSENTS } });
      // Company OS (signup.ts:258): the person it creates needs a name. A login with no person name and none sent: 400.
      const name = typeof body?.person?.name === 'string' ? body.person.name : '';
      // The real shape (Company-OS errors.ts withHttpErrors, HttpError(400, "validation", undefined, errors)): the field
      // messages of coerceData under `details`, no `message`.
      if (api.rejectOther) return json(res, 400, { error: 'validation', details: ['field "phone": expected a string'] });
      if (api.rejectName || (!m?.personName && !name)) return json(res, 400, { error: 'validation', details: ['missing required field "name"'] });
      if (!m.roleKeys.includes('member')) m.roleKeys.push('member');
      m.registered = true;
      if (!m.personName) m.personName = name;
      return json(res, 201, { userId: user, personId: `per_${user}`, facetId: `mem_${user}` });
    }
    if (route === '/query' && req.method === 'POST') {
      const spec = (await bodyOf(req)) ?? {};
      if (spec.entity === 'person') return json(res, 200, { data: m ? [{ id: `per_${user}`, data: { name: m.personName ?? null, email: m.email, user }, createdAt: at, updatedAt: at }] : [] });
      if (spec.entity === 'member') return json(res, 200, { data: m?.roleKeys.includes('member') ? [{ id: `mem_${user}`, data: { person: `per_${user}`, status: 'active', price_audience: m.audience ?? 'general', joined_at: '2026-10-01' }, createdAt: at, updatedAt: at }] : [] });
      if (spec.entity === 'product') return json(res, 200, { data: [...PRODUCTS, ...(api.giftProduct ? [{ id: 'prd_gift4', data: { key: 'gift4', name: 'Regalo 4 clases', kind: 'gift', price: 160000, credits: 4, validity_days: 90, active: true, freezable: false, audience: null, valid_from: '2026-01-01', valid_until: null }, createdAt: at, updatedAt: at }] : [])] });
      // With the live booking, a second class an hour later the same day, to move to.
      if (spec.entity === 'occurrence' && api.calendarCancelled) api.cancelledReads++;
      if (spec.entity === 'occurrence') return json(res, 200, { data: [occurrence(api.released ? 4 : 5), { ...occurrence(0), id: 'occ_cancelled', data: { ...occurrence(0).data, title: 'CANCELLED FIXTURE ONLY', status: 'cancelled' } }, ...(api.liveBooking ? [{ ...occurrence(2), id: 'occ_10', data: { ...occurrence(2).data, title: 'Fuerza', starts_at: iso(26.5 * 3600_000), ends_at: iso(27.5 * 3600_000) } }] : [])] });
      // PAG-03: Ana's single class held by transfer, whose time ran out a minute ago; `released` is the server's pass.
      // Review r1: Ana's booked class tomorrow, cancelled from its change sheet (Company OS stores late_cancel).
      if (spec.entity === 'booking' && (user === 'user_ana' || user === 'user_deskcust') && api.liveBooking) return json(res, 200, { data: [{ id: 'bk_live', data: { person: `per_${user}`, occurrence: 'occ_9', entitlement: 'credit', ...(api.liveCancelled ? { status: 'late_cancel', cancelled_at: iso(-5_000) } : { status: 'booked' }) }, createdAt: at, updatedAt: at }] });
      if (spec.entity === 'booking' && user === 'user_ana' && api.expiredHold) return json(res, 200, { data: [{ id: 'bk_exp', data: { person: `per_${user}`, occurrence: 'occ_9', entitlement: 'single', payment_method: 'transfer', ...(api.released ? { status: 'cancelled', cancel_reason: 'hold_expired', cancelled_at: iso(-30_000) } : { status: 'held', hold_until: iso(-60_000) }) }, createdAt: at, updatedAt: at }] });
      // PRO-04: a pending trial payment.
      // Review r2: an existing pending payment for the 12-class pack, its receipt not uploaded yet.
      if (spec.entity === 'payment' && api.packPending && user === 'user_deskcust') return json(res, 200, { data: [{ id: 'pay_pack', data: { person: `per_${user}`, product: 'prd_pack12', status: 'pending', amount: 540000, method: 'transfer', date: '2026-11-02', concept: 'Paquete de 12 clases' }, createdAt: at, updatedAt: at }] });
      if (spec.entity === 'payment' && m?.trialPending) return json(res, 200, { data: [{ id: 'pay_trial', data: { person: `per_${user}`, product: 'prd_trial', status: 'pending', amount: 30000, method: 'transfer', date: '2026-11-01', concept: 'Clase de prueba' }, createdAt: at, updatedAt: at }] });
      return json(res, 200, { data: [] });
    }
    if (route === '/batch' && req.method === 'POST') {
      const body = await bodyOf(req);
      api.batches.push({ user, body });
      if (api.liveBooking && body?.ops?.some((o) => o.op === 'update' && o.entity === 'booking' && o.id === 'bk_live' && o.data?.status === 'cancelled')) api.liveCancelled = true;
      return json(res, 200, { ids: (body?.ops ?? []).map((o) => (o.op === 'update' ? o.id : 'pay_new')) });
    }
    if (route === '/api/booking/bk_pay' && req.method === 'GET') return json(res, 200, { data: { id: 'bk_pay', data: { person: `per_${user}`, occurrence: null, status: 'held', payment_method: 'transfer', hold_until: iso(20 * 60_000) }, createdAt: at, updatedAt: at } });
    return json(res, 404, { error: 'not_found' });
  }
  try {
    let file = resolve(DIST, '.' + decodeURIComponent(path));
    if (file !== DIST && !file.startsWith(DIST + sep)) { res.writeHead(403); return res.end(); }
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' }); res.end(await readFile(file));
  } catch { res.writeHead(404); res.end('Not found'); }
});
const PORT = Number(process.env.QA_PORT ?? 5341);
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${PORT}`;

// Fictional Clerk accounts. The fake Clerk users carry no first/last name: the name comes from /me (null = nameless).
const acct = (id, email) => ({ emails: [{ id: `ea_${id}`, email, verified: true }], primary: `ea_${id}` });
const ACCOUNTS = {
  user_noname: acct('noname', 'sinnombre@example.test'),
  user_long: acct('long', 'largo@example.test'),
  user_reject: acct('reject', 'rechazo@example.test'),
  user_desk: acct('desk', 'recepcion@example.test'),
  user_nonamecust: acct('nonamecust', 'clientesin@example.test'),
  user_deskcust: acct('deskcust', 'mostrador@example.test'),
  user_ana: acct('ana', 'ana@example.test'),
  user_quiet: acct('quiet', 'callada@example.test'),
  user_affil: acct('affil', 'afiliada@example.test'),
  user_dupe: acct('dupe', 'duplicada@example.test'),
  user_nofield: acct('nofield', 'sincampo@example.test'),
  user_trialed: acct('trialed', 'probada@example.test'),
};
const MEMBERS = () => ({
  // Email-code staff logins with no name in Clerk or Company OS (Jas's 1 Nov "no profile" reports).
  user_noname: { name: null, email: 'sinnombre@example.test', roleKeys: ['front_desk'] },
  user_long: { name: null, email: 'largo@example.test', roleKeys: ['front_desk'] },
  user_reject: { name: null, email: 'rechazo@example.test', roleKeys: ['front_desk'] },
  // A named staff login (unchanged: never asked).
  user_desk: { name: 'Rita Recepción', email: 'recepcion@example.test', roleKeys: ['front_desk'], personName: 'Rita Recepción' },
  // A desk-invited customer with no name who never signed up (the consent step asks for the name too).
  user_nonamecust: { name: null, email: 'clientesin@example.test', roleKeys: ['member'], registered: false },
  user_deskcust: { name: 'Dora Mostrador', email: 'mostrador@example.test', roleKeys: ['member'], registered: false, personName: 'Dora Mostrador' },
  // Registered customers: the person row's name differs from the login's; a nameless one; an affiliate.
  user_ana: { name: 'Ana Prueba', email: 'ana@example.test', roleKeys: ['member'], registered: true, personName: 'Anita Persona' },
  user_quiet: { name: null, email: 'callada@example.test', roleKeys: ['member'], registered: true, personName: null },
  user_affil: { name: 'Alba Afiliada', email: 'afiliada@example.test', roleKeys: ['member'], registered: true, personName: 'Alba Afiliada', audience: 'affiliate' },
  // Review: a nameless customer whose sign-up Company OS refuses duplicate_person_user; one on a tenant taking no name.
  user_dupe: { name: null, email: 'duplicada@example.test', roleKeys: ['member'], registered: false },
  user_nofield: { name: null, email: 'sincampo@example.test', roleKeys: ['member'], registered: false, personName: 'Nora Sincampo' },
  // PRO-04: a registered customer with a pending trial payment.
  user_trialed: { name: 'Paula Probada', email: 'probada@example.test', roleKeys: ['member'], registered: true, personName: 'Paula Probada', trialPending: true },
});

const browser = await launchBrowser();
const errors = [];
async function open(path = '/', { lang = 'es', width = 1280 } = {}) {
  api.calendarCancelled = false; api.cancelledReads = 0; api.members = MEMBERS(); api.signups = []; api.batches = []; api.emailLinked = false; api.rejectName = false; api.duplicatePerson = false; api.noNameField = false; api.expiredHold = false; api.released = false; api.liveBooking = false; api.liveCancelled = false; api.rejectOther = false; api.packPending = false; api.giftProduct = false;
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  await ctx.route(`https://${HOST}/npm/@clerk/clerk-js@*/dist/clerk.browser.js`, (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_CLERK }));
  await ctx.addInitScript(({ accounts, pk, lang }) => {
    window.__fakeClerkConfig = { accounts, publishableKey: pk };
    if (!sessionStorage.getItem('qa-init')) { sessionStorage.setItem('qa-init', '1'); localStorage.setItem('hoyos.lang', lang); }
  }, { accounts: ACCOUNTS, pk: PK, lang });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${path}: ${e.message}`));
  await page.goto(`${BASE}/#${path}`);
  await page.waitForTimeout(800);
  return { ctx, page };
}
const route = (page) => routeOf(page.url());
async function signIn(page, email) {
  await page.locator('[data-step="email"] input').fill(email);
  await page.locator('[data-step="email"] button[type=submit]').click();
  await page.locator('[data-step="code"]').waitFor({ timeout: 5000 });
  await page.locator('[data-step="code"] input').fill('424242');
  await page.locator('[data-step="code"] button[type=submit]').click();
  await page.waitForTimeout(1200);
}
const stepOf = (page) => page.locator('[data-enrol-customer="consent"]');
/** The consent step: optionally type a name, tick the box, continue. */
async function submitStep(page, name) {
  const step = stepOf(page);
  await step.waitFor({ timeout: 5000 });
  if (name != null) await step.locator('[data-enrol-name] input').fill(name);
  const box = step.locator('input[type=checkbox]');
  if (await box.count()) await box.check();
  await step.locator('button[type=submit]').click();
  await page.waitForTimeout(1200);
}
const text = (page, sel = 'body') => page.locator(sel).first().innerText().catch(() => '');

let ctx, page;
try {
  // ── 1 · a nameless staff login is asked for its name; refusals on screen; the POST carries it ───────────────────
  ({ ctx, page } = await open('/auth/sign-in'));
  await signIn(page, 'sinnombre@example.test');
  await page.goto(`${BASE}/#/app`); await page.waitForTimeout(1200);
  check('name: a nameless login\'s consent step shows the required name field', (await stepOf(page).locator('[data-enrol-name] input').count()) === 1, route(page));
  await submitStep(page, '');
  check('name: an empty name is refused on screen, nothing sent', /Escribe tu nombre/.test(await text(page, '[data-enrol-customer]')) && api.signups.length === 0);
  await submitStep(page, 'L');
  check('name: a one-character name is refused on screen, nothing sent', /Escribe tu nombre/.test(await text(page, '[data-enrol-customer]')) && api.signups.length === 0);
  await submitStep(page, 'lu@example.test');
  check('name: a name with "@" is refused on screen, nothing sent', /no tu correo/.test(await text(page, '[data-enrol-customer]')) && api.signups.length === 0);
  const hostile = '<b>Lu</b> Nueva';
  await submitStep(page, hostile);
  const sent = api.signups.at(-1);
  check('name: the POST body carries the typed name, as text (hostile HTML unchanged)', sent?.user === 'user_noname' && sent.body.person?.name === hostile && JSON.stringify(sent.body.consents) === JSON.stringify(CONSENTS), JSON.stringify(sent));
  check('name: …then the customer app opens as a customer', (await page.locator('.appshell').count()) === 1 && (await page.locator('[data-enrol-customer]').count()) === 0 && JSON.stringify(api.members.user_noname.roleKeys) === '["front_desk","member"]', route(page));
  const greet = page.locator('.cust-greeting').first();
  check('hostile: the stored HTML name is shown as text in the greeting (no element made from it)', /<b>Lu<\/b>/.test(await greet.innerText().catch(() => '')) && (await greet.locator('b').count()) === 0, await greet.innerText().catch(() => ''));
  await ctx.close();

  // ── over-long name: cut at the limit ───────────────────────────────────────────────────────────────────────────
  ({ ctx, page } = await open('/auth/sign-in'));
  await signIn(page, 'largo@example.test');
  await page.goto(`${BASE}/#/app`); await page.waitForTimeout(1200);
  const long = 'Ana '.repeat(80).trim();
  await submitStep(page, long);
  const longSent = api.signups.at(-1)?.body.person?.name ?? '';
  check('hostile: an over-long name is cut at 200 characters (SIGNUP_FORM_LIMITS.name)', longSent.length > 0 && longSent.length <= 200 && long.startsWith(longSent.trim()), String(longSent.length));
  await ctx.close();

  // ── Company OS refuses the name (400 validation): the field says so ────────────────────────────────────────────
  ({ ctx, page } = await open('/auth/sign-in'));
  await signIn(page, 'rechazo@example.test');
  await page.goto(`${BASE}/#/app`); await page.waitForTimeout(1200);
  // Review r2: a validation about another field is not the name's fault: the generic notice, not "check your name".
  api.rejectOther = true;
  await submitStep(page, 'Rocío Rechazo');
  check('name r2: a 400 validation about another field shows the notice, not the name error', (await page.locator('[data-enrol-customer="notice"]').count()) === 1 && !/Revisa tu nombre/.test(await text(page, '[data-enrol-customer]')) && !/validation|phone/.test(await text(page, '[data-enrol-customer]')), await text(page, '[data-enrol-customer]'));
  api.rejectOther = false;
  await page.locator('[data-enrol-retry]').click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(1200);
  api.rejectName = true;
  await submitStep(page, 'Rocío Rechazo');
  check('name: a 400 validation points at the name field (the step stays, the field explains), no raw code', (await stepOf(page).locator('[data-enrol-name] input').count()) === 1 && /Revisa tu nombre/.test(await text(page, '[data-enrol-customer]')) && !/validation/.test(await text(page, '[data-enrol-customer]')), await text(page, '[data-enrol-customer]'));
  api.rejectName = false;
  await submitStep(page, 'Rocío Rechazo');
  check('name: …corrected and sent again, the customer app opens', (await page.locator('.appshell').count()) === 1 && api.signups.at(-1)?.body.person?.name === 'Rocío Rechazo', route(page));
  await ctx.close();

  // ── unchanged: a named staff login is never asked ──────────────────────────────────────────────────────────────
  ({ ctx, page } = await open('/auth/sign-in'));
  await signIn(page, 'recepcion@example.test');
  await page.goto(`${BASE}/#/app`); await page.waitForTimeout(1200);
  check('unchanged: a named staff login\'s step has no name field', (await stepOf(page).count()) === 1 && (await stepOf(page).locator('[data-enrol-name]').count()) === 0);
  await submitStep(page, null);
  check('unchanged: …and sends its own name', api.signups.at(-1)?.body.person?.name === 'Rita Recepción' && (await page.locator('.appshell').count()) === 1, JSON.stringify(api.signups.at(-1)));
  await ctx.close();

  // ── the consent step (a customer who never signed up) asks for a missing name too ─────────────────────────────
  ({ ctx, page } = await open('/auth/sign-in'));
  await signIn(page, 'clientesin@example.test');
  await page.goto(`${BASE}/#/app`); await page.waitForTimeout(1200);
  check('name: a nameless customer\'s consent step asks for the name', (await stepOf(page).locator('[data-enrol-name] input').count()) === 1);
  await submitStep(page, 'Celia Cliente');
  check('name: …and the consent sign-up carries it', api.signups.at(-1)?.user === 'user_nonamecust' && api.signups.at(-1)?.body.person?.name === 'Celia Cliente' && (await page.locator('.appshell').count()) === 1, JSON.stringify(api.signups.at(-1)));
  await ctx.close();

  // ── review: only a 400 validation points at the name; duplicate_person_user keeps its notice and "Continue for now" ─
  ({ ctx, page } = await open('/auth/sign-in'));
  await signIn(page, 'duplicada@example.test');
  await page.goto(`${BASE}/#/app`); await page.waitForTimeout(1200);
  api.duplicatePerson = true;
  await submitStep(page, 'Duna Duplicada');
  const dupText = await text(page, '[data-enrol-customer]');
  check('name review: duplicate_person_user for a nameless login → the "profile linked to another account" notice, not the name error', (await page.locator('[data-enrol-customer="notice"]').count()) === 1 && /unida a otra cuenta/.test(dupText) && !/Revisa tu nombre/.test(dupText) && !/duplicate_person_user/.test(dupText), dupText.slice(0, 300));
  check('name review: …with "Continue for now" (no loop back to the name)', (await page.locator('[data-enrol-customer] [data-consent-later]').count()) === 1 && (await page.locator('[data-enrol-name]').count()) === 0);
  await ctx.close();
  ({ ctx, page } = await open('/auth/sign-in'));
  api.noNameField = true;
  await signIn(page, 'sincampo@example.test');
  await page.goto(`${BASE}/#/app`); await page.waitForTimeout(1200);
  check('name review: a tenant that takes no name at sign-up never asks for one', (await stepOf(page).count()) === 1 && (await stepOf(page).locator('[data-enrol-name]').count()) === 0);
  await submitStep(page, null);
  check('name review: …and sends none', api.signups.at(-1)?.user === 'user_nofield' && !('name' in (api.signups.at(-1)?.body.person ?? {})) && (await page.locator('.appshell').count()) === 1, JSON.stringify(api.signups.at(-1)));
  await ctx.close();

  // ── 2 · C-01d: after "Continue for now" ───────────────────────────────────────────────────────────────────────
  ({ ctx, page } = await open('/auth/sign-in'));
  await signIn(page, 'mostrador@example.test');
  await page.goto(`${BASE}/#/app`); await page.waitForTimeout(1200);
  api.emailLinked = true;
  await submitStep(page, null);
  await page.locator('[data-enrol-customer] [data-consent-later]').click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(800);
  check('C-01d: "Continue for now" opens the customer area', (await page.locator('.appshell').count()) === 1 && (await page.locator('[data-enrol-customer]').count()) === 0, route(page));
  for (const p of ['/app/history', '/app/classes', '/app/account']) {
    await page.goto(`${BASE}/#${p}`); await page.waitForTimeout(900);
    check(`C-01d: ${p} (existing bookings, balance, account) opens`, (await page.locator('.appshell').count()) === 1 && (await page.locator('[data-enrol-customer]').count()) === 0 && route(page) === p, route(page));
  }
  for (const p of ['/app/checkout/occ_1', '/app/gift-voucher', '/app/plans']) {
    await page.goto(`${BASE}/#${p}`); await page.waitForTimeout(900);
    const hold = page.locator('[data-consent-hold]');
    check(`C-01d: ${p} shows "record your consent to book" with Retry`, (await hold.count()) === 1 && /consentimiento/i.test(await hold.innerText().catch(() => '')) && (await hold.locator('[data-consent-retry]').count()) === 1, route(page));
  }
  // Review: every product purchase waits, including the payment page reached by a link or history; a held booking's stays open.
  await page.goto(`${BASE}/#/app/pay/product/pack12`); await page.waitForTimeout(1200);
  check('C-01d review: /app/pay/product/pack12 shows the hold notice and no payment form', (await page.locator('[data-consent-hold]').count()) === 1 && (await page.locator('input[name=receipt]').count()) === 0, route(page));
  check('C-01d review: …and nothing is written (no POST /batch)', api.batches.length === 0, JSON.stringify(api.batches));
  await page.goto(`${BASE}/#/app/pay/booking/bk_pay`); await page.waitForTimeout(1500);
  check('C-01d review: paying an existing held booking stays open (the form, no hold notice)', (await page.locator('[data-consent-hold]').count()) === 0 && (await page.locator('input[name=receipt]').count()) === 1, route(page));
  // Review r2: finishing an EXISTING pending product payment (its receipt not sent yet) stays open; nothing new is written.
  api.packPending = true;
  await page.goto(`${BASE}/#/app/pay/product/pack12`); await page.waitForTimeout(1500);
  check('C-01d r2: an existing pending pack payment can be finished while held (the receipt form, no hold notice)', (await page.locator('[data-consent-hold]').count()) === 0 && (await page.locator('input[name=receipt]').count()) === 1, route(page));
  check('C-01d r2: …and opening it writes nothing', api.batches.length === 0, JSON.stringify(api.batches));
  api.packPending = false;
  // Review r2 (test gap): the gift purchase while held: the button is disabled and nothing is written.
  api.giftProduct = true;
  await page.goto(`${BASE}/#/app/gift-voucher`); await page.waitForTimeout(1500);
  const giftCta = page.getByRole('button', { name: 'Continuar al pago por transferencia' });
  check('C-01d r2: the gift purchase lists the gift product while held', (await page.locator('input[name=gift-product]').count()) === 1, route(page));
  await page.getByLabel('Nombre de quien recibe').fill('Rosa Regalo').catch(() => {});
  await page.getByLabel('Correo de quien recibe').fill('rosa@example.test').catch(() => {});
  check('C-01d r2: …its button is disabled', (await giftCta.count()) === 1 && (await giftCta.isDisabled().catch(() => false)));
  await giftCta.click({ timeout: 1500 }).catch(() => {}); await page.waitForTimeout(500);
  check('C-01d r2: …and nothing starts or is written (still on the page, no /batch)', route(page) === '/app/gift-voucher' && api.batches.length === 0, route(page));
  api.giftProduct = false;
  await page.goto(`${BASE}/#/app/passes`); await page.waitForTimeout(1500);
  const passButtons = page.locator('.cust-pass button');
  check('C-01d review: Passes shows the notice and every pass button is disabled', (await page.locator('[data-consent-hold]').count()) === 1 && (await passButtons.count()) > 0 && (await passButtons.evaluateAll((bs) => bs.every((b) => b.disabled))), `${await passButtons.count()}`);
  await page.goto(`${BASE}/#/app/classes`); await page.waitForTimeout(1500);
  const buyMore = page.locator('button.pricerow').first();
  check('C-01d review: Buy more on the balance shows the notice', (await page.locator('[data-consent-hold]').count()) === 1 && (await buyMore.count()) === 1);
  const packRows = page.locator('button.pricerow');
  check('C-01d review r1: …and every pack row in it looks disabled (disabled button, aria-disabled)', (await packRows.count()) > 0 && (await packRows.evaluateAll((bs) => bs.every((b) => b.disabled && b.getAttribute('aria-disabled') === 'true'))), `${await packRows.count()}`);
  await buyMore.click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(600);
  check('C-01d review: …and a pack in it goes nowhere (no payment page, nothing written)', route(page) === '/app/classes' && api.batches.length === 0, route(page));
  // The website's Book button (signed in): the drawer shows the notice and the button starts nothing.
  await page.goto(`${BASE}/#/site/schedule`); await page.waitForTimeout(2000);
  // The fixture is 26 hours ahead and can fall in the next week (for example on Sundays).
  // Select its studio date through the calendar's own control before testing the drawer.
  const fixtureDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(occurrence(5).data.starts_at));
  await page.locator('.session-calendar input[type=date]').fill(fixtureDay);
  await page.locator('.session-calendar button', { hasText: 'Pulso' }).first().click({ timeout: 5000 });
  await page.waitForTimeout(800);
  const drawerHold = page.locator('[data-consent-hold]');
  check('C-01d review: the website schedule drawer shows the notice (signed-in copy) for a held login', (await drawerHold.count()) === 1 && /Reserva esta clase/.test(await text(page)), route(page));
  const bookBtn = drawerHold.locator('xpath=following-sibling::button').last();
  check('C-01d review: …and its Book button is disabled', (await bookBtn.count()) === 1 && (await bookBtn.isDisabled().catch(() => false)));
  await page.goto(`${BASE}/#/app/checkout/occ_9`); await page.waitForTimeout(1500);
  const confirm = page.locator('.cust-sticky button').last();
  check('C-01d review: checkout of a real class shows the notice and its button is disabled', (await page.locator('[data-consent-hold]').count()) === 1 && (await confirm.isDisabled().catch(() => false)), route(page));
  // Owner 2026-11-03: the deferral lasts for the browser session: a reload keeps the hold (not the consent step).
  await page.goto(`${BASE}/#/app/plans`); await page.waitForTimeout(900);
  await page.reload(); await page.waitForTimeout(2000);
  check('C-01d session: after a reload the hold stays (notice on Plans, no consent step)', (await page.locator('[data-consent-hold]').count()) === 1 && (await stepOf(page).count()) === 0, route(page));
  // Owner 2026-11-03: a move counts as a new booking; cancelling an existing booking stays allowed.
  api.liveBooking = true; api.batches = [];
  await page.goto(`${BASE}/#/app/booking/bk_live/change`); await page.waitForTimeout(2000);
  let sheet = page.locator('[role=dialog]').last();
  await sheet.getByText('Reprogramar a otra clase', { exact: true }).first().click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(600);
  check('C-01d move: the move mode shows the hold notice', (await sheet.locator('[data-consent-hold]').count()) === 1, (await sheet.innerText().catch(() => '')).slice(0, 300));
  check('C-01d move: …and offers no class to move to', (await sheet.locator('[role=radio]').count()) === 0 && !/Fuerza/.test(await sheet.innerText().catch(() => '')));
  check('C-01d move: …and nothing is sent (no POST /batch)', api.batches.length === 0, JSON.stringify(api.batches));
  await sheet.getByRole('button', { name: 'Volver', exact: true }).click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(400);
  await sheet.getByText('Cancelar', { exact: true }).first().click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(400);
  await sheet.getByRole('button', { name: 'Sí, cancelar y perder la clase' }).click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(2500);
  check('C-01d move: cancelling the existing booking still works while held (one /batch)', api.liveCancelled && api.batches.filter((b) => b.body?.ops?.some((o) => o.entity === 'booking' && o.id === 'bk_live')).length === 1, JSON.stringify(api.batches).slice(0, 300));
  api.liveBooking = false; api.liveCancelled = false;
  await page.goto(`${BASE}/#/app/checkout/occ_1`); await page.waitForTimeout(900);
  api.emailLinked = false;
  await page.locator('[data-consent-hold] [data-consent-retry]').click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(1200);
  check('C-01d: Retry reruns the consent step', (await stepOf(page).count()) === 1, route(page));
  // Review r2: the step shown after Retry has a way back without accepting: "Continue for now" re-defers.
  const later = stepOf(page).locator('[data-consent-later]');
  check('C-01d r2: the consent step after Retry offers "Continue for now"', (await later.count()) === 1);
  await later.click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(1000);
  check('C-01d r2: …which opens the page again with the hold (no step, the notice back)', (await stepOf(page).count()) === 0 && (await page.locator('[data-consent-hold]').count()) === 1 && route(page) === '/app/checkout/occ_1', route(page));
  await page.locator('[data-consent-hold] [data-consent-retry]').click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(1200);
  await submitStep(page, null).catch(() => {});
  check('C-01d: …and once recorded, booking opens (no notice)', route(page) === '/app/checkout/occ_1' && (await page.locator('[data-consent-hold]').count()) === 0 && (await page.locator('[data-enrol-customer]').count()) === 0 && api.members.user_deskcust.registered === true, route(page));
  await ctx.close();

  // ── 3 · PAG-03: an expired hold shows released, then the server's release and the refreshed count ─────────────
  ({ ctx, page } = await open('/auth/sign-in'));
  await signIn(page, 'ana@example.test');
  api.expiredHold = true;
  await page.goto(`${BASE}/#/app/booking/bk_exp`); await page.waitForTimeout(2000);
  let booked = await text(page, 'main');
  check('PAG-03: an expired hold not yet released reads "released", never "pending"', /Pago liberado/.test(booked) && !/Pendiente de confirmación/.test(booked), booked.slice(0, 400));
  check('PAG-03: …with the class count the server had (5 of 15)', (await page.locator('[role=meter]').first().getAttribute('aria-valuenow').catch(() => null)) === '5');
  api.released = true;
  await page.waitForTimeout(12_000); // one re-read (every 10 s)
  booked = await text(page, 'main');
  check('PAG-03: the re-read shows the server\'s release ("Cupo liberado")', /Cupo liberado/.test(booked) && !/Pendiente de confirmación/.test(booked), booked.slice(0, 400));
  check('PAG-03: …and the refreshed place count (4 of 15)', (await page.locator('[role=meter]').first().getAttribute('aria-valuenow').catch(() => null)) === '4');
  await ctx.close();

  // ── review r1: a path change keeps the page mounted; the change sheet's notice shows on the booking ───────────
  ({ ctx, page } = await open('/auth/sign-in'));
  await signIn(page, 'ana@example.test');
  api.liveBooking = true;
  await page.goto(`${BASE}/#/app/booking/bk_live/change`); await page.waitForTimeout(2000);
  sheet = page.locator('[role=dialog]').last();
  check('r1: /app/booking/:id/change opens the change sheet', (await sheet.count()) === 1 && /Cancelar/.test(await sheet.innerText().catch(() => '')), route(page));
  await sheet.getByText('Cancelar', { exact: true }).first().click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(500);
  await sheet.getByRole('button', { name: 'Sí, cancelar y perder la clase' }).click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(2500);
  check('r1: the cancel is one /batch updating the booking to cancelled', api.batches.filter((b) => b.body?.ops?.some((o) => o.entity === 'booking' && o.id === 'bk_live')).length === 1 && api.liveCancelled, JSON.stringify(api.batches).slice(0, 400));
  check('r1: …then the sheet closes onto /app/booking/:id', route(page) === '/app/booking/bk_live', route(page));
  const afterCancel = await text(page, 'main');
  check('r1: …and the cancel notice shows there (the page kept its state across the path change)', /Reserva cancelada\. La clase no vuelve a tu saldo\./.test(afterCancel), afterCancel.slice(0, 400));
  await ctx.close();

  // ── 4 · PRO-04: checkout omits a used trial ───────────────────────────────────────────────────────────────────
  for (const [email, used] of [['ana@example.test', false], ['probada@example.test', true]]) {
    ({ ctx, page } = await open('/auth/sign-in'));
    await signIn(page, email);
    await page.goto(`${BASE}/#/app/checkout/occ_9`); await page.waitForTimeout(2500);
    const choices = await text(page, '.cust-choices');
    check(`PRO-04: checkout ${used ? 'omits the trial for a pending trial payment' : 'offers the trial to a new customer'}`, choices.length > 0 && /prueba/i.test(choices) === !used, choices.slice(0, 300));
    await ctx.close();
  }

  // ── 9 · RES-02: greeting and announcement ─────────────────────────────────────────────────────────────────────
  for (const lang of ['es', 'en']) {
    ({ ctx, page } = await open('/auth/sign-in', { lang }));
    await signIn(page, 'ana@example.test');
    await page.goto(`${BASE}/#/app`); await page.waitForTimeout(1500);
    const g = await text(page, '.cust-greeting');
    check(`RES-02 (${lang}): the greeting uses the person row's name`, (lang === 'es' ? /Hola, Anita/ : /Hi, Anita/).test(g), g);
    const body = await text(page, 'main');
    check(`RES-02 (${lang}): no demo announcement in the production home`, !/Aviso del estudio|Studio announcement|al aire libre|outdoors/.test(body), body.slice(0, 300));
    await ctx.close();
  }
  ({ ctx, page } = await open('/auth/sign-in'));
  await signIn(page, 'callada@example.test');
  await page.goto(`${BASE}/#/app`); await page.waitForTimeout(1500);
  const quiet = await text(page, '.cust-greeting');
  check('RES-02: a nameless login is greeted without its email', quiet.length > 0 && !/@/.test(quiet) && !/callada/.test(quiet), quiet);
  await ctx.close();

  // ── 5 · PRO-05: the affiliate pack in the app's Plans ─────────────────────────────────────────────────────────
  for (const [email, affiliate] of [['ana@example.test', false], ['afiliada@example.test', true]]) {
    ({ ctx, page } = await open('/auth/sign-in'));
    await signIn(page, email);
    await page.goto(`${BASE}/#/app/plans`); await page.waitForTimeout(1800);
    const plansText = await text(page, '.cust-plans');
    check(`PRO-05: ${affiliate ? 'an affiliate sees' : 'a non-affiliate does not see'} the Santa María pack in the app`, /Paquete de 12 clases/.test(plansText) && /Santa María/.test(plansText) === affiliate, plansText.slice(0, 300));
    await ctx.close();
  }

  // Canceled classes disappear from browse, not from server records or booking history.
  for (const lang of ['es', 'en']) for (const width of [390, 1280]) {
    ({ ctx, page } = await open('/auth/sign-in', { lang, width }));
    await signIn(page, 'ana@example.test');
    for (const routeName of ['/app/schedule', '/app/schedule/week']) {
      await page.goto(`${BASE}/#${routeName}`);
      await page.locator('.session-calendar input[type=date]').waitFor();
      const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(occurrence(5).data.starts_at));
      await page.locator('.session-calendar input[type=date]').fill(day);
      await page.waitForTimeout(1000);
      const contents = await text(page, '.session-calendar');
      check(`canceled browse ${lang}/${width}/${routeName}: scheduled remains, canceled absent`, contents.includes('Pulso') && !contents.includes('CANCELLED FIXTURE ONLY'), contents.slice(0,400));
    }
    const batchCount = api.batches.length;
    api.calendarCancelled = true;
    await page.waitForTimeout(22_000);
    await page.locator('.session-calendar').waitFor({ state: 'visible' });
    await page.locator('.session-calendar .calendar-empty').first().waitFor({ state: 'visible' });
    check(`canceled poll ${lang}/${width}: canceled session removed after refresh`, api.cancelledReads > 0 && !(await page.locator('.session-calendar').innerText()).includes('Pulso'));
    check(`canceled poll ${lang}/${width}: no writes`, api.batches.length === batchCount);
    api.calendarCancelled = false;
    await page.reload();
    await page.waitForTimeout(1200);
    check(`canceled reload ${lang}/${width}: restored scheduled fixture visible`, (await text(page, '.session-calendar')).includes('Pulso'));
    await ctx.close();
  }

  // ── 8 · RES-01: week grid columns; the day survives a refetch and Back ───────────────────────────────────────
  for (const width of [1024, 768]) {
    ({ ctx, page } = await open('/auth/sign-in', { width }));
    await signIn(page, 'ana@example.test');
    await page.goto(`${BASE}/#/app/schedule/week`); await page.waitForTimeout(1500);
    const seen = await page.evaluate(() => {
      const win = document.querySelector('.calendar-window')?.getBoundingClientRect();
      const cells = [...document.querySelectorAll('.calendar-grid .calendar-column, .calendar-strip .calendar-strip-day')];
      return { n: cells.length, inside: !!win && cells.length === 7 && cells.every((c) => { const r = c.getBoundingClientRect(); return r.left >= win.left - 1 && r.right <= win.right + 1; }), overflow: document.documentElement.scrollWidth - innerWidth };
    });
    check(`RES-01 ${width}px: the week shows all seven days, Sunday not cut`, seen.inside && seen.overflow <= 0, JSON.stringify(seen));
    await ctx.close();
  }
  ({ ctx, page } = await open('/auth/sign-in'));
  await signIn(page, 'ana@example.test');
  await page.goto(`${BASE}/#/app/schedule`); await page.waitForTimeout(1500);
  await page.locator('.calendar-arrows button').nth(1).click(); await page.waitForTimeout(300);
  await page.locator('.calendar-arrows button').nth(1).click(); await page.waitForTimeout(300);
  const chosen = await text(page, '.calendar-period h2');
  check('RES-01: the chosen day is in the URL query', /[?&]day=\d{4}-\d{2}-\d{2}/.test(route(page)), route(page));
  await page.waitForTimeout(22_000); // one live-updates poll (20 s) refetches the schedule
  check('RES-01: after a refetch the chosen day stays', (await text(page, '.calendar-period h2')) === chosen, `${chosen} → ${await text(page, '.calendar-period h2')}`);
  await page.goto(`${BASE}/#/app/more`); await page.waitForTimeout(800);
  await page.goBack(); await page.waitForTimeout(1500);
  check('RES-01: Back returns to the same day', (await text(page, '.calendar-period h2')) === chosen, `${chosen} → ${await text(page, '.calendar-period h2')}`);
  await ctx.close();

  check('no page errors', errors.length === 0, errors.slice(0, 5).join(' | '));
} finally {
  await browser.close();
  server.close();
  done();
}
