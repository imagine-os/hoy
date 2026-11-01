// M1 (review round 1, Hoy all-roles): the one-off operator script that moves the pay data (payroll, integrations, the
// staff-only contacts) out of a `studio_settings` record saved before the split (decision F-01) into `studio_private`,
// through the Company OS API. Run against a fake Company OS (an HTTP server on 127.0.0.1); fictional values only.
// Checks: dry run by default (no write), what would move is named without its values, --apply writes both records in
// one /batch with an Idempotency-Key, a second run moves nothing, an existing studio_private keeps its values, --check
// fails while anything is left, the credentials come only from the environment (never a .env file), plain http to a
// remote host is refused, a refusal or a malformed answer stops before any write, and the token is never printed.
// Run: node scripts/test-move-private-settings.mjs
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { reporter } from './lib/launch-qa.mjs';

const { check, done } = reporter('move private settings');
const SCRIPT = resolve('scripts/move-private-settings.ts');
const TENANT = 'hoy-mp';
const TOKEN = 'tok_operator_SECRET_9f3a';
const SECRET_ACCOUNT = '0099-SECRET-ACCOUNT';
const SECRET_PHONE = '+57 300 SECRET 11';

const LEGACY = {
  profile: { name: 'Estudio Ficticio' },
  hours: { mon: '08:00-20:00' },
  contacts: { classes: { whatsapp: '+57 300 000 0001' }, payroll: { whatsapp: SECRET_PHONE }, owner: { whatsapp: SECRET_PHONE } },
  payroll: { rate: 42000, account: SECRET_ACCOUNT },
  integrations: { wompi: { key: 'SECRET-WOMPI' } },
};

// ── the fake Company OS ─────────────────────────────────────────────────────────────────────────────────────────────
let state;
function reset(records = {}, opts = {}) {
  state = { records: new Map(), calls: [], refuse: opts.refuse ?? null, malformed: !!opts.malformed, seq: 0 };
  for (const [key, value] of Object.entries(records)) state.records.set(`set_${key}`, { id: `set_${key}`, data: { key, value } });
  // A second record under a key the app never duplicates (review round 2, L7); listed first so a "first row wins" read picks it.
  for (const [i, [key, value]] of (opts.duplicates ?? []).entries()) state.records = new Map([[`set_dup_${i}`, { id: `set_dup_${i}`, data: { key, value } }], ...state.records]);
}
const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
const readBody = (req) => new Promise((r) => { let s = ''; req.on('data', (c) => { s += c; }); req.on('end', () => { try { r(JSON.parse(s || '{}')); } catch { r(null); } }); });
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  const body = req.method === 'GET' ? null : await readBody(req);
  state.calls.push({ method: req.method, path: url.pathname, auth: req.headers.authorization ?? null, platformKey: req.headers['x-platform-key'] ?? null, idem: req.headers['idempotency-key'] ?? null, body });
  const authed = req.headers.authorization === `Bearer ${TOKEN}` || req.headers['x-platform-key'] === TOKEN;
  if (!authed) return json(res, 401, { error: 'unauthorized' });
  if (state.refuse) return json(res, 403, { error: state.refuse });
  if (req.method === 'POST' && url.pathname === `/t/${TENANT}/query`) {
    if (state.malformed) return json(res, 200, { rows: 'nope' });
    const keys = body?.filter?.value ?? [];
    const found = [...state.records.values()].filter((r) => body?.entity === 'setting' && [].concat(keys).includes(r.data.key));
    return json(res, 200, { data: typeof body?.limit === 'number' ? found.slice(0, body.limit) : found });
  }
  if (req.method === 'POST' && url.pathname === `/t/${TENANT}/batch`) {
    for (const op of body.ops) {
      if (op.entity !== 'setting') return json(res, 400, { error: 'invalid_op' });
      if (op.op === 'update') { const r = state.records.get(op.id); if (!r) return json(res, 404, { error: 'not_found' }); r.data = { ...r.data, ...op.data }; }
      else if (op.op === 'create') { const id = `set_new_${++state.seq}`; state.records.set(id, { id, data: op.data }); }
      else return json(res, 400, { error: 'invalid_op' });
    }
    return json(res, 200, { results: body.ops.map(() => ({ ok: true })) });
  }
  return json(res, 404, { error: 'not_found' });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;

const work = mkdtempSync(join(tmpdir(), 'hoy-mp-'));
function run(args = [], env = {}, cwd = work) {
  return new Promise((r) => {
    const child = spawn(process.execPath, [SCRIPT, ...args], { cwd, env: { PATH: process.env.PATH, ...env } });
    let out = '';
    child.stdout.on('data', (c) => { out += c; });
    child.stderr.on('data', (c) => { out += c; });
    child.on('close', (code) => r({ code, out }));
  });
}
const ENV = { COMPANY_OS_URL: BASE, COMPANY_OS_TENANT: TENANT, COMPANY_OS_TOKEN: TOKEN };
const writes = () => state.calls.filter((c) => c.method !== 'GET' && !c.path.endsWith('/query'));
const pub = () => [...state.records.values()].find((r) => r.data.key === 'studio_settings')?.data.value;
const priv = () => [...state.records.values()].find((r) => r.data.key === 'studio_private')?.data.value;
const leaks = (out) => [TOKEN, SECRET_ACCOUNT, SECRET_PHONE, 'SECRET-WOMPI', '42000'].filter((s) => out.includes(s));

try {
  // MP-01 dry run by default
  reset({ studio_settings: structuredClone(LEGACY) });
  let r = await run([], ENV);
  check('MP-01 a dry run is the default: exit 0, no write sent', r.code === 0 && writes().length === 0, `${r.code} ${writes().length}\n${r.out}`);
  check('MP-01 the dry run names what would move (sections and contact intents)', /payroll/.test(r.out) && /integrations/.test(r.out) && /contacts\.owner/.test(r.out) && /contacts\.payroll/.test(r.out) && /dry run/i.test(r.out), r.out);
  check('MP-01 the dry run prints no value and no token', leaks(r.out).length === 0, leaks(r.out).join(', '));
  check('MP-01 the read is one POST /query for the two setting keys, with the token as a Bearer', state.calls.length === 1 && state.calls[0].path === `/t/${TENANT}/query` && state.calls[0].auth === `Bearer ${TOKEN}`, JSON.stringify(state.calls.map((c) => c.path)));

  // MP-02 --apply
  r = await run(['--apply'], ENV);
  const batch = writes();
  check('MP-02 --apply sends one POST /batch with an Idempotency-Key', r.code === 0 && batch.length === 1 && batch[0].path === `/t/${TENANT}/batch` && typeof batch[0].idem === 'string' && batch[0].idem.length >= 16, `${r.code} ${JSON.stringify(batch.map((b) => [b.path, b.idem]))}\n${r.out}`);
  check('MP-02 studio_settings keeps only the public part', pub() && !('payroll' in pub()) && !('integrations' in pub()) && JSON.stringify(pub().contacts) === JSON.stringify({ classes: LEGACY.contacts.classes }) && pub().profile.name === 'Estudio Ficticio', JSON.stringify(pub()));
  check('MP-02 studio_private holds payroll, integrations and the staff contacts, unchanged', JSON.stringify(priv()) === JSON.stringify({ contacts: { payroll: LEGACY.contacts.payroll, owner: LEGACY.contacts.owner }, payroll: LEGACY.payroll, integrations: LEGACY.integrations }), JSON.stringify(priv()));
  check('MP-02 --apply prints no value and no token', leaks(r.out).length === 0, leaks(r.out).join(', '));

  // MP-03 idempotent
  const before = state.calls.length;
  r = await run(['--apply'], ENV);
  check('MP-03 a second --apply finds nothing to move and writes nothing', r.code === 0 && /nothing to move/i.test(r.out) && state.calls.slice(before).every((c) => c.path.endsWith('/query')), r.out);

  // MP-04 an existing studio_private keeps its values
  reset({ studio_settings: structuredClone(LEGACY), studio_private: { payroll: { rate: 50000 }, contacts: { coordinator: { whatsapp: '+57 300 000 0009' } } } });
  r = await run(['--apply'], ENV);
  check('MP-04 with studio_private already there: it is updated (not created twice) and its own values win', r.code === 0 && [...state.records.values()].filter((x) => x.data.key === 'studio_private').length === 1 && priv().payroll.rate === 50000 && priv().integrations?.wompi && priv().contacts.coordinator && priv().contacts.owner && priv().contacts.payroll, JSON.stringify(priv()));
  check('MP-04 the update and the private write are one /batch (update + update)', writes().length === 1 && writes()[0].body.ops.length === 2 && writes()[0].body.ops.every((o) => o.op === 'update'), JSON.stringify(writes().map((w) => w.body)));

  // MP-05 nothing saved yet
  reset({});
  r = await run(['--apply'], ENV);
  check('MP-05 a tenant with no saved settings has nothing to move', r.code === 0 && /nothing to move/i.test(r.out) && writes().length === 0, r.out);

  // MP-06 --check for go-live
  reset({ studio_settings: structuredClone(LEGACY) });
  r = await run(['--check'], ENV);
  check('MP-06 --check fails (exit 1) while studio_settings still holds pay data, and writes nothing', r.code === 1 && writes().length === 0, `${r.code}\n${r.out}`);
  reset({ studio_settings: { profile: { name: 'x' } } });
  r = await run(['--check'], ENV);
  check('MP-06 --check passes on a clean tenant', r.code === 0, `${r.code}\n${r.out}`);

  // MP-07 credentials only from the environment
  reset({ studio_settings: structuredClone(LEGACY) });
  writeFileSync(join(work, '.env'), `COMPANY_OS_URL=${BASE}\nCOMPANY_OS_TENANT=${TENANT}\nCOMPANY_OS_TOKEN=${TOKEN}\n`);
  r = await run(['--apply'], {});
  check('MP-07 without the environment it refuses (exit 2), even with a .env file in the folder, and calls nothing', r.code === 2 && state.calls.length === 0 && /COMPANY_OS_URL/.test(r.out), `${r.code} ${state.calls.length}\n${r.out}`);
  check('MP-07 the script reads no file for credentials (no dotenv, no file reads)', !/dotenv|['"`]\.env|readFile|createReadStream/.test(readFileSync(SCRIPT, 'utf8')));
  r = await run(['--apply'], { ...ENV, COMPANY_OS_TOKEN: '', COMPANY_OS_PLATFORM_KEY: TOKEN });
  check('MP-07 a platform key (COMPANY_OS_PLATFORM_KEY) is sent as x-platform-key', r.code === 0 && state.calls.length > 0 && state.calls.every((c) => c.platformKey === TOKEN && !c.auth), `${r.code}\n${r.out}`);
  r = await run(['--apply', '--yes-really'], ENV);
  check('MP-07 an unknown argument is refused (exit 2)', r.code === 2, `${r.code}\n${r.out}`);

  // MP-08 refusals, malformed answers, hostile targets
  reset({ studio_settings: structuredClone(LEGACY) }, { refuse: 'forbidden' });
  r = await run(['--apply'], ENV);
  check('MP-08 a refusal stops before any write, names the code, prints no value or token', r.code === 1 && writes().length === 0 && /forbidden/.test(r.out) && leaks(r.out).length === 0, `${r.code}\n${r.out}`);
  reset({ studio_settings: structuredClone(LEGACY) }, { malformed: true });
  r = await run(['--apply'], ENV);
  check('MP-08 a malformed answer stops before any write', r.code === 1 && writes().length === 0, `${r.code}\n${r.out}`);
  reset({ studio_settings: 'not an object' });
  r = await run(['--apply'], ENV);
  check('MP-08 a studio_settings value that is not an object is refused, not rewritten', r.code === 1 && writes().length === 0, `${r.code}\n${r.out}`);
  reset({ studio_settings: structuredClone(LEGACY) });
  r = await run(['--apply'], { ...ENV, COMPANY_OS_URL: 'http://api.example.com' });
  check('MP-08 plain http to a remote host is refused (the token would travel in clear)', r.code === 2 && state.calls.length === 0, `${r.code}\n${r.out}`);
  r = await run(['--apply'], { ...ENV, COMPANY_OS_TENANT: '../platform' });
  check('MP-08 a tenant slug that is not a slug is refused', r.code === 2 && state.calls.length === 0, `${r.code}\n${r.out}`);

  // MP-09 (review round 2, L7): a key that appears twice is refused, never "whichever row came first"
  reset({ studio_settings: structuredClone(LEGACY) }, { duplicates: [['studio_settings', { profile: { name: 'x' } }]] });
  r = await run(['--check'], ENV);
  check('MP-09 the read asks for at least 3 rows (room to see a duplicate)', state.calls[0]?.body?.limit >= 3, JSON.stringify(state.calls[0]?.body));
  check('MP-09 two studio_settings records: --check fails (exit 1), names the duplicate, writes nothing', r.code === 1 && /more than one/i.test(r.out) && /studio_settings/.test(r.out) && writes().length === 0, `${r.code}\n${r.out}`);
  r = await run(['--apply'], ENV);
  check('MP-09 two studio_settings records: --apply refuses (exit 1) and writes nothing', r.code === 1 && writes().length === 0, `${r.code}\n${r.out}`);
  reset({ studio_settings: structuredClone(LEGACY), studio_private: { payroll: { rate: 1 } } }, { duplicates: [['studio_private', { payroll: { rate: 2 } }]] });
  r = await run(['--apply'], ENV);
  check('MP-09 two studio_private records: --apply refuses (exit 1) and writes nothing', r.code === 1 && /more than one/i.test(r.out) && /studio_private/.test(r.out) && writes().length === 0, `${r.code}\n${r.out}`);

  // MP-10 (review round 2, L6): the usage says which Node runs the script (type stripping on by default)
  r = await run([], {});
  check('MP-10 the usage names the minimum Node (22.18 or 23.6+) and the flag for an older Node 22', /Node (>= ?|≥ ?)?22\.18/.test(r.out) && /23\.6/.test(r.out) && /--experimental-strip-types/.test(r.out), r.out);
  check('MP-10 the script header says it too', /22\.18/.test(readFileSync(SCRIPT, 'utf8').split('\nimport ')[0]));
} finally {
  server.close();
  rmSync(work, { recursive: true, force: true });
}
done();
