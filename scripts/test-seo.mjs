// SEO for Hoy's public debut (Hoy 12 Nov programme, lane H-SEO; decision D11, reading R5): the public website on real
// Spanish paths on https://hoyhumanclub.com, through the real Hoy server (server/app.mjs + server/seo.mjs), and the
// browser's path map (src/modules/website/paths.ts) that the production build routes with.
// - every public path answers 200 with its own title, description, canonical, Open Graph, Twitter and JSON-LD;
// - the old addresses (/site/x on the server, /#/site/x in the browser) reach the new path;
// - unknown paths answer 404; sitemap.xml and robots.txt are valid; the test site says noindex; www goes to the apex;
// - the app's hash routes and its server routes are unchanged; hostile paths (traversal, very long, encoded) go nowhere.
// Needs `npm ci --prefix server`. Run: node scripts/test-seo.mjs (Node 22.18+ strips the types of the .ts it imports)
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHandler, createHoyServer } from '../server/app.mjs';
import { loadConfig } from '../server/config.mjs';

// Dynamic, so that without the modules each check below fails by name instead of the whole file failing to load.
const seo = await import('../server/seo.mjs').catch((err) => ({ missing: err }));
const paths = await import('../src/modules/website/paths.ts').catch((err) => ({ missing: err }));
const brand = await import('../src/tenant/brand.ts');

const results = [];
async function test(name, fn) {
  try {
    await fn();
    results.push(['✅', name]);
  } catch (err) {
    results.push(['❌', name, err]);
  }
}

// ---------------------------------------------------------------------------------------------
// Fixtures: a dist/ shaped like the production build's (relative assets, the pre-launch social block)
// ---------------------------------------------------------------------------------------------
const ORIGIN = 'https://hoyhumanclub.com';
const NOW = Date.parse('2026-11-12T08:00:00-05:00');
const READ_TOKEN = `cos_svc_0b0f6e1c-3c6a-4c0e-9a51-6f3f2c1d9e02_${'R'.repeat(43)}`;
const PASS = 'correct horse battery';
const SECRET = 's'.repeat(64);
const APP_MARKER = './assets/index-abc123.js';

const PUBLIC = {
  '/': 'home',
  '/nosotros': 'about',
  '/clases': 'classes',
  '/metodologias': 'modalities',
  '/horario': 'schedule',
  '/profesores': 'teachers',
  '/planes': 'plans',
  '/preguntas': 'faq',
  '/contacto': 'contact',
  '/legal/terminos': 'terms',
  '/legal/privacidad': 'privacy',
  '/eliminar-cuenta': 'delete',
};
const LEGACY = {
  '/site': '/',
  '/site/about': '/nosotros',
  '/site/classes': '/clases',
  '/site/classes/fuego': '/clases/fuego',
  '/site/modalities': '/metodologias',
  '/site/schedule': '/horario',
  '/site/teachers': '/profesores',
  '/site/plans': '/planes',
  '/site/faq': '/preguntas',
  '/site/contact': '/contacto',
  '/site/legal/terms': '/legal/terminos',
  '/site/legal/privacy': '/legal/privacidad',
  '/site/delete-account': '/eliminar-cuenta',
};
const CLASS_SLUGS = brand.classOrder;

const INDEX = `<!doctype html>
<html lang="es" data-theme="light" data-skin="styled">
  <head>
    <meta charset="UTF-8" />
    <!-- hoy-social:start -->
    <title>HOY Human Club — Próximamente</title>
    <meta name="description" content="Estamos preparando un espacio para moverte, conectar y hacer una pausa. Nos vemos pronto." />
    <link rel="canonical" href="https://hoyhumanclub.com/" />
    <meta property="og:title" content="HOY Human Club — Próximamente" />
    <!-- hoy-social:end -->
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <link rel="icon" type="image/png" href="./brand/hoy-blue.png" />
    <script type="module" crossorigin src="${APP_MARKER}"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`;

const root = await mkdtemp(join(tmpdir(), 'hoy-seo-'));
const dist = join(root, 'dist');
await mkdir(join(dist, 'assets'), { recursive: true });
await writeFile(join(dist, 'index.html'), INDEX);
await writeFile(join(dist, 'assets', 'index-abc123.js'), 'console.log("the app");\n');
await writeFile(join(dist, 'release.json'), JSON.stringify({ version: '1.0.0', sourceCommit: 'a'.repeat(40) }));

/** The studio's public settings record as Company OS stores it (decision F-01). */
const SETTINGS = {
  profile: {
    address: 'Calle de prueba 1 # 2-3', city: 'Medellín', whatsapp: '+57 300 111 2233', email: 'hola@example.com',
    instagram: '@hoyprueba', instagramUrl: 'https://www.instagram.com/hoyprueba', mapLat: 6.2, mapLng: -75.5,
    confirmedFields: { whatsapp: true, address: true, email: true, instagram: true },
  },
  openingHours: { '0': null, '1': { open: '06:00', close: '20:00' }, '2': { open: '06:00', close: '20:00' }, '3': { open: '06:00', close: '20:00' }, '4': { open: '06:00', close: '20:00' }, '5': { open: '06:00', close: '20:00' }, '6': { open: '08:00', close: '13:00' } },
  openingHoursConfirmed: true,
};
/** What the fake Company OS answers to the settings query; a test swaps it. */
let settingsAnswer = { status: 200, body: { data: [{ id: 'set-1', data: { key: 'studio_settings', value: SETTINGS } }] } };
const seen = [];
const upstream = http.createServer((req, res) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks).toString();
    seen.push({ method: req.method, url: req.url, headers: req.headers, body });
    res.writeHead(settingsAnswer.status, { 'content-type': 'application/json' });
    res.end(typeof settingsAnswer.body === 'string' ? settingsAnswer.body : JSON.stringify(settingsAnswer.body));
  });
});
await new Promise((r) => upstream.listen(0, '127.0.0.1', r));

const BASE_ENV = {
  COMPANY_OS_URL: `http://127.0.0.1:${upstream.address().port}`,
  COMPANY_OS_TENANT: 'hoy-dev',
  CLERK_SECRET_KEY: 'sk_test_example',
  DIST_DIR: dist,
  HOY_ENV: 'production',
  APP_URL: ORIGIN,
  SITE_LIVE: 'true',
};
const GATED = { HOY_ENV: 'test', TEST_GATE_PASSPHRASE: PASS, COOKIE_SIGNING_SECRET: SECRET, APP_URL: 'https://test.hoyhumanclub.com' };

const servers = [];
async function start(env = {}, now = NOW) {
  const config = loadConfig({ ...BASE_ENV, ...env });
  const server = createHoyServer(await createHandler(config, { verifySession: async () => { throw new Error('no sessions here'); }, log: () => {}, now: () => now }));
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  servers.push(server);
  return { call: (method, path, headers = {}) => request(server, method, path, headers) };
}
function request(server, method, path, headers) {
  return new Promise((done, fail) => {
    const req = http.request({ host: '127.0.0.1', port: server.address().port, method, path, headers, agent: false }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => done({ status: res.statusCode, headers: res.headers, text: Buffer.concat(chunks).toString() }));
      res.on('error', fail);
    });
    req.on('error', fail);
    req.end();
  });
}

/** The page's head, read the way a crawler would. */
function head(html) {
  const attr = (re) => html.match(re)?.[1]?.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>');
  const meta = (key) => attr(new RegExp(`<meta (?:name|property)="${key.replace(/[:.]/g, '\\$&')}" content="([^"]*)"`));
  const ld = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
  return {
    titles: [...html.matchAll(/<title>([^<]*)<\/title>/g)].map((m) => m[1]),
    title: attr(/<title>([^<]*)<\/title>/),
    description: meta('description'),
    canonical: attr(/<link rel="canonical" href="([^"]*)"/),
    canonicals: [...html.matchAll(/<link rel="canonical"/g)].length,
    lang: attr(/<html[^>]* lang="([^"]*)"/),
    base: attr(/<base href="([^"]*)"/),
    og: { title: meta('og:title'), description: meta('og:description'), url: meta('og:url'), image: meta('og:image'), type: meta('og:type'), locale: meta('og:locale') },
    twitter: { card: meta('twitter:card'), title: meta('twitter:title'), image: meta('twitter:image') },
    ld,
  };
}
const business = (h) => h.ld.find((x) => x['@type'] === 'HealthClub');

// ---------------------------------------------------------------------------------------------
// Every public path: 200 with its own tags
// ---------------------------------------------------------------------------------------------
await test('every public path answers 200 HTML with its own title, description, canonical, OG, Twitter, lang and JSON-LD', async () => {
  const app = await start({ COMPANY_OS_READ_TOKEN: READ_TOKEN });
  const titles = new Set();
  const descriptions = new Set();
  for (const path of [...Object.keys(PUBLIC), ...CLASS_SLUGS.map((s) => `/clases/${s}`)]) {
    const r = await app.call('GET', path);
    assert.equal(r.status, 200, path);
    assert.match(r.headers['content-type'], /^text\/html/, path);
    assert.ok(r.text.includes(APP_MARKER.slice(1)), `${path}: the app still loads`);
    const h = head(r.text);
    assert.equal(h.titles.length, 1, `${path}: one title`);
    assert.ok(h.title && !/Próximamente/.test(h.title), `${path}: ${h.title}`);
    assert.ok(h.description && h.description.length >= 50 && h.description.length <= 170, `${path}: description ${h.description?.length}`);
    assert.equal(h.canonical, `${ORIGIN}${path}`, path);
    assert.equal(h.canonicals, 1, `${path}: one canonical`);
    assert.equal(h.lang, 'es-CO', path);
    assert.equal(h.og.title, h.title, path);
    assert.equal(h.og.description, h.description, path);
    assert.equal(h.og.url, `${ORIGIN}${path}`, path);
    assert.equal(h.og.type, 'website', path);
    assert.equal(h.og.locale, 'es_CO', path);
    assert.match(h.og.image ?? '', /^https:\/\/hoyhumanclub\.com\/social\/[a-z0-9-]+\.png$/, path);
    assert.equal(h.twitter.card, 'summary_large_image', path);
    assert.equal(h.twitter.title, h.title, path);
    assert.equal(h.twitter.image, h.og.image, path);
    const b = business(h);
    assert.ok(b, `${path}: HealthClub JSON-LD`);
    assert.equal(b['@context'], 'https://schema.org');
    assert.equal(b.name, 'Hoy Human Club');
    assert.equal(b.url, `${ORIGIN}/`);
    assert.ok(!/Próximamente/.test(r.text), `${path}: the pre-launch tags are gone`);
    // Relative assets (vite base './') must resolve from the root on a deep path.
    if (path !== '/') assert.equal(h.base, '/', `${path}: <base href="/">`);
    titles.add(h.title);
    descriptions.add(h.description);
  }
  assert.equal(titles.size, Object.keys(PUBLIC).length + CLASS_SLUGS.length, 'every title is its own');
  assert.equal(descriptions.size, Object.keys(PUBLIC).length + CLASS_SLUGS.length, 'every description is its own');
});

await test('a class page names its class, from the site copy (R5)', async () => {
  const app = await start();
  for (const slug of CLASS_SLUGS) {
    const h = head((await app.call('GET', `/clases/${slug}`)).text);
    assert.ok(h.title.includes(brand.classes[slug].name.es), `${slug}: ${h.title}`);
  }
});

await test('HEAD answers like GET without a body; other methods 405', async () => {
  const app = await start();
  const r = await app.call('HEAD', '/planes');
  assert.equal(r.status, 200);
  assert.match(r.headers['content-type'], /^text\/html/);
  assert.equal(r.text, '');
  for (const method of ['POST', 'PUT', 'DELETE']) assert.equal((await app.call(method, '/planes')).status, 405, method);
});

await test('the page HTML is never cached by a shared cache for long, and keeps the page security policy', async () => {
  const app = await start();
  const r = await app.call('GET', '/horario');
  assert.equal(r.headers['cache-control'], 'no-cache');
  assert.match(r.headers['content-security-policy'] ?? '', /base-uri 'self'/);
  assert.equal(r.headers['x-content-type-options'], 'nosniff');
  const gz = await app.call('GET', '/horario', { 'accept-encoding': 'gzip' });
  assert.equal(gz.status, 200);
});

// ---------------------------------------------------------------------------------------------
// The root and the go-live switch
// ---------------------------------------------------------------------------------------------
await test('/ before go-live keeps the pre-launch "Próximamente" tags (the file as built)', async () => {
  for (const env of [{ SITE_LIVE: 'false' }, { SITE_LIVE: '', SITE_LIVE_AT: '2026-11-13T06:00:00-05:00' }]) {
    const app = await start(env);
    const r = await app.call('GET', '/');
    assert.equal(r.status, 200);
    assert.equal(r.text, INDEX, JSON.stringify(env));
  }
});

await test('/ once live (SITE_LIVE, or SITE_LIVE_AT reached) serves the home tags', async () => {
  for (const env of [{ SITE_LIVE: 'true' }, { SITE_LIVE: '', SITE_LIVE_AT: '2026-11-12T06:00:00-05:00' }]) {
    const app = await start(env);
    const h = head((await app.call('GET', '/')).text);
    assert.ok(!/Próximamente/.test(h.title), `${JSON.stringify(env)}: ${h.title}`);
    assert.equal(h.canonical, `${ORIGIN}/`);
    assert.ok(business(h));
  }
});

await test('the other public paths answer before go-live too (the site was reachable before; only / waits)', async () => {
  const app = await start({ SITE_LIVE: 'false' });
  const r = await app.call('GET', '/planes');
  assert.equal(r.status, 200);
  assert.equal(head(r.text).canonical, `${ORIGIN}/planes`);
});

// ---------------------------------------------------------------------------------------------
// JSON-LD: from the public settings, through the read identity; tenant config as the fallback
// ---------------------------------------------------------------------------------------------
await test('JSON-LD reads the public settings record with the read identity (address, phone, hours, Instagram)', async () => {
  seen.length = 0;
  settingsAnswer = { status: 200, body: { data: [{ id: 'set-1', data: { key: 'studio_settings', value: SETTINGS } }] } };
  const app = await start({ COMPANY_OS_READ_TOKEN: READ_TOKEN });
  const b = business(head((await app.call('GET', '/contacto')).text));
  assert.equal(b.telephone, '+57 300 111 2233');
  assert.equal(b.email, 'hola@example.com');
  assert.equal(b.address['@type'], 'PostalAddress');
  assert.equal(b.address.streetAddress, 'Calle de prueba 1 # 2-3');
  assert.equal(b.address.addressLocality, 'Medellín');
  assert.equal(b.address.addressCountry, 'CO');
  assert.deepEqual(b.sameAs, ['https://www.instagram.com/hoyprueba']);
  assert.deepEqual(b.geo, { '@type': 'GeoCoordinates', latitude: 6.2, longitude: -75.5 });
  const weekdays = b.openingHoursSpecification.find((s) => s.dayOfWeek.includes('Monday'));
  assert.deepEqual(weekdays, { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '06:00', closes: '20:00' });
  assert.deepEqual(b.openingHoursSpecification.find((s) => s.dayOfWeek.includes('Saturday')).dayOfWeek, ['Saturday']);
  assert.ok(!b.openingHoursSpecification.some((s) => s.dayOfWeek.includes('Sunday')));
  const q = seen.find((s) => s.method === 'POST' && s.url === '/t/hoy-dev/query');
  assert.ok(q, 'asked Company OS');
  assert.equal(q.headers.authorization, `Bearer ${READ_TOKEN}`);
  assert.equal(JSON.parse(q.body).entity, 'setting');
  // Cached: a second page does not ask again.
  const before = seen.length;
  await app.call('GET', '/planes');
  assert.equal(seen.length, before, 'one read serves many pages');
});

await test('JSON-LD falls back to the tenant config without a read identity, or when Company OS fails', async () => {
  const fallback = async (app) => business(head((await app.call('GET', '/contacto')).text));
  for (const [what, env, answer] of [
    ['no read token', {}, null],
    ['a 500', { COMPANY_OS_READ_TOKEN: READ_TOKEN }, { status: 500, body: { error: 'boom' } }],
    ['no record yet', { COMPANY_OS_READ_TOKEN: READ_TOKEN }, { status: 200, body: { data: [] } }],
    ['not JSON', { COMPANY_OS_READ_TOKEN: READ_TOKEN }, { status: 200, body: '<html>' }],
  ]) {
    if (answer) settingsAnswer = answer;
    const b = await fallback(await start(env));
    assert.equal(b.telephone, '+57 312 776 5000', what);
    assert.equal(b.address.streetAddress, 'Cl. 7B Sur # 29C-100, El Poblado', what);
    assert.equal(b.address.addressLocality, 'Medellín', what);
    assert.deepEqual(b.sameAs, ['https://www.instagram.com/hoyhumanclub'], what);
    // 0041: hours go out only once Administration has confirmed them; the defaults are not confirmed.
    assert.equal(b.openingHoursSpecification, undefined, what);
  }
  settingsAnswer = { status: 200, body: { data: [{ id: 'set-1', data: { key: 'studio_settings', value: SETTINGS } }] } };
});

await test('JSON-LD: an unconfirmed field is left out (0036), unconfirmed hours too (0041)', async () => {
  settingsAnswer = { status: 200, body: { data: [{ id: 'set-1', data: { key: 'studio_settings', value: { ...SETTINGS, openingHoursConfirmed: false, profile: { ...SETTINGS.profile, confirmedFields: { whatsapp: false, address: true, email: true, instagram: false } } } } }] } };
  const b = business(head((await (await start({ COMPANY_OS_READ_TOKEN: READ_TOKEN })).call('GET', '/')).text));
  assert.equal(b.telephone, undefined);
  assert.equal(b.sameAs, undefined);
  assert.equal(b.openingHoursSpecification, undefined);
  assert.equal(b.address.streetAddress, 'Calle de prueba 1 # 2-3');
  settingsAnswer = { status: 200, body: { data: [{ id: 'set-1', data: { key: 'studio_settings', value: SETTINGS } }] } };
});

await test('JSON-LD: hostile settings values never break out of the script, and odd types are ignored', async () => {
  settingsAnswer = { status: 200, body: { data: [{ id: 'set-1', data: { key: 'studio_settings', value: {
    profile: { address: '</script><script>alert(1)</script>', city: { evil: true }, whatsapp: '+57 300 111 2233\u2028', instagramUrl: 'javascript:alert(1)', mapLat: 'x', mapLng: 1e309, confirmedFields: { whatsapp: true, address: true, instagram: true } },
    openingHours: { '1': { open: '<b>', close: '20:00' }, '2': 'nope' }, openingHoursConfirmed: true,
  } } }] } };
  const r = await (await start({ COMPANY_OS_READ_TOKEN: READ_TOKEN })).call('GET', '/contacto');
  assert.equal(r.status, 200);
  assert.ok(!r.text.includes('<script>alert(1)'), 'no script injection');
  assert.ok(!/\u2028/.test(r.text));
  const b = business(head(r.text));
  assert.equal(b.address.streetAddress, '</script><script>alert(1)</script>', 'the value survives as data, escaped');
  assert.equal(b.address.addressLocality, 'Medellín', 'a non-string city falls back');
  assert.equal(b.sameAs, undefined, 'only an https Instagram link is published');
  assert.equal(b.geo, undefined, 'bad coordinates are left out');
  assert.ok(!(b.openingHoursSpecification ?? []).some((s) => s.opens === '<b>'), 'a malformed time is left out');
  settingsAnswer = { status: 200, body: { data: [{ id: 'set-1', data: { key: 'studio_settings', value: SETTINGS } }] } };
});

// ---------------------------------------------------------------------------------------------
// Old addresses
// ---------------------------------------------------------------------------------------------
await test('old /site/x addresses answer 301 to the new path (trailing slash too; a plain query string kept)', async () => {
  const app = await start();
  for (const [from, to] of Object.entries(LEGACY)) {
    for (const path of [from, `${from}/`]) {
      const r = await app.call('GET', path);
      assert.equal(r.status, 301, path);
      assert.equal(r.headers.location, to, path);
    }
  }
  assert.equal((await app.call('GET', '/site/schedule?modality=fuego')).headers.location, '/horario?modality=fuego');
  assert.equal((await app.call('GET', '/site/plans?a=%0d%0aSet-Cookie:x=1')).headers.location, '/planes');
  assert.equal((await app.call('HEAD', '/site/plans')).status, 301);
});

await test('/coming-soon still goes to the app route after the # (it keeps its own pre-launch copy)', async () => {
  const r = await (await start()).call('GET', '/coming-soon');
  assert.equal(r.status, 302);
  assert.equal(r.headers.location, '/#/coming-soon');
});

await test('a trailing slash on a public path answers 301 to the path without it', async () => {
  const app = await start();
  for (const path of ['/nosotros/', '/clases/', '/clases/fuego/', '/legal/terminos/']) {
    const r = await app.call('GET', path);
    assert.equal(r.status, 301, path);
    assert.equal(r.headers.location, path.slice(0, -1), path);
  }
});

// ---------------------------------------------------------------------------------------------
// Unknown and hostile paths
// ---------------------------------------------------------------------------------------------
await test('unknown paths answer 404, not the app', async () => {
  const app = await start();
  for (const path of ['/foo', '/clases/nope', '/clases/fuego/extra', '/nosotros/x', '/NOSOTROS', '/app', '/app/home', '/hub', '/legal', '/legal/terms', '/site/nope', '/about', '/plans', '/es/planes']) {
    const r = await app.call('GET', path);
    assert.equal(r.status, 404, path);
    assert.ok(!r.text.includes(APP_MARKER.slice(1)), `${path}: not the SPA`);
  }
});

await test('hostile paths: traversal, encoded, very long, header injection: 404 or a same-site redirect, never 500 or reflected', async () => {
  const app = await start();
  const hostile = [
    '/clases/..', '/clases/%2e%2e', '/clases/..%2f..%2fetc%2fpasswd', '/clases/%2fetc', '/clases/fuego%00', '/clases/fuego%2f', '/clases/<script>',
    '/clases/%3Cscript%3Ealert(1)%3C%2Fscript%3E', `/clases/${'a'.repeat(5000)}`, `/${'n'.repeat(8000)}`, '/nosotros%2f', '/nosotros%00', '/nosotros%0d%0aSet-Cookie:x=1',
    '/%2e%2e/%2e%2e/etc/passwd', '/legal/..%2fterminos', '/legal/%2e%2e', '/site/..', '/site/../etc/passwd', '/site/%2f%2fevil.example', '/site//evil.example', '/site/classes/%2f%2fevil',
    '/sitemap.xml/..', '/robots.txt%00', '/clases/fu%C3%A9go', '/clases/%ff',
  ];
  for (const path of hostile) {
    const r = await app.call('GET', path);
    assert.ok(r.status === 404 || r.status === 301 || r.status === 400, `${path}: ${r.status}`);
    if (r.headers.location) assert.match(r.headers.location, /^\/(?!\/)[A-Za-z0-9/_.-]*$/, `${path}: ${r.headers.location}`);
    assert.equal(r.headers['set-cookie'], undefined, path);
    assert.ok(!r.text.includes('<script>alert'), `${path}: reflected`);
  }
  for (const path of ['//evil.example', '//evil.example/nosotros', '///nosotros']) {
    const r = await app.call('GET', path);
    assert.ok(r.headers.location === undefined || !/^\/\/|^https?:/i.test(r.headers.location), `${path}: ${r.headers.location}`);
  }
});

// ---------------------------------------------------------------------------------------------
// sitemap.xml and robots.txt
// ---------------------------------------------------------------------------------------------
await test('sitemap.xml lists every public path and every class page on the apex, once', async () => {
  const r = await (await start()).call('GET', '/sitemap.xml');
  assert.equal(r.status, 200);
  assert.match(r.headers['content-type'], /^application\/xml/);
  assert.match(r.text, /^<\?xml version="1\.0" encoding="UTF-8"\?>\s*<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.match(r.text, /<\/urlset>\s*$/);
  const locs = [...r.text.matchAll(/<url>\s*<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const expected = [...Object.keys(PUBLIC), ...CLASS_SLUGS.map((s) => `/clases/${s}`)].map((p) => `${ORIGIN}${p}`);
  assert.deepEqual([...locs].sort(), [...expected].sort());
  assert.equal(new Set(locs).size, locs.length);
  assert.equal([...r.text.matchAll(/<url>/g)].length, locs.length, 'every <url> has its <loc>');
});

await test('robots.txt (production): the sitemap line; /app, /hub and the API disallowed; the site allowed', async () => {
  const r = await (await start()).call('GET', '/robots.txt');
  assert.equal(r.status, 200);
  assert.match(r.headers['content-type'], /^text\/plain/);
  const lines = r.text.split('\n').map((l) => l.trim());
  assert.equal(lines[0], 'User-agent: *');
  for (const path of ['/app', '/hub', '/api/', '/files/', '/private-docs/']) assert.ok(lines.includes(`Disallow: ${path}`), path);
  assert.ok(!lines.includes('Disallow: /'), 'the site itself is open');
  assert.ok(lines.includes(`Sitemap: ${ORIGIN}/sitemap.xml`));
});

await test('before go-live nothing is offered for indexing: robots says Disallow: / and the sitemap has no URL', async () => {
  for (const env of [{ SITE_LIVE: 'false' }, { SITE_LIVE: '', SITE_LIVE_AT: '2026-11-13T06:00:00-05:00' }]) {
    const app = await start(env);
    const robots = await app.call('GET', '/robots.txt');
    assert.equal(robots.status, 200);
    assert.ok(robots.text.split('\n').map((l) => l.trim()).includes('Disallow: /'), JSON.stringify(env));
    assert.ok(!/Sitemap:/.test(robots.text), JSON.stringify(env));
    const map = await app.call('GET', '/sitemap.xml');
    assert.equal(map.status, 200);
    assert.match(map.text, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
    assert.equal([...map.text.matchAll(/<url>/g)].length, 0, JSON.stringify(env));
  }
  // Reached by SITE_LIVE_AT: open.
  const live = await start({ SITE_LIVE: '', SITE_LIVE_AT: '2026-11-12T06:00:00-05:00' });
  assert.ok(!(await live.call('GET', '/robots.txt')).text.split('\n').map((l) => l.trim()).includes('Disallow: /'));
});

await test('robots.txt outside production disallows everything', async () => {
  const r = await (await start({ HOY_ENV: 'local' })).call('GET', '/robots.txt');
  assert.equal(r.status, 200);
  assert.ok(r.text.split('\n').map((l) => l.trim()).includes('Disallow: /'));
});

// ---------------------------------------------------------------------------------------------
// The test site: noindex everywhere
// ---------------------------------------------------------------------------------------------
await test('test site: every answer (gate, pages, sitemap, robots, redirects) says noindex', async () => {
  const app = await start(GATED);
  const closed = await app.call('GET', '/planes');
  assert.equal(closed.status, 401, 'the gate still runs first');
  assert.equal(closed.headers['x-robots-tag'], 'noindex, nofollow');
  // With the gate's cookie the page answers, still noindex.
  const { createHmac, createHash } = await import('node:crypto');
  const exp = NOW + 86_400_000;
  const sig = createHmac('sha256', SECRET).update(`gate|https://test.hoyhumanclub.com|${createHash('sha256').update(PASS).digest('hex')}|${exp}`).digest('hex');
  const cookie = `hoy_test_gate=${exp}.${sig}`;
  for (const path of ['/planes', '/', '/clases/fuego', '/sitemap.xml', '/robots.txt', '/site/plans', '/nope']) {
    const r = await app.call('GET', path, { cookie });
    assert.notEqual(r.status, 401, path);
    assert.equal(r.headers['x-robots-tag'], 'noindex, nofollow', path);
  }
});

// ---------------------------------------------------------------------------------------------
// www → apex
// ---------------------------------------------------------------------------------------------
await test('a request on www answers 301 to the same path on the apex', async () => {
  const app = await start();
  for (const [path, to] of [['/planes?x=1', `${ORIGIN}/planes?x=1`], ['/', `${ORIGIN}/`], ['/#/app', `${ORIGIN}/`], ['/assets/index-abc123.js', `${ORIGIN}/assets/index-abc123.js`]]) {
    const r = await app.call('GET', path, { host: 'www.hoyhumanclub.com' });
    assert.equal(r.status, 301, path);
    assert.equal(r.headers.location, to, path);
  }
  assert.equal((await app.call('GET', '/planes', { host: 'www.hoyhumanclub.com:443' })).headers.location, `${ORIGIN}/planes`);
  // Not www, or not a host name: served as usual.
  for (const host of ['hoyhumanclub.com', 'test.hoyhumanclub.com', 'wwwhoy.example', 'www.', 'www..evil', 'www.evil.example/x', 'www.evil.example', 'www.hoyhumanclub.com.evil.example', 'www.test.hoyhumanclub.com']) {
    const r = await app.call('GET', '/planes', { host });
    // Only the indexed host's www (or the configured site's) redirects; anything else is served as usual.
    assert.notEqual(r.status, 301, host);
    assert.equal(r.status, 200, host);
  }
  // A path that would leave the site after the host goes to the apex root instead.
  const odd = await app.call('GET', '//evil.example/x', { host: 'www.hoyhumanclub.com' });
  assert.equal(odd.status, 301);
  assert.equal(odd.headers.location, `${ORIGIN}/`);
});

await test('www on the test site redirects too, before the gate: privately cached, noindex', async () => {
  const app = await start(GATED);
  const r = await app.call('GET', '/planes', { host: 'www.test.hoyhumanclub.com' });
  assert.equal(r.status, 301);
  assert.equal(r.headers.location, 'https://test.hoyhumanclub.com/planes');
  assert.match(r.headers['cache-control'] ?? '', /^private\b/);
  assert.equal(r.headers['x-robots-tag'], 'noindex, nofollow');
  const evil = await app.call('GET', '/planes', { host: 'www.evil.example' });
  assert.notEqual(evil.status, 301, 'not the configured host: no redirect');
});

await test('www on production: publicly cacheable, no noindex', async () => {
  const r = await (await start()).call('GET', '/planes', { host: 'www.hoyhumanclub.com' });
  assert.match(r.headers['cache-control'] ?? '', /^public\b/);
  assert.equal(r.headers['x-robots-tag'], undefined);
});

// ---------------------------------------------------------------------------------------------
// The app is unchanged
// ---------------------------------------------------------------------------------------------
await test('the app\'s own server routes are unchanged (index, assets, app-config, API, health)', async () => {
  const app = await start({ SITE_LIVE: 'false' });
  assert.equal((await app.call('GET', '/')).text, INDEX);
  assert.equal((await app.call('GET', '/index.html')).status, 200);
  assert.equal((await app.call('GET', '/assets/index-abc123.js')).status, 200);
  assert.equal((await app.call('GET', '/app-config.json')).status, 200);
  assert.equal((await app.call('GET', '/health')).status, 200);
  assert.equal((await app.call('GET', '/api/cos/t/hoy-dev/me')).status, 401);
  assert.equal((await app.call('GET', '/api/nope')).status, 404);
});

// ---------------------------------------------------------------------------------------------
// The production build: one <base href="/"> on every page, so the app's relative assets (./images, ./brand) resolve
// from the root after the browser moves to /clases/fuego, whichever page it started on
// ---------------------------------------------------------------------------------------------
await test('production build: /, the live home and /clases/fuego carry one <base href="/"> before any relative URL', async () => {
  const prodDist = process.env.QA_PROD_DIST ?? new URL('../dist', import.meta.url).pathname;
  const built = await readFile(join(prodDist, 'index.html'), 'utf8').catch(() => null);
  assert.ok(built, `no production build at ${prodDist}: run npm run build:production first`);
  assert.ok(!(await readFile(join(prodDist, 'hub-map.json')).catch(() => null)), `${prodDist} is the review build (hub-map.json): this check reads the production build`);
  const check = (html, what) => {
    assert.equal([...html.matchAll(/<base\b[^>]*>/g)].length, 1, `${what}: one <base>`);
    const base = html.search(/<base href="\/"\s*\/?>/);
    assert.ok(base >= 0, `${what}: <base href="/">`);
    const relative = html.search(/(?:src|href)="\.\//);
    assert.ok(relative === -1 || base < relative, `${what}: the base comes before the first ./ URL`);
  };
  for (const [env, path] of [[{ SITE_LIVE: 'false' }, '/'], [{ SITE_LIVE: 'true' }, '/'], [{ SITE_LIVE: 'false' }, '/clases/fuego'], [{ SITE_LIVE: 'false' }, '/legal/terminos']]) {
    const config = loadConfig({ ...BASE_ENV, ...env, DIST_DIR: prodDist });
    const server = createHoyServer(await createHandler(config, { verifySession: async () => { throw new Error('none'); }, log: () => {}, now: () => NOW }));
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    servers.push(server);
    const r = await request(server, 'GET', path, {});
    assert.equal(r.status, 200, path);
    check(r.text, `${path} ${JSON.stringify(env)}`);
  }
});

await test('the FAQ index links are real addresses (/preguntas#faq-<key>), not a bare #fragment that the root base would send home', async () => {
  const source = await readFile(new URL('../src/modules/website/pages/FaqPage.tsx', import.meta.url), 'utf8');
  assert.ok(!/href=\{`#faq-/.test(source), 'a bare #faq- href');
  assert.ok(/\/preguntas#faq-|cleanPathOf\('\/site\/faq'\)/.test(source), 'the FAQ path in the href');
});

// ---------------------------------------------------------------------------------------------
// The browser's path map (src/modules/website/paths.ts), the same table as the server's
// ---------------------------------------------------------------------------------------------
await test('path map: every website route has a clean path, and the map round-trips', async () => {
  assert.ok(!paths.missing, `paths.ts: ${paths.missing?.message}`);
  const source = await readFile(new URL('../src/modules/website/index.ts', import.meta.url), 'utf8');
  const routes = [...source.matchAll(/path: '([^']+)'/g)].map((m) => m[1]);
  assert.ok(routes.length >= 13);
  for (const route of routes) {
    const sample = route.replace(':slug', 'fuego');
    const clean = paths.cleanPathOf(sample);
    assert.ok(clean, route);
    // `/` maps back to the root entry, which shows the home once live (SW-08); checked below.
    assert.equal(paths.internalPathOf(clean), sample === '/site' ? '/' : sample, route);
  }
  for (const [from, to] of Object.entries(LEGACY)) assert.equal(paths.cleanPathOf(from), to, from);
  assert.equal(paths.internalPathOf('/'), '/', 'the root stays the root entry (Coming Soon until go-live)');
  for (const app of ['/app', '/app/home', '/auth/sign-in', '/coming-soon', '/hub', '/staff']) assert.equal(paths.cleanPathOf(app), null, app);
  for (const unknown of ['/foo', '/NOSOTROS', '/app', '/clases/x/y']) assert.equal(paths.internalPathOf(unknown), null, unknown);
});

await test('path map: the server and the browser use the same table', async () => {
  assert.ok(!seo.missing, `seo.mjs: ${seo.missing?.message}`);
  assert.ok(!paths.missing, `paths.ts: ${paths.missing?.message}`);
  assert.deepEqual(seo.SITE_PATHS.map(([a, b]) => [a, b]), paths.SITE_PATHS.map(([a, b]) => [a, b]));
});

await test('boot: which router a URL gets (production), and the old /#/site/x moving to its clean path', async () => {
  assert.ok(!paths.missing, `paths.ts: ${paths.missing?.message}`);
  const boot = (pathname, hash) => paths.bootRoute(pathname, hash, true);
  assert.deepEqual(boot('/', ''), { mode: 'path' });
  assert.deepEqual(boot('/nosotros', ''), { mode: 'path' });
  assert.deepEqual(boot('/clases/fuego', '#'), { mode: 'path' });
  assert.deepEqual(boot('/', '#/'), { mode: 'hash' });
  assert.deepEqual(boot('/', '#/app/home'), { mode: 'hash' });
  assert.deepEqual(boot('/', '#/auth/sign-in?next=/app/plans'), { mode: 'hash' });
  assert.deepEqual(boot('/', '#/coming-soon'), { mode: 'hash' });
  assert.deepEqual(boot('/', '#/site'), { mode: 'path', replace: '/' });
  assert.deepEqual(boot('/', '#/site/plans'), { mode: 'path', replace: '/planes' });
  assert.deepEqual(boot('/', '#/site/schedule?modality=fuego'), { mode: 'path', replace: '/horario?modality=fuego' });
  assert.deepEqual(boot('/', '#/site/classes/fuego'), { mode: 'path', replace: '/clases/fuego' });
  // A hash route wins over the path it sits on (the app's links are /#/…).
  assert.deepEqual(boot('/nosotros', '#/app/home'), { mode: 'hash' });
  // The review build (GitHub Pages, no server) keeps hash routes everywhere.
  assert.deepEqual(paths.bootRoute('/', '#/site/plans', false), { mode: 'hash' });
  assert.deepEqual(paths.bootRoute('/', '', false), { mode: 'hash' });
});

await test('hrefs: a website link is its clean path, an app link goes to /#/…', async () => {
  assert.ok(!paths.missing, `paths.ts: ${paths.missing?.message}`);
  assert.equal(paths.hrefOf({ pathname: '/site/plans', search: '?version=latest', hash: '' }), '/planes?version=latest');
  assert.equal(paths.hrefOf({ pathname: '/site', search: '', hash: '' }), '/');
  assert.equal(paths.hrefOf({ pathname: '/site/classes/fuego', search: '', hash: '#top' }), '/clases/fuego#top');
  assert.equal(paths.hrefOf({ pathname: '/app/checkout/abc', search: '?x=1', hash: '' }), '/#/app/checkout/abc?x=1');
  assert.equal(paths.hrefOf({ pathname: '/auth/sign-in', search: '?next=/app/plans', hash: '' }), '/#/auth/sign-in?next=/app/plans');
  assert.equal(paths.hrefOf({ pathname: '/', search: '', hash: '' }), '/');
});

await test('the server\'s class list and fallback contact match the app\'s (brand.ts, tenant.ts)', async () => {
  assert.ok(!seo.missing, `seo.mjs: ${seo.missing?.message}`);
  assert.deepEqual(seo.CLASSES.map((c) => c.slug), [...brand.classOrder]);
  for (const c of seo.CLASSES) assert.equal(c.name, brand.classes[c.slug].name.es, c.slug);
  const tenantSource = await readFile(new URL('../src/tenant/tenant.ts', import.meta.url), 'utf8');
  for (const value of [seo.FALLBACK.whatsapp, seo.FALLBACK.address, seo.FALLBACK.email, seo.FALLBACK.instagramUrl, seo.FALLBACK.city]) {
    assert.ok(tenantSource.includes(`'${value}'`), value);
  }
});

// ---------------------------------------------------------------------------------------------
for (const s of servers) s.close();
upstream.close();
let failed = 0;
for (const [mark, name, err] of results) {
  console.log(`${mark} ${name}`);
  if (err) {
    failed += 1;
    console.log(`   ${String(err?.stack ?? err).split('\n').slice(0, 4).join('\n   ')}`);
  }
}
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
