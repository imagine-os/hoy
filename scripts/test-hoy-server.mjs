// The Hoy server (server/): static serving, the Company OS proxy (session check, token forwarding,
// refusal without a session, path and header hygiene), GET /files/<id> (the API decides, the bytes are
// streamed, the signed storage link never leaves the server), the Resend webhook's raw body, /health,
// /app-config.json, configuration checks and the bundle secret scan. A fake Company OS records what
// reaches it; the real @clerk/backend check runs against a locally signed token (networkless jwtKey).
// Needs `npm ci --prefix server`. Run: node scripts/test-hoy-server.mjs
import assert from 'node:assert/strict';
import { generateKeyPairSync, createSign } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import * as appModule from '../server/app.mjs';
import { ANONYMOUS_ROUTES, createHandler, createHoyServer, publicReadLimiter } from '../server/app.mjs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { clerkSessionVerifier } from '../server/clerk.mjs';
import { loadConfig } from '../server/config.mjs';
import { findSecrets } from '../server/check-bundle.mjs';

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
// Fixtures: a dist folder, a fake Company OS, a fake Clerk check
// ---------------------------------------------------------------------------------------------
const root = await mkdtemp(join(tmpdir(), 'hoy-server-'));
const dist = join(root, 'dist');
const bigJs = 'console.log("hoy");\n'.repeat(400);
const video = Buffer.from(Array.from({ length: 2000 }, (_, i) => i % 256));
await mkdir(join(dist, 'assets'), { recursive: true });
await mkdir(join(dist, 'website'), { recursive: true });
await writeFile(join(dist, 'index.html'), '<!doctype html><title>Hoy</title><div id="root"></div>');
await writeFile(join(dist, 'website', 'index.html'), '<!doctype html><title>Website</title>');
await writeFile(join(dist, 'assets', 'index-abc123.js'), bigJs);
await writeFile(join(dist, 'clip.mp4'), video);
await writeFile(join(dist, '.env'), 'CLERK_SECRET_KEY=sk_test_nope');
await writeFile(join(dist, 'release.json'), JSON.stringify({ version: '0.26.0', sourceCommit: 'a'.repeat(40) }));
await writeFile(join(root, 'outside.txt'), 'outside');

/** Every request the fake Company OS saw: method, url, headers, raw body bytes. */
const seen = [];
let upstreamReply = (req, res) => {
  res.writeHead(200, { 'content-type': 'application/json', 'set-cookie': 'x=1', 'access-control-allow-origin': '*', 'x-api': 'yes' });
  res.end(JSON.stringify({ ok: true }));
};
const upstream = http.createServer((req, res) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    seen.push({ method: req.method, url: req.url, headers: req.headers, body: Buffer.concat(chunks) });
    upstreamReply(req, res);
  });
});
await listen(upstream);

/** A fake object storage behind signed links: what it saw, and its answers by path. */
const storageSeen = [];
const SIGNED = 'sig-token-must-stay-on-the-server';
const receipt = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.alloc(1500, 7)]);
const storage = http.createServer((req, res) => {
  storageSeen.push({ url: req.url, headers: req.headers });
  const path = req.url.split('?')[0];
  if (path === '/obj/receipt.png') {
    res.writeHead(200, { 'content-type': 'image/png', 'content-length': receipt.length, 'set-cookie': 'sb=1', 'x-signed-url': req.url });
    return res.end(receipt);
  }
  if (path === '/obj/page.svg') {
    res.writeHead(200, { 'content-type': 'image/svg+xml' });
    return res.end('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
  }
  if (path === '/obj/declared-big') {
    res.writeHead(200, { 'content-type': 'image/jpeg', 'content-length': 5000 });
    return res.end(Buffer.alloc(5000));
  }
  if (path === '/obj/undeclared-big') {
    res.writeHead(200, { 'content-type': 'image/jpeg' });
    res.write(Buffer.alloc(3000));
    return setTimeout(() => res.end(Buffer.alloc(3000)), 20);
  }
  if (path === '/obj/trickle') {
    res.writeHead(200, { 'content-type': 'image/png' });
    const drip = setInterval(() => res.write(Buffer.alloc(10)), 50);
    return res.on('close', () => clearInterval(drip));
  }
  if (path === '/obj/slow') return setTimeout(() => res.end('late'), 2000).unref();
  res.writeHead(path === '/obj/gone' ? 404 : 500, { 'content-type': 'text/plain' });
  res.end(`no object at ${req.url}`);
});
await listen(storage);
const storageOrigin = `http://127.0.0.1:${storage.address().port}`;
const FILE_ID = '0b0f6e1c-3c6a-4c0e-9a51-6f3f2c1d9e01';
/** The fake Company OS answers the download-link route with `link(path)` for the given object. */
const linkTo = (object, status = 200, answer) => (req, res) => {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify(answer ?? { url: `${storageOrigin}/obj/${object}?token=${SIGNED}`, expiresIn: 60 }));
};

const GOOD = 'good.session.token';
const fakeVerify = async (token) => {
  if (token !== GOOD) throw new Error('invalid');
  return { userId: 'user_1' };
};

const config = loadConfig({
  COMPANY_OS_URL: `http://127.0.0.1:${upstream.address().port}`,
  COMPANY_OS_TENANT: 'hoy-dev',
  CLERK_SECRET_KEY: 'sk_test_example',
  CLERK_PUBLISHABLE_KEY: 'pk_test_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5kZXYk',
  HOY_ENV: 'local', // the fakes speak plain http, which only `local` may fetch files over
  DIST_DIR: dist,
  WEBHOOK_BODY_LIMIT_BYTES: '4096',
  PROXY_BODY_LIMIT_BYTES: '8192',
  UPSTREAM_TIMEOUT_MS: '500',
  FILE_SIZE_LIMIT_BYTES: '4096',
  FILE_TIMEOUT_MS: '500',
});
const logs = [];
const server = createHoyServer(await createHandler(config, { verifySession: fakeVerify, log: (e) => logs.push(e) }));
await listen(server);
const base = `http://127.0.0.1:${server.address().port}`;

// ---------------------------------------------------------------------------------------------
// Static serving
// ---------------------------------------------------------------------------------------------
await test('static: / serves dist/index.html, never cached stale', async () => {
  const r = await request('GET', '/');
  assert.equal(r.status, 200);
  assert.match(r.headers['content-type'], /^text\/html/);
  assert.equal(r.headers['cache-control'], 'no-cache');
  assert.match(r.body.toString(), /<title>Hoy<\/title>/);
  assert.equal(r.headers['x-content-type-options'], 'nosniff');
  assert.equal(r.headers['x-frame-options'], 'SAMEORIGIN');
  assert.equal(r.headers['content-security-policy'], "object-src 'none'; base-uri 'self'; frame-ancestors 'self'", 'the pages carry the baseline policy');
});

await test('static: a folder without its slash redirects (query kept), with it serves its index.html', async () => {
  const r = await request('GET', '/website?x=1');
  assert.equal(r.status, 301);
  assert.equal(r.headers.location, '/website/?x=1');
  const doubled = await request('GET', '//website');
  assert.equal(doubled.status, 301);
  assert.equal(doubled.headers.location, '/website/'); // never protocol-relative (//website/ = another host)
  const s = await request('GET', '/website/');
  assert.equal(s.status, 200);
  assert.match(s.body.toString(), /Website/);
});

await test('static: hashed assets are immutable and gzip on request', async () => {
  const r = await request('GET', '/assets/index-abc123.js', { 'accept-encoding': 'gzip, br' });
  assert.equal(r.status, 200);
  assert.equal(r.headers['content-encoding'], 'gzip');
  assert.match(r.headers['cache-control'], /immutable/);
  assert.equal(r.headers['content-security-policy'], undefined, 'scripts need no page policy');
  assert.equal(gunzipSync(r.body).toString(), bigJs);
  const plain = await request('GET', '/assets/index-abc123.js');
  assert.equal(plain.headers['content-encoding'], undefined);
  assert.equal(Number(plain.headers['content-length']), Buffer.byteLength(bigJs));
});

await test('static: ETag revalidation answers 304', async () => {
  const first = await request('GET', '/index.html');
  const again = await request('GET', '/index.html', { 'if-none-match': first.headers.etag });
  assert.equal(again.status, 304);
  assert.equal(again.body.length, 0);
});

await test('static: byte ranges for video (Safari needs them), 416 past the end', async () => {
  const r = await request('GET', '/clip.mp4', { range: 'bytes=100-199' });
  assert.equal(r.status, 206);
  assert.equal(r.headers['content-range'], `bytes 100-199/${video.length}`);
  assert.deepEqual(r.body, video.subarray(100, 200));
  const tail = await request('GET', '/clip.mp4', { range: 'bytes=-10' });
  assert.deepEqual(tail.body, video.subarray(video.length - 10));
  const bad = await request('GET', '/clip.mp4', { range: 'bytes=5000-' });
  assert.equal(bad.status, 416);
});

await test('static: HEAD sends headers only', async () => {
  const r = await request('HEAD', '/clip.mp4');
  assert.equal(r.status, 200);
  assert.equal(Number(r.headers['content-length']), video.length);
  assert.equal(r.body.length, 0);
});

await test('static: no traversal, no dotfiles, no other methods, unknown paths 404', async () => {
  for (const path of ['/../outside.txt', '/%2e%2e/outside.txt', '/assets/..%2f..%2foutside.txt', '/.env', '/%2eenv', '/a\\..\\outside.txt', '/nope.js', '/%zz']) {
    const r = await request('GET', path);
    assert.equal(r.status, 404, path);
    assert.doesNotMatch(r.body.toString(), /outside|sk_test/, path);
  }
  assert.equal((await request('POST', '/index.html')).status, 405);
});

await test('static: HashRouter routes are just "/" (the fragment never reaches the server)', async () => {
  const r = await request('GET', '/?utm=1');
  assert.equal(r.status, 200);
});

// ---------------------------------------------------------------------------------------------
// /health and /app-config.json
// ---------------------------------------------------------------------------------------------
await test('/health answers ok with the release it runs', async () => {
  const r = await request('GET', '/health');
  assert.equal(r.status, 200);
  assert.deepEqual(JSON.parse(r.body), { ok: true, version: '0.26.0', commit: 'a'.repeat(40) });
  assert.equal(r.headers['cache-control'], 'no-store');
});

await test('/app-config.json exposes only public settings (no secret key)', async () => {
  const r = await request('GET', '/app-config.json');
  const body = JSON.parse(r.body);
  assert.deepEqual(Object.keys(body).sort(), ['apiBase', 'clerkPublishableKey', 'environment', 'launch', 'tenant']);
  assert.equal(body.apiBase, '/api/cos');
  // The go-live switch defaults to Coming Soon (SW-08). PUBLIC_DOCUMENTS is retired (owner 2026-11-01): no such key.
  assert.deepEqual(body.launch, { siteLive: false, siteLiveAt: null });
  assert.equal(body.tenant, 'hoy-dev');
  assert.match(body.clerkPublishableKey, /^pk_test_/);
  assert.doesNotMatch(r.body.toString(), /sk_test/);
});

// ---------------------------------------------------------------------------------------------
// /api/cos/* → Company OS
// ---------------------------------------------------------------------------------------------
await test('proxy: a signed-in call reaches Company OS with the same token as the bearer, path and query intact', async () => {
  seen.length = 0;
  const r = await request('GET', '/api/cos/t/hoy-dev/e/booking?limit=5&q=%C3%B1', { authorization: `Bearer ${GOOD}`, 'accept-language': 'es' });
  assert.equal(r.status, 200);
  assert.deepEqual(JSON.parse(r.body), { ok: true });
  assert.equal(seen.length, 1);
  assert.equal(seen[0].url, '/t/hoy-dev/e/booking?limit=5&q=%C3%B1');
  assert.equal(seen[0].headers.authorization, `Bearer ${GOOD}`);
  assert.equal(seen[0].headers['accept-language'], 'es');
});

await test('proxy: a write keeps its body, content type and Idempotency-Key', async () => {
  seen.length = 0;
  const body = JSON.stringify({ ops: [{ op: 'create', entity: 'booking', data: { name: 'Ñandú' } }] });
  const r = await request('POST', '/api/cos/t/hoy-dev/batch', { authorization: `Bearer ${GOOD}`, 'content-type': 'application/json', 'idempotency-key': 'k-123' }, body);
  assert.equal(r.status, 200);
  assert.equal(seen[0].method, 'POST');
  assert.equal(seen[0].body.toString(), body);
  assert.equal(seen[0].headers['content-type'], 'application/json');
  assert.equal(seen[0].headers['idempotency-key'], 'k-123');
});

await test('proxy: browser headers beyond the allow-list never reach Company OS', async () => {
  seen.length = 0;
  await request('GET', '/api/cos/t/hoy-dev/me', {
    authorization: `Bearer ${GOOD}`,
    'x-platform-key': 'guess',
    'x-scheduler-key': 'guess',
    cookie: '__session=abc',
    'x-service-identity': 'guess',
    host: 'evil.example',
  });
  const h = seen[0].headers;
  for (const name of ['x-platform-key', 'x-scheduler-key', 'cookie', 'x-service-identity']) assert.equal(h[name], undefined, name);
  assert.notEqual(h.host, 'evil.example');
});

await test('proxy: the answer drops cookies and CORS headers, and is never cacheable (whatever the API says)', async () => {
  const r = await request('GET', '/api/cos/t/hoy-dev/me', { authorization: `Bearer ${GOOD}` });
  assert.equal(r.headers['set-cookie'], undefined);
  assert.equal(r.headers['access-control-allow-origin'], undefined);
  assert.equal(r.headers['x-api'], 'yes');
  assert.equal(r.headers['cache-control'], 'private, no-store');
  upstreamReply = (req, res) => {
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'public, max-age=3600', vary: 'Authorization' });
    res.end('{"ok":true}');
  };
  const cached = await request('GET', '/api/cos/t/hoy-dev/me', { authorization: `Bearer ${GOOD}` });
  assert.equal(cached.headers['cache-control'], 'private, no-store');
  assert.equal(cached.headers.vary, 'Authorization');
  upstreamReply = (req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end('{"ok":true}');
  };
});

await test('proxy: the client address is the edge’s X-Real-IP, never a browser-written X-Forwarded-For', async () => {
  seen.length = 0;
  await request('GET', '/api/cos/t/hoy-dev/me', { authorization: `Bearer ${GOOD}`, 'x-forwarded-for': '6.6.6.6' });
  assert.equal(seen[0].headers['x-forwarded-for'], '127.0.0.1');
  await request('GET', '/api/cos/t/hoy-dev/me', { authorization: `Bearer ${GOOD}`, 'x-forwarded-for': '6.6.6.6', 'x-real-ip': '190.0.2.7' });
  assert.equal(seen[1].headers['x-forwarded-for'], '190.0.2.7');
  assert.equal(seen[1].headers['x-real-ip'], '190.0.2.7');
});

await test('proxy: a GET or HEAD with a body is refused before anything is read or forwarded', async () => {
  seen.length = 0;
  assert.equal((await request('GET', '/api/cos/t/hoy-dev/me', { authorization: `Bearer ${GOOD}`, 'content-length': '100' }, 'x'.repeat(100))).status, 400);
  assert.equal((await request('GET', '/api/cos/t/hoy-dev/me', { authorization: `Bearer ${GOOD}`, 'transfer-encoding': 'chunked' }, ['a', 'b'])).status, 400);
  assert.equal(seen.length, 0, JSON.stringify(seen.map((x) => [x.method, x.url, x.headers])));
});

await test('proxy and webhook: an endless body gets an early 413 and a closed connection (it is not drained)', async () => {
  seen.length = 0;
  const sig = { 'content-type': 'application/json', 'svix-id': 'a', 'svix-timestamp': '1', 'svix-signature': 'v1,x' };
  for (const [path, headers] of [['/webhooks/resend', sig], ['/api/cos/t/hoy-dev/batch', { authorization: `Bearer ${GOOD}`, 'content-type': 'application/json' }], ['/api/cos/t/hoy-dev/me', { 'content-type': 'application/json' }]]) {
    const r = await endless(path, headers);
    assert.ok(r.status === 413 || r.status === 401, `${path}: ${JSON.stringify(r)}`);
    assert.ok(r.sent < 4 * 1024 * 1024, `${path}: the server read ${r.sent} bytes`);
    assert.ok(r.closed, `${path}: connection left open`);
  }
  assert.equal(seen.length, 0);
});

await test('proxy: Company OS refusals pass through unchanged (status and body)', async () => {
  upstreamReply = (req, res) => {
    res.writeHead(409, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'idempotency_conflict' }));
  };
  const r = await request('POST', '/api/cos/t/hoy-dev/batch', { authorization: `Bearer ${GOOD}`, 'content-type': 'application/json' }, '{}');
  assert.equal(r.status, 409);
  assert.deepEqual(JSON.parse(r.body), { error: 'idempotency_conflict' });
  upstreamReply = (req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end('{"ok":true}');
  };
});

await test('proxy: no session → 401 and nothing reaches Company OS', async () => {
  seen.length = 0;
  for (const [method, path] of [['GET', '/api/cos/t/hoy-dev/me'], ['POST', '/api/cos/t/hoy-dev/batch'], ['POST', '/api/cos/t/hoy-dev/signup'], ['GET', '/api/cos/t/hoy-dev/signup/x'], ['GET', '/api/cos/t/hoy-dev/%73ignup'], ['GET', '/api/cos/t/hoy-dev/signup']]) {
    const r = await request(method, path, {}, method === 'POST' ? '{}' : undefined);
    assert.equal(r.status, 401, `${method} ${path}`);
    assert.deepEqual(JSON.parse(r.body), { error: 'unauthorized' });
  }
  assert.equal(seen.length, 0);
});

await test('proxy: a bad, foreign or malformed token → 401 and nothing reaches Company OS', async () => {
  seen.length = 0;
  for (const authorization of ['Bearer forged.token.value', 'Basic dXNlcjpwYXNz', 'Bearer', `Bearer ${GOOD} extra`, `Token ${GOOD}`]) {
    const r = await request('GET', '/api/cos/t/hoy-dev/me', { authorization });
    assert.equal(r.status, 401, authorization);
  }
  assert.equal((await request('GET', '/api/cos/t/hoy-dev/signup', { authorization: 'Bearer forged' })).status, 401);
  assert.equal(seen.length, 0);
});

await test('proxy: no route is anonymous (the API authenticates every one, GET signup included); signed in, sign-up goes through', async () => {
  assert.deepEqual(ANONYMOUS_ROUTES, []);
  seen.length = 0;
  const r = await request('GET', '/api/cos/t/hoy-dev/signup', { authorization: `Bearer ${GOOD}` });
  assert.equal(r.status, 200);
  assert.equal(seen[0].url, '/t/hoy-dev/signup');
  assert.equal(seen[0].headers.authorization, `Bearer ${GOOD}`);
});

await test('proxy: only this tenant, never the platform routes or the dev login, never an escaping path', async () => {
  seen.length = 0;
  const paths = [
    '/api/cos/platform/tenants', '/api/cos/provision', '/api/cos/templates', '/api/cos/health', '/api/cos', '/api/cos/',
    '/api/cos/t/santa-maria/me', '/api/cos/t/hoy-dev', '/api/cos/t/hoy-dev/', '/api/cos/t/hoy-dev/auth/dev-login',
    '/api/cos/t/hoy-dev/%61uth/dev-login', '/api/cos/t/hoy-dev/../../platform/tenants', '/api/cos/t/hoy-dev/%2e%2e/%2e%2e/platform/tenants',
    '/api/cos/t/hoy-dev/e%2f..%2f..%2fplatform', '/api/cos/t/hoy-dev//me', '/api/cos/t/hoy-dev/e\\..\\..\\platform', '/api/cos/t/hoy-dev/%zz', '/api/cos/t/hoy-dev;x/me', '/api/cos/t/hoy-dev%2fx/me',
    '/api/other', '/webhooks/other',
  ];
  for (const path of paths) {
    const r = await request('POST', path, { authorization: `Bearer ${GOOD}`, 'content-type': 'application/json' }, '{}');
    assert.equal(r.status, 404, path);
  }
  assert.equal(seen.length, 0);
});

await test('proxy: bodies over the limit are refused (declared or streamed)', async () => {
  seen.length = 0;
  const big = 'x'.repeat(9000);
  const r = await request('POST', '/api/cos/t/hoy-dev/batch', { authorization: `Bearer ${GOOD}`, 'content-type': 'application/json' }, big);
  assert.equal(r.status, 413);
  const chunked = await request('POST', '/api/cos/t/hoy-dev/batch', { authorization: `Bearer ${GOOD}`, 'content-type': 'application/json', 'transfer-encoding': 'chunked' }, [big.slice(0, 5000), big.slice(5000)]);
  assert.equal(chunked.status, 413);
});

await test('proxy: Company OS down → 502, too slow → 504, both as JSON', async () => {
  upstreamReply = () => {}; // never answers
  const slow = await request('GET', '/api/cos/t/hoy-dev/me', { authorization: `Bearer ${GOOD}` });
  assert.equal(slow.status, 504);
  assert.deepEqual(JSON.parse(slow.body), { error: 'upstream_timeout' });
  upstreamReply = (req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end('{"ok":true}');
  };
  const downConfig = { ...config, companyOsUrl: 'http://127.0.0.1:1' };
  const down = createHoyServer(await createHandler(downConfig, { verifySession: fakeVerify, log: () => {} }));
  await listen(down);
  const r = await request('GET', '/api/cos/t/hoy-dev/me', { authorization: `Bearer ${GOOD}` }, undefined, down);
  assert.equal(r.status, 502);
  assert.deepEqual(JSON.parse(r.body), { error: 'upstream_unavailable' });
  down.close();
});

await test('proxy: logs carry the route shape, never the token, ids or query', async () => {
  const text = JSON.stringify(logs);
  assert.doesNotMatch(text, new RegExp(GOOD.replace(/\./g, '\\.')));
  assert.doesNotMatch(text, /limit=5|Ñandú/);
  assert.ok(logs.some((l) => l.event === 'api.cos' && l.route === '/t/hoy-dev/e'));
});

// ---------------------------------------------------------------------------------------------
// Signed-out public reads (lane F, ADR 0029): the server's own read-only identity, never the visitor's
// ---------------------------------------------------------------------------------------------
const READ_TOKEN = `cos_svc_0b0f6e1c-3c6a-4c0e-9a51-6f3f2c1d9e02_${'R'.repeat(43)}`;
const publicLogs = [];
const publicConfig = loadConfig({
  COMPANY_OS_URL: `http://127.0.0.1:${upstream.address().port}`, COMPANY_OS_TENANT: 'hoy-dev', CLERK_SECRET_KEY: 'sk_test_example',
  HOY_ENV: 'local', DIST_DIR: dist, UPSTREAM_TIMEOUT_MS: '500', COMPANY_OS_READ_TOKEN: READ_TOKEN,
});
const publicServer = createHoyServer(await createHandler(publicConfig, { verifySession: fakeVerify, log: (e) => publicLogs.push(e) }));
await listen(publicServer);
const pub = (method, path, headers = {}, body) => request(method, path, headers, body, publicServer);
const json = { 'content-type': 'application/json' };
const okUpstream = (req, res) => { res.writeHead(200, { 'content-type': 'application/json', 'set-cookie': 'x=1' }); res.end('{"data":[]}'); };

await test('public reads: signed out, a query on the timetable, coaches, rooms or products goes to Company OS with the server\'s read identity', async () => {
  upstreamReply = okUpstream;
  for (const entity of ['occurrence', 'schedule', 'resource', 'coach', 'product']) {
    seen.length = 0;
    const body = JSON.stringify({ entity, filter: { all: true }, include: entity === 'coach' ? [{ field: 'person', fields: ['name'] }] : undefined, limit: 500 });
    const r = await pub('POST', '/api/cos/t/hoy-dev/query', json, body);
    assert.equal(r.status, 200, entity);
    assert.equal(r.headers['cache-control'], 'private, no-store');
    assert.equal(r.headers['set-cookie'], undefined);
    assert.equal(seen.length, 1, entity);
    assert.equal(seen[0].url, '/t/hoy-dev/query');
    assert.equal(seen[0].headers.authorization, `Bearer ${READ_TOKEN}`);
    assert.equal(seen[0].body.toString(), body, 'the body reaches Company OS as sent');
  }
  for (const path of ['/api/occurrence/0b0f6e1c-3c6a-4c0e-9a51-6f3f2c1d9e01', '/api/product', '/api/coach/x1']) {
    seen.length = 0;
    const r = await pub('GET', `/api/cos/t/hoy-dev${path}`);
    assert.equal(r.status, 200, path);
    assert.equal(seen[0]?.url, `/t/hoy-dev${path}`);
    assert.equal(seen[0].headers.authorization, `Bearer ${READ_TOKEN}`);
  }
});

await test('public reads (lane H2): a settings answer never carries the pay data, even from a row saved before the split', async () => {
  const legacy = { key: 'studio_settings', value: { profile: { whatsapp: '+57 300' }, payroll: { rateCard: { byTeacher: { leo: 91000 } } }, integrations: { wompi: 'connected' }, contacts: { frontDesk: { whatsapp: '+57 301' }, owner: { whatsapp: '+57 399' }, payroll: { whatsapp: '+57 398' } } } };
  upstreamReply = (req, res) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(req.url.includes('/api/setting/') ? { data: { id: 's1', data: legacy } } : { data: [{ id: 's1', data: legacy }] })); };
  for (const [method, path, body] of [['POST', '/api/cos/t/hoy-dev/query', JSON.stringify({ entity: 'setting', filter: { field: 'key', op: 'eq', value: 'studio_settings' } })], ['GET', '/api/cos/t/hoy-dev/api/setting/s1']]) {
    const r = await pub(method, path, method === 'POST' ? json : {}, body);
    assert.equal(r.status, 200, path);
    const text = r.body.toString();
    for (const secret of ['91000', 'wompi', '+57 399', '+57 398']) assert.ok(!text.includes(secret), `${path}: ${secret}`);
    const rec = JSON.parse(text).data;
    const value = (Array.isArray(rec) ? rec[0] : rec).data.value;
    assert.deepEqual(value, { profile: { whatsapp: '+57 300' }, contacts: { frontDesk: { whatsapp: '+57 301' } } });
  }
  // Other public answers stream through untouched.
  upstreamReply = okUpstream;
  const r = await pub('POST', '/api/cos/t/hoy-dev/query', json, JSON.stringify({ entity: 'product' }));
  assert.equal(r.status, 200); assert.equal(r.body.toString(), '{"data":[]}');
});

await test('public reads: signed out, everything else stays 401 and nothing reaches Company OS', async () => {
  upstreamReply = okUpstream;
  seen.length = 0;
  const refusedQueries = [
    // Lane H2 forwards setting, hours_override and booking too: the public_site policies narrow them to the public
    // settings record, the holiday hours without their note, and a booking's class and mat.
    ...['person', 'payment', 'credit_lot', 'credit_entry', 'member', 'invoice', 'waitlist_entry', 'comms_log', 'staff_note', 'form_submission', 'policy_acceptance', 'file', 'feature_flag', 'voucher'].map((entity) => JSON.stringify({ entity })),
    '{}', 'not json', '[]', 'null', JSON.stringify({ entity: ['occurrence'] }), JSON.stringify({ entity: { $ne: null } }), JSON.stringify({ entity: 'Occurrence' }),
    JSON.stringify({ entity: 'occurrence', entity2: 'x' }).replace('entity2', 'entity'), // a repeated key: the parser keeps the last one
  ];
  for (const body of refusedQueries) {
    const r = await pub('POST', '/api/cos/t/hoy-dev/query', json, body);
    assert.equal(r.status, 401, body);
    assert.deepEqual(JSON.parse(r.body), { error: 'unauthorized' });
  }
  const other = [
    ['GET', '/me'], ['GET', '/signup'], ['POST', '/signup'], ['POST', '/batch'], ['GET', '/query'],
    ['GET', '/api/person'], ['GET', '/api/person/p1'], ['GET', '/api/staff_note'], ['GET', '/api/payment/x'],
    ['POST', '/api/occurrence'], ['PATCH', '/api/occurrence/o1'], ['DELETE', '/api/occurrence/o1'], ['PUT', '/api/product/p1'],
    ['GET', '/api/occurrence/o1/extra'], ['GET', '/api/%6fccurrence/o1/..'], ['HEAD', '/api/product'],
    ['GET', '/public-files/f1/url'], ['POST', '/public-files/urls'], ['GET', '/files/f1/url'], ['GET', '/audit'], ['GET', '/admin/roles'],
  ];
  for (const [method, path] of other) {
    const r = await pub(method, `/api/cos/t/hoy-dev${path}`, method === 'POST' || method === 'PATCH' || method === 'PUT' ? json : {}, method === 'POST' || method === 'PATCH' || method === 'PUT' ? JSON.stringify({ entity: 'occurrence' }) : undefined);
    assert.ok([401, 404].includes(r.status), `${method} ${path}: ${r.status}`);
  }
  // Other tenants and the platform are never reached, signed out or not.
  for (const path of ['/api/cos/t/santa-maria/query', '/api/cos/platform/tenants/hoy-dev/service-identities']) {
    assert.equal((await pub('POST', path, json, JSON.stringify({ entity: 'occurrence' }))).status, 404, path);
  }
  assert.equal(seen.length, 0);
});

await test('public reads: a query body over 16 KiB is refused, not buffered', async () => {
  seen.length = 0;
  const big = JSON.stringify({ entity: 'occurrence', filter: { field: 'title', op: 'in', value: Array.from({ length: 4000 }, (_, i) => `t${i}`) } });
  assert.ok(big.length > 16 * 1024 && big.length < publicConfig.proxyBodyLimit);
  const r = await pub('POST', '/api/cos/t/hoy-dev/query', json, big);
  assert.equal(r.status, 413);
  const chunked = await pub('POST', '/api/cos/t/hoy-dev/query', { ...json, 'transfer-encoding': 'chunked' }, [big.slice(0, 9000), big.slice(9000)]);
  assert.equal(chunked.status, 413);
  assert.equal(seen.length, 0);
});

await test('public reads: the visitor\'s own headers never become the identity', async () => {
  upstreamReply = okUpstream;
  seen.length = 0;
  // A bearer is always a Clerk session to check: the read token itself, any service token, or a forged one is never
  // forwarded. Changed on purpose (test-hoy fixes, lane Y2): on a public read a failed check is answered as signed out
  // (the server's read identity), not 401, so a visitor's expired session doesn't break the website.
  for (const authorization of [`Bearer ${READ_TOKEN}`, `Bearer cos_svc_00000000-0000-4000-8000-000000000000_${'A'.repeat(43)}`, 'Bearer forged', 'Basic dXNlcjpwYXNz', '']) {
    seen.length = 0;
    const r = await pub('POST', '/api/cos/t/hoy-dev/query', { ...json, authorization }, JSON.stringify({ entity: 'product' }));
    assert.equal(r.status, 200, authorization);
    assert.equal(seen.length, 1, authorization);
    assert.equal(seen[0].headers.authorization, `Bearer ${READ_TOKEN}`, authorization);
  }
  seen.length = 0;
  // Visitor headers that look like identities or addresses are dropped; the server sets its own.
  const r = await pub('POST', '/api/cos/t/hoy-dev/query', {
    ...json, cookie: '__session=visitor', 'x-api-key': 'visitor', 'x-platform-key': 'visitor', 'x-service-token': 'visitor',
    'x-forwarded-for': '6.6.6.6', 'x-real-ip': '10.0.0.7', 'proxy-authorization': 'Bearer visitor', 'x-tenant': 'santa-maria',
  }, JSON.stringify({ entity: 'product' }));
  assert.equal(r.status, 200);
  const h = seen[0].headers;
  assert.equal(h.authorization, `Bearer ${READ_TOKEN}`);
  for (const name of ['cookie', 'x-api-key', 'x-platform-key', 'x-service-token', 'proxy-authorization', 'x-tenant']) assert.equal(h[name], undefined, name);
  assert.equal(h['x-forwarded-for'], '10.0.0.7', 'the edge\'s address, never the visitor\'s own X-Forwarded-For');
  // Signed in, the person's own session goes through, never the read identity.
  seen.length = 0;
  const signedIn = await pub('POST', '/api/cos/t/hoy-dev/query', { ...json, authorization: `Bearer ${GOOD}` }, JSON.stringify({ entity: 'booking' }));
  assert.equal(signedIn.status, 200);
  assert.equal(seen[0].headers.authorization, `Bearer ${GOOD}`);
});

// Lane Y2 (test-hoy, 2026-11-01): an expired Clerk session made every signed-out read 401.
await test('public reads (Y2): an invalid or expired session on a public read falls back to the read identity', async () => {
  upstreamReply = okUpstream;
  const hostile = ['expired.session.token', 'forged', `${GOOD}x`, 'a'.repeat(4000), `${READ_TOKEN}`];
  for (const token of hostile) {
    for (const [method, path, body] of [['POST', '/query', JSON.stringify({ entity: 'occurrence' })], ['GET', '/api/product'], ['GET', '/api/coach/c1']]) {
      seen.length = 0;
      const r = await pub(method, `/api/cos/t/hoy-dev${path}`, { ...(body ? json : {}), authorization: `Bearer ${token}` }, body);
      assert.equal(r.status, 200, `${token.slice(0, 20)} ${method} ${path}`);
      assert.equal(seen.length, 1);
      assert.equal(seen[0].headers.authorization, `Bearer ${READ_TOKEN}`, 'never the visitor\'s token');
      assert.equal(r.headers['x-hoy-session'], 'stale', 'the browser is told its session was refused');
    }
  }
  assert.ok(publicLogs.some((l) => l.event === 'api.cos' && l.public === true && l.staleSession === true), 'the log says the session was refused');
});

await test('public reads (Y2): an expired session on a private route or a non-public query still answers 401, nothing reaches Company OS', async () => {
  upstreamReply = okUpstream;
  seen.length = 0;
  const auth = { authorization: 'Bearer expired.session.token' };
  for (const [method, path, body] of [
    ['GET', '/me'], ['POST', '/signup', '{}'], ['POST', '/batch', '[]'], ['GET', '/api/person'], ['GET', '/api/payment/x'],
    ['POST', '/api/occurrence', '{}'], ['PATCH', '/api/occurrence/o1', '{}'], ['DELETE', '/api/booking/b1'],
    ['POST', '/query', JSON.stringify({ entity: 'person' })], ['POST', '/query', JSON.stringify({ entity: 'payment' })], ['POST', '/query', 'not json'],
  ]) {
    const r = await pub(method, `/api/cos/t/hoy-dev${path}`, { ...auth, ...(body ? json : {}) }, body);
    assert.equal(r.status, 401, `${method} ${path} ${body ?? ''}`);
  }
  assert.equal(seen.length, 0);
});

await test('public reads (Y2): a valid session on a public read still uses the person, never the read identity', async () => {
  upstreamReply = okUpstream;
  for (const [method, path, body] of [['POST', '/query', JSON.stringify({ entity: 'occurrence' })], ['GET', '/api/product']]) {
    seen.length = 0;
    const r = await pub(method, `/api/cos/t/hoy-dev${path}`, { ...(body ? json : {}), authorization: `Bearer ${GOOD}` }, body);
    assert.equal(r.status, 200);
    assert.equal(seen[0].headers.authorization, `Bearer ${GOOD}`);
    assert.equal(r.headers['x-hoy-session'], undefined);
  }
});

await test('public reads (Y2): without COMPANY_OS_READ_TOKEN an expired session stays 401 on every read', async () => {
  seen.length = 0;
  const r = await request('POST', '/api/cos/t/hoy-dev/query', { ...json, authorization: 'Bearer expired.session.token' }, JSON.stringify({ entity: 'occurrence' }));
  assert.equal(r.status, 401);
  assert.equal(seen.length, 0);
});

await test('public reads (Y2): with the real Clerk check, an expired JWT on a public read gets the public answer; on /me, 401', async () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const pem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const realConfig = { ...publicConfig, clerkJwtKey: pem, authorizedParties: ['https://hoy-test.example'] };
  const real = createHoyServer(await createHandler(realConfig, { verifySession: clerkSessionVerifier(realConfig), log: () => {} }));
  await listen(real);
  upstreamReply = okUpstream;
  const now = Math.floor(Date.now() / 1000);
  const expired = signJwt({ sub: 'user_9', sid: 'sess_9', azp: 'https://hoy-test.example', iat: now - 700, nbf: now - 700, exp: now - 600 }, privateKey);
  seen.length = 0;
  const site = await request('POST', '/api/cos/t/hoy-dev/query', { ...json, authorization: `Bearer ${expired}` }, JSON.stringify({ entity: 'occurrence' }), real);
  assert.equal(site.status, 200);
  assert.equal(seen[0].headers.authorization, `Bearer ${READ_TOKEN}`);
  seen.length = 0;
  const me = await request('GET', '/api/cos/t/hoy-dev/me', { authorization: `Bearer ${expired}` }, undefined, real);
  assert.equal(me.status, 401);
  assert.equal(seen.length, 0);
  real.close();
});

await test('public reads: the read token is never in an answer, /app-config.json or a log line', async () => {
  upstreamReply = okUpstream;
  const answers = [await pub('GET', '/app-config.json'), await pub('POST', '/api/cos/t/hoy-dev/query', json, JSON.stringify({ entity: 'product' })), await pub('POST', '/api/cos/t/hoy-dev/query', json, JSON.stringify({ entity: 'person' }))];
  for (const a of answers) {
    assert.doesNotMatch(a.body.toString(), /cos_svc_/);
    assert.doesNotMatch(JSON.stringify(a.headers), /cos_svc_/);
  }
  assert.doesNotMatch(JSON.stringify(publicLogs), /cos_svc_|RRRRRRRR/);
  assert.ok(publicLogs.some((l) => l.event === 'api.cos' && l.public === true && l.route === '/t/hoy-dev/query'));
});

await test('public reads: without COMPANY_OS_READ_TOKEN signed-out reads stay 401, as before', async () => {
  seen.length = 0;
  const r = await request('POST', '/api/cos/t/hoy-dev/query', json, JSON.stringify({ entity: 'product' }));
  assert.equal(r.status, 401);
  assert.equal((await request('GET', '/api/cos/t/hoy-dev/api/occurrence/o1')).status, 401);
  assert.equal(seen.length, 0);
});

await test('public reads: one visitor is limited (429), another is still served', async () => {
  upstreamReply = okUpstream;
  const limited = createHoyServer(await createHandler({ ...publicConfig, publicReadRate: { perSecond: 0.001, burst: 3 } }, { verifySession: fakeVerify, log: () => {} }));
  await listen(limited);
  seen.length = 0;
  const one = { ...json, 'x-real-ip': '10.0.0.1' };
  const statuses = [];
  for (let i = 0; i < 5; i++) statuses.push((await request('POST', '/api/cos/t/hoy-dev/query', one, JSON.stringify({ entity: 'product' }), limited)).status);
  assert.deepEqual(statuses, [200, 200, 200, 429, 429]);
  const r = await request('POST', '/api/cos/t/hoy-dev/query', one, JSON.stringify({ entity: 'product' }), limited);
  assert.deepEqual(JSON.parse(r.body), { error: 'rate_limited' });
  assert.equal((await request('POST', '/api/cos/t/hoy-dev/query', { ...json, 'x-real-ip': '10.0.0.2' }, JSON.stringify({ entity: 'product' }), limited)).status, 200);
  // A signed-in person is never limited by it.
  assert.equal((await request('POST', '/api/cos/t/hoy-dev/query', { ...one, authorization: `Bearer ${GOOD}` }, JSON.stringify({ entity: 'product' }), limited)).status, 200);
  assert.equal(seen.length, 5);
  limited.close();
});

await test('public reads: all visitors together stay under the read identity\'s own limit in Company OS (429 for everyone)', async () => {
  upstreamReply = okUpstream;
  const capped = createHoyServer(await createHandler({ ...publicConfig, publicReadRate: { perSecond: 20, burst: 120, totalPerSecond: 0.001, totalBurst: 4 } }, { verifySession: fakeVerify, log: () => {} }));
  await listen(capped);
  const statuses = [];
  for (let i = 0; i < 6; i++) statuses.push((await request('POST', '/api/cos/t/hoy-dev/query', { ...json, 'x-real-ip': `10.0.1.${i}` }, JSON.stringify({ entity: 'product' }), capped)).status);
  assert.deepEqual(statuses, [200, 200, 200, 200, 429, 429]);
  capped.close();
});

await test('public reads: the per-visitor table forgets idle visitors first, never resets a busy one', async () => {
  const take = publicReadLimiter({ perSecond: 1, burst: 2, totalPerSecond: 1e9, totalBurst: 1e9 }, 3);
  assert.equal(take('busy', 0), true); assert.equal(take('busy', 0), true); assert.equal(take('busy', 0), false);
  assert.equal(take('a', 0), true); assert.equal(take('b', 0), true);
  assert.equal(take('c', 0), false, 'the table is full of busy visitors: a new one waits, nobody is reset');
  assert.equal(take('busy', 0), false, 'the busy visitor is still limited');
  assert.equal(take('c', 10_000), true, 'once others are idle again they are forgotten and a new visitor is served');
});

await test('config: COMPANY_OS_READ_TOKEN must be a Company OS service token; check-bundle finds one in the build', async () => {
  const ok = { COMPANY_OS_URL: 'http://api.railway.internal:4000', COMPANY_OS_TENANT: 'hoy', CLERK_SECRET_KEY: 'sk_live_x' };
  assert.equal(loadConfig(ok).companyOsReadToken, null);
  assert.equal(loadConfig({ ...ok, COMPANY_OS_READ_TOKEN: ` ${READ_TOKEN} ` }).companyOsReadToken, READ_TOKEN);
  for (const bad of ['sk_live_abc', 'cos_svc_x', `cos_svc_not-a-uuid_${'A'.repeat(43)}`, `${READ_TOKEN}x`, `Bearer ${READ_TOKEN}`]) {
    assert.throws(() => loadConfig({ ...ok, COMPANY_OS_READ_TOKEN: bad }), /COMPANY_OS_READ_TOKEN/, bad);
  }
  assert.throws(() => loadConfig({ ...ok, COMPANY_OS_READ_TOKEN: 'cos_svc_x_not-shown-in-errors' }), (e) => !String(e.message).includes('not-shown-in-errors'), 'the error never repeats the value');
  const dirty = join(root, 'dirty-svc');
  await mkdir(dirty, { recursive: true });
  await writeFile(join(dirty, 'a.js'), `const t="${READ_TOKEN}";`);
  await writeFile(join(dirty, 'b.js'), 'const t="RRRRRRRRRRRRRRRRRRRR";');
  const found = await findSecrets(dirty, { COMPANY_OS_READ_TOKEN: READ_TOKEN });
  assert.match(found.join('\n'), /a\.js: looks like a Company OS service token/);
  assert.match(found.join('\n'), /a\.js: contains the value of COMPANY_OS_READ_TOKEN/);
  publicServer.close();
});

// ---------------------------------------------------------------------------------------------
// /site and /coming-soon: an old address typed without the # (lane H-SEO, D11: the website is on real paths now)
// ---------------------------------------------------------------------------------------------
await test('old /site addresses answer 301 to the website\'s real path; /coming-soon still goes to its hash route', async () => {
  for (const [path, location, status] of [
    ['/site', '/', 301], ['/site/', '/', 301], ['/site/plans', '/planes', 301], ['/site/classes/fuego', '/clases/fuego', 301], ['/site/teachers/', '/profesores', 301], ['/coming-soon', '/#/coming-soon', 302],
  ]) {
    for (const method of ['GET', 'HEAD']) {
      const r = await request(method, path);
      assert.equal(r.status, status, `${method} ${path}`);
      assert.equal(r.headers.location, location, `${method} ${path}`);
      assert.equal(r.headers['x-content-type-options'], 'nosniff');
    }
  }
});

await test('old /site addresses: a plain query string passes; anything else is dropped, and the redirect still happens', async () => {
  assert.equal((await request('GET', '/site/plans?version=photos&x=1')).headers.location, '/planes?version=photos&x=1');
  for (const query of ['?next=//evil.example', '?a=%0d%0aSet-Cookie:x=1', '?a=%2F%2Fevil', '?a=<script>', '?a=b#c', '?', `?${'a'.repeat(600)}`]) {
    const r = await request('GET', `/site${query}`);
    assert.equal(r.status, 301, query);
    assert.equal(r.headers.location, '/', query);
    assert.equal(r.headers['set-cookie'], undefined, query);
  }
});

await test('old /site addresses: hostile paths keep the 404, and no answer ever leaves the site', async () => {
  for (const path of [
    '/site/%2f%2fevil.example', '/site/%2fevil', '/site/..', '/site/../etc/passwd', '/site/..%2f..%2fetc', '/site/%2e%2e/x', '/site/.', '/site//evil.example', '/site/a//b', '/site/%0d%0aSet-Cookie:x=1', '/site/%0aevil', '/site/a%00b',
    '/site/%5cevil', '/site/a\\b', '/site/@evil.example', '/site/a:b', '/site/<script>', '/coming-soon/x', '/coming-soon/', '/coming-soon/..',
  ]) {
    const r = await request('GET', path);
    assert.equal(r.status, 404, path);
    assert.equal(r.headers.location, undefined, path);
  }
  for (const path of ['//evil.example', '//evil.example/site', '//site', '///site']) {
    const r = await request('GET', path);
    assert.ok(r.headers.location === undefined || !/^\/\/|^https?:/i.test(r.headers.location), `${path}: ${r.headers.location}`);
    assert.notEqual(r.headers.location, '/', path);
  }
});

await test('routes without the #: only GET and HEAD, and only these paths', async () => {
  for (const method of ['POST', 'PUT', 'DELETE']) assert.ok(![301, 302].includes((await request(method, '/site')).status), method);
  for (const path of ['/website', '/website/', '/sites', '/site-map', '/SITE', '/coming-soonish', '/index.html', '/assets/index-abc123.js', '/media/x', '/files/x', '/api/x', '/api/cos/t/hoy-dev/me']) {
    const r = await request('GET', path);
    assert.ok(r.headers.location === undefined || !r.headers.location.includes('#'), `${path}: ${r.headers.location}`);
    assert.notEqual(r.status, 302, path);
    if (path !== '/website') assert.notEqual(r.status, 301, path);
  }
  assert.equal((await request('GET', '/website/')).status, 200, 'the static website is untouched');
  assert.equal((await request('GET', '/assets/index-abc123.js')).status, 200, 'static files are untouched');
});

// ---------------------------------------------------------------------------------------------
// GET /media/<id>: a public image (a teacher's photo, the payment QR), with the server's read identity (go-live lane H1)
// ---------------------------------------------------------------------------------------------
const MEDIA_LINK = `/t/hoy-dev/public-files/${FILE_ID}/url`;
const mediaServer = createHoyServer(await createHandler({ ...publicConfig, fileSizeLimit: 4096, fileTimeoutMs: 500 }, { verifySession: fakeVerify, log: (e) => publicLogs.push(e) }));
await listen(mediaServer);
const media = (path, headers = {}, method = 'GET', body) => request(method, path, headers, body, mediaServer);

await test('media: an allowed image is served inline with the read identity; nothing of the visitor reaches the API or storage', async () => {
  upstreamReply = linkTo('receipt.png');
  seen.length = 0; storageSeen.length = 0;
  const r = await media(`/media/${FILE_ID}`, { cookie: 'hoy_test_gate=1', authorization: `Bearer ${GOOD}`, 'x-real-ip': '203.0.113.9' });
  assert.equal(r.status, 200);
  assert.equal(r.headers['content-type'], 'image/png');
  assert.equal(r.headers['content-disposition'], 'inline');
  assert.deepEqual(r.body, receipt);
  assert.equal(seen.length, 1);
  assert.equal(seen[0].url, MEDIA_LINK, 'the published-copy route, so the policy and the published bucket decide');
  assert.equal(seen[0].headers.authorization, `Bearer ${READ_TOKEN}`, 'always the read identity, never the visitor token');
  assert.equal(seen[0].headers.cookie, undefined);
  assert.equal(seen[0].headers['x-real-ip'], '203.0.113.9');
  assert.equal(storageSeen.length, 1);
  assert.equal(storageSeen[0].headers.cookie, undefined);
  assert.equal(storageSeen[0].headers.authorization, undefined);
  const everything = JSON.stringify(r.headers) + r.body.toString('latin1');
  assert.doesNotMatch(everything, new RegExp(SIGNED), 'the storage link never reaches the browser');
  assert.equal(r.headers['set-cookie'], undefined);
  assert.match(r.headers['content-security-policy'], /sandbox/);
  assert.equal(r.headers['cross-origin-resource-policy'], 'same-origin');
  assert.equal(r.headers['x-content-type-options'], 'nosniff');
  assert.equal(r.headers['cache-control'], 'public, max-age=300', 'short: a replaced bank QR must not linger');
});

await test('media: the same image for a signed-out visitor (no session needed)', async () => {
  upstreamReply = linkTo('receipt.png');
  assert.equal((await media(`/media/${FILE_ID}`)).status, 200);
});

await test('media: other kinds, drafts and receipts are refused as the API refuses them, with no storage call and no caching', async () => {
  for (const [status, answer, expected] of [
    [404, { error: 'not found' }, { status: 404, error: 'not_found' }],
    [403, { error: 'forbidden' }, { status: 404, error: 'not_found' }],
    [404, { error: 'file_not_ready' }, { status: 404, error: 'file_not_ready' }],
  ]) {
    upstreamReply = (req, res) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(answer)); };
    storageSeen.length = 0;
    const r = await media(`/media/${FILE_ID}`);
    assert.equal(r.status, expected.status, JSON.stringify(answer));
    assert.deepEqual(JSON.parse(r.body), { error: expected.error });
    assert.equal(r.headers['cache-control'], 'no-store', 'a refusal must not stick in the browser');
    assert.equal(storageSeen.length, 0);
  }
});

await test('media: the read identity refused, or the API busy, is no refusal of the file: 502 or 503, no-store, and the log says what came back', async () => {
  for (const [status, expected] of [[401, 502], [429, 503], [400, 502]]) {
    upstreamReply = (req, res) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: 'unauthorized' })); };
    publicLogs.length = 0;
    const r = await media(`/media/${FILE_ID}`);
    assert.equal(r.status, expected, String(status));
    assert.equal(r.headers['cache-control'], 'no-store', String(status));
    assert.ok(publicLogs.some((l) => l.event === 'media' && l.upstream === status), `logged ${status}`);
  }
  upstreamReply = (req, res) => { res.writeHead(404, { 'content-type': 'application/json' }); res.end('{"error":"not found"}'); };
  publicLogs.length = 0;
  await media(`/media/${FILE_ID}`);
  assert.ok(publicLogs.some((l) => l.event === 'media' && l.upstream === 404), 'a refusal is logged too');
});

await test('media and files: a client leaving mid-stream gives the slot back at once, and the log says so', async () => {
  const seenLogs = [];
  const roomy = createHoyServer(await createHandler({ ...publicConfig, mediaConcurrency: 1, fileTimeoutMs: 20_000 }, { verifySession: fakeVerify, log: (e) => seenLogs.push(e) }));
  await listen(roomy);
  const leave = (path, headers) => new Promise((done, fail) => {
    const req = http.request({ host: '127.0.0.1', port: roomy.address().port, method: 'GET', path, headers, agent: false }, (res) => { res.once('data', () => { req.destroy(); done(); }); });
    req.on('error', () => {}); setTimeout(() => fail(new Error('no bytes')), 3000).unref(); req.end();
  });
  const settle = async (event) => { for (let i = 0; i < 40 && !seenLogs.some((l) => l.event === event); i++) await new Promise((r) => setTimeout(r, 25)); };
  upstreamReply = linkTo('trickle');
  await leave(`/media/${FILE_ID}`, { 'x-real-ip': '10.3.0.1' });
  await settle('media');
  assert.equal(seenLogs.find((l) => l.event === 'media')?.outcome, 'client_gone', 'the read ended with the client');
  upstreamReply = linkTo('receipt.png');
  assert.equal((await request('GET', `/media/${FILE_ID}`, { 'x-real-ip': '10.3.0.1' }, undefined, roomy)).status, 200, 'the slot came back');
  upstreamReply = linkTo('trickle');
  await leave(`/files/${FILE_ID}`, { authorization: `Bearer ${GOOD}` });
  await settle('file');
  assert.equal(seenLogs.find((l) => l.event === 'file')?.outcome, 'client_gone', '/files shares the code');
  roomy.close();
});

await test('media: one address may hold only so many reads at once; the slot comes back afterwards', async () => {
  upstreamReply = linkTo('trickle');
  const capped = createHoyServer(await createHandler({ ...publicConfig, mediaConcurrency: 1, fileTimeoutMs: 300 }, { verifySession: fakeVerify, log: () => {} }));
  await listen(capped);
  const one = { 'x-real-ip': '10.2.0.1' };
  const held = request('GET', `/media/${FILE_ID}`, one, undefined, capped).catch(() => null);
  await new Promise((r) => setTimeout(r, 80));
  const second = await request('GET', `/media/${FILE_ID}`, one, undefined, capped);
  assert.equal(second.status, 429);
  assert.deepEqual(JSON.parse(second.body), { error: 'rate_limited' });
  upstreamReply = linkTo('receipt.png');
  assert.equal((await request('GET', `/media/${FILE_ID}`, { 'x-real-ip': '10.2.0.2' }, undefined, capped)).status, 200, 'another address is not affected');
  await held;
  await new Promise((r) => setTimeout(r, 50));
  assert.equal((await request('GET', `/media/${FILE_ID}`, one, undefined, capped)).status, 200, 'the slot came back');
  capped.close();
});

await test('media: the API being down or its answer odd is a 502, and an unlisted storage host is never fetched', async () => {
  upstreamReply = (req, res) => { res.writeHead(500); res.end('boom'); };
  assert.equal((await media(`/media/${FILE_ID}`)).status, 502);
  upstreamReply = linkTo('x', 200, { url: 'file:///etc/passwd' });
  assert.equal((await media(`/media/${FILE_ID}`)).status, 502);
  upstreamReply = linkTo('x', 200, { nope: true });
  assert.equal((await media(`/media/${FILE_ID}`)).status, 502);
});

await test('media: only images: an SVG or anything else stored is refused, never rendered or downloaded from this address', async () => {
  upstreamReply = linkTo('page.svg');
  const r = await media(`/media/${FILE_ID}`);
  assert.equal(r.status, 404);
  assert.doesNotMatch(r.body.toString(), /script/);
  assert.equal(r.headers['content-disposition'], undefined);
});

await test('media: too big is refused; storage missing is a 404', async () => {
  upstreamReply = linkTo('declared-big');
  assert.equal((await media(`/media/${FILE_ID}`)).status, 502);
  upstreamReply = linkTo('gone');
  assert.equal((await media(`/media/${FILE_ID}`)).status, 404);
});

await test('media: hostile ids and path tricks never reach the API', async () => {
  upstreamReply = linkTo('receipt.png');
  seen.length = 0;
  for (const path of ['/media', '/media/', '/media/not-a-uuid', `/media/${FILE_ID}/url`, `/media/${FILE_ID}/`, `/media/..%2F${FILE_ID}`, `/media/${FILE_ID}%2F..`, `/media/%2e%2e/${FILE_ID}`, `/media/${FILE_ID}%00`, '/media/..%2F..%2Fetc%2Fpasswd', `/media/${FILE_ID}x`, '/media/<script>alert(1)</script>', `/media//${FILE_ID}`]) {
    const r = await media(path);
    assert.equal(r.status, 404, path);
    assert.deepEqual(JSON.parse(r.body), { error: 'not_found' }, path);
  }
  assert.equal(seen.length, 0);
});

await test('media: reads only: other methods 405, a body 400', async () => {
  upstreamReply = linkTo('receipt.png');
  seen.length = 0;
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) assert.equal((await media(`/media/${FILE_ID}`, {}, method)).status, 405, method);
  assert.equal((await media(`/media/${FILE_ID}`, { 'content-length': '3' }, 'GET', 'abc')).status, 400);
  assert.equal(seen.length, 0);
});

await test('media: one visitor is limited (429, the public reads\' limiter), another is still served; a query string changes nothing', async () => {
  upstreamReply = linkTo('receipt.png');
  const limited = createHoyServer(await createHandler({ ...publicConfig, publicReadRate: { perSecond: 0.001, burst: 2 } }, { verifySession: fakeVerify, log: () => {} }));
  await listen(limited);
  const one = { 'x-real-ip': '10.1.0.1' };
  const statuses = [];
  for (let i = 0; i < 3; i++) statuses.push((await request('GET', `/media/${FILE_ID}?r=${i}`, one, undefined, limited)).status);
  assert.deepEqual(statuses, [200, 200, 429]);
  assert.equal((await request('GET', `/media/${FILE_ID}`, { 'x-real-ip': '10.1.0.2' }, undefined, limited)).status, 200);
  limited.close();
});

await test('media: without a read identity nothing is asked (404), and the log never carries the id or the link', async () => {
  seen.length = 0; logs.length = 0;
  assert.equal((await request('GET', `/media/${FILE_ID}`)).status, 404, 'the server with no COMPANY_OS_READ_TOKEN');
  assert.equal(seen.length, 0);
  assert.ok(logs.some((l) => l.event === 'media'));
  assert.doesNotMatch(JSON.stringify(logs), new RegExp(FILE_ID));
});

await test('media: a browser may cache it publicly, but never a shared cache behind the test gate', () => {
  assert.match(appModule.mediaCacheControl({ testGate: { on: false } }), /^public, max-age=\d+$/);
  assert.match(appModule.mediaCacheControl({}), /^public, max-age=\d+$/);
  assert.match(appModule.mediaCacheControl({ testGate: { on: true } }), /^private, max-age=\d+$/);
});

await test('proxy: /public-files is never forwarded, signed in or out, so the storage link never reaches a browser', async () => {
  upstreamReply = linkTo('receipt.png');
  seen.length = 0;
  const auth = { authorization: `Bearer ${GOOD}` };
  for (const [method, path] of [['GET', `/public-files/${FILE_ID}/url`], ['GET', `/%70ublic-files/${FILE_ID}/url`], ['GET', `/PUBLIC-FILES/${FILE_ID}/url`], ['GET', `/Public-Files/${FILE_ID}/url`], ['GET', `/public-files/${FILE_ID}/url?x=1`], ['POST', '/public-files/urls'], ['GET', '/public-files']]) {
    const body = method === 'POST' ? JSON.stringify({ ids: [FILE_ID] }) : undefined;
    for (const headers of [auth, {}]) {
      const r = await request(method, `/api/cos/t/hoy-dev${path}`, { ...headers, ...(body ? json : {}) }, body, mediaServer);
      assert.ok([401, 404].includes(r.status), `${method} ${path}: ${r.status}`);
      assert.doesNotMatch(r.body.toString(), new RegExp(SIGNED));
    }
    assert.equal((await request(method, `/api/cos/t/hoy-dev${path}`, { ...auth, ...(body ? json : {}) }, body, mediaServer)).status, 404, 'signed in: refused too');
  }
  assert.equal(seen.length, 0);
});

// ---------------------------------------------------------------------------------------------
// GET /files/<id> → the API's download link → the bytes
// ---------------------------------------------------------------------------------------------
const auth = { authorization: `Bearer ${GOOD}` };

await test('proxy: the private download link route is never forwarded (the browser gets bytes from /files/<id>)', async () => {
  seen.length = 0;
  upstreamReply = linkTo('receipt.png');
  for (const path of [`/api/cos/t/hoy-dev/files/${FILE_ID}/url`, `/api/cos/t/hoy-dev/files/${FILE_ID}/%75rl`, `/api/cos/t/hoy-dev/files/${FILE_ID}/url?x=1`, `/api/cos/t/hoy-dev/FILES/${FILE_ID}/url`, `/api/cos/t/hoy-dev/files/${FILE_ID}/URL`]) {
    const r = await request('GET', path, auth);
    assert.equal(r.status, 404, path);
    assert.ok(!r.body.includes(SIGNED));
  }
  assert.equal(seen.length, 0);
  // Other file routes (listing, upload) still go through.
  assert.equal((await request('GET', '/api/cos/t/hoy-dev/files?owner=x', auth)).status, 200);
});

await test('files: allowed → the API is asked with the user’s token, the bytes are streamed inline, never cached', async () => {
  seen.length = 0;
  storageSeen.length = 0;
  upstreamReply = linkTo('receipt.png');
  const r = await request('GET', `/files/${FILE_ID}`, { ...auth, cookie: 'c=1', 'x-real-ip': '203.0.113.9' });
  assert.equal(r.status, 200);
  assert.ok(r.body.equals(receipt));
  assert.equal(r.headers['content-type'], 'image/png');
  assert.equal(r.headers['content-disposition'], 'inline');
  assert.equal(r.headers['cache-control'], 'private, no-store');
  assert.equal(Number(r.headers['content-length']), receipt.length);
  assert.match(r.headers['content-security-policy'], /default-src 'none'.*sandbox/);
  assert.equal(r.headers['cross-origin-resource-policy'], 'same-origin');
  assert.equal(r.headers['x-content-type-options'], 'nosniff');
  assert.equal(seen.length, 1);
  assert.equal(seen[0].method, 'GET');
  assert.equal(seen[0].url, `/t/hoy-dev/files/${FILE_ID}/url`);
  assert.equal(seen[0].headers.authorization, `Bearer ${GOOD}`);
  assert.equal(seen[0].headers['x-real-ip'], '203.0.113.9');
  assert.equal(seen[0].headers.cookie, undefined);
  // Storage gets nothing of the user: no token, no cookie.
  assert.equal(storageSeen.length, 1);
  assert.equal(storageSeen[0].headers.authorization, undefined);
  assert.equal(storageSeen[0].headers.cookie, undefined);
});

await test('files: the signed link never reaches the browser (headers, body, errors) or the log', async () => {
  upstreamReply = linkTo('receipt.png');
  const ok = await request('GET', `/files/${FILE_ID}`, auth);
  const where = JSON.stringify(ok.headers);
  assert.doesNotMatch(where, new RegExp(SIGNED));
  assert.doesNotMatch(where, /127\.0\.0\.1:\d+\/obj|set-cookie|x-signed-url/);
  assert.ok(!ok.body.includes(SIGNED));
  upstreamReply = linkTo('broken'); // storage answers 500 with the link in its body
  const failed = await request('GET', `/files/${FILE_ID}`, auth);
  assert.equal(failed.status, 502);
  assert.deepEqual(JSON.parse(failed.body), { error: 'storage_error' });
  upstreamReply = linkTo('gone');
  const gone = await request('GET', `/files/${FILE_ID}`, auth);
  assert.equal(gone.status, 404);
  assert.doesNotMatch(gone.body.toString() + JSON.stringify(gone.headers), new RegExp(SIGNED));
  const text = JSON.stringify(logs);
  assert.doesNotMatch(text, new RegExp(SIGNED));
  assert.doesNotMatch(text, new RegExp(FILE_ID));
  assert.ok(logs.some((l) => l.event === 'file' && l.outcome === 'served' && l.status === 200));
});

await test('files: forbidden, missing and not-ready come back exactly as the API answered; storage is never asked', async () => {
  storageSeen.length = 0;
  for (const [status, answer, expected] of [
    [403, { error: 'forbidden' }, 'forbidden'],
    [404, { error: 'not found' }, 'not_found'], // the API's text is not a code: the status' own code instead
    [409, { error: 'file_not_ready', message: "the file hasn't been confirmed" }, 'file_not_ready'],
    [401, { error: 'unauthorized' }, 'unauthorized'],
  ]) {
    upstreamReply = linkTo(null, status, answer);
    const r = await request('GET', `/files/${FILE_ID}`, auth);
    assert.equal(r.status, status);
    assert.deepEqual(JSON.parse(r.body), { error: expected });
  }
  upstreamReply = linkTo(null, 500, { error: 'internal error' });
  assert.equal((await request('GET', `/files/${FILE_ID}`, auth)).status, 502);
  assert.equal(storageSeen.length, 0);
});

await test('files: no session, a bad token, a malformed id or another method → refused before the API', async () => {
  seen.length = 0;
  upstreamReply = linkTo('receipt.png');
  assert.equal((await request('GET', `/files/${FILE_ID}`)).status, 401);
  assert.equal((await request('GET', `/files/${FILE_ID}`, { authorization: 'Bearer forged' })).status, 401);
  assert.equal((await request('GET', `/files/${FILE_ID}`, { authorization: 'Basic eDp5' })).status, 401);
  for (const path of ['/files', '/files/', '/files/not-a-uuid', `/files/${FILE_ID}/url`, `/files/..%2F${FILE_ID}`, `/files/${FILE_ID}%2F..`]) {
    assert.equal((await request('GET', path, auth)).status, 404, path);
  }
  assert.equal((await request('POST', `/files/${FILE_ID}`, auth, 'x')).status, 405);
  assert.equal((await request('GET', `/files/${FILE_ID}`, { ...auth, 'content-length': '3' }, 'abc')).status, 400);
  assert.equal(seen.length, 0);
});

await test('files: size cap — a declared size over it is refused, an undeclared one is cut off at the cap', async () => {
  upstreamReply = linkTo('declared-big');
  const declared = await request('GET', `/files/${FILE_ID}`, auth);
  assert.equal(declared.status, 502);
  assert.deepEqual(JSON.parse(declared.body), { error: 'file_too_large' });
  upstreamReply = linkTo('undeclared-big');
  const cut = await request('GET', `/files/${FILE_ID}`, auth).catch((err) => ({ error: err }));
  // Either the connection is reset mid-answer, or it ends short: never more than the cap.
  assert.ok(cut.error || cut.body.length <= 4096, 'more than the cap reached the browser');
});

await test('files: a slow storage or API → 504 within the deadline; an unreachable API → 502', async () => {
  upstreamReply = linkTo('slow');
  const started = Date.now();
  const slow = await request('GET', `/files/${FILE_ID}`, auth);
  assert.equal(slow.status, 504);
  assert.ok(Date.now() - started < 1500);
  upstreamReply = () => {}; // never answers
  assert.equal((await request('GET', `/files/${FILE_ID}`, auth)).status, 504);
  // The deadline also covers the stream: a trickling download is cut off, and logged as a timeout.
  upstreamReply = linkTo('trickle');
  const trickled = await request('GET', `/files/${FILE_ID}`, auth).catch((err) => ({ error: err }));
  assert.ok(trickled.error, 'a trickling download must be cut off');
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(logs.filter((l) => l.event === 'file').at(-1).outcome, 'timeout');
  // A slow session check counts against the same deadline.
  const stuck = createHoyServer(await createHandler(config, { verifySession: () => new Promise(() => {}), log: () => {} }));
  await listen(stuck);
  assert.equal((await request('GET', `/files/${FILE_ID}`, auth, undefined, stuck)).status, 504);
  stuck.close();
  const down = createHoyServer(await createHandler({ ...config, companyOsUrl: 'http://127.0.0.1:1' }, { verifySession: fakeVerify, log: () => {} }));
  await listen(down);
  assert.equal((await request('GET', `/files/${FILE_ID}`, auth, undefined, down)).status, 502);
  down.close();
});

await test('files: anything but a safe image type is downloaded, never rendered on this origin', async () => {
  upstreamReply = linkTo('page.svg');
  const r = await request('GET', `/files/${FILE_ID}`, auth);
  assert.equal(r.status, 200);
  assert.equal(r.headers['content-type'], 'application/octet-stream');
  assert.equal(r.headers['content-disposition'], 'attachment');
});

await test('files: links the server must not fetch — other origins, http outside local, production unpinned, credentials, garbage', async () => {
  storageSeen.length = 0;
  const pinned = { ...config, fileStorageOrigins: ['https://storage.example'] };
  for (const [cfg, answer] of [
    [pinned, undefined],
    [{ ...config, environment: 'test' }, undefined], // http
    [{ ...config, environment: 'production', fileStorageOrigins: [storageOrigin] }, undefined], // http, even pinned
    [{ ...config, environment: 'production' }, { url: 'https://storage.example/obj/x?token=t' }], // production fetches nothing unpinned
    [config, { url: `http://user:pw@127.0.0.1:${storage.address().port}/obj/receipt.png` }],
    [config, { url: 'file:///etc/passwd' }],
    [config, { url: 42 }],
    [config, { nope: true }],
  ]) {
    const s = createHoyServer(await createHandler(cfg, { verifySession: fakeVerify, log: () => {} }));
    await listen(s);
    upstreamReply = linkTo('receipt.png', 200, answer);
    const r = await request('GET', `/files/${FILE_ID}`, auth, undefined, s);
    assert.equal(r.status, 502);
    assert.deepEqual(JSON.parse(r.body), { error: 'bad_file_link' });
    s.close();
  }
  assert.equal(storageSeen.length, 0);
  const allowed = createHoyServer(await createHandler({ ...config, fileStorageOrigins: [storageOrigin] }, { verifySession: fakeVerify, log: () => {} }));
  await listen(allowed);
  upstreamReply = linkTo('receipt.png');
  assert.equal((await request('GET', `/files/${FILE_ID}`, auth, undefined, allowed)).status, 200);
  allowed.close();
  upstreamReply = (req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end('{"ok":true}');
  };
});

// ---------------------------------------------------------------------------------------------
// POST /webhooks/resend → /webhooks/messaging/resend
// ---------------------------------------------------------------------------------------------
await test('webhook: the raw body and the Svix headers reach the API byte for byte', async () => {
  seen.length = 0;
  // Whitespace, key order and unicode exactly as Resend sent them: the signature covers these bytes.
  const raw = Buffer.from('{"type":"email.delivered",  "data":{"email_id":"e_1","to":["ñ@example.com"]}}\n', 'utf8');
  const r = await request('POST', '/webhooks/resend', {
    'content-type': 'application/json',
    'svix-id': 'msg_1',
    'svix-timestamp': '1761600000',
    'svix-signature': 'v1,abc=',
    authorization: 'Bearer should-not-pass',
    cookie: 'x=1',
  }, raw);
  assert.equal(r.status, 200);
  assert.equal(seen.length, 1);
  assert.equal(seen[0].url, '/webhooks/messaging/resend');
  assert.equal(seen[0].method, 'POST');
  assert.ok(seen[0].body.equals(raw));
  assert.equal(seen[0].headers['svix-id'], 'msg_1');
  assert.equal(seen[0].headers['svix-timestamp'], '1761600000');
  assert.equal(seen[0].headers['svix-signature'], 'v1,abc=');
  assert.equal(seen[0].headers['content-type'], 'application/json');
  assert.equal(seen[0].headers.authorization, undefined);
  assert.equal(seen[0].headers.cookie, undefined);
});

await test('webhook: the API’s answer (e.g. a bad signature) comes back as is', async () => {
  upstreamReply = (req, res) => {
    res.writeHead(401, { 'content-type': 'application/json' });
    res.end('{"error":"invalid_signature"}');
  };
  const r = await request('POST', '/webhooks/resend', { 'content-type': 'application/json', 'svix-id': 'a', 'svix-timestamp': '1', 'svix-signature': 'v1,x' }, '{}');
  assert.equal(r.status, 401);
  assert.deepEqual(JSON.parse(r.body), { error: 'invalid_signature' });
  upstreamReply = (req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end('{"ok":true}');
  };
});

await test('webhook: no signature headers → 400, too big → 413, GET → 405; none forwarded', async () => {
  seen.length = 0;
  assert.equal((await request('POST', '/webhooks/resend', { 'content-type': 'application/json' }, '{}')).status, 400);
  const sig = { 'content-type': 'application/json', 'svix-id': 'a', 'svix-timestamp': '1', 'svix-signature': 'v1,x' };
  assert.equal((await request('POST', '/webhooks/resend', sig, 'x'.repeat(5000))).status, 413);
  assert.equal((await request('POST', '/webhooks/resend', { ...sig, 'transfer-encoding': 'chunked' }, ['x'.repeat(3000), 'x'.repeat(3000)])).status, 413);
  assert.equal((await request('GET', '/webhooks/resend')).status, 405);
  assert.equal(seen.length, 0);
});

// ---------------------------------------------------------------------------------------------
// The real Clerk check (@clerk/backend), networkless with a local key pair
// ---------------------------------------------------------------------------------------------
await test('clerk: a valid session token from an authorized origin passes; wrong origin, expired, other key, pending fail', async () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const { privateKey: otherKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const pem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const verify = clerkSessionVerifier({ clerkSecretKey: undefined, clerkJwtKey: pem, authorizedParties: ['https://hoy-test.example'] });
  const now = Math.floor(Date.now() / 1000);
  const claims = { sub: 'user_2abc', sid: 'sess_1', azp: 'https://hoy-test.example', iss: 'https://heroic-gnu-516.clerk.accounts.dev', iat: now - 5, nbf: now - 5, exp: now + 60 };

  assert.deepEqual(await verify(signJwt(claims, privateKey)), { userId: 'user_2abc' });
  await assert.rejects(verify(signJwt({ ...claims, azp: 'https://evil.example' }, privateKey)));
  await assert.rejects(verify(signJwt({ ...claims, exp: now - 600, iat: now - 700, nbf: now - 700 }, privateKey)));
  await assert.rejects(verify(signJwt(claims, otherKey)));
  await assert.rejects(verify(signJwt({ ...claims, sts: 'pending' }, privateKey)));
  await assert.rejects(verify(signJwt({ ...claims, sub: undefined }, privateKey)));
  await assert.rejects(verify('not-a-jwt'));
  await assert.rejects(verify(''));
});

await test('clerk + proxy: the real check gates /api/cos end to end', async () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const pem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const realConfig = { ...config, clerkJwtKey: pem, authorizedParties: ['https://hoy-test.example'] };
  const real = createHoyServer(await createHandler(realConfig, { verifySession: clerkSessionVerifier(realConfig), log: () => {} }));
  await listen(real);
  const now = Math.floor(Date.now() / 1000);
  const token = signJwt({ sub: 'user_9', sid: 'sess_9', azp: 'https://hoy-test.example', iat: now - 5, nbf: now - 5, exp: now + 60 }, privateKey);
  seen.length = 0;
  const ok = await request('GET', '/api/cos/t/hoy-dev/me', { authorization: `Bearer ${token}` }, undefined, real);
  assert.equal(ok.status, 200);
  assert.equal(seen[0].headers.authorization, `Bearer ${token}`);
  const forged = await request('GET', '/api/cos/t/hoy-dev/me', { authorization: `Bearer ${token.slice(0, -4)}AAAA` }, undefined, real);
  assert.equal(forged.status, 401);
  assert.equal(seen.length, 1);
  real.close();
});

// ---------------------------------------------------------------------------------------------
// Configuration and the bundle secret scan
// ---------------------------------------------------------------------------------------------
await test('make-bundle: refuses the checkout, a folder inside it, a folder holding it, or a non-empty folder', async () => {
  const script = fileURLToPath(new URL('../server/make-bundle.mjs', import.meta.url));
  const checkout = fileURLToPath(new URL('..', import.meta.url));
  const stranger = join(root, 'not-a-bundle');
  await mkdir(stranger, { recursive: true });
  await writeFile(join(stranger, 'keep.txt'), 'keep');
  for (const out of [checkout, join(checkout, 'server'), join(checkout, '..'), '/', stranger]) {
    const run = spawnSync(process.execPath, [script, out], { encoding: 'utf8' });
    assert.equal(run.status, 1, out);
    assert.match(run.stderr, /make-bundle:/, out);
  }
  assert.equal((await import('node:fs')).readFileSync(join(stranger, 'keep.txt'), 'utf8'), 'keep');
});

await test('config: refuses a missing API address, tenant or Clerk key, a secret as the publishable key, production without origins', async () => {
  assert.throws(() => loadConfig({}), /COMPANY_OS_URL[\s\S]*COMPANY_OS_TENANT[\s\S]*CLERK_SECRET_KEY/);
  const ok = { COMPANY_OS_URL: 'http://api.railway.internal:4000', COMPANY_OS_TENANT: 'hoy', CLERK_SECRET_KEY: 'sk_live_x' };
  assert.equal(loadConfig(ok).tenant, 'hoy');
  assert.throws(() => loadConfig({ ...ok, CLERK_PUBLISHABLE_KEY: 'sk_live_x' }), /publishable/);
  assert.throws(() => loadConfig({ ...ok, COMPANY_OS_URL: 'ftp://x' }), /http/);
  assert.throws(() => loadConfig({ ...ok, COMPANY_OS_TENANT: '../platform' }), /slug/);
  assert.throws(() => loadConfig({ ...ok, RAILWAY_ENVIRONMENT_NAME: 'production' }), /APP_URL/);
  const prod = loadConfig({ ...ok, RAILWAY_ENVIRONMENT_NAME: 'production', APP_URL: 'https://hoy.example/app', CLERK_AUTHORIZED_PARTIES: 'https://www.hoy.example, https://hoy.example' });
  assert.deepEqual(prod.authorizedParties, ['https://hoy.example', 'https://www.hoy.example']);
  assert.deepEqual(loadConfig({ ...ok, FILE_STORAGE_ORIGINS: 'https://p.supabase.co/storage/v1, https://p.supabase.co' }).fileStorageOrigins, ['https://p.supabase.co']);
  assert.throws(() => loadConfig({ ...ok, FILE_STORAGE_ORIGINS: 'not a url' }), /FILE_STORAGE_ORIGINS/);
  assert.equal(loadConfig(ok).fileSizeLimit, 10 * 1024 * 1024);
});

await test('config: the go-live switch (SITE_LIVE, SITE_LIVE_AT) is checked at start', async () => {
  const ok = { COMPANY_OS_URL: 'http://api.railway.internal:4000', COMPANY_OS_TENANT: 'hoy', CLERK_SECRET_KEY: 'sk_live_x' };
  assert.deepEqual(loadConfig(ok).launch, { siteLive: false, siteLiveAt: null });
  assert.equal(loadConfig({ ...ok, SITE_LIVE: 'TRUE ' }).launch.siteLive, true);
  assert.equal(loadConfig({ ...ok, SITE_LIVE: 'false' }).launch.siteLive, false);
  assert.throws(() => loadConfig({ ...ok, SITE_LIVE: 'yes' }), /SITE_LIVE must be/);
  assert.equal(loadConfig({ ...ok, SITE_LIVE_AT: '2026-11-01T06:00:00-05:00' }).launch.siteLiveAt, '2026-11-01T06:00:00-05:00');
  assert.throws(() => loadConfig({ ...ok, SITE_LIVE_AT: '2026-11-01' }), /SITE_LIVE_AT/);
});
await test('config: PUBLIC_DOCUMENTS is retired (owner 2026-11-01): a value left set opens nothing and is not handed out', async () => {
  const ok = { COMPANY_OS_URL: 'http://api.railway.internal:4000', COMPANY_OS_TENANT: 'hoy', CLERK_SECRET_KEY: 'sk_live_x' };
  for (const value of ['/manual/es, /docs/terminos', '/manual', '/admin', '/docs/../admin']) {
    const c = loadConfig({ ...ok, PUBLIC_DOCUMENTS: value });
    assert.deepEqual(c.launch, { siteLive: false, siteLiveAt: null }, value);
    assert.ok(!JSON.stringify(c).includes('publicDocuments') && !JSON.stringify(c).includes(value.split(',')[0]), value);
  }
});

await test('check-bundle: finds secret shapes and this environment’s secret values; a clean dist passes', async () => {
  assert.deepEqual(await findSecrets(dist, {}), []);
  const dirty = join(root, 'dirty');
  await mkdir(dirty, { recursive: true });
  await writeFile(join(dirty, 'a.js'), `const k="sk_live_${'A'.repeat(30)}";`);
  await writeFile(join(dirty, 'b.js'), 'const x="my-own-platform-key-value";');
  await writeFile(join(dirty, 'c.jpg'), `sk_live_${'A'.repeat(30)}`); // binary files are not scanned
  const found = await findSecrets(dirty, { COMPANY_OS_PLATFORM_KEY: 'my-own-platform-key-value' });
  assert.equal(found.length, 2);
  assert.match(found.join('\n'), /a\.js: looks like a Clerk secret key/);
  assert.match(found.join('\n'), /b\.js: contains the value of COMPANY_OS_PLATFORM_KEY/);
});

// ---------------------------------------------------------------------------------------------
server.close();
upstream.close();
storage.close();
await rm(root, { recursive: true, force: true });
for (const [mark, name, err] of results) {
  console.log(`${mark} ${name}`);
  if (err) console.log(`   ${err.stack ?? err}`);
}
const failed = results.filter(([m]) => m === '❌').length;
console.log(failed ? `\n${failed} of ${results.length} failed` : `\nAll ${results.length} Hoy server checks passed`);
process.exit(failed ? 1 : 0);

// ---------------------------------------------------------------------------------------------
function listen(s) {
  return new Promise((r) => s.listen(0, '127.0.0.1', r));
}

/** A raw HTTP request (no URL normalisation, so traversal attempts reach the server as written). */
function request(method, path, headers = {}, body, target = server) {
  return new Promise((done, fail) => {
    const req = http.request({ host: '127.0.0.1', port: target.address().port, method, path, headers, agent: false }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => done({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
      // The server cut the answer off mid-body.
      res.on('error', (err) => fail(err));
      res.on('aborted', () => fail(new Error('answer cut off')));
    });
    req.on('error', (err) => fail(err));
    if (Array.isArray(body)) {
      for (const part of body) req.write(part);
      req.end();
    } else {
      req.end(body);
    }
  });
}

/**
 * Over a raw socket (Node's HTTP client drops an answer that arrives while it is still sending): sends
 * a chunked body that never ends, stops writing at the first byte of an answer, counts what it sent,
 * and reports the status line and whether the server closed the connection.
 */
function endless(path, headers) {
  return new Promise((done) => {
    const socket = net.connect(server.address().port, '127.0.0.1');
    let sent = 0;
    let answer = '';
    let finished = false;
    const end = (closed) => {
      if (finished) return;
      finished = true;
      const m = /^HTTP\/1\.1 (\d{3})/.exec(answer);
      done({ status: m ? Number(m[1]) : undefined, sent, closed });
    };
    const head = [`POST ${path} HTTP/1.1`, 'Host: 127.0.0.1', 'Transfer-Encoding: chunked', ...Object.entries(headers).map(([k, v]) => `${k}: ${v}`), '', ''].join('\r\n');
    const chunk = Buffer.concat([Buffer.from('4000\r\n'), Buffer.alloc(0x4000, 120), Buffer.from('\r\n')]);
    const pump = () => {
      if (finished || answer || socket.destroyed || sent > 64 * 1024 * 1024) return;
      socket.write(chunk, () => setImmediate(pump));
      sent += 0x4000;
    };
    socket.on('data', (d) => (answer += d.toString('latin1')));
    socket.on('error', () => {});
    socket.on('close', () => end(true));
    socket.on('end', () => setTimeout(() => end(true), 50));
    setTimeout(() => {
      socket.destroy();
      end(false);
    }, 5000).unref();
    socket.write(head, pump);
  });
}

function signJwt(claims, key) {
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const head = enc({ alg: 'RS256', typ: 'JWT', kid: 'ins_test' });
  const payload = enc(Object.fromEntries(Object.entries(claims).filter(([, v]) => v !== undefined)));
  const signer = createSign('RSA-SHA256');
  signer.update(`${head}.${payload}`);
  return `${head}.${payload}.${signer.sign(key).toString('base64url')}`;
}
