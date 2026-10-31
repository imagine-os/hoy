// M-07 activity log on Company OS (Hoy all-roles lane E): the audit read in `src/data/companyos/audit.ts`.
// Contract: Company OS `GET /t/:t/audit` (integration guide, admin routes table): super admin only; `?limit` ≤ 500,
// `?before=<ISO time>` pages with the last row's `at`, `?since`, `?event=<prefix>`, `?result`, `?actor`, `?q`;
// answers `{ events: [{ id, at, actor, event, result, details }] }`, newest first. A fake `request` records every call.
// No network, no browser. Fictional data only.
// Run: node scripts/test-admin-activity.mjs
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const scratch = await mkdtemp(join(tmpdir(), 'hoy-activity-'));
let passed = 0, failed = 0;
const row = async (name, fn) => {
  try { await fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { failed++; console.log(`FAIL ${name}\n     ${String(e?.message ?? e).split('\n').slice(0, 4).join('\n     ')}`); }
};

/** The query parameters Company OS's audit route accepts (apps/api/src/routes/client-audit.ts `listSchema`). */
const DOCUMENTED = new Set(['limit', 'before', 'since', 'event', 'result', 'actor', 'q']);
const ISO_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

/** A fake Company OS audit trail: `n` events one second apart (newest first), paged like the API. */
function fakeAudit(n, { start = Date.parse('2026-10-30T12:00:00.000Z'), sameMsAt = null } = {}) {
  const events = Array.from({ length: n }, (_, i) => ({
    id: `aud_${String(i).padStart(5, '0')}`,
    // `sameMsAt`: rows from that index share one millisecond (the API keeps microseconds; JSON shows milliseconds).
    at: new Date(sameMsAt != null && i >= sameMsAt ? start - sameMsAt * 1000 : start - i * 1000).toISOString(),
    actor: i % 3 === 0 ? 'usr_admin' : i % 3 === 1 ? null : 'platform:key',
    event: i % 2 ? 'record.updated' : 'client.view_as',
    result: 'OK',
    details: i % 2 ? { entity: 'booking', id: `bk_${i}`, fields: ['status'] } : { clientReported: true, resource: '/admin', detail: {}, result: 'OK' },
  }));
  const calls = [];
  const request = async (method, path) => {
    calls.push({ method, path });
    const url = new URL(path, 'http://x');
    if (method !== 'GET' || url.pathname !== '/audit') throw Object.assign(new Error('not_found'), { code: 'not_found', status: 404 });
    for (const k of url.searchParams.keys()) if (!DOCUMENTED.has(k)) throw Object.assign(new Error('invalid_query'), { code: 'invalid_query', status: 400 });
    const limit = Number(url.searchParams.get('limit') ?? 100);
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) throw Object.assign(new Error('invalid_query'), { code: 'invalid_query', status: 400 });
    const before = url.searchParams.get('before');
    if (before && !ISO_OFFSET.test(before)) throw Object.assign(new Error('invalid_query'), { code: 'invalid_query', status: 400 });
    const since = url.searchParams.get('since');
    const rows = events.filter((e) => (!before || Date.parse(e.at) < Date.parse(before)) && (!since || Date.parse(e.at) >= Date.parse(since)));
    return { events: rows.slice(0, limit) };
  };
  return { request, calls, events };
}

try {
  const file = join(scratch, 'activity.mjs');
  await build({
    stdin: { contents: [
      "export * from './src/data/companyos/audit';",
      "export { refusalCopy, hasRefusalCopy } from './src/data/companyos/refusals';",
      "export { normalizeCode } from './src/data/companyos/transport';",
      "export { strings as adminStrings } from './src/modules/admin/strings';",
    ].join('\n'), resolveDir: process.cwd() },
    bundle: true, format: 'esm', platform: 'node', outfile: file, logLevel: 'silent', jsx: 'automatic',
    define: { 'import.meta.env.VITE_HOY_BUILD': '"production"', 'import.meta.env.DEV': 'false' },
  });
  const m = await import(pathToFileURL(file));

  await row('AC-01 the request names only documented parameters, limit 500, and the range as `since`', async () => {
    const path = m.auditPath({ since: '2026-10-23T05:00:00.000Z' });
    const url = new URL(path, 'http://x');
    assert.equal(url.pathname, '/audit');
    for (const k of url.searchParams.keys()) assert.ok(DOCUMENTED.has(k), `undocumented parameter ${k}`);
    assert.equal(url.searchParams.get('limit'), '500');
    assert.equal(url.searchParams.get('since'), '2026-10-23T05:00:00.000Z');
    assert.equal(m.auditPath({}), '/audit?limit=500', 'no range: only the limit');
  });

  await row('AC-02 hostile filter text is URL-encoded, never a second parameter; empty values are left out', async () => {
    const url = new URL(m.auditPath({ q: 'x&actor=usr_admin%_', event: 'record.', actor: '' }), 'http://x');
    assert.equal(url.searchParams.get('q'), 'x&actor=usr_admin%_');
    assert.equal(url.searchParams.get('actor'), null);
    assert.equal(url.searchParams.get('event'), 'record.');
    assert.equal([...url.searchParams.keys()].length, 3);
  });

  await row('AC-03 the limit is kept within 1…500 whatever the caller asks', async () => {
    for (const [ask, want] of [[0, '1'], [-5, '1'], [9999, '500'], [120, '120'], [Number.NaN, '500']]) {
      assert.equal(new URL(m.auditPath({ limit: ask }), 'http://x').searchParams.get('limit'), want, `limit ${ask}`);
    }
  });

  await row('AC-04 pages past one page: 1 230 events come back in full, in order, each once', async () => {
    const api = fakeAudit(1230);
    const out = await m.readAudit((method, path) => api.request(method, path), {});
    assert.equal(out.events.length, 1230);
    assert.equal(out.truncated, false);
    assert.equal(new Set(out.events.map((e) => e.id)).size, 1230, 'no duplicates');
    assert.deepEqual(out.events.map((e) => e.id), api.events.map((e) => e.id), 'newest first, nothing skipped');
    assert.ok(api.calls.length >= 3, `${api.calls.length} requests`);
    for (const c of api.calls) for (const k of new URL(c.path, 'http://x').searchParams.keys()) assert.ok(DOCUMENTED.has(k), k);
    const second = new URL(api.calls[1].path, 'http://x').searchParams.get('before');
    assert.match(second, ISO_OFFSET, 'before is an ISO time with offset');
  });

  await row('AC-05 rows sharing the page boundary\'s millisecond are not skipped (the API pages with `before` < at)', async () => {
    const api = fakeAudit(700, { sameMsAt: 495 }); // rows 495…699 share one millisecond, across the 500-row page edge
    const out = await m.readAudit((method, path) => api.request(method, path), {});
    assert.equal(new Set(out.events.map((e) => e.id)).size, 700);
    assert.equal(out.events.length, 700);
  });

  await row('AC-06 stops at the row cap and says it did (no endless paging)', async () => {
    const api = fakeAudit(2600);
    const out = await m.readAudit((method, path) => api.request(method, path), { maxRows: 1000 });
    assert.equal(out.events.length, 1000);
    assert.equal(out.truncated, true);
    assert.ok(api.calls.length <= 4, `${api.calls.length} requests`);
  });

  await row('AC-07 a page that brings nothing new ends the read (a server that ignores `before` cannot loop it)', async () => {
    let n = 0;
    const page = Array.from({ length: 500 }, (_, i) => ({ id: `x${i}`, at: '2026-10-30T12:00:00.000Z', actor: null, event: 'a.b', result: 'OK', details: {} }));
    const out = await m.readAudit(async () => { n++; return { events: page }; }, {});
    assert.equal(out.events.length, 500);
    assert.ok(n <= 3, `${n} requests`);
  });

  await row('AC-08 an empty trail is an empty list (the screen shows its empty state), one request', async () => {
    const api = fakeAudit(0);
    const out = await m.readAudit((method, path) => api.request(method, path), { since: '2026-10-30T00:00:00.000Z' });
    assert.deepEqual(out, { events: [], truncated: false });
    assert.equal(api.calls.length, 1);
  });

  await row('AC-09 a refusal is thrown as it came (the screen turns its code into copy), nothing half-read is shown', async () => {
    const refused = Object.assign(new Error('forbidden'), { code: 'forbidden', status: 403 });
    await assert.rejects(m.readAudit(async () => { throw refused; }, {}), (e) => e === refused);
    let n = 0;
    await assert.rejects(m.readAudit(async () => { if (n++) throw refused; return { events: fakeAudit(500).events }; }, {}), (e) => e === refused);
  });

  await row('AC-10 a malformed answer is refused as `service_unavailable`, not shown as "no activity"', async () => {
    for (const body of [null, {}, { events: 'x' }, { events: [{ id: 1 }] }]) {
      await assert.rejects(m.readAudit(async () => body, {}), (e) => e.code === 'service_unavailable', JSON.stringify(body));
    }
  });

  await row('AC-11 events become screen rows: who from the member names, object from details, source, result', async () => {
    const names = new Map([['usr_admin', 'Olga Admin']]);
    const labels = { system: 'Sistema', platform: 'Plataforma', unknown: (id) => `Usuario ${id}` };
    const [a, b, c, d] = m.activityRows([
      { id: '1', at: '2026-10-30T12:00:00.000Z', actor: 'usr_admin', event: 'record.updated', result: 'OK', details: { entity: 'booking', id: 'bk_1', fields: ['status'] } },
      { id: '2', at: '2026-10-30T11:00:00.000Z', actor: null, event: 'payments.hold_expired', result: 'OK', details: {} },
      { id: '3', at: '2026-10-30T10:00:00.000Z', actor: 'platform:key', event: 'tenant.updated', result: 'OK', details: null },
      { id: '4', at: '2026-10-30T09:00:00.000Z', actor: 'usr_gone', event: 'client.access_denied', result: 'UNAUTHORIZED', details: { clientReported: true, resource: '/admin/finance', result: 'UNAUTHORIZED' } },
    ], names, labels);
    assert.deepEqual({ id: a.id, created_at: a.created_at, who: a.who, action: a.action, entity: a.entity, entity_id: a.entity_id, object: a.object, source: a.sourceKey, result: a.result, actor: a.actor_id },
      { id: '1', created_at: '2026-10-30T12:00:00.000Z', who: 'Olga Admin', action: 'record.updated', entity: 'booking', entity_id: 'bk_1', object: 'booking#bk_1', source: 'api', result: 'OK', actor: 'usr_admin' });
    assert.deepEqual([b.who, b.entity, b.object, b.sourceKey], ['Sistema', 'payments', 'payments', 'automation']);
    assert.deepEqual([c.who, c.entity, c.sourceKey], ['Plataforma', 'tenant', 'platform']);
    assert.deepEqual([d.who, d.sourceKey, d.result, d.object], ['Usuario usr_gone', 'app', 'UNAUTHORIZED', 'client']);
    assert.deepEqual(d.diff, { clientReported: true, resource: '/admin/finance', result: 'UNAUTHORIZED' });
  });

  await row('AC-12 every code the read can meet has Spanish and English copy in the code→copy table', async () => {
    assert.equal(m.normalizeCode('super-admin only', 403), 'forbidden', 'the API\'s "super-admin only" is `forbidden`');
    assert.equal(m.normalizeCode('invalid query', 400), 'invalid_query');
    for (const code of m.AUDIT_REFUSALS) {
      assert.ok(m.hasRefusalCopy(code), `no copy for ${code}`);
      assert.ok(m.refusalCopy(code, 'es') && m.refusalCopy(code, 'en') && m.refusalCopy(code, 'es') !== m.refusalCopy(code, 'en'), `${code} needs es and en`);
    }
    for (const code of ['forbidden', 'invalid_query', 'unauthorized', 'network_error', 'service_unavailable']) assert.ok(m.AUDIT_REFUSALS.includes(code), code);
  });

  await row('AC-13 the screen\'s new lines exist in Spanish and English', async () => {
    for (const key of ['admin.activity.superAdminOnly', 'admin.activity.truncated', 'admin.activity.platform', 'admin.activity.unknownActor', 'admin.activity.retry', 'admin.activity.empty.none', 'admin.activity.source.api', 'admin.activity.source.platform', 'admin.activity.retention.live']) {
      const s = m.adminStrings[key];
      assert.ok(s?.es && s?.en && s.es !== s.en, `missing or untranslated ${key}`);
    }
  });
} catch (e) {
  failed++;
  console.log(`FAIL the audit module loads (${String(e?.message ?? e).split('\n')[0]})`);
} finally {
  await rm(scratch, { recursive: true, force: true });
}
console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
