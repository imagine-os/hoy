// Lane Y6 (Hoy test-fixes): the server gate for the Hub's docs (owner, 2026-11-01: "Gate on the server first").
// The production build keeps the docs, the operations manual, the kanban, the changelog and the source documents out
// of the public bundle (dist/) and writes them to `<dist>-private/`, which the static server never serves. The Hoy
// server answers them at /private-docs/* only for a request whose bearer is a valid Clerk session AND whose Company OS
// `GET /t/<tenant>/me` says `isSuperAdmin: true` for a person who works as Super admin (not an AD-04 Administration). Everyone else gets 401/403 and no content, never cached.
// Hostile inputs: signed out, a forged or expired token (with the real @clerk/backend check), a forged cookie, client
// headers that claim a role, each staff role and a member, a /me answer that only looks like a super admin, the API
// down, traversal (`..`, encoded, absolute, backslash, NUL), unlisted files, the old /source/ and private paths through
// the static server, and Y2's stale-session fallback (a public read identity must never open the docs).
// Needs `npm ci --prefix server`. Run: node scripts/test-docs-gate.mjs
import assert from 'node:assert/strict';
import { createSign, generateKeyPairSync } from 'node:crypto';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { createHandler, createHoyServer } from '../server/app.mjs';
import { clerkSessionVerifier } from '../server/clerk.mjs';
import { loadConfig } from '../server/config.mjs';

const results = [];
async function test(name, fn) {
  try { await fn(); results.push(['✅', name]); } catch (err) { results.push(['❌', name, err]); }
}

// ── fixtures: a public dist/, its private sibling, a fake Company OS that answers /me per Clerk user ───────────────
const root = await mkdtemp(join(tmpdir(), 'hoy-docs-gate-'));
const dist = join(root, 'dist');
const priv = `${dist}-private`;
const SECRET_LINE = 'Texto interno del manual: la caja se cuadra a las 21:00.';
const PDF = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(3000, 65)]);
await mkdir(join(dist, 'assets'), { recursive: true });
await mkdir(join(priv, 'source', 'sub'), { recursive: true });
await writeFile(join(dist, 'index.html'), '<!doctype html><title>Hoy</title>');
await writeFile(join(priv, 'docs.json'), JSON.stringify({ version: 1, docs: [{ path: 'docs/ops-manual/es/01-x.md', info: { title: 'x' }, body: `${SECRET_LINE}\n`.repeat(200) }], images: {}, sources: [] }));
await writeFile(join(priv, 'source', 'manual-de-marca.pdf'), PDF);
await writeFile(join(priv, 'source', 'manual-de-marca-cover.jpg'), Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]));
await writeFile(join(priv, 'source', 'sub', 'nested.pdf'), PDF);
await writeFile(join(priv, 'source', '.hidden.pdf'), PDF);
await writeFile(join(priv, 'notes.txt'), SECRET_LINE);
await writeFile(join(root, 'outside.txt'), SECRET_LINE);

const ROLE_KEYS = ['member', 'front_desk', 'administrator', 'booking_manager', 'treasurer', 'coach', 'maintenance', 'marketing', 'developer'];
/** Clerk user → what the fake /me answers. */
const ME = {
  user_super: { status: 200, body: { user: { id: 'user_super' }, roleKeys: ['super_admin'], isSuperAdmin: true } },
  // AD-04: every Administration login also holds the tenant super_admin membership, so /me says isSuperAdmin for it;
  // it works as Administration (src/auth/companyOsIdentity.ts isSuperAdminMe) and the Hub's docs are not for it.
  user_admin_ad04: { status: 200, body: { user: { id: 'user_admin_ad04' }, roleKeys: ['administrator', 'super_admin'], isSuperAdmin: true } },
  // A platform operator: isSuperAdmin without a tenant role.
  user_operator: { status: 200, body: { user: { id: 'user_operator' }, roleKeys: [], isSuperAdmin: true } },
  user_lookalike: { status: 200, body: { user: { id: 'user_lookalike' }, roleKeys: ['super_admin'], isSuperAdmin: 'true' } },
  user_nomember: { status: 403, body: { error: 'no access to this tenant' } },
  user_meexpired: { status: 401, body: { error: 'unauthorized' } },
  user_down: { status: 500, body: { error: 'boom' } },
  user_garbage: { status: 200, raw: 'not json' },
  ...Object.fromEntries(ROLE_KEYS.map((k) => [`user_${k}`, { status: 200, body: { user: { id: `user_${k}` }, roleKeys: [k], isSuperAdmin: false } }])),
};
const seen = [];
const upstream = http.createServer((req, res) => {
  seen.push({ method: req.method, url: req.url, headers: req.headers });
  const sub = subOf(req.headers.authorization);
  if (req.url === '/t/hoy-dev/me' && ME[sub]) {
    const a = ME[sub];
    res.writeHead(a.status, { 'content-type': 'application/json' });
    return res.end(a.raw ?? JSON.stringify(a.body));
  }
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ data: [] }));
});
await listen(upstream);

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const { privateKey: otherKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const AZP = 'https://hoy-test.example';
const READ_TOKEN = `cos_svc_${'0'.repeat(8)}-0000-0000-0000-${'0'.repeat(12)}_${'R'.repeat(43)}`;
const config = {
  ...loadConfig({
    COMPANY_OS_URL: `http://127.0.0.1:${upstream.address().port}`,
    COMPANY_OS_TENANT: 'hoy-dev',
    CLERK_SECRET_KEY: 'sk_test_example',
    HOY_ENV: 'local',
    DIST_DIR: dist,
    APP_URL: AZP,
    UPSTREAM_TIMEOUT_MS: '800',
    COMPANY_OS_READ_TOKEN: READ_TOKEN,
  }),
  clerkJwtKey: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
};
const logs = [];
const server = createHoyServer(await createHandler(config, { verifySession: clerkSessionVerifier(config), log: (e) => logs.push(e) }));
await listen(server);

const now = () => Math.floor(Date.now() / 1000);
const tokenFor = (sub, { key = privateKey, exp = now() + 600, azp = AZP, sts } = {}) => signJwt({ sub, sid: `sess_${sub}`, azp, iat: now() - 10, nbf: now() - 10, exp, sts }, key);
const auth = (sub, opts) => ({ authorization: `Bearer ${tokenFor(sub, opts)}` });
const DOCS = '/private-docs/docs.json';
const PDF_PATH = '/private-docs/source/manual-de-marca.pdf';

/** A refusal: the status, a JSON error code and nothing of the content, never cacheable. */
function refused(r, status) {
  assert.equal(r.status, status, `status ${r.status}: ${r.body.toString().slice(0, 120)}`);
  assert.doesNotMatch(r.body.toString(), /Texto interno|%PDF/);
  assert.ok(r.body.length < 200, 'a refusal carries no content');
  assert.match(r.headers['cache-control'] ?? '', /no-store/);
  if (status !== 404 || r.headers['content-type']?.includes('json')) assert.match(r.body.toString(), /^\{"error":"[a-z_]+"\}$/);
}

// ── super admin ────────────────────────────────────────────────────────────────────────────────────────────────
await test('super admin: docs.json is served, private and never stored, gzipped on request', async () => {
  seen.length = 0;
  const r = await request('GET', DOCS, { ...auth('user_super'), 'accept-encoding': 'gzip' });
  assert.equal(r.status, 200);
  assert.equal(r.headers['cache-control'], 'private, no-store');
  assert.match(r.headers.vary ?? '', /Authorization/i);
  assert.match(r.headers['content-type'], /^application\/json/);
  assert.equal(r.headers['content-encoding'], 'gzip');
  assert.match(gunzipSync(r.body).toString(), /Texto interno del manual/);
  const me = seen.filter((s) => s.url === '/t/hoy-dev/me');
  assert.equal(me.length, 1, 'one /me per request, on the configured tenant');
  assert.match(me[0].headers.authorization, /^Bearer ey/, 'asked with the user\'s own token');
});

await test('super admin: a source PDF and its cover are served (inline, typed)', async () => {
  const r = await request('GET', PDF_PATH, auth('user_super'));
  assert.equal(r.status, 200);
  assert.equal(r.headers['content-type'], 'application/pdf');
  assert.equal(r.headers['cache-control'], 'private, no-store');
  assert.equal(Buffer.compare(r.body, PDF), 0);
  const c = await request('GET', '/private-docs/source/manual-de-marca-cover.jpg', auth('user_super'));
  assert.equal(c.status, 200);
  assert.equal(c.headers['content-type'], 'image/jpeg');
  const head = await request('HEAD', DOCS, auth('user_super'));
  assert.equal(head.status, 200);
  assert.equal(head.body.length, 0);
});

// ── who is refused ─────────────────────────────────────────────────────────────────────────────────────────────
await test('signed out: 401 for every private path, and Company OS is never asked', async () => {
  seen.length = 0;
  for (const p of [DOCS, PDF_PATH, '/private-docs', '/private-docs/', '/private-docs/nope']) refused(await request('GET', p), 401);
  assert.equal(seen.length, 0);
});

await test('a forged, expired, pending or foreign-origin token: 401, Company OS never asked', async () => {
  seen.length = 0;
  for (const headers of [
    { authorization: 'Bearer not-a-jwt' },
    { authorization: 'Basic dXNlcjpwYXNz' },
    { authorization: 'Bearer ' },
    auth('user_super', { key: otherKey }),
    auth('user_super', { exp: now() - 60 }),
    auth('user_super', { sts: 'pending' }),
    auth('user_super', { azp: 'https://evil.example' }),
  ]) refused(await request('GET', DOCS, headers), 401);
  assert.equal(seen.length, 0);
});

await test('a cookie or a client header never stands in for the session', async () => {
  seen.length = 0;
  const forged = tokenFor('user_super');
  for (const headers of [
    { cookie: `__session=${forged}` },
    { cookie: '__session=forged; __client_uat=1' },
    { 'x-super-admin': 'true', 'x-hoy-role': 'super_admin', 'x-clerk-user-id': 'user_super' },
    { 'x-hoy-session': 'stale' },
  ]) refused(await request('GET', DOCS, headers), 401);
  assert.equal(seen.length, 0);
});

await test('Y2 stale-session fallback never applies: an expired session with the read identity configured is 401', async () => {
  seen.length = 0;
  const r = await request('GET', DOCS, auth('user_super', { exp: now() - 600 }));
  refused(r, 401);
  assert.equal(r.headers['x-hoy-session'], undefined);
  assert.ok(!seen.some((s) => s.headers.authorization === `Bearer ${READ_TOKEN}`), 'the read identity is never used');
});

await test('every staff role and a member: 403, no content', async () => {
  for (const k of ROLE_KEYS) {
    for (const p of [DOCS, PDF_PATH]) refused(await request('GET', p, auth(`user_${k}`)), 403);
  }
});

await test('AD-04: an Administration login (it also holds super_admin, so /me says isSuperAdmin) is 403; a platform operator is served', async () => {
  for (const p of [DOCS, PDF_PATH]) refused(await request('GET', p, auth('user_admin_ad04')), 403);
  assert.equal((await request('GET', DOCS, auth('user_operator'))).status, 200);
});

await test('a /me that only looks like a super admin, or no membership: 403; /me 401: 401; API down or garbage: 502', async () => {
  refused(await request('GET', DOCS, auth('user_lookalike')), 403);
  refused(await request('GET', DOCS, auth('user_nomember')), 403);
  refused(await request('GET', DOCS, auth('user_meexpired')), 401);
  refused(await request('GET', DOCS, auth('user_down')), 502);
  refused(await request('GET', DOCS, auth('user_garbage')), 502);
  refused(await request('GET', DOCS, auth('user_unknown')), 502);
});

await test('only GET and HEAD, with no body', async () => {
  for (const m of ['POST', 'PUT', 'DELETE', 'PATCH']) refused(await request(m, DOCS, auth('user_super')), 405);
  refused(await request('GET', DOCS, { ...auth('user_super'), 'content-length': '5' }, 'hello'), 400);
});

// ── paths ──────────────────────────────────────────────────────────────────────────────────────────────────────
const HOSTILE = [
  '/private-docs/../dist-private/docs.json', '/private-docs/%2e%2e/outside.txt', '/private-docs/..%2Foutside.txt',
  '/private-docs/source/..%2F..%2Foutside.txt', '/private-docs/source/%2e%2e%2fnotes.txt', '/private-docs//etc/passwd',
  '/private-docs/%2Fetc%2Fpasswd', '/private-docs/source/..\\notes.txt', '/private-docs/source/manual-de-marca.pdf%00.jpg',
  '/private-docs/source/sub/nested.pdf', '/private-docs/source/.hidden.pdf', '/private-docs/notes.txt',
  '/private-docs/source/', '/private-docs/source', '/private-docs/DOCS.JSON', '/private-docs/docs.json/',
  '/private-docs/source/manual-de-marca.pdf/..', '/private-docs/source/MANUAL-DE-MARCA.PDF',
];
await test('traversal and unlisted files: 404 for the super admin, 401 signed out (nothing probed without a session)', async () => {
  for (const p of HOSTILE) {
    refused(await request('GET', p, auth('user_super')), 404);
    refused(await request('GET', p), 401);
    refused(await request('GET', p, auth('user_front_desk')), 403);
  }
});

await test('the static server never serves the private folder, the old /source/ files or traversal into them', async () => {
  for (const p of ['/source/manual-de-marca.pdf', '/source/manual-de-marca-cover.jpg', '/../dist-private/docs.json', '/%2e%2e/dist-private/docs.json', '/dist-private/docs.json', '/private-docs.json']) {
    const r = await request('GET', p, auth('user_super'));
    assert.equal(r.status, 404, p);
    assert.doesNotMatch(r.body.toString(), /Texto interno|%PDF/, p);
  }
});

await test('logs carry the outcome, never a token or a path beyond the prefix', async () => {
  const lines = logs.filter((l) => l.event === 'docs');
  assert.ok(lines.length > 10);
  assert.ok(lines.some((l) => l.outcome === 'served') && lines.some((l) => l.outcome === 'not_super_admin') && lines.some((l) => l.outcome === 'unauthorized'));
  assert.doesNotMatch(JSON.stringify(lines), /eyJ|Bearer|passwd|outside/);
});

await test('no private folder built (the review build): the super admin gets 404, everyone else still 401/403', async () => {
  const bare = join(root, 'bare');
  await mkdir(bare, { recursive: true });
  await writeFile(join(bare, 'index.html'), '<!doctype html>');
  const s = createHoyServer(await createHandler({ ...config, distDir: bare }, { verifySession: clerkSessionVerifier(config), log: () => {} }));
  await listen(s);
  refused(await request('GET', DOCS, auth('user_super'), undefined, s), 404);
  refused(await request('GET', DOCS, {}, undefined, s), 401);
  refused(await request('GET', DOCS, auth('user_coach'), undefined, s), 403);
  s.close();
});

server.close();
upstream.close();
for (const [mark, name, err] of results) {
  console.log(`${mark} ${name}`);
  if (err) console.log(`   ${err.stack?.split('\n').slice(0, 3).join('\n   ')}`);
}
const failed = results.filter(([m]) => m === '❌').length;
if (failed) { console.error(`\n${failed} docs gate check(s) failed`); process.exit(1); }
console.log(`\ndocs gate passed (${results.length})`);

// ── helpers ────────────────────────────────────────────────────────────────────────────────────────────────────
function subOf(authorization) {
  try { return JSON.parse(Buffer.from((authorization ?? '').split(' ')[1].split('.')[1], 'base64url').toString()).sub; } catch { return null; }
}
function listen(s) { return new Promise((r) => s.listen(0, '127.0.0.1', r)); }
function request(method, path, headers = {}, body, target = server) {
  return new Promise((done, fail) => {
    const req = http.request({ host: '127.0.0.1', port: target.address().port, method, path, headers, agent: false }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => done({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', fail);
    req.end(body);
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
