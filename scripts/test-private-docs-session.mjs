// Review round 2 (r2hoy, L5 and L6): what the super admin's tab keeps when the session changes (production build).
// L5: the gated docs pack (PrivateDocsWatch) and the wireframe skin (WireframeGate) belong to the signed-in super
// admin. Only a settled answer that this is not the super admin drops them: signed out, a login whose /me has no role
// for this tab, or one that needs sign-up. A /me that failed once (the `error` state, a network blip) or is still
// loading is not an answer: the tab is not reloaded and the skin stays.
// L6: a docs pack that arrives after the drop (sign-out while docs.json was still downloading) is thrown away.
// Fictional data only. Run: node scripts/test-private-docs-session.mjs
import { build } from 'esbuild';
import assert from 'node:assert/strict';

let failures = 0, passed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log(`ok   ${name}`); }
  catch (e) { failures++; console.log(`FAIL ${name}\n     ${String(e?.stack ?? e).split('\n').slice(0, 3).join('\n     ')}`); }
}
async function load(contents) {
  try {
    const out = await build({
      stdin: { contents, resolveDir: process.cwd(), loader: 'ts' },
      bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent', jsx: 'automatic',
      loader: { '.jpg': 'empty', '.png': 'empty', '.webp': 'empty', '.svg': 'empty', '.css': 'empty', '.md': 'text' },
      define: { 'import.meta.env': '{"VITE_HOY_BUILD":"production","DEV":false,"PROD":true}', __HOY_BUILD__: '"production"' },
    });
    return await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
  } catch (e) { console.log(`FAIL does not build: ${String(e.message).split('\n')[1] ?? e.message}`); failures++; return {}; }
}
const m = await load([
  "export { superAdminTab } from './src/auth/superAdminTab';",
  "export { loadPrivateDocs, privateDocs, privateDocsLoaded, dropPrivateDocs } from './src/modules/docs/privateDocs';",
  "export { setSessionTokenSource } from './src/auth/sessionToken';",
].join('\n'));

const session = (status, extra = {}) => ({ status, signedIn: true, isSuperAdmin: false, viewAs: null, ...extra });

// ── L5 ──────────────────────────────────────────────────────────────────────────────────────────────────────────
await test('L5: the super admin (or the super admin viewing as a role) is allowed', () => {
  assert.equal(m.superAdminTab(session('ready', { isSuperAdmin: true })), 'allowed');
  assert.equal(m.superAdminTab(session('ready', { viewAs: 'front_desk' })), 'allowed');
});
await test('L5: a /me that failed once, or is still loading, is not an answer: nothing is dropped', () => {
  for (const s of [session('error'), session('loading'), session('error', { signedIn: false }), session('loading', { signedIn: false })]) {
    assert.equal(m.superAdminTab(s), 'unsettled', JSON.stringify(s));
  }
});
await test('L5: signed out, or a settled answer that is not the super admin, drops the tab\'s super admin things', () => {
  for (const s of [session('ready', { signedIn: false }), session('ready'), session('no-role'), session('needs-signup'), session('unverified')]) {
    assert.equal(m.superAdminTab(s), 'denied', JSON.stringify(s));
  }
});
await test('L5: both watchers decide through the same rule (no local copy of it)', async () => {
  const { readFileSync } = await import('node:fs');
  for (const f of ['src/modules/docs/PrivateDocsWatch.tsx', 'src/app/WireframeGate.tsx']) {
    const src = readFileSync(f, 'utf8');
    assert.match(src, /superAdminTab\(/, f);
    assert.doesNotMatch(src, /status !== 'loading'/, `${f} keeps its own settled rule`);
  }
});

// ── L6 ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const PACK = { version: 1, docs: [{ path: 'docs/ops-manual/es/01-x.md', info: { title: 'x' }, body: 'Texto interno ficticio.' }], images: {}, sources: [] };
function deferredFetch() {
  const waiting = [];
  globalThis.fetch = (url, init) => new Promise((resolve) => waiting.push({ url, init, resolve }));
  return { waiting, answer: (i = 0, body = PACK) => waiting[i].resolve(new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })) };
}
await test('L6: a pack that lands after the drop (signed out mid-download) is not kept', async () => {
  m.setSessionTokenSource(async () => 'tok_fictional');
  const f = deferredFetch();
  const loading = m.loadPrivateDocs();
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(f.waiting.length, 1, 'docs.json asked');
  m.dropPrivateDocs();
  f.answer();
  const state = await loading;
  assert.notEqual(state, 'ok');
  assert.equal(m.privateDocs(), null, 'nothing of the pack in memory');
  assert.equal(m.privateDocsLoaded(), false);
});
await test('L6: a load started after the drop (the next super admin) does not join the dropped one, and keeps its pack', async () => {
  const f = deferredFetch();
  const dropped = m.loadPrivateDocs();
  await new Promise((r) => setTimeout(r, 5));
  m.dropPrivateDocs();
  const fresh = m.loadPrivateDocs();
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(f.waiting.length, 2, 'a new request, not the dropped one');
  f.answer(1);
  assert.equal(await fresh, 'ok');
  f.answer(0, { ...PACK, docs: [] });
  assert.notEqual(await dropped, 'ok');
  assert.equal(m.privateDocs()?.docs.length, 1, 'the late dropped answer does not replace the fresh pack');
  m.dropPrivateDocs();
  assert.equal(m.privateDocs(), null);
});

console.log(`\n${passed} passed, ${failures} failed`);
if (failures) process.exit(1);
