// Hoy all-roles, lane H1 · the customer and admin flows the route-connectivity check found mock-only on launch routes,
// now through the real CompanyOSProvider (production build) against a fake Company OS that models the entities they
// use: person, notification_pref, credit_lot / credit_entry (with the lot include), product, payment, booking,
// occurrence and setting, with a member's own-row policies, required fields, the comms duplicate-preference rule and
// ADR 0040 Idempotency-Key replay. It is NOT Company OS; fictional data only. Lane H2's adapters (emergency contact,
// deletion requests, `lot_source`) are checked when their adapter is present, else reported as pending.
// Run: node scripts/test-h1-connected-flows.mjs
import { build } from 'esbuild';
import assert from 'node:assert/strict';

let failures = 0, passed = 0, pending = 0;
async function test(name, fn) {
  try { const r = await fn(); if (r === 'pending') { pending++; console.log(`skip ${name} (waits for lane H2's adapter)`); return; } passed++; console.log(`ok   ${name}`); }
  catch (e) { failures++; console.log(`FAIL ${name}\n     ${String(e?.stack ?? e).split('\n').slice(0, 3).join('\n     ')}`); }
}

const values = new Map();
globalThis.localStorage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, String(v)), removeItem: (k) => values.delete(k) };
globalThis.sessionStorage = globalThis.localStorage;

const ENTRIES = {
  CompanyOSProvider: "export { CompanyOSProvider } from './src/data/companyos/CompanyOSProvider';",
  adapters: "export { adapters } from './src/data/companyos/mapping';",
  refusals: "export { refusalCopy, hasRefusalCopy } from './src/data/companyos/refusals';",
  prefs: "export * from './src/modules/customer/notificationPrefs';",
  profile: "export * from './src/modules/customer/profileSave';",
  account: "export * from './src/modules/customer/accountData';",
  marketing: "export * from './src/modules/customer/marketingConsent';",
  trial: "export * from './src/data/trialEligibility';",
  payments: "export * from './src/modules/customer/payments';",
  // settings.ts sits in an import cycle that the app enters through the data layer: load that first, as the app does.
  instructions: "import './src/data/MockProvider'; export * from './src/modules/admin/paymentInstructions';",
  report: "export * from './src/data/confirmedPaymentReport';",
  reportReads: "export * from './src/modules/admin/paymentReportReads';",
  studioReturn: "export * from './src/modules/classSchedule/ownStudioReturn';",
  content: "export * from './src/modules/admin/contentRecovery';",
  balances: "export * from './src/modules/admin/customers/customerBalances';",
  settings: "import './src/data/MockProvider'; export { mergeSettings } from './src/modules/admin/settings';",
};
/** Each module bundled on its own (production build), so one missing module fails only its own tests. */
async function load(contents) {
  try {
    const out = await build({
      stdin: { contents, resolveDir: process.cwd(), loader: 'ts' },
      bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent', jsx: 'automatic',
      loader: { '.jpg': 'empty', '.png': 'empty', '.webp': 'empty', '.svg': 'empty', '.css': 'empty', '.md': 'text' },
      define: { 'import.meta.env': '{"VITE_HOY_BUILD":"production","DEV":false,"PROD":true}', __HOY_BUILD__: '"production"' },
    });
    return await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
  } catch (e) { console.log(`FAIL does not build: ${contents} — ${String(e.message).split('\n')[1] ?? e.message}`); failures++; return {}; }
}
const L = Object.fromEntries(await Promise.all(Object.entries(ENTRIES).map(async ([k, c]) => [k, await load(c)])));
const m = { ...L.CompanyOSProvider, ...L.adapters, ...L.refusals, ...L.settings, prefs: L.prefs, profile: L.profile, account: L.account, marketing: L.marketing, trial: L.trial, payments: L.payments, instructions: L.instructions, report: L.report, reportReads: L.reportReads, studioReturn: L.studioReturn, content: L.content, balances: L.balances };
const T = 'ten_hoy';

// ── A fake Company OS ────────────────────────────────────────────────────────────────────────────────────────────
const FIELDS = {
  person: { name: { req: true }, email: {}, phone: {}, dob: {}, user: {}, locale: {}, emergency_contact_name: {}, emergency_contact_phone: {} },
  notification_pref: { person: { req: true }, channel: { req: true, enum: ['email', 'in_app', 'whatsapp'] }, category: { req: true }, enabled: {} },
  product: { key: {}, name: {}, kind: {}, price: {}, credits: {}, validity_days: {}, active: {}, freezable: {}, audience: {}, valid_from: {}, valid_until: {} },
  payment: { person: { req: true }, product: {}, amount: { req: true }, method: {}, status: {}, date: { req: true }, concept: { req: true }, provider: {}, reference: {}, notes: {}, for_entity: {}, for_id: {}, approved_at: {}, price_override_reason: {}, provider_ref: {} },
  credit_lot: { person: {}, source: {}, product: {}, payment: {}, quantity: {}, valid_from: {}, valid_until: {}, frozen_from: {}, frozen_until: {}, freezable: {}, freezes_used: {} },
  credit_entry: { lot: {}, person: {}, delta: {}, reason: {}, booking: {}, note: {}, at: {} },
  booking: { person: {}, occurrence: {}, status: {}, entitlement: {}, spot: {}, payment_method: {}, source: {}, reason: {}, cancelled_at: {} },
  occurrence: { title: {}, kind: {}, starts_at: {}, ends_at: {}, capacity: {}, booked_count: {}, status: {}, coach: {}, resource: {}, schedule: {}, cancel_reason: {}, spots_enabled: {} },
  setting: { key: { req: true }, value: {} },
  invoice: { payment: {}, number: {}, total: {}, subtotal: {}, tax: {}, issued_at: {}, kind: {} },
  notification: { person: {}, title: {}, body: {}, category: {}, link: {}, read_at: {} },
  consent: { person: {}, purpose: {}, version: {}, granted_at: {}, revoked: {} },
  policy_acceptance: { person: {}, policy: {}, version: {}, accepted_at: {} },
  form_submission: { form_key: {}, email: {}, answers: {}, placement: {}, person: {} },
};
const OWN_FIELD = { person: 'user', notification_pref: 'person', payment: 'person', credit_lot: 'person', credit_entry: 'person', booking: 'person', invoice: null, notification: 'person', consent: 'person', policy_acceptance: 'person' };
const json = (status, body) => new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function fakeCos({ role = 'member', userId = 'usr_m1', personId = 'per_m1' } = {}) {
  const db = Object.fromEntries(Object.keys(FIELDS).map((e) => [e, new Map()]));
  const calls = [], keys = new Map(), forms = [];
  let seq = 0, lose = null, me = { role, userId, personId };
  const put = (entity, data, id = `${entity}_${String(++seq).padStart(3, '0')}`) => { const at = new Date(Date.UTC(2026, 9, 1, 12, 0, seq)).toISOString(); const rec = { id, data: { ...data }, createdAt: at, updatedAt: at, createdBy: me.userId }; db[entity].set(id, rec); return rec; };
  put('person', { name: 'Fictional Member', email: 'member@example.test', phone: '+57 300 000 0001', user: userId, locale: 'es' }, personId);
  const mine = (entity, rec) => {
    if (me.role !== 'member') return true;
    if (['product', 'occurrence'].includes(entity)) return true;
    if (entity === 'setting') return rec.data.key === 'studio_settings';
    const f = OWN_FIELD[entity];
    if (entity === 'person') return rec.data.user === me.userId;
    if (entity === 'invoice') { const p = db.payment.get(rec.data.payment); return !!p && p.data.person === me.personId; }
    return f ? rec.data[f] === me.personId : false;
  };
  const invalid = (entity, data, create) => {
    const s = FIELDS[entity];
    if (!s) return `unknown entity ${entity}`;
    for (const [k, v] of Object.entries(data ?? {})) {
      if (!s[k]) return `unknown field ${entity}.${k}`;
      if (v != null && s[k].enum && !s[k].enum.includes(v)) return `${entity}.${k} not in enum`;
    }
    if (create) for (const [k, f] of Object.entries(s)) if (f.req && (data?.[k] == null || data[k] === '')) return `${entity}.${k} required`;
    return null;
  };
  const test = (rec, f) => {
    if (!f || f.all) return true;
    if (f.and) return f.and.every((x) => test(rec, x));
    if (f.or) return f.or.some((x) => test(rec, x));
    const v = f.field === 'id' ? rec.id : rec.data[f.field];
    const want = f.value && typeof f.value === 'object' && f.value.$me ? me.userId : f.value;
    switch (f.op) {
      case 'eq': return v === want; case 'neq': return v !== want; case 'in': return want.includes(v);
      case 'is_null': return v == null; case 'is_not_null': return v != null;
      case 'gte': return v != null && v >= want; case 'lte': return v != null && v <= want;
      default: throw Object.assign(new Error(`op ${f.op}`), { status: 400 });
    }
  };
  const withInclude = (entity, rec, include) => {
    const r = structuredClone(rec);
    for (const inc of include ?? []) {
      const target = { lot: 'credit_lot', person: 'person' }[inc.field];
      const t = target && db[target].get(r.data[inc.field]);
      if (t) r.data[inc.field] = { id: t.id, ...Object.fromEntries(Object.entries(t.data).filter(([k]) => !inc.fields || inc.fields.includes(k))) };
    }
    return r;
  };
  function write(op, ids) {
    const data = op.data && Object.fromEntries(Object.entries(op.data).map(([k, v]) => [k, v && typeof v === 'object' && '$ref' in v ? ids[v.$ref] : v]));
    if (me.role === 'member' && !['notification_pref', 'person', 'payment', 'booking', 'policy_acceptance', 'form_submission'].includes(op.entity)) throw Object.assign(new Error('forbidden'), { status: 403, code: 'forbidden' });
    if (me.role === 'member' && op.entity === 'setting') throw Object.assign(new Error('forbidden'), { status: 403, code: 'forbidden' });
    if (op.op === 'create') {
      const why = invalid(op.entity, data, true);
      if (why) throw Object.assign(new Error(why), { status: 400, code: 'validation' });
      if (me.role === 'member' && OWN_FIELD[op.entity] && data[OWN_FIELD[op.entity]] !== me.personId) throw Object.assign(new Error('forbidden'), { status: 403, code: 'forbidden' });
      if (op.entity === 'notification_pref' && [...db.notification_pref.values()].some((r) => r.data.person === data.person && r.data.channel === data.channel && r.data.category === data.category)) throw Object.assign(new Error('dup'), { status: 422, code: 'notification_pref_duplicate' });
      return put(op.entity, data).id;
    }
    const rec = db[op.entity]?.get(op.id);
    if (!rec || !mine(op.entity, rec)) throw Object.assign(new Error('not found'), { status: 404, code: 'not_found' });
    if (op.op === 'delete') { db[op.entity].delete(op.id); return op.id; }
    const why = invalid(op.entity, data, false);
    if (why) throw Object.assign(new Error(why), { status: 400, code: 'validation' });
    Object.assign(rec.data, data); rec.updatedAt = new Date(Date.UTC(2026, 9, 2, 0, 0, ++seq)).toISOString();
    return rec.id;
  }
  async function fetch(url, init = {}) {
    const u = new URL(url, 'http://hoy.test/'), method = init.method ?? 'GET', body = init.body ? JSON.parse(init.body) : undefined, key = init.headers?.['idempotency-key'];
    if (u.pathname.endsWith('app-config.json')) return json(200, { tenant: 'hoy', apiBase: '/api/cos' });
    const path = u.pathname.replace('/api/cos/t/hoy', '');
    calls.push({ method, path, body: structuredClone(body), key });
    // A lost answer: the server did the work (and keeps the key's answer), the caller never hears back.
    const dropAnswer = (r) => { if (lose && lose.path === path && lose.n > 0) { lose.n--; throw new TypeError('fetch failed'); } return r; };
    if (key && method !== 'GET') {
      const prior = keys.get(key);
      if (prior) return dropAnswer(JSON.stringify(prior.body) === JSON.stringify(body) ? json(prior.status, prior.response) : json(409, { error: 'idempotency_conflict' }));
      const r = await run(); if (r.ok) keys.set(key, { body, status: r.status, response: await r.clone().json() }); return dropAnswer(r);
    }
    return dropAnswer(await run());
    async function run() {
      try {
        if (path === '/me') return json(200, { user: { id: me.userId }, roleKeys: [me.role], caps: [], isSuperAdmin: false });
        if (path === '/query') {
          if (!db[body.entity]) return json(200, { data: [] });
          const rows = [...db[body.entity].values()].filter((r) => mine(body.entity, r) && test(r, body.filter)).map((r) => withInclude(body.entity, r, body.include));
          return json(200, { data: rows.slice(body.offset ?? 0, (body.offset ?? 0) + (body.limit ?? 100)) });
        }
        if (path === '/batch') {
          const snapshot = Object.fromEntries(Object.entries(db).map(([e, t]) => [e, structuredClone([...t.entries()])]));
          const ids = [];
          try { body.ops.forEach((op, i) => { try { ids.push(write(op, ids)); } catch (e) { e.opIndex = i; throw e; } }); }
          catch (e) { for (const [e2, rows] of Object.entries(snapshot)) db[e2] = new Map(rows); return json(e.status ?? 422, { error: e.code ?? e.message, opIndex: e.opIndex }); }
          return json(200, { ids });
        }
        let mm = path.match(/^\/forms\/([a-z_]+)\/submissions$/);
        if (mm && method === 'POST') { forms.push({ form: mm[1], body, as: me.userId }); return json(200, { outcome: 'created' }); }
        mm = path.match(/^\/api\/([a-z_]+)(?:\/([^/]+))?$/);
        if (!mm) return json(404, { error: 'not_found' });
        const [, entity, id] = mm;
        if (method === 'POST') { const rid = write({ op: 'create', entity, data: body }, []); return json(201, { data: db[entity].get(rid) }); }
        const rec = db[entity]?.get(decodeURIComponent(id ?? ''));
        if (!rec || !mine(entity, rec)) return json(404, { error: 'not_found' });
        if (method === 'GET') return json(200, { data: withInclude(entity, rec) });
        if (method === 'PATCH') { write({ op: 'update', entity, id: rec.id, data: body }, []); return json(200, { data: db[entity].get(rec.id) }); }
        if (method === 'DELETE') { write({ op: 'delete', entity, id: rec.id }, []); return new Response(null, { status: 204 }); }
      } catch (e) { return json(e.status ?? 422, { error: e.code ?? e.message }); }
      return json(404, { error: 'not_found' });
    }
  }
  return { db, calls, forms, put, fetch, as(next) { me = { ...me, ...next }; return this; }, loseNext(path, n = 1) { lose = { path, n }; }, writes: () => calls.filter((c) => c.method !== 'GET' && c.path !== '/query') };
}
const provider = (api) => new m.CompanyOSProvider({ fetch: api.fetch, config: { tenant: 'hoy', apiBase: '/api/cos' }, getToken: async () => 'tok', retryDelayMs: 1, sleep: async () => {} });
const member = { userId: 'usr_m1', role: 'customer' };
const has = (code) => (e) => String(e?.message ?? e).includes(code);

// ── C-19 / C-21 notification preferences (comms notification_pref) ─────────────────────────────────────────────
await test('preferences: the production channels are the tenant\'s (email, in_app; whatsapp kept), never push', () => {
  assert.deepEqual([...m.prefs.NOTIF_CHANNELS].sort(), ['email', 'in_app', 'whatsapp']);
});
await test('preferences: read on Company OS (no prefs_disconnected); no row means enabled', async () => {
  const api = fakeCos(), p = provider(api);
  const rows = await m.prefs.readOwnPreferences(p, member);
  assert.deepEqual(rows, []);
});
await test('preferences: turning a channel off for a category is one keyed /batch creating notification_pref rows for the person', async () => {
  const api = fakeCos(), p = provider(api);
  const rows = await m.prefs.readOwnPreferences(p, member);
  await m.prefs.savePreferences(p, member, { requestId: 'req-pref-1', channel: 'email', category: 'payments', enabled: false, expected: m.prefs.preferenceRevision(rows, { channel: 'email', category: 'payments' }) });
  const batches = api.calls.filter((c) => c.path === '/batch');
  assert.equal(batches.length, 1); assert.ok(batches[0].key, 'Idempotency-Key');
  assert.deepEqual(batches[0].body.ops, [{ op: 'create', entity: 'notification_pref', data: { person: 'per_m1', channel: 'email', category: 'payments', enabled: false } }]);
  const after = await m.prefs.readOwnPreferences(p, member);
  assert.equal(after.length, 1); assert.equal(after[0].user_id, 'usr_m1'); assert.equal(after[0].enabled, false);
});
await test('preferences: a whole channel (all five categories) then back on updates the same rows, never a duplicate', async () => {
  const api = fakeCos(), p = provider(api);
  const exp = async (channel, category) => m.prefs.preferenceRevision(await m.prefs.readOwnPreferences(p, member), { channel, category });
  await m.prefs.savePreferences(p, member, { requestId: 'r1', channel: 'in_app', category: null, enabled: false, expected: await exp('in_app', null) });
  await m.prefs.savePreferences(p, member, { requestId: 'r2', channel: 'in_app', category: null, enabled: true, expected: await exp('in_app', null) });
  assert.equal(api.db.notification_pref.size, 5);
  assert.ok([...api.db.notification_pref.values()].every((r) => r.data.enabled === true && r.data.channel === 'in_app'));
});
await test('preferences: hostile: staff roles, push and a stale revision are refused before anything is written', async () => {
  const api = fakeCos(), p = provider(api);
  await assert.rejects(m.prefs.savePreferences(p, { userId: 'usr_m1', role: 'front_desk' }, { requestId: 'x', channel: 'email', category: 'payments', enabled: false, expected: '[]' }), has('prefs_scope'));
  await assert.rejects(m.prefs.savePreferences(p, member, { requestId: 'x', channel: 'push', category: 'payments', enabled: false, expected: '[]' }), has('prefs_invalid'));
  await assert.rejects(m.prefs.savePreferences(p, member, { requestId: 'x', channel: 'email', category: 'payments', enabled: false, expected: 'stale' }), has('prefs_stale'));
  assert.equal(api.writes().length, 0);
});

await test('preferences (review round): a retry after a lost answer that committed is saved, not prefs_stale', async () => {
  const api = fakeCos(), p = provider(api);
  const input = { requestId: 'req-pref-lost', channel: 'email', category: 'payments', enabled: false, expected: m.prefs.preferenceRevision(await m.prefs.readOwnPreferences(p, member), { channel: 'email', category: 'payments' }) };
  api.loseNext('/batch', 3);
  await assert.rejects(m.prefs.savePreferences(p, member, input));
  assert.equal((await m.prefs.savePreferences(p, member, input)).status, 'saved');
  assert.equal(api.db.notification_pref.size, 1);
});
await test('preferences (review round): a row with a category the app does not show is ignored, not a page error', async () => {
  const api = fakeCos(), p = provider(api);
  api.put('notification_pref', { person: 'per_m1', channel: 'email', category: 'class_reminders', enabled: false });
  assert.deepEqual(await m.prefs.readOwnPreferences(p, member), []);
});
// ── C-19 profile save (person in one /batch) ────────────────────────────────────────────────────────────────────
const form = { full_name: 'Fictional Renamed', phone: '+57 300 000 0002', birthday: '1990-05-17', ec_name: '', ec_phone: '' };
await test('profile: name, date of birth and phone go to the person in one keyed /batch, then read back', async () => {
  const api = fakeCos(), p = provider(api);
  const rows = await m.profile.readOwnProfile(p, 'usr_m1');
  const res = await m.profile.saveOwnProfile(p, { actorId: 'usr_m1', role: 'customer', requestId: 'req-prof-1', expected: await m.profile.profileRevision(rows), form });
  assert.equal(res.status, 'saved');
  const batches = api.calls.filter((c) => c.path === '/batch');
  assert.equal(batches.length, 1); assert.ok(batches[0].key);
  assert.ok(batches[0].body.ops.every((o) => o.op === 'update' && o.entity === 'person' && o.id === 'per_m1'), JSON.stringify(batches[0].body.ops));
  const person = api.db.person.get('per_m1').data;
  assert.equal(person.name, 'Fictional Renamed'); assert.equal(person.dob, '1990-05-17'); assert.equal(person.phone, '+57 300 000 0002');
  assert.equal(person.email, 'member@example.test', 'the login email is never written');
});
await test('profile: a retry after a lost answer is the same request (one write), not profile_stale', async () => {
  const api = fakeCos(), p = provider(api);
  const rows = await m.profile.readOwnProfile(p, 'usr_m1');
  const input = { actorId: 'usr_m1', role: 'customer', requestId: 'req-prof-2', expected: await m.profile.profileRevision(rows), form };
  api.loseNext('/batch', 3);
  await assert.rejects(m.profile.saveOwnProfile(p, input));
  const res = await m.profile.saveOwnProfile(p, input);
  assert.equal(res.status, 'saved');
});
await test('profile: hostile: staff roles and invalid forms are refused before anything is sent', async () => {
  const api = fakeCos(), p = provider(api);
  const rows = await m.profile.readOwnProfile(p, 'usr_m1'), expected = await m.profile.profileRevision(rows);
  await assert.rejects(m.profile.saveOwnProfile(p, { actorId: 'usr_m1', role: 'front_desk', requestId: 'x', expected, form }), has('profile_denied'));
  await assert.rejects(m.profile.saveOwnProfile(p, { actorId: 'usr_m1', role: 'customer', requestId: 'x', expected, form: { ...form, birthday: '2026-02-30' } }), has('profile_validation'));
  assert.equal(api.writes().length, 0);
});
await test('profile: the emergency contact is saved to the person (H2: person emergency_contact_name/phone)', async () => {
  if (m.adapters.profiles.cols.emergency_contact?.derive) return 'pending';
  const api = fakeCos(), p = provider(api);
  const rows = await m.profile.readOwnProfile(p, 'usr_m1');
  await m.profile.saveOwnProfile(p, { actorId: 'usr_m1', role: 'customer', requestId: 'req-ec', expected: await m.profile.profileRevision(rows), form: { ...form, ec_name: 'Fictional Contact', ec_phone: '+57 300 000 0003' } });
  const person = api.db.person.get('per_m1').data;
  assert.equal(person.emergency_contact_name, 'Fictional Contact'); assert.equal(person.emergency_contact_phone, '+57 300 000 0003');
});
await test('profile: a field the backend did not keep is reported, never a silent "saved"', async () => {
  const api = fakeCos(), p = provider(api);
  const rows = await m.profile.readOwnProfile(p, 'usr_m1');
  const real = api.fetch;
  // The server answers the batch but keeps nothing (as with a field it drops): the read-back must catch it.
  const dropping = async (url, init) => (String(url).endsWith('/batch') ? json(200, { ids: ['per_m1'] }) : real(url, init));
  const q = new m.CompanyOSProvider({ fetch: dropping, config: { tenant: 'hoy', apiBase: '/api/cos' }, getToken: async () => 'tok', retryDelayMs: 1, sleep: async () => {} });
  await assert.rejects(m.profile.saveOwnProfile(q, { actorId: 'usr_m1', role: 'customer', requestId: 'req-drop', expected: await m.profile.profileRevision(rows), form }), has('profile_unconfirmed'));
});

// ── C-26 account: export from readable tables; deletion via the privacy_request form; marketing switch ──────────
const actor = { userId: 'usr_m1', tenantId: T, role: 'customer' };
await test('account export: prepared from the tables a member may read (no unconnected table asked), no write', async () => {
  const api = fakeCos(), p = provider(api);
  api.put('payment', { person: 'per_m1', amount: 90000, date: '2026-10-01', concept: 'Paquete', status: 'approved', method: 'transfer' });
  const preview = await m.account.prepareAccountPreview(p, actor);
  assert.equal(preview.tables.users.length, 1); assert.equal(preview.tables.payments.length, 1);
  for (const t of ['memberships', 'waitlist', 'payment_methods', 'reviews', 'invites', 'event_rsvps', 'message_log']) assert.ok(!(t in preview.tables), `${t} is not in the production export`);
  const cmd = await m.account.prepareAccountCommand(p, actor, { kind: 'export', preview }, 'nonce-export');
  const res = await cmd.execute();
  assert.equal(res.kind, 'export');
  assert.equal(api.writes().length, 0, 'export writes nothing');
  assert.ok(await cmd.takePreview());
});
await test('account deletion: the request goes to deletion_requests (H2: the privacy_request form) and reads back as sent', async () => {
  if (!m.adapters.deletion_requests) {
    // Until H2 merges, the production command must at least refuse honestly (not_in_launch), never report "sent".
    const api = fakeCos(), p = provider(api);
    const cmd = await m.account.prepareAccountCommand(p, actor, { kind: 'request', reason: 'Fictional reason' }, 'nonce-del');
    await assert.rejects(cmd.execute(), has('not_in_launch'));
    return 'pending';
  }
  const api = fakeCos(), p = provider(api);
  const cmd = await m.account.prepareAccountCommand(p, actor, { kind: 'request', reason: 'Fictional reason' }, 'nonce-del');
  const res = await cmd.execute();
  assert.equal(res.status, 'requested');
  assert.equal(api.db.form_submission.size + api.forms.length, 1);
});
await test('account deletion (production): the command inserts one deletion_requests row with the person\'s contact, no read-back of staff data', async () => {
  const inserted = [];
  const p = provider(fakeCos());
  const spy = { name: 'companyos', list: p.list.bind(p), get: p.get.bind(p), subscribe: () => () => {}, request: p.request.bind(p),
    insert: async (table, row, options) => { inserted.push({ table, row, options }); return { id: 'sub_1', tenant_id: T, created_at: '', updated_at: '', ...row }; },
    update: async () => { throw Error('no update'); }, remove: async () => { throw Error('no remove'); }, atomic: async () => { throw Error('no atomic'); } };
  const cmd = await m.account.prepareAccountCommand(spy, actor, { kind: 'request', reason: '  Fictional reason ' }, 'nonce-del2');
  const res = await cmd.execute();
  assert.equal(res.status, 'requested'); assert.equal(inserted.length, 1);
  assert.equal(inserted[0].table, 'deletion_requests');
  assert.deepEqual({ ...inserted[0].row }, { user_id: 'usr_m1', email: 'member@example.test', phone: '+57 300 000 0001', channel: 'app', reason: 'Fictional reason' });
  assert.ok(inserted[0].options?.idempotencyKey, 'keyed: a double tap is one request');
  await assert.rejects((await m.account.prepareAccountCommand(spy, actor, { kind: 'cancel', requestId: 'sub_1' }, 'n3')).execute(), has('account_'));
});
await test('marketing switch: one notification_pref marketing row in a keyed /batch; opt-in is worked out from the rows', async () => {
  const api = fakeCos(), p = provider(api);
  const before = await m.marketing.readMarketingState(p, actor);
  assert.equal(before.optin, true, 'no rows = enabled');
  const cmd = await m.marketing.prepareMarketingCommand(p, actor, 'email', false, 'nonce-mkt-1');
  await cmd.execute();
  const batches = api.calls.filter((c) => c.path === '/batch');
  assert.equal(batches.length, 1);
  assert.deepEqual(batches[0].body.ops, [{ op: 'create', entity: 'notification_pref', data: { person: 'per_m1', channel: 'email', category: 'marketing', enabled: false } }]);
  const mid = await m.marketing.readMarketingState(p, actor);
  assert.equal(mid.optin, true, 'whatsapp still on');
  await (await m.marketing.prepareMarketingCommand(p, actor, 'whatsapp', false, 'nonce-mkt-2')).execute();
  assert.equal((await m.marketing.readMarketingState(p, actor)).optin, false);
});
await test('marketing switch (review round): a retry after a lost answer that committed succeeds', async () => {
  const api = fakeCos(), p = provider(api);
  const cmd = await m.marketing.prepareMarketingCommand(p, actor, 'email', false, 'nonce-mkt-lost');
  api.loseNext('/batch', 3);
  await assert.rejects(cmd.execute());
  await cmd.execute();
  assert.equal(api.db.notification_pref.size, 1);
});
await test('marketing switch: hostile: a staff role is refused (marketing_scope), nothing written', async () => {
  const api = fakeCos(), p = provider(api);
  await assert.rejects(m.marketing.prepareMarketingCommand(p, { ...actor, role: 'front_desk' }, 'email', false, 'n'), has('marketing_scope'));
  assert.equal(api.writes().length, 0);
});

// ── Trial assessment (8 customer routes): the person's own lots and trial payments; trial_used from the server ───
const seedTrialProduct = (api) => api.put('product', { key: 'trial', name: 'Clase de prueba', kind: 'trial', price: 20000, credits: 1, active: true }).id;
await test('trial: a new customer is eligible on Company OS (no trial_disconnected)', async () => {
  const api = fakeCos(), p = provider(api);
  seedTrialProduct(api);
  assert.equal((await m.trial.readTrialAssessment(p, 'usr_m1')).status, 'eligible');
});
await test('trial: a trial lot (the trial product\'s lot) means trial_used', async () => {
  const api = fakeCos(), p = provider(api);
  const trialId = seedTrialProduct(api);
  const lot = api.put('credit_lot', { person: 'per_m1', source: 'purchase', product: trialId, quantity: 1, valid_until: '2026-12-31' });
  api.put('credit_entry', { lot: lot.id, person: 'per_m1', delta: 1, reason: 'grant' });
  assert.equal((await m.trial.readTrialAssessment(p, 'usr_m1')).status, 'trial_used');
});
await test('trial: a lot whose source is trial means trial_used (H2: class_ledger lot_source)', async () => {
  if (!m.adapters.class_ledger.cols.lot_source) return 'pending';
  const api = fakeCos(), p = provider(api);
  seedTrialProduct(api);
  const lot = api.put('credit_lot', { person: 'per_m1', source: 'trial', product: null, quantity: 1 });
  api.put('credit_entry', { lot: lot.id, person: 'per_m1', delta: 1, reason: 'grant' });
  assert.equal((await m.trial.readTrialAssessment(p, 'usr_m1')).status, 'trial_used');
});
await test('trial: a pending or approved trial payment means trial_used; a declined one does not; the excluded payment is ignored', async () => {
  const api = fakeCos(), p = provider(api);
  const trialId = seedTrialProduct(api);
  const declined = api.put('payment', { person: 'per_m1', product: trialId, amount: 20000, date: '2026-10-01', concept: 'Prueba', status: 'declined', method: 'transfer' });
  assert.equal((await m.trial.readTrialAssessment(p, 'usr_m1')).status, 'eligible');
  const pend = api.put('payment', { person: 'per_m1', product: trialId, amount: 20000, date: '2026-10-02', concept: 'Prueba', status: 'pending', method: 'transfer' });
  assert.equal((await m.trial.readTrialAssessment(p, 'usr_m1')).status, 'trial_used');
  assert.equal((await m.trial.readTrialAssessment(p, 'usr_m1', pend.id)).status, 'eligible', 'the payment being approved is not its own reason');
  assert.ok(declined);
});
await test('trial: the server\'s trial_used refusal has copy (es, en)', () => {
  assert.ok(m.hasRefusalCopy('trial_used')); assert.notEqual(m.refusalCopy('trial_used', 'en'), m.refusalCopy('trial_used', 'es'));
});

// ── /app/classes buy-more: recordPayment is never the production purchase path ─────────────────────────────────
await test('recordPayment: production refuses before any request (SERVER_RULES: Company OS prices and records the sale)', async () => {
  const api = fakeCos(), p = provider(api);
  await assert.rejects(m.payments.recordPayment(p, { userId: 'usr_m1', planId: 'plan_pack12', amount: 1, method: 'card', ivaRate: 0 }), has('checkout_server_only'));
  assert.equal(api.calls.length, 0);
  assert.ok(m.hasRefusalCopy('checkout_server_only'));
});

// ── M-08 payment instructions save (settings adapter inside atomic) ─────────────────────────────────────────────
const adminCos = () => { const api = fakeCos({ role: 'administrator', userId: 'usr_admin', personId: 'per_admin' }); api.put('person', { name: 'Fictional Admin', user: 'usr_admin', email: 'admin@example.test' }, 'per_admin'); return api; };
await test('payment instructions: an administrator\'s save is one keyed /batch on the studio_settings record (no payment_settings_disconnected)', async () => {
  const api = adminCos(), p = provider(api);
  const before = m.mergeSettings({}).payments, after = { ...before, bankName: 'FICTIONAL BANK', accountNumber: 'TEST-0001', accountHolder: 'FICTIONAL HOLDER', breBKey: '@TEST' };
  const res = await m.instructions.savePaymentSettings(p, { actorId: 'usr_admin', role: 'admin', requestId: 'req-pi-1', before, after }, { isCurrent: () => true });
  assert.deepEqual(res, after);
  const batches = api.calls.filter((c) => c.path === '/batch');
  assert.equal(batches.length, 1); assert.ok(batches[0].key);
  assert.equal(batches[0].body.ops[0].entity, 'setting');
  const rec = [...api.db.setting.values()].find((r) => r.data.key === 'studio_settings');
  assert.equal(rec.data.value.payments.bankName, 'FICTIONAL BANK');
});
await test('payment instructions: a retry after a lost answer is not refused as stale and writes once', async () => {
  const api = adminCos(), p = provider(api);
  const before = m.mergeSettings({}).payments, after = { ...before, bankName: 'FICTIONAL BANK 2' };
  const cmd = { actorId: 'usr_admin', role: 'admin', requestId: 'req-pi-2', before, after };
  api.loseNext('/batch', 3);
  await assert.rejects(m.instructions.savePaymentSettings(p, cmd, { isCurrent: () => true }));
  assert.deepEqual(await m.instructions.savePaymentSettings(p, cmd, { isCurrent: () => true }), after);
  assert.equal(api.db.setting.size, 1);
});
await test('payment instructions: hostile: a role without settings.write is refused before anything is sent', async () => {
  const api = adminCos(), p = provider(api);
  const before = m.mergeSettings({}).payments;
  await assert.rejects(m.instructions.savePaymentSettings(p, { actorId: 'usr_admin', role: 'front_desk', requestId: 'r', before, after: { ...before, bankName: 'X' } }, { isCurrent: () => true }), has('payment_settings_denied'));
  assert.equal(api.writes().length, 0);
});

// ── M-09 finance labels from payment.concept; special_charges is review only ────────────────────────────────────
await test('finance: a payment with no product is labelled by its concept (not "unresolved")', () => {
  const pay = { id: 'pay_1', tenant_id: T, created_at: '', updated_at: '', user_id: 'u', plan_id: null, amount: 50000, amount_paid: 50000, currency: 'COP', method: 'cash', provider: 'manual', status: 'approved', paid_at: '2026-10-05T15:00:00Z', note: null, concept: 'Clase privada' };
  const r = m.report.confirmedPaymentReport([pay], { tenantId: T, from: '2026-10-01', to: '2026-10-31', productName: (id) => id, personName: (id) => id });
  assert.equal(r.rows[0].product, 'Clase privada'); assert.equal(r.unresolvedProducts, 0);
});
await test('finance (review round): the adapter\'s default concepts (Compra, Transferencia) still count as unresolved', () => {
  const base = { tenant_id: T, created_at: '', updated_at: '', user_id: 'u', plan_id: null, amount: 1, amount_paid: 1, currency: 'COP', method: 'cash', provider: 'manual', status: 'approved', paid_at: '2026-10-05T15:00:00Z', note: null };
  const r = m.report.confirmedPaymentReport([{ ...base, id: 'p1', concept: 'Compra' }, { ...base, id: 'p2', concept: 'Transferencia' }], { tenantId: T, from: '2026-10-01', to: '2026-10-31', productName: (id) => id, personName: (id) => id, missingProductLabel: '?' });
  assert.equal(r.unresolvedProducts, 2); assert.ok(r.rows.every((x) => x.product === '?'));
});
await test('finance: production report reads payments only (no special_charges read)', async () => {
  const asked = [];
  const spy = { name: 'companyos', list: async (t) => { asked.push(t); return []; }, subscribe: () => () => {} };
  await new Promise((resolve) => { const w = m.reportReads.watchPaymentReport(spy, T, (s) => { if (s.status !== 'loading') { w.stop(); resolve(); } }); });
  assert.deepEqual(asked, ['payments']);
});

// ── C-08/C-10 the class the studio cancelled: the return from class_ledger cancel_return ───────────────────────
await test('studio return: a cancelled booking with a studio_cancel entry for it reads as returned (one class, its lot\'s expiry)', async () => {
  const api = fakeCos(), p = provider(api);
  const occ = api.put('occurrence', { title: 'Pulso', kind: 'class', starts_at: '2026-11-03T12:00:00Z', ends_at: '2026-11-03T13:00:00Z', capacity: 10, booked_count: 0, status: 'cancelled' });
  const bk = api.put('booking', { person: 'per_m1', occurrence: occ.id, status: 'cancelled', entitlement: 'credit' });
  const lot = api.put('credit_lot', { person: 'per_m1', source: 'purchase', quantity: 12, valid_until: '2026-12-31' });
  api.put('credit_entry', { lot: lot.id, person: 'per_m1', delta: 12, reason: 'grant' });
  api.put('credit_entry', { lot: lot.id, person: 'per_m1', delta: -1, reason: 'booking', booking: bk.id });
  api.put('credit_entry', { lot: lot.id, person: 'per_m1', delta: 1, reason: 'studio_cancel', booking: bk.id });
  const r = await m.studioReturn.readOwnStudioReturn(p, { actorId: 'usr_m1', role: 'customer' }, bk.id, { now: () => Date.parse('2026-11-04T12:00:00Z') });
  assert.equal(r.status, 'verified'); assert.equal(r.units, 1); assert.equal(r.expiresAt, '2026-12-31'); assert.equal(r.balance, 12);
});
await test('studio return: a paid single class comes back as a new one-class lot whose only entry is studio_cancel (H3)', async () => {
  const api = fakeCos(), p = provider(api);
  const occ = api.put('occurrence', { title: 'Pulso', kind: 'class', starts_at: '2026-11-03T12:00:00Z', ends_at: '2026-11-03T13:00:00Z', capacity: 10, booked_count: 0, status: 'cancelled' });
  const bk = api.put('booking', { person: 'per_m1', occurrence: occ.id, status: 'cancelled', entitlement: 'single' });
  const lot = api.put('credit_lot', { person: 'per_m1', source: 'purchase', quantity: 1, valid_until: '2027-01-31' });
  api.put('credit_entry', { lot: lot.id, person: 'per_m1', delta: 1, reason: 'studio_cancel', booking: bk.id });
  const r = await m.studioReturn.readOwnStudioReturn(p, { actorId: 'usr_m1', role: 'customer' }, bk.id, { now: () => Date.parse('2026-11-04T12:00:00Z') });
  assert.equal(r.status, 'verified'); assert.equal(r.units, 1); assert.equal(r.expiresAt, '2027-01-31');
  // The balance counts that lot only once class_ledger reads a lot's opening studio_cancel entry as the lot (H2 request).
  const rows = await p.list('class_ledger', { where: { user_id: 'usr_m1' } });
  if (rows.some((x) => x.reason === 'cancel_return' && x.purchase_ledger_id)) return 'pending';
  assert.equal(r.balance, 1);
});
await test('studio return: no return entry (or a booking the customer cancelled) reads as unverified, never a made-up return', async () => {
  const api = fakeCos(), p = provider(api);
  const occ = api.put('occurrence', { title: 'Pulso', kind: 'class', starts_at: '2026-11-03T12:00:00Z', ends_at: '2026-11-03T13:00:00Z', capacity: 10, booked_count: 0, status: 'scheduled' });
  const bk = api.put('booking', { person: 'per_m1', occurrence: occ.id, status: 'cancelled', entitlement: 'credit' });
  const r = await m.studioReturn.readOwnStudioReturn(p, { actorId: 'usr_m1', role: 'customer' }, bk.id, { now: () => Date.now() });
  assert.equal(r.status, 'unverified');
  await assert.rejects(m.studioReturn.readOwnStudioReturn(p, { actorId: 'usr_m1', role: 'front_desk' }, bk.id), has('studio_cancel_denied'));
});

// ── M-02 content editor: refused with copy until Wave 3, before anything is sent ───────────────────────────────
await test('content editor: a save in production is refused content_later (no silent success), nothing sent', async () => {
  const api = adminCos(), p = provider(api);
  const intent = { kind: 'update', table: 'teachers', before: { id: 'coach_1', tenant_id: T, created_at: '', updated_at: '' }, patch: { display_name: 'X' } };
  await assert.rejects(m.content.writeContent(p, { id: 'usr_admin', role: 'admin' }, intent, 'req-c1', { currentActor: () => ({ id: 'usr_admin', role: 'admin' }) }), has('content_later'));
  assert.equal(api.calls.length, 0);
  assert.ok(m.hasRefusalCopy('content_later'));
});

// ── AD-07 customer list: /query rows are { id, data } ──────────────────────────────────────────────────────────
await test('customer list: balances come from { id, data } rows (person, lot fields under data), aggregate rows flat', () => {
  const rows = {
    people: [{ id: 'per_1', data: { name: 'Fictional One', email: 'one@example.test', phone: '+57 300 000 0009' }, createdAt: '2026-10-01T00:00:00Z' }],
    products: [{ id: 'prd_pack', data: { name: 'Paquete 12' } }],
    lots: [{ id: 'lot_1', data: { person: 'per_1', source: 'purchase', product: 'prd_pack', valid_from: '2026-10-01', valid_until: '2026-12-31' } }],
    left: [{ lot: 'lot_1', left: 7 }],
    vouchers: [],
  };
  const list = m.balances.customerListRows(rows, '2026-10-31');
  assert.equal(list.length, 1);
  assert.equal(list[0].name, 'Fictional One'); assert.equal(list[0].remaining, 7); assert.equal(list[0].plan_name, 'Paquete 12'); assert.equal(list[0].expires, '2026-12-31');
});

console.log(`\n${passed} passed, ${failures} failed, ${pending} waiting for lane H2`);
console.log(failures ? 'H1 connected flows FAILED' : 'H1 connected flows passed');
process.exitCode = failures ? 1 : 0;
