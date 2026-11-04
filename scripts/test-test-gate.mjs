// The test site's passphrase gate (Company OS playbook rule D5, server/testGate.mjs), through the real Hoy server: a
// fake Company OS records what gets past it, the clock and the environment are injected. The cookie is computed here
// from the contract, not with the server's code, so a change to what it is bound to shows up.
// Needs `npm ci --prefix server`. Run: node scripts/test-test-gate.mjs
import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHandler, createHoyServer } from '../server/app.mjs';
import { findSecrets } from '../server/check-bundle.mjs';
import { loadConfig } from '../server/config.mjs';

// Dynamic, so that without the module each check below fails by name instead of the whole file failing to load.
const gateModule = await import('../server/testGate.mjs').catch(() => ({}));

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
// Fixtures
// ---------------------------------------------------------------------------------------------
const NOW = Date.UTC(2026, 10, 4, 12);
const DAY = 86_400_000;
const WINDOW = 15 * 60_000;
const COOKIE_NAME = 'hoy_test_gate';
const PASS = 'correct horse battery';
const SECRET = 's'.repeat(64);
const ORIGIN = 'https://test.hoy.example';
const GOOD = 'good.session.token';
const APP_MARKER = '/assets/index-abc123.js';

const root = await mkdtemp(join(tmpdir(), 'hoy-gate-'));
const dist = join(root, 'dist');
await mkdir(join(dist, 'assets'), { recursive: true });
await writeFile(join(dist, 'index.html'), `<!doctype html><title>Hoy</title><script type="module" src="${APP_MARKER}"></script>`);
await writeFile(join(dist, 'assets', 'index-abc123.js'), 'console.log("the app");\n');

/** Every request that reached the fake Company OS. */
const seen = [];
const upstream = http.createServer((req, res) => {
  req.resume();
  req.on('end', () => {
    seen.push({ method: req.method, url: req.url, headers: req.headers });
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  });
});
await new Promise((r) => upstream.listen(0, '127.0.0.1', r));

const BASE_ENV = {
  COMPANY_OS_URL: `http://127.0.0.1:${upstream.address().port}`,
  COMPANY_OS_TENANT: 'hoy-dev',
  CLERK_SECRET_KEY: 'sk_test_example',
  CLERK_PUBLISHABLE_KEY: 'pk_test_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5kZXYk',
  RAILWAY_ENVIRONMENT_NAME: 'test',
  DIST_DIR: dist,
};
const GATED = { TEST_GATE_PASSPHRASE: PASS, COOKIE_SIGNING_SECRET: SECRET, APP_URL: ORIGIN };

const fakeVerify = async (token) => {
  if (token !== GOOD) throw new Error('invalid');
  return { userId: 'user_1' };
};

const servers = [];
/** A server on these settings, with its own clock (and so its own count of wrong tries). */
async function start(env = GATED, clock = { now: NOW }) {
  const config = loadConfig({ ...BASE_ENV, ...env });
  const server = createHoyServer(await createHandler(config, { verifySession: fakeVerify, log: () => {}, now: () => clock.now }));
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  servers.push(server);
  return { clock, call: (method, path, headers = {}, body) => request(server, method, path, headers, body) };
}

function request(server, method, path, headers, body) {
  return new Promise((done, fail) => {
    const req = http.request({ host: '127.0.0.1', port: server.address().port, method, path, headers, agent: false }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => done({ status: res.statusCode, headers: res.headers, text: Buffer.concat(chunks).toString() }));
      res.on('error', fail);
    });
    req.on('error', fail);
    if (Array.isArray(body)) {
      for (const part of body) req.write(part);
      req.end();
    } else {
      req.end(body);
    }
  });
}

const FORM = { 'content-type': 'application/x-www-form-urlencoded' };
const IP = '203.0.113.7';
const post = (app, fields, ip = IP, extra = {}) =>
  app.call('POST', '/test-gate', { ...FORM, 'x-real-ip': ip, ...extra }, new URLSearchParams(fields).toString());

const sha256 = (s) => createHash('sha256').update(s).digest('hex');
/** The contract: HMAC-SHA256 over the site's origin, the passphrase's hash and the expiry. */
const signature = ({ passphrase = PASS, secret = SECRET, origin = ORIGIN, exp }) =>
  createHmac('sha256', secret).update(`gate|${origin}|${sha256(passphrase)}|${exp}`).digest('hex');
const cookieFor = (o = {}) => {
  const exp = o.exp ?? NOW + DAY;
  return `${COOKIE_NAME}=${exp}.${signature({ ...o, exp })}`;
};
const setCookie = (r) => (r.headers['set-cookie'] ?? [])[0] ?? '';

const assertGatePage = (r, status = 401) => {
  assert.equal(r.status, status);
  assert.match(r.headers['content-type'], /^text\/html/);
  assert.match(r.text, /<form[^>]*method="post"[^>]*action="\/test-gate"/);
  assert.equal(setCookie(r), '');
};
const assertGateJson = (r) => {
  assert.equal(r.status, 401);
  assert.match(r.headers['content-type'], /^application\/json/);
  assert.deepEqual(JSON.parse(r.text), { error: 'test_gate' });
};

// ---------------------------------------------------------------------------------------------
// Off
// ---------------------------------------------------------------------------------------------
for (const [what, env] of [
  ['no passphrase set', {}],
  ['an empty passphrase', { TEST_GATE_PASSPHRASE: '', COOKIE_SIGNING_SECRET: SECRET }],
  ['a signing secret alone', { COOKIE_SIGNING_SECRET: SECRET }],
  ['production, even with a passphrase and a secret', { ...GATED, RAILWAY_ENVIRONMENT_NAME: 'production' }],
  ['production, with a passphrase and no secret', { TEST_GATE_PASSPHRASE: PASS, APP_URL: ORIGIN, RAILWAY_ENVIRONMENT_NAME: 'production' }],
]) {
  await test(`off with ${what}: every path answers as before, nothing says noindex`, async () => {
    const app = await start(env);
    const page = await app.call('GET', '/');
    assert.equal(page.status, 200);
    assert.ok(page.text.includes(APP_MARKER));
    assert.equal(page.headers['x-robots-tag'], undefined);
    assert.equal((await app.call('GET', '/health')).status, 200);
    assert.equal((await app.call('GET', '/app-config.json')).status, 200);
    seen.length = 0;
    const api = await app.call('GET', '/api/cos/t/hoy-dev/me', { authorization: `Bearer ${GOOD}` });
    assert.equal(api.status, 200);
    assert.equal(seen.length, 1);
    assert.equal((await app.call('POST', '/test-gate', FORM, 'passphrase=x')).status, 405, 'the gate has no form while it is off');
  });
}

// ---------------------------------------------------------------------------------------------
// Half configured
// ---------------------------------------------------------------------------------------------
await test('half configured: a passphrase without a signing secret answers 503 on gated paths and never opens the site', async () => {
  const app = await start({ TEST_GATE_PASSPHRASE: PASS, APP_URL: ORIGIN });
  seen.length = 0;
  for (const [method, path] of [['GET', '/'], ['GET', '/app-config.json'], [`GET`, '/assets/index-abc123.js'], ['GET', '/api/cos/t/hoy-dev/me'], ['GET', '/files/x'], ['GET', '/private-docs/docs.json'], ['POST', '/test-gate']]) {
    const r = await app.call(method, path, { authorization: `Bearer ${GOOD}` });
    assert.equal(r.status, 503, `${method} ${path}`);
    assert.equal(r.headers['x-robots-tag'], 'noindex, nofollow');
    assert.ok(!r.text.includes(APP_MARKER));
  }
  const right = await post(app, { passphrase: PASS });
  assert.equal(right.status, 503);
  assert.equal(setCookie(right), '');
  assert.equal(seen.length, 0);
});

await test('half configured: /health still answers, and the webhook still reaches the forwarder', async () => {
  const app = await start({ TEST_GATE_PASSPHRASE: PASS, APP_URL: ORIGIN });
  assert.equal((await app.call('GET', '/health')).status, 200);
  assert.equal((await app.call('POST', '/webhooks/resend', {}, '')).status, 400);
});

// ---------------------------------------------------------------------------------------------
// No cookie
// ---------------------------------------------------------------------------------------------
await test('no cookie: a page gets 401 with the passphrase form in Spanish and English, never cached or indexed, no app bundle', async () => {
  const app = await start();
  const r = await app.call('GET', '/');
  assertGatePage(r);
  assert.equal(r.headers['x-robots-tag'], 'noindex, nofollow');
  assert.equal(r.headers['cache-control'], 'no-store');
  assert.match(r.headers['content-security-policy'] ?? '', /default-src 'none'/);
  assert.match(r.text, /Frase de acceso/);
  assert.match(r.text, /Passphrase/);
  assert.ok(!r.text.includes(APP_MARKER));
  assert.doesNotMatch(r.text, /<script/i);
  assert.match(r.text, /name="next" value="\/"/);
});

await test('no cookie: the app\'s files and settings are gated too, and the form keeps the address asked for', async () => {
  const app = await start();
  assert.ok(!(await app.call('GET', '/assets/index-abc123.js')).text.includes('the app'));
  const settings = await app.call('GET', '/app-config.json');
  assertGatePage(settings);
  assert.ok(!settings.text.includes('pk_test_'));
  const deep = await app.call('GET', '/website/?a=1&b=2');
  assertGatePage(deep);
  assert.ok(deep.text.includes('name="next" value="/website/?a=1&#38;b=2"'), deep.text);
  assertGatePage(await app.call('POST', '/', FORM, 'a=1'));
  assertGatePage(await app.call('GET', '/test-gate'));
  assertGatePage(await app.call('PUT', '/test-gate', FORM, `passphrase=${encodeURIComponent(PASS)}`));
});

await test('no cookie: HEAD gets the status without a body', async () => {
  const app = await start();
  const r = await app.call('HEAD', '/');
  assert.equal(r.status, 401);
  assert.equal(r.text, '');
});

await test('no cookie: /api/, /files/ and /private-docs/ get 401 JSON, and a valid Clerk session does not get past it', async () => {
  const app = await start();
  seen.length = 0;
  for (const path of ['/api/cos/t/hoy-dev/me', '/api/other', '/files/x', '/private-docs/docs.json', '/api', '/files', '/private-docs']) {
    const r = await app.call('GET', path, { authorization: `Bearer ${GOOD}` });
    assertGateJson(r);
    assert.equal(r.headers['x-robots-tag'], 'noindex, nofollow');
    assert.equal(r.headers['cache-control'], 'no-store');
  }
  assertGateJson(await app.call('POST', '/api/cos/t/hoy-dev/batch', { authorization: `Bearer ${GOOD}`, 'content-type': 'application/json' }, '{}'));
  assert.equal(seen.length, 0);
});

// ---------------------------------------------------------------------------------------------
// Exempt paths
// ---------------------------------------------------------------------------------------------
await test('exempt: /health answers without a cookie, and says noindex', async () => {
  const app = await start();
  const r = await app.call('GET', '/health');
  assert.equal(r.status, 200);
  assert.equal(JSON.parse(r.text).ok, true);
  assert.equal(r.headers['x-robots-tag'], 'noindex, nofollow');
  assert.equal((await app.call('HEAD', '/health')).status, 200);
});

await test('exempt: POST /webhooks/resend reaches the forwarder without a cookie; no body and no signature answers 400, not 401', async () => {
  const app = await start();
  seen.length = 0;
  const r = await app.call('POST', '/webhooks/resend', { 'content-type': 'application/json', 'svix-id': 'a', 'svix-timestamp': '1', 'svix-signature': 'v1,x' }, '{}');
  assert.equal(r.status, 200);
  assert.equal(r.headers['x-robots-tag'], 'noindex, nofollow');
  assert.deepEqual(seen.map((s) => [s.method, s.url]), [['POST', '/webhooks/messaging/resend']]);
  assert.equal((await app.call('POST', '/webhooks/resend', {}, '')).status, 400);
});

await test('exempt paths are exact: their neighbours, other methods and traversal stay gated', async () => {
  const app = await start();
  seen.length = 0;
  for (const [method, path] of [
    ['GET', '/webhooks/resend'], ['POST', '/webhooks/resend/'], ['POST', '/webhooks/resend/x'], ['POST', '/webhooks/other'],
    ['GET', '/health/'], ['GET', '/health/x'], ['GET', '/healthz'], ['GET', '//health'], ['GET', '/health/../app-config.json'],
    ['POST', '/webhooks/resend/../../api/cos/t/hoy-dev/me'], ['GET', '/%68ealth'], ['GET', '/email/logo.png'],
  ]) {
    const r = await app.call(method, path, method === 'POST' ? { 'svix-id': 'a', 'svix-timestamp': '1', 'svix-signature': 'v1,x' } : {});
    assert.equal(r.status, 401, `${method} ${path}`);
  }
  assert.equal(seen.length, 0);
});

// ---------------------------------------------------------------------------------------------
// The right passphrase
// ---------------------------------------------------------------------------------------------
await test('right passphrase: a 303 to next and a signed cookie, HttpOnly, Secure, SameSite=Lax, 30 days', async () => {
  const app = await start();
  const r = await post(app, { passphrase: PASS, next: '/website/?a=1' });
  assert.equal(r.status, 303);
  assert.equal(r.headers.location, '/website/?a=1');
  assert.equal(r.headers['x-robots-tag'], 'noindex, nofollow');
  assert.equal(r.headers['cache-control'], 'no-store');
  const cookie = setCookie(r);
  assert.equal(cookie.split(';')[0], cookieFor({ exp: NOW + 30 * DAY }), 'bound to the origin, the passphrase\'s hash and the expiry');
  const flags = cookie.split(';').slice(1).map((s) => s.trim());
  for (const flag of ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/', `Max-Age=${30 * 86_400}`]) assert.ok(flags.includes(flag), `${flag} in ${cookie}`);
  assert.ok(!cookie.includes(PASS));
});

await test('with the cookie: a page answers 200 (still noindex); /api/cos reaches the proxy, where Clerk still decides', async () => {
  const app = await start();
  const cookie = setCookie(await post(app, { passphrase: PASS })).split(';')[0];
  const page = await app.call('GET', '/', { cookie });
  assert.equal(page.status, 200);
  assert.ok(page.text.includes(APP_MARKER));
  assert.equal(page.headers['x-robots-tag'], 'noindex, nofollow');
  assert.equal((await app.call('GET', '/app-config.json', { cookie })).status, 200);
  assert.equal((await app.call('GET', '/assets/index-abc123.js', { cookie })).status, 200);

  seen.length = 0;
  const anonymous = await app.call('GET', '/api/cos/t/hoy-dev/me', { cookie });
  assert.equal(anonymous.status, 401);
  assert.deepEqual(JSON.parse(anonymous.text), { error: 'unauthorized' }, 'the proxy\'s own answer, not the gate\'s');
  const wrong = await app.call('GET', '/api/cos/t/hoy-dev/me', { cookie, authorization: 'Bearer nope' });
  assert.deepEqual(JSON.parse(wrong.text), { error: 'unauthorized' });
  assert.equal(seen.length, 0, 'the gate\'s cookie opens no data');
  const signedIn = await app.call('GET', '/api/cos/t/hoy-dev/me', { cookie, authorization: `Bearer ${GOOD}` });
  assert.equal(signedIn.status, 200);
  assert.equal(signedIn.headers['x-robots-tag'], 'noindex, nofollow');
  assert.equal(seen.length, 1);
  assert.equal(seen[0].headers.cookie, undefined, 'the gate\'s cookie never reaches Company OS');
});

await test('with the cookie: a valid one among other cookies counts; the form\'s address sends you home', async () => {
  const app = await start();
  assert.equal((await app.call('GET', '/', { cookie: `a=1; ${cookieFor()}; b=2` })).status, 200);
  const again = await app.call('GET', '/test-gate', { cookie: cookieFor() });
  assert.equal(again.status, 303);
  assert.equal(again.headers.location, '/');
});

await test('APP_URL is reduced to its origin: a trailing slash signs the same cookie', async () => {
  const app = await start({ ...GATED, APP_URL: `${ORIGIN}/` });
  assert.equal((await app.call('GET', '/', { cookie: cookieFor() })).status, 200);
});

// ---------------------------------------------------------------------------------------------
// Wrong passphrases
// ---------------------------------------------------------------------------------------------
await test('wrong passphrase: 401, the form again, no cookie', async () => {
  const app = await start();
  const r = await post(app, { passphrase: 'nope', next: '/website/' });
  assertGatePage(r);
  assert.match(r.text, /name="next" value="\/website\/"/);
  assert.match(r.text, /role="alert"/);
});

await test('five wrong tries from one address, then 429, even with the right passphrase; another address is unaffected', async () => {
  const app = await start();
  for (let i = 0; i < 5; i++) assert.equal((await post(app, { passphrase: `nope ${i}` })).status, 401, `try ${i + 1}`);
  const sixth = await post(app, { passphrase: 'nope' });
  assertGatePage(sixth, 429);
  assert.equal(sixth.headers['x-robots-tag'], 'noindex, nofollow');
  const right = await post(app, { passphrase: PASS });
  assert.equal(right.status, 429);
  assert.equal(setCookie(right), '');
  assert.equal((await post(app, { passphrase: PASS }, '198.51.100.9')).status, 303);
});

await test('the window resets after 15 minutes (fake clock), and tries older than it stop counting', async () => {
  const app = await start();
  for (let i = 0; i < 5; i++) assert.equal((await post(app, { passphrase: 'nope' })).status, 401);
  app.clock.now = NOW + WINDOW - 1;
  assert.equal((await post(app, { passphrase: PASS })).status, 429);
  app.clock.now = NOW + WINDOW;
  assert.equal((await post(app, { passphrase: 'nope' })).status, 401, 'the earlier five no longer count');
  assert.equal((await post(app, { passphrase: PASS })).status, 303);
});

await test('the address is the edge\'s X-Real-IP: rotating a browser-written X-Forwarded-For does not get more tries', async () => {
  const app = await start();
  for (let i = 0; i < 5; i++) assert.equal((await post(app, { passphrase: 'nope' }, IP, { 'x-forwarded-for': `10.0.0.${i}` })).status, 401);
  assert.equal((await post(app, { passphrase: PASS }, IP, { 'x-forwarded-for': '10.0.0.99' })).status, 429);
});

await test('no X-Real-IP: the tries count against the connection\'s own address', async () => {
  const app = await start();
  const noHeader = (passphrase) => app.call('POST', '/test-gate', FORM, new URLSearchParams({ passphrase }).toString());
  for (let i = 0; i < 5; i++) assert.equal((await noHeader('nope')).status, 401);
  assert.equal((await noHeader('nope')).status, 429);
});

await test('the count of wrong tries is bounded: it can\'t grow without limit, and a long address is cut', async () => {
  const limiter = gateModule.createAttemptLimiter({ max: 2, windowMs: WINDOW, maxAddresses: 3 });
  for (let i = 0; i < 50; i++) limiter.fail(`address ${i}`, NOW);
  assert.ok(limiter.size() <= 3, `${limiter.size()} addresses kept`);
  assert.equal(limiter.blocked('address 49', NOW), false, 'one try is under the limit');
  limiter.fail('address 49', NOW);
  assert.equal(limiter.blocked('address 49', NOW), true);
  assert.equal(limiter.blocked('address 49', NOW + WINDOW), false);
  // Expired addresses make room before anyone still inside the window is dropped.
  const room = gateModule.createAttemptLimiter({ max: 1, windowMs: WINDOW, maxAddresses: 2 });
  room.fail('old', NOW);
  room.fail('recent', NOW + WINDOW - 1);
  room.fail('new', NOW + WINDOW);
  assert.equal(room.blocked('recent', NOW + WINDOW), true, 'still inside its window');
  assert.equal(room.blocked('new', NOW + WINDOW), true);
  assert.equal(room.size(), 2);
});

// ---------------------------------------------------------------------------------------------
// Which cookies count
// ---------------------------------------------------------------------------------------------
for (const [what, make] of [
  ['expired', () => cookieFor({ exp: NOW - 1 })],
  ['expiring this very moment', () => cookieFor({ exp: NOW })],
  ['signed for an old passphrase', () => cookieFor({ passphrase: 'an old passphrase' })],
  ['signed with another secret', () => cookieFor({ secret: 't'.repeat(64) })],
  ['from another origin', () => cookieFor({ origin: 'https://elsewhere.example' })],
  ['with no origin in it', () => cookieFor({ origin: '' })],
  ['with a tampered expiry', () => cookieFor().replace(/=(\d+)\./, (_, d) => `=${Number(d) + 1}.`)],
  ['with a tampered signature', () => cookieFor().replace(/.$/, (c) => (c === '0' ? '1' : '0'))],
  ['with a signature in capitals', () => cookieFor().toUpperCase().replace(COOKIE_NAME.toUpperCase(), COOKIE_NAME)],
  ['with half a signature', () => cookieFor().slice(0, -32)],
  ['garbage', () => `${COOKIE_NAME}=not-a-cookie`],
  ['empty', () => `${COOKIE_NAME}=`],
  ['under another name', () => cookieFor().replace(COOKIE_NAME, `x${COOKIE_NAME}`)],
]) {
  await test(`a cookie ${what} is refused`, async () => {
    const app = await start();
    const cookie = make();
    assertGatePage(await app.call('GET', '/', { cookie }));
    assertGateJson(await app.call('GET', '/api/cos/t/hoy-dev/me', { cookie, authorization: `Bearer ${GOOD}` }));
  });
}

await test('a new passphrase signs everyone out; another site\'s APP_URL refuses this one\'s cookie', async () => {
  const before = await start();
  const cookie = setCookie(await post(before, { passphrase: PASS })).split(';')[0];
  assert.equal((await before.call('GET', '/', { cookie })).status, 200);
  assert.equal((await (await start({ ...GATED, TEST_GATE_PASSPHRASE: 'a brand new passphrase' })).call('GET', '/', { cookie })).status, 401);
  assert.equal((await (await start({ ...GATED, APP_URL: 'https://other.hoy.example' })).call('GET', '/', { cookie })).status, 401);
});

await test('the cookie ends after 30 days', async () => {
  const app = await start();
  const cookie = setCookie(await post(app, { passphrase: PASS })).split(';')[0];
  app.clock.now = NOW + 30 * DAY - 1;
  assert.equal((await app.call('GET', '/', { cookie })).status, 200);
  app.clock.now = NOW + 30 * DAY;
  assert.equal((await app.call('GET', '/', { cookie })).status, 401);
});

// ---------------------------------------------------------------------------------------------
// Hostile input
// ---------------------------------------------------------------------------------------------
for (const next of [
  'https://evil.example/', '//evil.example', '//evil.example/x', '/\\evil', '\\\\evil.example', 'evil.example', 'javascript:alert(1)',
  '/%2F%2Fevil.example/', '/%2fevil.example', '/%5Cevil.example/', '/a\r\nSet-Cookie: x=1', '/a%0d%0aSet-Cookie:%20x=1', '/\tevil', '/a b', '/é', '/%zz', '', `/${'a'.repeat(2100)}`,
]) {
  await test(`next ${JSON.stringify(next.slice(0, 40))} redirects home`, async () => {
    const r = await post(await start(), { passphrase: PASS, next });
    assert.equal(r.status, 303);
    assert.equal(r.headers.location, '/');
    assert.equal(r.headers['x-robots-tag'], 'noindex, nofollow');
    assert.equal((r.headers['set-cookie'] ?? []).length, 1, 'no header injected');
  });
}

await test('a next that is a path on this site is kept; none at all goes home', async () => {
  const app = await start();
  for (const next of ['/', '/website/', '/a/b.html?x=1&y=%20z']) assert.equal((await post(app, { passphrase: PASS, next })).headers.location, next);
  assert.equal((await post(app, { passphrase: PASS })).headers.location, '/');
});

await test('an over-long body gets 413, declared or chunked, and opens nothing', async () => {
  const app = await start();
  const declared = await post(app, { passphrase: PASS, next: `/${'a'.repeat(5000)}` });
  assert.equal(declared.status, 413);
  assert.equal(setCookie(declared), '');
  const chunked = await app.call('POST', '/test-gate', { ...FORM, 'x-real-ip': IP }, [`passphrase=${encodeURIComponent(PASS)}&next=/`, 'a'.repeat(3000), 'a'.repeat(3000)]);
  assert.equal(chunked.status, 413);
  assert.equal(setCookie(chunked), '');
  assert.ok(!declared.text.includes('aaaa'));
});

await test('a body at the limit is still read', async () => {
  const app = await start();
  const head = `passphrase=${encodeURIComponent(PASS)}&x=`;
  assert.equal((await app.call('POST', '/test-gate', { ...FORM, 'x-real-ip': IP }, head + 'a'.repeat(4096 - head.length))).status, 303);
});

await test('nothing typed is echoed: a passphrase with HTML never comes back, in the page or a header', async () => {
  const app = await start();
  const typed = '<script>alert("typed")</script>';
  const r = await post(app, { passphrase: typed, next: '/' });
  assert.equal(r.status, 401);
  assert.ok(!r.text.includes('typed'));
  assert.ok(!JSON.stringify(r.headers).includes('typed'));
  const locked = await start();
  for (let i = 0; i < 5; i++) await post(locked, { passphrase: 'nope' });
  assert.ok(!(await post(locked, { passphrase: typed })).text.includes('typed'));
});

await test('the address written into the form is escaped, from the path and from a posted next', async () => {
  const app = await start();
  const fromPath = await app.call('GET', '/p/"><script>x</script>');
  assert.doesNotMatch(fromPath.text, /<script/i);
  const posted = await post(app, { passphrase: 'nope', next: '/x"><script>y</script>' });
  assert.equal(posted.status, 401);
  assert.doesNotMatch(posted.text, /<script/i);
});

await test('a form that is not a form is a wrong try, not a crash', async () => {
  const app = await start();
  assert.equal((await app.call('POST', '/test-gate', { 'content-type': 'application/json', 'x-real-ip': IP }, '{"passphrase":"x"}')).status, 401);
  assert.equal((await app.call('POST', '/test-gate', { ...FORM, 'x-real-ip': IP }, '%%%&&&===')).status, 401);
  assert.equal((await app.call('POST', '/test-gate', { ...FORM, 'x-real-ip': IP }, '')).status, 401);
});

// ---------------------------------------------------------------------------------------------
// The settings and the bundle scan
// ---------------------------------------------------------------------------------------------
await test('gateSettings: on only with a passphrase, never on production', () => {
  const { gateSettings } = gateModule;
  assert.equal(gateSettings({}).on, false);
  assert.equal(gateSettings({ TEST_GATE_PASSPHRASE: PASS, COOKIE_SIGNING_SECRET: SECRET, RAILWAY_ENVIRONMENT_NAME: 'production' }).on, false);
  assert.equal(gateSettings({ TEST_GATE_PASSPHRASE: PASS, COOKIE_SIGNING_SECRET: SECRET, RAILWAY_ENVIRONMENT_NAME: 'test' }).on, true);
  assert.equal(gateSettings({ TEST_GATE_PASSPHRASE: PASS }).on, true, 'half configured is on: it answers 503');
  assert.equal(gateSettings({ TEST_GATE_PASSPHRASE: PASS, APP_URL: 'https://x.example/app' }).origin, 'https://x.example');
});

await test('the bundle scan knows the passphrase and the signing secret', async () => {
  const dirty = join(root, 'dirty');
  await mkdir(dirty, { recursive: true });
  await writeFile(join(dirty, 'a.js'), `const a="${PASS}";`);
  await writeFile(join(dirty, 'b.js'), `const b="${SECRET}";`);
  const found = (await findSecrets(dirty, { TEST_GATE_PASSPHRASE: PASS, COOKIE_SIGNING_SECRET: SECRET })).join('\n');
  assert.match(found, /a\.js: contains the value of TEST_GATE_PASSPHRASE/);
  assert.match(found, /b\.js: contains the value of COOKIE_SIGNING_SECRET/);
});

// ---------------------------------------------------------------------------------------------
for (const server of servers) server.close();
upstream.close();
await rm(root, { recursive: true, force: true });
for (const [mark, name, err] of results) {
  console.log(`${mark} ${name}`);
  if (err) console.log(`   ${err.stack ?? err}`);
}
const failed = results.filter(([m]) => m === '❌').length;
console.log(failed ? `\n${failed} of ${results.length} failed` : `\nAll ${results.length} test gate checks passed`);
process.exit(failed ? 1 : 0);
