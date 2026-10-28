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
import { ANONYMOUS_ROUTES, createHandler, createHoyServer } from '../server/app.mjs';
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
  // The go-live switch defaults to Coming Soon (SW-08).
  assert.deepEqual(body.launch, { siteLive: false, siteLiveAt: null, publicDocuments: [] });
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
// GET /files/<id> → the API's download link → the bytes
// ---------------------------------------------------------------------------------------------
const auth = { authorization: `Bearer ${GOOD}` };

await test('proxy: the private download link route is never forwarded (the browser gets bytes from /files/<id>)', async () => {
  seen.length = 0;
  upstreamReply = linkTo('receipt.png');
  for (const path of [`/api/cos/t/hoy-dev/files/${FILE_ID}/url`, `/api/cos/t/hoy-dev/files/${FILE_ID}/%75rl`, `/api/cos/t/hoy-dev/files/${FILE_ID}/url?x=1`]) {
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

await test('config: the go-live switch (SITE_LIVE, SITE_LIVE_AT, PUBLIC_DOCUMENTS) is checked at start', async () => {
  const ok = { COMPANY_OS_URL: 'http://api.railway.internal:4000', COMPANY_OS_TENANT: 'hoy', CLERK_SECRET_KEY: 'sk_live_x' };
  assert.deepEqual(loadConfig(ok).launch, { siteLive: false, siteLiveAt: null, publicDocuments: [] });
  assert.equal(loadConfig({ ...ok, SITE_LIVE: 'TRUE ' }).launch.siteLive, true);
  assert.equal(loadConfig({ ...ok, SITE_LIVE: 'false' }).launch.siteLive, false);
  assert.throws(() => loadConfig({ ...ok, SITE_LIVE: 'yes' }), /SITE_LIVE must be/);
  assert.equal(loadConfig({ ...ok, SITE_LIVE_AT: '2026-11-01T06:00:00-05:00' }).launch.siteLiveAt, '2026-11-01T06:00:00-05:00');
  assert.throws(() => loadConfig({ ...ok, SITE_LIVE_AT: '2026-11-01' }), /SITE_LIVE_AT/);
  assert.deepEqual(loadConfig({ ...ok, PUBLIC_DOCUMENTS: '/manual/es, /docs/terminos' }).launch.publicDocuments, ['/manual/es', '/docs/terminos']);
  assert.throws(() => loadConfig({ ...ok, PUBLIC_DOCUMENTS: '/admin' }), /PUBLIC_DOCUMENTS/);
  assert.throws(() => loadConfig({ ...ok, PUBLIC_DOCUMENTS: '/docs/../admin' }), /PUBLIC_DOCUMENTS/);
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
