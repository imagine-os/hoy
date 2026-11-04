// The real-API mode of scripts/test-auth-real-clerk.mjs (Hoy all-roles lane E): its options, and the removal of the
// Company OS side of a QA sign-up (the login's membership, its `person` and `member` records) through the API as a
// tenant Super Admin. Only QA addresses (`qa-<run>+clerk_test@example.com`) are ever removed; anything else is refused.
// No secret is read here: the caller passes a token source. Tested by scripts/test-real-signup.mjs.

/** The only addresses this code may remove: Clerk test addresses the real-Clerk check creates. */
export const QA_EMAIL = /^qa-[a-z0-9]+\+clerk_test@example\.com$/;

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * The mode from the command line and the environment.
 * - no argument: `{ mode: 'fake' }` (the in-memory Company OS, as before);
 * - `--real-api`: `{ mode: 'real-api', baseUrl, adminEmail }` from `HOY_TEST_URL` (the deployed test frontend's origin,
 *   https; http only on this machine) and `HOY_CLEANUP_ADMIN_EMAIL` (a test-hoy Administration login, which holds the
 *   tenant Super Admin role, in the same Clerk development instance).
 * Anything else throws an Error whose message says what to fix.
 */
export function realApiOptions(argv = [], env = {}) {
  const unknown = argv.filter((a) => a !== '--real-api');
  if (unknown.length) throw new Error(`unknown argument(s): ${unknown.join(' ')} (the only one is --real-api)`);
  if (!argv.includes('--real-api')) return { mode: 'fake' };
  const missing = ['HOY_TEST_URL', 'HOY_CLEANUP_ADMIN_EMAIL'].filter((k) => !String(env[k] ?? '').trim());
  if (missing.length) throw new Error(`--real-api needs ${missing.join(' and ')} in the environment`);
  let url;
  try { url = new URL(String(env.HOY_TEST_URL).trim()); } catch { throw new Error('HOY_TEST_URL is not a URL'); }
  if (url.username || url.password) throw new Error('HOY_TEST_URL must not carry credentials');
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && LOCAL_HOSTS.has(url.hostname))) throw new Error('HOY_TEST_URL must be https (http only for localhost)');
  if ((url.pathname !== '/' && url.pathname !== '') || url.search || url.hash) throw new Error('HOY_TEST_URL is the site\'s origin only, e.g. https://test-hoy.example.com');
  const adminEmail = String(env.HOY_CLEANUP_ADMIN_EMAIL).trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(adminEmail)) throw new Error('HOY_CLEANUP_ADMIN_EMAIL is not an email address');
  if (QA_EMAIL.test(adminEmail)) throw new Error('HOY_CLEANUP_ADMIN_EMAIL must be a standing Administration login, not a QA address');
  return { mode: 'real-api', baseUrl: url.origin, adminEmail };
}

/**
 * Checks the site's public settings before anything is written: a test environment (never production) on the same
 * Clerk instance as the keys this run holds. Returns `{ tenant, siteLive }` or throws with the reason.
 */
export function checkTestSite(config, publishableKey) {
  if (!config || typeof config.tenant !== 'string' || !config.tenant) throw new Error('the site\'s /app-config.json names no tenant');
  // An allowlist: only an environment that says it is a test one (Railway's `test`, or `staging`).
  if (!['test', 'staging'].includes(config.environment)) throw new Error(`the site says its environment is ${JSON.stringify(config.environment ?? null)}: the real-API sign-up check runs only against a test environment (test, staging)`);
  if (config.clerkPublishableKey !== publishableKey) throw new Error('the site uses another Clerk instance than CLERK_PUBLISHABLE_KEY: use the test environment\'s keys');
  return { tenant: config.tenant, siteLive: Boolean(config.launch?.siteLive) };
}

/**
 * Past the test site's passphrase gate (server/testGate.mjs, Company OS playbook rule D5): posts the passphrase and
 * answers the cookie as `{ name, value }`. Anything but a 303 with a cookie throws; the message never has the passphrase.
 */
export async function passGate({ baseUrl, passphrase, fetchImpl = fetch }) {
  const res = await fetchImpl(`${baseUrl}/test-gate`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ passphrase, next: '/' }).toString(),
  });
  if (res.status !== 303) throw new Error(`the test gate answered ${res.status} to TEST_GATE_PASSPHRASE, expected 303`);
  const pair = /^([^=;\s]+)=([^;\s]+)/.exec(res.headers.getSetCookie()[0] ?? '');
  if (!pair) throw new Error('the test gate set no cookie');
  return { name: pair[1], value: pair[2] };
}

/** `fetchImpl` with the gate's cookie on every call; without a cookie, `fetchImpl` itself. */
export function withGateCookie(cookie, fetchImpl = fetch) {
  if (!cookie) return fetchImpl;
  return (url, init = {}) => fetchImpl(url, { ...init, headers: { ...init.headers, cookie: `${cookie.name}=${cookie.value}` } });
}

/**
 * A Company OS client over `apiRoot` (`<site>/api/cos/t/<tenant>` through the Hoy server, or `<api>/t/<tenant>`
 * directly). `token()` gives a bearer per call. Answers `{ status, body }`; a non-2xx throws `{ code, status }`.
 */
export function cosOver({ apiRoot, token, fetchImpl = fetch }) {
  return async (method, path, body) => {
    const headers = { accept: 'application/json', authorization: `Bearer ${await token()}` };
    if (body !== undefined) headers['content-type'] = 'application/json';
    const res = await fetchImpl(`${apiRoot}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = res.status === 204 ? '' : await res.text();
    let parsed = null;
    if (text) { try { parsed = JSON.parse(text); } catch { parsed = null; } }
    if (!res.ok) throw Object.assign(new Error(`${method} ${path.split('?')[0]} → ${res.status} ${parsed?.error ?? ''}`.trim()), { code: parsed?.error ?? 'unknown', status: res.status });
    return { status: res.status, body: parsed };
  };
}

/** Postgres-style timestamps (`2026-10-31 18:17:21.271895+00`) and ISO strings, as milliseconds; NaN when unreadable. */
export function timeOf(value) {
  if (typeof value !== 'string') return Number.NaN;
  const iso = value.trim().replace(' ', 'T').replace(/(\.\d{3})\d+/, '$1').replace(/([+-]\d{2})$/, '$1:00');
  return Date.parse(iso);
}

/** What Company OS holds for a QA address: logins (with memberships), `person` records and their `member` facets. */
export async function findSignup(request, email) {
  const users = ((await request('GET', '/admin/users')).body?.users ?? []).filter((u) => String(u.email ?? '').toLowerCase() === email);
  const people = (await request('POST', '/query', { entity: 'person', filter: { field: 'email', op: 'eq', value: email }, limit: 50 })).body?.data ?? [];
  const members = [];
  for (const p of people) members.push(...((await request('POST', '/query', { entity: 'member', filter: { field: 'person', op: 'eq', value: p.id }, limit: 50 })).body?.data ?? []));
  return {
    userIds: users.map((u) => u.userId),
    membershipIds: users.flatMap((u) => (u.memberships ?? []).map((m) => m.membershipId)),
    roleKeys: users.flatMap((u) => (u.memberships ?? []).map((m) => m.roleKey)),
    personIds: people.map((p) => p.id),
    members: members.map((m) => ({ id: m.id, source: m.data?.source ?? null })),
  };
}

/**
 * Removes the Company OS side of one QA sign-up: `member` facets, then `person` records, then the memberships (the
 * login row itself has no delete route; with no membership it opens nothing). Never throws: each failure is logged
 * and listed in `left`, and a final read says what is still there. A non-QA address is refused, nothing removed.
 */
export async function removeSignup(request, email, { log = console.log } = {}) {
  const address = String(email ?? '').toLowerCase();
  if (!QA_EMAIL.test(address)) {
    log(`  Company OS clean-up REFUSED for ${JSON.stringify(email)}: only qa-…+clerk_test@example.com addresses are removed`);
    return { removed: [], left: [], refused: true };
  }
  const removed = [], failures = [];
  let found;
  try { found = await findSignup(request, address); }
  catch (e) {
    log(`  Company OS clean-up FAILED: could not read what ${address} holds (${e.message}). LEFT BEHIND: unknown; remove by hand (Team, Customers) on the test site`);
    return { removed, left: ['unknown'], refused: false };
  }
  const step = async (label, fn) => { try { await fn(); removed.push(label); } catch (e) { failures.push(`${label} (${e.message})`); } };
  for (const m of found.members) await step(`member ${m.id}`, () => request('DELETE', `/api/member/${encodeURIComponent(m.id)}`));
  for (const id of found.personIds) await step(`person ${id}`, () => request('DELETE', `/api/person/${encodeURIComponent(id)}`));
  for (const id of found.membershipIds) await step(`membership ${id}`, () => request('DELETE', `/admin/memberships/${encodeURIComponent(id)}`));
  let left;
  try {
    const after = await findSignup(request, address);
    left = [...after.members.map((m) => `member ${m.id}`), ...after.personIds.map((id) => `person ${id}`), ...after.membershipIds.map((id) => `membership ${id}`)];
  } catch (e) { left = [`unknown (the check after the clean-up failed: ${e.message})`]; }
  if (failures.length || left.length) {
    log(`  Company OS clean-up FAILED for ${address}: ${failures.join('; ') || 'records remain'}`);
    log(`  LEFT BEHIND in Company OS: ${left.join(', ') || failures.join(', ')}; remove by hand as a Super Admin (Customers, Team) on the test site`);
  } else if (removed.length) log(`  Company OS clean-up: removed ${removed.length} record(s) of ${address}`);
  return { removed, left: left.length ? left : failures.length ? failures : [], refused: false };
}

/** QA sign-ups an earlier run left behind (older than `minAgeMs`), each removed with `removeSignup`. */
export async function removeStaleSignups(request, { now = Date.now(), minAgeMs = 30 * 60_000, log = console.log } = {}) {
  const people = (await request('POST', '/query', { entity: 'person', filter: { field: 'email', op: 'contains', value: '+clerk_test@example.com' }, limit: 200 })).body?.data ?? [];
  const stale = [...new Set(people.filter((p) => QA_EMAIL.test(String(p.data?.email ?? '').toLowerCase()) && now - timeOf(p.createdAt) > minAgeMs).map((p) => p.data.email.toLowerCase()))];
  let count = 0;
  for (const email of stale) { const r = await removeSignup(request, email, { log }); if (!r.left.length) count++; }
  return count;
}
