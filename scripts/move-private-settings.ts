// One-off operator step (review round 1, M1; Company OS runbook prod-env §13c): moves the pay data out of a
// `studio_settings` record saved before the settings split (decision F-01, lane H2). Every signed-in role reads that
// record, so `payroll`, `integrations` and the staff-only contacts (`contacts.payroll`, `.coordinator`, `.owner`) move
// to `studio_private`, which only Administration and Finance read. The split is the app's own (src/data/companyos/
// settingsSplit.ts), so the result is what an Administration save in the app would write.
//
//   COMPANY_OS_URL=https://<api> COMPANY_OS_TENANT=<slug> COMPANY_OS_PLATFORM_KEY=<key> node scripts/move-private-settings.ts
//       dry run (the default): reads, and prints which sections and contact intents would move, never their values
//   … node scripts/move-private-settings.ts --apply    writes both records in one /batch (all or nothing)
//   … node scripts/move-private-settings.ts --check    exit 1 while studio_settings still holds pay data (go-live gate)
//
// Credentials come only from the environment (never a file): COMPANY_OS_PLATFORM_KEY (sent as x-platform-key, the
// operator acting as the tenant's Super Admin) or COMPANY_OS_TOKEN (a Bearer: a platform token or an Administration
// session). Plain http only to localhost. Idempotent: a second run finds nothing to move. An existing studio_private
// keeps its values (they were saved after the split, so they are newer); contacts merge by intent.
// Exit: 0 done or nothing to move · 1 a refusal, a malformed answer, or --check found pay data · 2 bad invocation.
// Node: 22.18+ or 23.6+ (TypeScript type stripping on by default; the script runs the app's own .ts). On an older
// Node 22 (22.6 to 22.17) add the flag: node --experimental-strip-types scripts/move-private-settings.ts. Older Node
// cannot parse the file at all, so it stops with a syntax error before any check here can run (review round 2, L6).
// Tested by scripts/test-move-private-settings.mjs against a fake Company OS.
import { randomUUID } from 'node:crypto';
import { PRIVATE_SETTINGS_KEY, PUBLIC_SETTINGS_KEY, mergeSettingsRecords, sameJson, splitSettings } from '../src/data/companyos/settingsSplit.ts';

type Obj = Record<string, unknown>;
type SettingRecord = { id: string; data: { key?: unknown; value?: unknown } };
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);

class Stop extends Error {
  exit: number;
  constructor(message: string, exit: number) { super(message); this.exit = exit; }
}

const USAGE = 'usage: COMPANY_OS_URL=… COMPANY_OS_TENANT=… (COMPANY_OS_PLATFORM_KEY=… | COMPANY_OS_TOKEN=…) node scripts/move-private-settings.ts [--apply | --check]\n'
  + 'needs Node 22.18+ or 23.6+ (type stripping on by default); on Node 22.6 to 22.17 run node --experimental-strip-types scripts/move-private-settings.ts';

function options() {
  const args = process.argv.slice(2);
  const unknown = args.filter((a) => a !== '--apply' && a !== '--check');
  if (unknown.length || (args.includes('--apply') && args.includes('--check'))) throw new Stop(`unknown or conflicting arguments: ${args.join(' ')}\n${USAGE}`, 2);
  const base = (process.env.COMPANY_OS_URL ?? '').trim().replace(/\/+$/, '');
  const tenant = (process.env.COMPANY_OS_TENANT ?? '').trim();
  const key = (process.env.COMPANY_OS_PLATFORM_KEY ?? '').trim();
  const token = (process.env.COMPANY_OS_TOKEN ?? '').trim();
  if (!base || !tenant || (!key && !token)) throw new Stop(`COMPANY_OS_URL, COMPANY_OS_TENANT and COMPANY_OS_PLATFORM_KEY or COMPANY_OS_TOKEN must be set in the environment\n${USAGE}`, 2);
  let url: URL;
  try { url = new URL(base); } catch { throw new Stop('COMPANY_OS_URL is not a URL', 2); }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) throw new Stop('COMPANY_OS_URL must be https (plain http only to localhost): the credential would travel in clear', 2);
  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(tenant)) throw new Stop('COMPANY_OS_TENANT is not a tenant slug', 2);
  const auth: Record<string, string> = key ? { 'x-platform-key': key } : { authorization: `Bearer ${token}` };
  return { base, tenant, auth, apply: args.includes('--apply'), check: args.includes('--check') };
}

async function call<T>(o: ReturnType<typeof options>, method: 'POST', path: string, body: unknown, extra: Record<string, string> = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${o.base}/t/${o.tenant}${path}`, { method, headers: { 'content-type': 'application/json', ...o.auth, ...extra }, body: JSON.stringify(body) });
  } catch (e) { throw new Stop(`${method} ${path}: network error (${(e as Error).message})`, 1); }
  const text = await res.text();
  let parsed: unknown = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { /* reported below */ }
  if (!res.ok) {
    const code = isObj(parsed) && typeof parsed.error === 'string' ? parsed.error : `http_${res.status}`;
    throw new Stop(`${method} ${path}: refused ${res.status} ${code}`, 1);
  }
  return parsed as T;
}

/** The pay data's names (sections and contact intents), never its values. */
function names(priv: Obj): string[] {
  return Object.entries(priv).flatMap(([k, v]) => (k === 'contacts' && isObj(v) ? Object.keys(v).map((i) => `contacts.${i}`) : [k])).sort();
}

async function main() {
  const o = options();
  const answer = await call<{ data?: unknown }>(o, 'POST', '/query', { entity: 'setting', filter: { field: 'key', op: 'in', value: [PUBLIC_SETTINGS_KEY, PRIVATE_SETTINGS_KEY] }, limit: 3 });
  const rows = isObj(answer) ? answer.data : undefined;
  if (!Array.isArray(rows) || !rows.every((r): r is SettingRecord => isObj(r) && typeof r.id === 'string' && isObj(r.data))) throw new Stop('the setting query answered in an unexpected shape: nothing written', 1);
  // One record per key is all the app ever writes. Three rows leave room to see a second one; acting on whichever came
  // first could report "nothing to move" while the other still holds pay data (review round 2, L7).
  for (const k of [PUBLIC_SETTINGS_KEY, PRIVATE_SETTINGS_KEY]) {
    if (rows.filter((r) => r.data.key === k).length > 1) throw new Stop(`${o.tenant}: more than one ${k} record: nothing written; look at them by hand (the app keeps one)`, 1);
  }
  const pubRec = rows.find((r) => r.data.key === PUBLIC_SETTINGS_KEY) ?? null;
  const privRec = rows.find((r) => r.data.key === PRIVATE_SETTINGS_KEY) ?? null;
  if (!pubRec) { console.log(`${o.tenant}: no ${PUBLIC_SETTINGS_KEY} record yet, nothing to move.`); return; }
  if (!isObj(pubRec.data.value)) throw new Stop(`${PUBLIC_SETTINGS_KEY} holds a value that is not an object: nothing written; look at it by hand`, 1);
  if (privRec && privRec.data.value != null && !isObj(privRec.data.value)) throw new Stop(`${PRIVATE_SETTINGS_KEY} holds a value that is not an object: nothing written; look at it by hand`, 1);

  const { pub, priv: legacy } = splitSettings(pubRec.data.value);
  const moving = names(legacy);
  if (!moving.length) { console.log(`${o.tenant}: ${PUBLIC_SETTINGS_KEY} holds no pay data, nothing to move.`); return; }
  // The existing private record was saved after the split: it wins; contacts merge by intent.
  const priv = mergeSettingsRecords(legacy, privRec?.data.value ?? {});
  console.log(`${o.tenant}: ${PUBLIC_SETTINGS_KEY} still holds ${moving.join(', ')} (every signed-in role reads it).`);
  if (o.check) throw new Stop(`check failed: move it with node scripts/move-private-settings.ts --apply`, 1);
  if (!o.apply) {
    console.log(`dry run: would move them to ${PRIVATE_SETTINGS_KEY} (${privRec ? 'update, its own values kept' : 'create'}) and rewrite ${PUBLIC_SETTINGS_KEY} without them. Run again with --apply.`);
    return;
  }
  const ops: Obj[] = [{ op: 'update', entity: 'setting', id: pubRec.id, data: { value: pub } }];
  if (privRec) { if (!sameJson(privRec.data.value, priv)) ops.push({ op: 'update', entity: 'setting', id: privRec.id, data: { value: priv } }); }
  else ops.push({ op: 'create', entity: 'setting', data: { key: PRIVATE_SETTINGS_KEY, value: priv } });
  await call(o, 'POST', '/batch', { ops }, { 'idempotency-key': randomUUID() });
  console.log(`moved ${moving.join(', ')} to ${PRIVATE_SETTINGS_KEY} in one batch (${ops.length} writes). Check: run again with --check.`);
}

main().catch((e) => {
  if (e instanceof Stop) { console.error(e.message); process.exit(e.exit); }
  console.error(`unexpected error: ${(e as Error)?.message ?? e}`);
  process.exit(1);
});
