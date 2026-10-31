// Lane F (hoy-all-roles): the signed-out website reads live Company OS data, on the PRODUCTION build behind the REAL
// Hoy server (server/app.mjs). The server holds a read-only service identity (COMPANY_OS_READ_TOKEN, ADR 0029) and
// answers a visitor's reads of the timetable, coaches, rooms and products with it; a fake Company OS speaking the
// real record shapes stands in for the API and plays the `public_site` role's policies (the private class is hidden,
// people show only a coach's name). fake-clerk.js stands in for Clerk with nobody signed in. Fictional data only.
// Checks: the schedule, home agenda, prices and teachers come from Company OS (prices and a teacher the build's
// catalogue doesn't have); no sign-in prompt replaces the timetable; no private-class price; the booking drawer reads
// the class and sends the visitor to sign in; every request that reaches Company OS carries the server's identity and
// none of the visitor's headers; nothing outside the public reads is asked or refused; the token never reaches the
// browser. Run: npm run build:production && node scripts/test-website-signed-out-live.mjs  (QA_PROD_DIST=<dir>)
import { createServer } from 'node:http';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { launchBrowser, reporter } from './lib/launch-qa.mjs';
import { createHandler, createHoyServer } from '../server/app.mjs';
import { loadConfig } from '../server/config.mjs';

const { check, done } = reporter('signed-out website on live data');
const DIST = resolve(process.env.QA_PROD_DIST ?? 'dist');
const TENANT = 'hoy-test';
const HOST = 'fake.clerk.accounts.dev';
const PK = `pk_test_${Buffer.from(`${HOST}$`).toString('base64')}`;
const FAKE_CLERK = readFileSync(new URL('./fixtures/fake-clerk.js', import.meta.url), 'utf8');
const READ_TOKEN = `cos_svc_5d1e2f3a-4b5c-4d6e-8f70-8192a3b4c5d6_${'Q'.repeat(43)}`;
const NOW = new Date('2026-11-02T13:00:00Z'); // 08:00 in Bogotá, a Monday

if (!existsSync(join(DIST, 'index.html'))) { console.error(`${DIST}/index.html missing: run npm run build:production first`); process.exit(1); }
const bundle = readdirSync(join(DIST, 'assets')).filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(DIST, 'assets', f), 'utf8')).join('\n');
if (!bundle.includes('clerk-js')) { console.error(`${DIST} is not a production build (no Clerk): run npm run build:production`); process.exit(1); }

// ── the fake Company OS: what the public_site role reads (deploy/recipes/hoy.json in Company OS) ────────────────
const at = (day, hh, mm = 0) => new Date(Date.UTC(2026, 10, 2 + day, hh + 5, mm)).toISOString(); // Bogotá is UTC-5
let n = 0;
const rec = (data) => ({ id: `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`, data, createdAt: '2026-10-01T12:00:00.000Z', updatedAt: '2026-10-01T12:00:00.000Z' });
const room = rec({ name: 'Salón principal', kind: 'room', capacity: 16 });
const clara = rec({ name: 'Clara Zuluaga' });
const nora = rec({ name: 'Nora Prueba' }); // not in the build's catalogue: only a live read shows her
const coachClara = rec({ person: clara.id, kind: 'teacher', active: true });
const coachNora = rec({ person: nora.id, kind: 'teacher', active: true });
const fuego = rec({ title: 'Fuego', kind: 'class', resource: room.id, coach: coachClara.id, weekday: 1, start_time: '12:00', duration_minutes: 50, capacity: 16, spots_enabled: false, active: true });
const pulso = rec({ title: 'Pulso', kind: 'class', resource: room.id, coach: coachNora.id, weekday: 2, start_time: '18:00', duration_minutes: 50, capacity: 16, spots_enabled: false, active: true });
const occurrence = (schedule, day, hh, booked) => rec({ title: schedule.data.title, kind: 'class', schedule: schedule.id, resource: room.id, coach: schedule.data.coach, starts_at: at(day, hh), ends_at: at(day, hh, 50), capacity: 16, spots_enabled: false, status: 'scheduled', booked_count: booked });
const todayClass = occurrence(fuego, 0, 12, 13);
const DATA = {
  resource: [room],
  person: [clara, nora],
  coach: [coachClara, coachNora],
  schedule: [fuego, pulso],
  occurrence: [todayClass, occurrence(pulso, 1, 18, 2), occurrence(fuego, 7, 12, 0)],
  product: [
    rec({ key: 'trial', name: 'Clase de prueba', kind: 'trial', price: 36000, credits: 1, active: true }),
    rec({ key: 'single', name: 'Clase individual', kind: 'single', price: 57000, credits: 0, active: true }),
    rec({ key: 'pack12', name: 'Paquete de 12 clases', kind: 'pack', price: 612000, credits: 12, validity_days: 90, freezable: true, active: true }),
    rec({ key: 'pack12_smtc', name: 'Paquete de 12 clases · afiliados', kind: 'pack', price: 489000, credits: 12, validity_days: 90, freezable: true, audience: 'affiliate', active: true }),
    rec({ key: 'gift_single', name: 'Tarjeta de regalo · clase individual', kind: 'gift', price: 57000, credits: 1, active: true }),
    rec({ key: 'gift_pack12', name: 'Tarjeta de regalo · paquete de 12 clases', kind: 'gift', price: 612000, credits: 12, validity_days: 90, active: true }),
  ],
  // Lane H2: the studio's public settings record, a holiday and a booked mat (a booking's class and mat only).
  setting: [rec({ key: 'studio_settings', value: { policies: { cancellationHours: 12 } } }), rec({ key: 'studio_private', value: { payroll: { rateCard: { byTeacher: { x: 91000 } } } } })],
  hours_override: [rec({ start_date: '2026-12-25', end_date: '2026-12-25', closed: true, label: { es: 'Navidad', en: 'Christmas' }, kind: 'holiday', source: 'colombia' })],
  booking: [rec({ occurrence: todayClass.id, spot: 4 })],
};
/** What the public_site policies let through (deploy/recipes/hoy.json): the public settings record only. */
const POLICY = { setting: (r) => r.data.key === 'studio_settings' };
/** Rows the role never reads (policy: kind ≠ private), kept here to prove they never leak through the site. */
const HIDDEN_PRIVATE = rec({ key: 'private', name: 'Clase privada', kind: 'private', price: 277000, credits: 0, active: true });
const match = (r, f) => {
  if (!f || f.all) return true;
  if (f.and) return f.and.every((x) => match(r, x));
  if (f.or) return f.or.some((x) => match(r, x));
  // Lane H2: signed-out bookings are read for upcoming classes (a filter through the booking's class).
  if (f.ref) { const target = (DATA[f.entity] ?? []).find((x) => x.id === r.data[f.ref]); return !!target && match(target, f.where); }
  const v = f.field === 'id' ? r.id : r.data[f.field];
  if (f.op === 'eq') return v === f.value;
  if (f.op === 'in') return f.value.includes(v);
  if (f.op === 'gte') return v >= f.value;
  if (f.op === 'is_null') return v == null;
  if (f.op === 'is_not_null') return v != null;
  throw new Error(`fake: op ${f.op}`);
};
const seen = [];
const json = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
const cos = createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => { raw += c; });
  req.on('end', () => {
    const path = new URL(req.url, 'http://cos').pathname.replace(`/t/${TENANT}`, '');
    const body = raw ? JSON.parse(raw) : undefined;
    seen.push({ method: req.method, path, entity: body?.entity ?? path.split('/')[2], headers: req.headers });
    if (req.headers.authorization !== `Bearer ${READ_TOKEN}`) return json(res, 401, { error: 'unauthorized' });
    if (req.method === 'POST' && path === '/query') {
      const rows = DATA[body.entity];
      if (!rows) return json(res, 403, { error: 'forbidden' });
      let out = rows.filter((r) => (POLICY[body.entity]?.(r) ?? true) && match(r, body.filter)).map((r) => ({ ...r, data: { ...r.data } }));
      if (body.sort?.[0]) out.sort((a, b) => (a.data[body.sort[0].field] < b.data[body.sort[0].field] ? -1 : 1));
      out = out.slice(body.offset ?? 0, (body.offset ?? 0) + (body.limit ?? 100));
      for (const inc of body.include ?? []) for (const r of out) {
        const person = DATA.person.find((p) => p.id === r.data[inc.field]);
        r.data[inc.field] = person ? { id: person.id, name: person.data.name } : null;
      }
      return json(res, 200, { data: out });
    }
    const one = path.match(/^\/api\/([a-z_]+)\/([^/]+)$/);
    if (req.method === 'GET' && one) {
      if (!DATA[one[1]]) return json(res, 403, { error: 'forbidden' });
      const r = DATA[one[1]].find((x) => x.id === one[2]);
      return r ? json(res, 200, { data: r }) : json(res, 404, { error: 'not found' });
    }
    return json(res, 403, { error: 'read_only_identity' });
  });
});
await new Promise((r) => cos.listen(0, '127.0.0.1', r));

// ── the real Hoy server in front of it ──────────────────────────────────────────────────────────────────────────
const logs = [];
const config = loadConfig({
  COMPANY_OS_URL: `http://127.0.0.1:${cos.address().port}`, COMPANY_OS_TENANT: TENANT, CLERK_SECRET_KEY: 'sk_test_example',
  CLERK_PUBLISHABLE_KEY: PK, HOY_ENV: 'local', DIST_DIR: DIST, SITE_LIVE: 'true', COMPANY_OS_READ_TOKEN: READ_TOKEN,
});
const web = createHoyServer(await createHandler(config, { verifySession: async () => { throw new Error('nobody is signed in'); }, log: (e) => logs.push(e) }));
await new Promise((r) => web.listen(5196, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:5196';

const browser = await launchBrowser();
const errors = [];
const answers = [];
async function open(path, lang = 'es') {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce', timezoneId: 'America/Bogota' });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  await ctx.route(`https://${HOST}/npm/@clerk/clerk-js@*/dist/clerk.browser.js`, (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_CLERK }));
  await ctx.addInitScript(({ pk, lang }) => {
    window.__fakeClerkConfig = { accounts: {}, publishableKey: pk };
    if (!sessionStorage.getItem('qa-init')) { sessionStorage.setItem('qa-init', '1'); localStorage.setItem('hoyos.lang', lang); }
  }, { pk: PK, lang });
  const page = await ctx.newPage();
  await page.clock.install({ time: NOW });
  page.on('pageerror', (e) => errors.push(`${path}: ${e.message}`));
  page.on('response', async (r) => { if (r.url().startsWith(BASE)) answers.push({ url: r.url(), headers: r.headers(), body: await r.text().catch(() => '') }); });
  await page.goto(`${BASE}/#${path}`);
  await page.locator('.site-main').waitFor();
  await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), null, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1500);
  return { ctx, page };
}
const route = (page) => decodeURIComponent(new URL(page.url()).hash.slice(1));
const PROMPT = /Inicia sesión para ver los horarios|Sign in to see the timetable/;

try {
  // The schedule: the live timetable, no sign-in prompt in its place.
  let { ctx, page } = await open('/site/schedule');
  let text = await page.locator('.site-main').innerText();
  check('schedule: no sign-in prompt replaces the timetable', !PROMPT.test(text), text.slice(0, 200));
  check('schedule: the live classes are listed (Fuego and Pulso from Company OS)', /Fuego/.test(text) && /Pulso/.test(text), text.slice(0, 400));
  // The booking drawer: the class, its teacher and the places left; continuing sends the visitor to sign in.
  await page.getByText('Fuego', { exact: false }).first().click();
  await page.locator('.drawer, [role="dialog"]').first().waitFor({ timeout: 5000 }).catch(() => {});
  const drawer = (await page.locator('.drawer, [role="dialog"]').first().innerText().catch(() => '')) || '';
  check('schedule: the drawer shows the class with its live teacher', /Clara Zuluaga/.test(drawer), drawer.slice(0, 300));
  check('schedule: the drawer shows the places left (16 places, 13 booked: 3 left)', /\b3 cupos\b/.test(drawer), drawer.slice(0, 300));
  const go = page.locator('.drawer button, [role="dialog"] button').filter({ hasText: /Continuar|Continue|Reservar|Book/ }).last();
  if (await go.count()) {
    await go.click();
    await page.waitForURL(/#\/auth\/sign-in/, { timeout: 10000 }).catch(() => {});
    check('schedule: continuing reads the class and sends the visitor to sign in, then checkout', /^\/auth\/sign-in\?next=\/app\/checkout\//.test(route(page)), route(page));
  } else check('schedule: the drawer offers to continue', false, drawer.slice(0, 300));
  await ctx.close();

  // Home: today's classes from Company OS.
  ({ ctx, page } = await open('/site'));
  const agenda = await page.locator('.sanctuary-agenda').innerText().catch(() => '');
  check('home: today\'s agenda lists the live class, not a sign-in prompt', /Fuego/.test(agenda) && /Clara Zuluaga/.test(agenda) && !PROMPT.test(agenda), agenda);
  text = await page.locator('.site-main').innerText();
  check('home: the plan prices are live (612.000, 36.000)', /612\.000/.test(text) && /36\.000/.test(text), text.slice(0, 300));
  await ctx.close();

  // Plans: live prices; never the private class's.
  ({ ctx, page } = await open('/site/plans'));
  text = (await page.locator('.site-main').textContent()) ?? '';
  check('plans: the 12-class package at its live price (612.000), not the build\'s (600.000)', /612\.000/.test(text) && !/600\.000/.test(text), text.slice(0, 300));
  check('plans: the affiliate package at its live price (489.000)', /489\.000/.test(text));
  check('plans: no private-class price, live or built in (J4)', !/277\.000|250\.000|60\.000/.test(text));
  await ctx.close();

  // Teachers: the live coaches, a new one included; nobody else.
  ({ ctx, page } = await open('/site/teachers'));
  text = await page.locator('.site-main').innerText();
  check('teachers: the live coaches, a teacher the build doesn\'t know included (Nora Prueba)', /Clara Zuluaga/.test(text) && /Nora Prueba/.test(text), text.slice(0, 300));
  check('teachers: a teacher only in the build\'s catalogue is not listed', !/Leandro Valencia/.test(text));
  await ctx.close();

  // English too: the schedule loads without a prompt.
  ({ ctx, page } = await open('/site/schedule', 'en'));
  text = await page.locator('.site-main').innerText();
  check('schedule (en): the live classes, no sign-in prompt', /Fuego/.test(text) && !PROMPT.test(text));
  await ctx.close();

  // What reached Company OS, and what the browser saw.
  const entities = [...new Set(seen.map((s) => s.entity))].sort();
  check('Company OS was asked only the public reads', entities.every((e) => ['coach', 'occurrence', 'product', 'resource', 'schedule', 'setting', 'hours_override', 'booking'].includes(e)), entities.join(', '));
  check('the site reads the public settings record live (lane H2)', entities.includes('setting'), entities.join(', '));
  check('the private settings record never reached the browser', answers.filter((a) => a.url.includes('/api/cos/')).every((a) => !a.body.includes('91000')));
  check('Company OS was asked for the timetable, coaches, rooms and products', ['coach', 'occurrence', 'product', 'resource', 'schedule'].every((e) => entities.includes(e)), entities.join(', '));
  check('every request carried the server\'s read identity', seen.length > 0 && seen.every((s) => s.headers.authorization === `Bearer ${READ_TOKEN}`));
  check('no visitor header reached Company OS (cookie, referer, user-agent, origin)', seen.every((s) => !s.headers.cookie && !s.headers.referer && !s.headers.origin && !s.headers['user-agent']?.includes('Chrome')));
  const refused = logs.filter((l) => l.event === 'api.cos' && l.status >= 400);
  check('the site asked nothing the server refuses signed out (no 401 in the server log)', refused.length === 0, JSON.stringify(refused.slice(0, 3)));
  check('the read token never reached the browser', answers.every((a) => !a.body.includes('cos_svc_') && !JSON.stringify(a.headers).includes('cos_svc_')) && !bundle.includes('cos_svc_'));
  check('the private class never reached the browser', answers.filter((a) => a.url.includes('/api/cos/')).every((a) => !a.body.includes(HIDDEN_PRIVATE.data.name) && !a.body.includes('277000')));
} finally {
  check('no page threw', errors.length === 0, errors.join(' | '));
  await browser.close();
  web.close(); cos.close();
}
done();
