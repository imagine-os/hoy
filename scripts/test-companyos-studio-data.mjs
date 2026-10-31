// Lane H2 (hoy-all-roles): the Company OS adapters behind the studio data, against a fake Company OS API that
// plays each role's row policies (deploy/recipes/hoy.json in ../Company-OS). Run: node scripts/test-companyos-studio-data.mjs
// Covers: the settings split (decision F-01: studio_settings + studio_private), holiday hours (hours_override) and
// the bookings review_closed_dates sync, the staff inbox (comms_log + staff_note), the privacy request (forms), legal
// publishing (people signup_consents), the emergency contact on the person, sign-up's person fields, and the
// signed-out reads (public settings, holiday hours, booked mats).
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const scratch = await mkdtemp(join(tmpdir(), 'hoy-h2-'));
let failures = 0, passed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log(`ok   ${name}`); }
  catch (e) { failures++; console.log(`FAIL ${name}\n     ${e?.stack ?? e}`); }
}

try {
  const file = join(scratch, 'h2.mjs');
  await build({
    stdin: {
      contents: `export * from './src/data/companyos/CompanyOSProvider.ts';
        export * from './src/data/companyos/mapping.ts';
        export * from './src/data/companyos/refusals.ts';
        export * from './src/data/companyos/settingsSplit.ts';
        export * from './src/data/companyos/closedDates.ts';
        export { signupBody, asksEmergencyContact, parseSignupConfig } from './src/auth/companyOsIdentity.ts';
        export { legalDocuments } from './src/data/seed/legal.ts';`,
      resolveDir: process.cwd(), loader: 'ts',
    },
    bundle: true, platform: 'node', format: 'esm', outfile: file, logLevel: 'silent',
    loader: { '.jpg': 'empty', '.png': 'empty', '.webp': 'empty', '.svg': 'empty', '.md': 'text' },
    define: { 'import.meta.env': '{"VITE_HOY_BUILD":"production"}' },
  });
  const m = await import(pathToFileURL(file));
  const { CompanyOSProvider, adapters, fromRecord, toData, hasRefusalCopy, splitSettings, closedDatesOf, signupBody, parseSignupConfig } = m;

  // ------------------------------------------------------------------ a fake Company OS that plays the recipe's policies
  const UUID = () => crypto.randomUUID();
  const ROLE_READS = {
    // entity -> roles that may read it (others: 403 forbidden); absent = everyone signed in.
    staff_note: ['administrator', 'front_desk', 'booking_manager'],
    comms_log: ['administrator', 'front_desk', 'booking_manager', 'marketing'],
    form_submission: ['administrator'],
  };
  function fakeApi({ role = 'administrator', superAdmin = role === 'administrator', today = '2026-11-01' } = {}) {
    const db = new Map();
    const calls = [];
    const modules = { people: { signup_consents: 'terms@2026-10-01,privacy@2026-10-01', self_signup: false }, bookings: { review_closed_dates: '' } };
    const table = (e) => { if (!db.has(e)) db.set(e, new Map()); return db.get(e); };
    const put = (entity, data, id = UUID()) => {
      const at = new Date().toISOString();
      const rec = { id, data: { ...data }, createdBy: 'user-1', createdAt: at, updatedAt: at };
      table(entity).set(id, rec); return rec;
    };
    const match = (rec, f) => {
      if (!f || f.all) return true;
      if (f.and) return f.and.every((x) => match(rec, x));
      if (f.or) return f.or.some((x) => match(rec, x));
      if (f.ref) { const target = table(f.entity).get(rec.data[f.ref]); return !!target && match(target, f.where); }
      const v = f.field === 'id' ? rec.id : rec.data[f.field];
      const want = f.value && typeof f.value === 'object' && f.value.$me ? 'user-1' : f.value;
      switch (f.op) {
        case 'eq': return v === want; case 'neq': return v !== want;
        case 'in': return want.includes(v); case 'gte': return v >= want; case 'is_null': return v == null; case 'is_not_null': return v != null;
        default: throw new Error(`fake: op ${f.op}`);
      }
    };
    const json = (status, body) => new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'x-request-id': 'r' } });
    const refuse = (status, error) => json(status, { error, message: `${error} (fake)` });
    /** The recipe's row policies, as the fake plays them. */
    function visible(entity, rec, anonymous) {
      if (entity === 'setting') {
        if (anonymous) return rec.data.key === 'studio_settings';
        return rec.data.key === 'studio_settings' || (rec.data.key === 'studio_private' && ['administrator', 'treasurer'].includes(role));
      }
      return true;
    }
    function project(entity, rec, anonymous) {
      const out = { id: rec.id, data: { ...rec.data }, createdBy: rec.createdBy, createdAt: rec.createdAt, updatedAt: rec.updatedAt };
      if (anonymous && entity === 'booking') out.data = { occurrence: rec.data.occurrence, spot: rec.data.spot };
      if (anonymous && entity === 'setting') out.data = { key: rec.data.key, value: rec.data.value };
      if (anonymous && entity === 'hours_override') delete out.data.note;
      return out;
    }
    const PUBLIC = new Set(['occurrence', 'schedule', 'resource', 'coach', 'product', 'setting', 'hours_override', 'booking']);
    async function handle(url, init = {}) {
      const u = new URL(url, 'http://hoy.test/');
      const method = init.method ?? 'GET';
      const body = init.body ? JSON.parse(init.body) : undefined;
      const headers = init.headers ?? {};
      calls.push({ method, path: u.pathname.replace(/^\/api\/cos\/t\/hoy/, ''), body });
      if (u.pathname === '/app-config.json') return json(200, { tenant: 'hoy', apiBase: '/api/cos', clerkPublishableKey: 'pk_test', launch: {} });
      const anonymous = headers.authorization === undefined;
      const path = u.pathname.replace(/^\/api\/cos\/t\/hoy/, '');
      if (anonymous && !(path === '/query' && PUBLIC.has(body?.entity))) return refuse(401, 'unauthorized');
      if (path === '/me') return json(200, { user: { id: 'user-1' }, roleKeys: [role], caps: [], isSuperAdmin: superAdmin, tenant: { timezone: 'America/Bogota' } });
      if (path === '/query') {
        if (!anonymous && ROLE_READS[body.entity] && !ROLE_READS[body.entity].includes(role)) return refuse(403, 'forbidden');
        if (anonymous && body.entity === 'booking') {
          for (const f of JSON.stringify(body.filter ?? {}).match(/"field":"(\w+)"/g) ?? []) if (!/occurrence|spot|starts_at/.test(f)) return refuse(400, 'unknown field');
        }
        let rows = [...table(body.entity).values()].filter((r) => visible(body.entity, r, anonymous) && match(r, body.filter));
        if (anonymous && body.entity === 'booking') rows = rows.filter((r) => ['booked', 'held', 'checked_in'].includes(r.data.status));
        rows = rows.slice(body.offset ?? 0, (body.offset ?? 0) + (body.limit ?? 100));
        return json(200, { data: rows.map((r) => project(body.entity, r, anonymous)) });
      }
      if (path === '/signup' && method === 'GET') {
        return json(200, { enabled: true, consents: modules.people.signup_consents.split(',').filter(Boolean).map((c) => ({ document: c.split('@')[0], version: c.split('@')[1] })), personFields: ['name', 'phone'], facetFields: [] });
      }
      const mod = path.match(/^\/modules\/(\w+)\/settings$/);
      if (mod) {
        if (!superAdmin) return refuse(403, 'forbidden');
        if (method === 'PATCH') Object.assign(modules[mod[1]], body.settings);
        return json(200, { module: mod[1], settings: { ...modules[mod[1]] } });
      }
      if (path === '/batch') {
        const ids = [];
        for (const op of body.ops) {
          if (op.op === 'create') ids.push(put(op.entity, op.data).id);
          else if (op.op === 'update') { Object.assign(table(op.entity).get(op.id).data, op.data); ids.push(op.id); }
          else { table(op.entity).delete(op.id); ids.push(op.id); }
        }
        return json(200, { ids });
      }
      const one = path.match(/^\/api\/([a-z_]+)(?:\/([^/]+))?$/);
      if (one) {
        const [, entity, id] = one;
        if (method === 'POST') {
          if (entity === 'form_submission' && role !== 'member' && role !== 'administrator') return refuse(403, 'forbidden');
          return json(201, { data: put(entity, entity === 'comms_log' ? { ...body, sent_by: 'user-1' } : body) });
        }
        const rec = table(entity).get(id);
        if (!rec || !visible(entity, rec, false)) return refuse(404, 'not found');
        if (method === 'GET') return json(200, { data: project(entity, rec, false) });
        if (method === 'PATCH') { Object.assign(rec.data, body); return json(200, { data: rec }); }
        if (method === 'DELETE') { table(entity).delete(id); return new Response(null, { status: 204 }); }
      }
      return refuse(404, 'not found');
    }
    return { db, calls, put, table, modules, today, fetch: (url, init) => handle(url, init) };
  }
  const make = (api, extra = {}) => new CompanyOSProvider({ fetch: api.fetch, getToken: async () => 'tok-1', retryDelayMs: 1, sleep: async () => {}, closedDatesDelayMs: 0, ...extra });
  const signedOut = (api) => make(api, { getToken: async () => null });
  const writes = (api, path) => api.calls.filter((c) => c.method !== 'GET' && c.path === path);

  const PUBLIC_VALUE = { profile: { whatsapp: '+57 300 000 0000' }, payments: { accountNumber: '000-1' }, contacts: { frontDesk: { whatsapp: '+57 300 000 0001', hours: 'studioHours' } } };
  const PRIVATE_VALUE = { payroll: { cadence: 'monthly', rateCard: { byModality: {}, byTeacher: { leo: 91000 } } }, integrations: { wompi: 'connected' }, contacts: { owner: { whatsapp: '+57 300 999 9999', hours: 'businessDays' } } };

  // ------------------------------------------------------------------ settings split (F-01)
  await test('settings split: the private sections are payroll, integrations and the payroll/coordinator/owner contacts', () => {
    const { pub, priv } = splitSettings({ ...PUBLIC_VALUE, payroll: PRIVATE_VALUE.payroll, integrations: PRIVATE_VALUE.integrations, contacts: { ...PUBLIC_VALUE.contacts, ...PRIVATE_VALUE.contacts, payroll: { hours: 'always' } } });
    assert.deepEqual(Object.keys(priv).sort(), ['contacts', 'integrations', 'payroll']);
    assert.deepEqual(Object.keys(priv.contacts).sort(), ['owner', 'payroll']);
    assert.deepEqual(Object.keys(pub).sort(), ['contacts', 'payments', 'profile']);
    assert.deepEqual(Object.keys(pub.contacts), ['frontDesk']);
  });
  await test('settings split: Administration reads both records merged into the one tenants row', async () => {
    const api = fakeApi();
    api.put('setting', { key: 'studio_settings', value: PUBLIC_VALUE });
    api.put('setting', { key: 'studio_private', value: PRIVATE_VALUE });
    const [row] = await make(api).list('tenants');
    assert.equal(row.settings.payroll.rateCard.byTeacher.leo, 91000);
    assert.equal(row.settings.payments.accountNumber, '000-1');
    assert.deepEqual(Object.keys(row.settings.contacts).sort(), ['frontDesk', 'owner']);
    assert.equal(api.calls.filter((c) => c.path === '/query' && c.body.entity === 'setting').length, 1, 'one query for both records');
  });
  await test('settings split: a customer (or any role but Administration and Finance) gets the public record only', async () => {
    const api = fakeApi({ role: 'member' });
    api.put('setting', { key: 'studio_settings', value: PUBLIC_VALUE });
    api.put('setting', { key: 'studio_private', value: PRIVATE_VALUE });
    const [row] = await make(api).list('tenants');
    assert.equal(row.settings.payroll, undefined);
    assert.ok(!JSON.stringify(row).includes('91000'));
  });
  await test('settings split: saving a public section writes studio_settings only; a payroll save writes studio_private only', async () => {
    const api = fakeApi();
    const pubRec = api.put('setting', { key: 'studio_settings', value: PUBLIC_VALUE });
    api.put('setting', { key: 'studio_private', value: PRIVATE_VALUE });
    const p = make(api);
    const [row] = await p.list('tenants');
    await p.update('tenants', row.id, { settings: { ...row.settings, policies: { cancellationHours: 24 } } });
    assert.equal(writes(api, `/api/setting/${pubRec.id}`).length, 1);
    assert.equal(api.calls.filter((c) => c.method !== 'GET' && c.path.startsWith('/api/setting') && c.path !== `/api/setting/${pubRec.id}`).length, 0, 'the private record is untouched');
    assert.equal(pubRec.data.value.policies.cancellationHours, 24);
    assert.equal(pubRec.data.value.payroll, undefined, 'never a private section in the public record');
    const [again] = await p.list('tenants');
    await p.update('tenants', again.id, { settings: { ...again.settings, payroll: { ...again.settings.payroll, cadence: 'biweekly' } } });
    const priv = [...api.table('setting').values()].find((r) => r.data.key === 'studio_private');
    assert.equal(priv.data.value.payroll.cadence, 'biweekly');
    assert.equal(writes(api, `/api/setting/${pubRec.id}`).length, 1, 'the public record is untouched by a payroll save');
  });
  await test('settings split: a legacy row holding the pay data moves it to studio_private on the next save (created then)', async () => {
    const api = fakeApi();
    const legacy = api.put('setting', { key: 'studio_settings', value: { ...PUBLIC_VALUE, payroll: PRIVATE_VALUE.payroll, integrations: PRIVATE_VALUE.integrations } });
    const p = make(api);
    const [row] = await p.list('tenants');
    assert.equal(row.settings.payroll.rateCard.byTeacher.leo, 91000, 'still read until it moves');
    await p.update('tenants', row.id, { settings: { ...row.settings, quietHours: { from: '22:00', to: '07:00' } } });
    assert.equal(legacy.data.value.payroll, undefined);
    assert.equal(legacy.data.value.integrations, undefined);
    // Both records in one /batch: the pay data is never in neither (review round 1).
    const batch = api.calls.filter((c) => c.path === '/batch');
    assert.equal(batch.length, 1);
    assert.deepEqual(batch[0].body.ops.find((o) => o.op === 'create'), { op: 'create', entity: 'setting', data: { key: 'studio_private', value: { payroll: PRIVATE_VALUE.payroll, integrations: PRIVATE_VALUE.integrations } } });
    assert.equal(writes(api, '/api/setting').length, 0);
  });
  await test('settings split: inside atomic, both parts are batch ops of the one /batch', async () => {
    const api = fakeApi();
    const pubRec = api.put('setting', { key: 'studio_settings', value: PUBLIC_VALUE });
    const p = make(api);
    await p.atomic(async (tx) => {
      const row = await tx.get('tenants', 'ten_hoy');
      await tx.update('tenants', row.id, { settings: { ...row.settings, payments: { accountNumber: '000-2' }, payroll: { cadence: 'monthly' } } });
    }, { idempotencyKey: 'settings-h2-1' });
    const batch = api.calls.filter((c) => c.path === '/batch');
    assert.equal(batch.length, 1);
    assert.deepEqual(batch[0].body.ops.map((o) => [o.op, o.entity, o.data?.key ?? o.id]).sort(), [['create', 'setting', 'studio_private'], ['update', 'setting', pubRec.id]].sort());
  });
  await test('settings split: a role that may not read the private record never writes it (a public save sends nothing private)', async () => {
    const api = fakeApi({ role: 'front_desk', superAdmin: false });
    api.put('setting', { key: 'studio_settings', value: PUBLIC_VALUE });
    api.put('setting', { key: 'studio_private', value: PRIVATE_VALUE });
    const p = make(api);
    const [row] = await p.list('tenants');
    await p.update('tenants', row.id, { settings: { ...row.settings, policies: { cancellationHours: 6 } } });
    assert.equal(writes(api, '/api/setting').length, 0, 'no studio_private create from a role that reads defaults');
    assert.ok(!api.calls.some((c) => c.method !== 'GET' && c.path.startsWith('/api/setting/') && c.body?.value?.payroll), 'nothing private is sent');
  });
  await test('signed out: the website reads the public settings record (never studio_private)', async () => {
    const api = fakeApi();
    api.put('setting', { key: 'studio_settings', value: PUBLIC_VALUE });
    api.put('setting', { key: 'studio_private', value: PRIVATE_VALUE });
    const [row] = await signedOut(api).list('tenants');
    assert.equal(row.settings.payments.accountNumber, '000-1');
    assert.equal(row.settings.payroll, undefined);
  });

  // ------------------------------------------------------------------ holiday hours
  await test('hours_overrides: hours_override ↔ HoursOverrideRow both ways', () => {
    const row = fromRecord(adapters.hours_overrides, { id: 'h1', createdBy: 'u9', data: { start_date: '2026-12-25', end_date: '2026-12-25', closed: true, open: null, close: null, label: { es: 'Navidad', en: 'Christmas' }, kind: 'holiday', source: 'colombia', note: 'x' } });
    assert.deepEqual([row.start_date, row.end_date, row.closed, row.kind, row.source, row.label.es, row.note, row.google_synced_at, row.created_by], ['2026-12-25', '2026-12-25', true, 'holiday', 'colombia', 'Navidad', 'x', null, 'u9']);
    assert.deepEqual(toData(adapters.hours_overrides, { start_date: '2026-12-31', end_date: '2026-12-31', closed: false, open: '08:00', close: '12:00', label: { es: 'Fin de año', en: 'NYE' }, kind: 'special', source: 'manual', note: null, google_synced_at: null, created_by: 'u1' }, 'create'),
      { start_date: '2026-12-31', end_date: '2026-12-31', closed: false, open: '08:00', close: '12:00', label: { es: 'Fin de año', en: 'NYE' }, kind: 'special', source: 'manual', note: null });
  });
  await test('closed dates: every date a closed override covers, from today on, sorted and unique', () => {
    const rows = [
      { start_date: '2026-10-20', end_date: '2026-10-20', closed: true },
      { start_date: '2026-12-24', end_date: '2026-12-26', closed: true },
      { start_date: '2026-12-25', end_date: '2026-12-25', closed: true },
      { start_date: '2026-11-15', end_date: '2026-11-15', closed: false },
    ];
    assert.deepEqual(closedDatesOf(rows, '2026-11-01'), ['2026-12-24', '2026-12-25', '2026-12-26']);
  });
  await test('hours_overrides: after the holiday import, bookings review_closed_dates holds the closed dates (Super Admin)', async () => {
    const api = fakeApi();
    const p = make(api, { today: () => '2026-11-01' });
    await p.insert('hours_overrides', { start_date: '2026-11-02', end_date: '2026-11-02', closed: true, label: { es: 'Todos los santos', en: 'All Saints' }, kind: 'holiday', source: 'colombia', note: null });
    await p.insert('hours_overrides', { start_date: '2026-11-16', end_date: '2026-11-16', closed: true, label: { es: 'Independencia de Cartagena', en: 'Cartagena' }, kind: 'holiday', source: 'colombia', note: null });
    await p.closedDatesSettled();
    assert.equal(api.modules.bookings.review_closed_dates, '2026-11-02, 2026-11-16');
    const patches = writes(api, '/modules/bookings/settings');
    assert.ok(patches.length >= 1 && patches.length <= 2);
    // Removing one re-syncs; an unchanged list sends nothing.
    const [first] = await p.list('hours_overrides', { where: { start_date: '2026-11-02' } });
    await p.remove('hours_overrides', first.id);
    await p.closedDatesSettled();
    assert.equal(api.modules.bookings.review_closed_dates, '2026-11-16');
    const before = writes(api, '/modules/bookings/settings').length;
    const [second] = await p.list('hours_overrides');
    await p.update('hours_overrides', second.id, { note: 'only a note' });
    await p.closedDatesSettled();
    assert.equal(writes(api, '/modules/bookings/settings').length, before, 'no PATCH when the dates are the same');
  });
  await test('hours_overrides: without the Super Admin the override still saves and the sync is skipped', async () => {
    const api = fakeApi({ superAdmin: false });
    const p = make(api, { today: () => '2026-11-01' });
    const warn = console.warn; console.warn = () => {};
    try {
      await p.insert('hours_overrides', { start_date: '2026-11-02', end_date: '2026-11-02', closed: true, label: { es: 'x', en: 'x' }, kind: 'holiday', source: 'manual', note: null });
      await p.closedDatesSettled();
    } finally { console.warn = warn; }
    assert.equal(api.table('hours_override').size, 1);
    assert.equal(api.modules.bookings.review_closed_dates, '');
  });
  await test('signed out: holiday hours are read live, without the note', async () => {
    const api = fakeApi();
    api.put('hours_override', { start_date: '2026-12-25', end_date: '2026-12-25', closed: true, label: { es: 'Navidad', en: 'Christmas' }, kind: 'holiday', source: 'colombia', note: 'interno' });
    const rows = await signedOut(api).list('hours_overrides');
    assert.equal(rows.length, 1); assert.equal(rows[0].note, null);
  });

  // ------------------------------------------------------------------ staff inbox and notes
  await test('message_log: reads comms_log and staff_note as one thread per person', async () => {
    const api = fakeApi({ role: 'front_desk', superAdmin: false });
    api.put('comms_log', { recipient: 'p1', direction: 'out', channel: 'whatsapp', body: 'Hola', status: 'logged', sent_at: '2026-11-01T12:00:00.000Z', sent_by: 'u2' });
    api.put('comms_log', { recipient: 'p1', direction: 'out', channel: 'email', subject: 'Bienvenida', body: 'Hola', status: 'sent', message_key: 'welcome', sent_at: '2026-11-01T11:00:00.000Z' });
    api.put('staff_note', { person: 'p1', body: 'Prefiere la ventana' });
    const rows = await make(api).list('message_log', { where: { user_id: 'p1' } });
    const by = Object.fromEntries(rows.map((r) => [r.channel, r]));
    assert.equal(rows.length, 3);
    assert.deepEqual([by.whatsapp.direction, by.whatsapp.status, by.whatsapp.source, by.whatsapp.sent_by], ['outbound', 'sent', 'manual', 'u2']);
    assert.deepEqual([by.email.template_key, by.email.source, by.email.subject], ['welcome', 'automation', 'Bienvenida']);
    assert.deepEqual([by.note.direction, by.note.body, by.note.status, by.note.read_at], ['internal', 'Prefiere la ventana', 'sent', null]);
    assert.ok(rows.every((r) => r.user_id === 'p1' && r.read_at === null));
  });
  await test('message_log: a role that can\'t read notes gets the log; a customer gets nothing, without an error', async () => {
    const api = fakeApi({ role: 'marketing', superAdmin: false });
    api.put('comms_log', { recipient: 'p1', direction: 'out', channel: 'whatsapp', body: 'Hola', status: 'logged' });
    api.put('staff_note', { person: 'p1', body: 'interna' });
    assert.deepEqual((await make(api).list('message_log')).map((r) => r.channel), ['whatsapp']);
    const customer = fakeApi({ role: 'member', superAdmin: false });
    customer.put('staff_note', { person: 'p1', body: 'interna' });
    assert.deepEqual(await make(customer).list('message_log'), []);
  });
  await test('message_log: a note is a staff_note, a WhatsApp is a logged comms_log row (wa.me, R-04), an email is refused', async () => {
    const api = fakeApi({ role: 'front_desk', superAdmin: false });
    const p = make(api);
    const note = await p.insert('message_log', { user_id: 'p1', channel: 'note', direction: 'internal', source: 'manual', body: 'Llamar', status: 'sent', sent_by: 'x', payload: null });
    assert.deepEqual(writes(api, '/api/staff_note').map((c) => c.body), [{ person: 'p1', body: 'Llamar' }]);
    assert.equal(note.channel, 'note');
    await p.insert('message_log', { user_id: 'p1', channel: 'whatsapp', direction: 'outbound', source: 'manual', template_key: 'reminder', body: 'Te esperamos', status: 'sent', sent_at: '2026-11-01T12:00:00.000Z', payload: { x: 1 } });
    assert.deepEqual(writes(api, '/api/comms_log').map((c) => c.body), [{ recipient: 'p1', direction: 'out', channel: 'whatsapp', message_key: 'reminder', subject: null, body: 'Te esperamos', status: 'logged', sent_at: '2026-11-01T12:00:00.000Z' }]);
    await assert.rejects(p.insert('message_log', { user_id: 'p1', channel: 'email', direction: 'outbound', subject: 'x', body: 'x' }), (e) => e.code === 'email_not_connected');
    const [row] = await p.list('message_log', { where: { channel: 'whatsapp' } });
    const before = api.calls.length;
    await p.update('message_log', row.id, { read_at: '2026-11-01T13:00:00.000Z', read_by: 'u1' });
    assert.equal(api.calls.filter((c, i) => i >= before && c.method !== 'GET' && c.path !== '/query').length, 0, 'read stamps are not stored (no inbound rows)');
  });

  await test('message_log: a logged message is never removed; a note is (Administration)', async () => {
    const api = fakeApi();
    const log = api.put('comms_log', { recipient: 'p1', direction: 'out', channel: 'whatsapp', body: 'Hola', status: 'logged', sent_by: 'u2' });
    const note = api.put('staff_note', { person: 'p1', body: 'x' });
    const p = make(api);
    await assert.rejects(p.remove('message_log', log.id), (e) => e.code === 'read_only');
    await p.remove('message_log', note.id);
    assert.equal(api.table('staff_note').size, 0); assert.equal(api.table('comms_log').size, 1);
  });

  // ------------------------------------------------------------------ class ledger (for H1 and H3)
  await test('class_ledger: lot_source is the lot\'s source (H1\'s trial check)', () => {
    const row = fromRecord(adapters.class_ledger, { id: 'e1', data: { person: 'p1', delta: 1, reason: 'grant', lot: { id: 'l1', source: 'trial' } } });
    assert.equal(row.lot_source, 'trial');
    assert.equal(fromRecord(adapters.class_ledger, { id: 'e2', data: { person: 'p1', delta: -1, reason: 'booking' } }).lot_source, null);
  });
  await test('class_ledger: a lot whose only entry is its studio_cancel return (credits 1.2.0) reads as the lot\'s opening', async () => {
    const api = fakeApi({ role: 'member', superAdmin: false });
    const single = api.put('credit_lot', { person: 'p1', source: 'purchase', quantity: 1 });
    const pack = api.put('credit_lot', { person: 'p1', source: 'purchase', quantity: 12 });
    api.put('credit_entry', { lot: single.id, person: 'p1', delta: 1, reason: 'studio_cancel', booking: 'b1' });
    api.put('credit_entry', { lot: pack.id, person: 'p1', delta: 12, reason: 'grant' });
    api.put('credit_entry', { lot: pack.id, person: 'p1', delta: -1, reason: 'booking', booking: 'b2' });
    api.put('credit_entry', { lot: pack.id, person: 'p1', delta: 1, reason: 'studio_cancel', booking: 'b2' });
    const p = make(api);
    const rows = await p.list('class_ledger');
    const opening = rows.find((r) => r.id === single.id);
    assert.ok(opening, 'the single class lot has a row with its id');
    assert.deepEqual([opening.reason, opening.delta, opening.purchase_ledger_id], ['cancel_return', 1, null]);
    assert.ok(rows.find((r) => r.reason === 'cancel_return' && r.purchase_ledger_id === pack.id), 'a return to a lot with a grant stays a return');
    assert.equal((await p.get('class_ledger', single.id))?.id, single.id);
  });

  // ------------------------------------------------------------------ privacy request
  await test('deletion_requests: a customer\'s request is a privacy_request form submission; listing it reads as empty', async () => {
    const api = fakeApi({ role: 'member', superAdmin: false });
    const p = make(api);
    await p.insert('deletion_requests', { user_id: 'p1', email: 'ana@example.test', phone: '+57 300', channel: 'app', status: 'requested', reason: 'Ya no vivo en la ciudad', requested_at: 'x', resolved_at: null, resolved_by: null, checklist: null, note: null });
    assert.deepEqual(writes(api, '/api/form_submission').map((c) => c.body), [{ form_key: 'privacy_request', person: 'p1', email: 'ana@example.test', placement: 'app', answers: { request: 'deletion', message: 'Ya no vivo en la ciudad' } }]);
    assert.deepEqual(await p.list('deletion_requests'), []);
    await assert.rejects(p.update('deletion_requests', 'x', { status: 'cancelled' }), (e) => e.code === 'read_only');
  });
  await test('deletion_requests: Administration reads them as requested rows', async () => {
    const api = fakeApi();
    api.put('form_submission', { form_key: 'privacy_request', person: 'p1', email: 'ana@example.test', placement: 'app', answers: { request: 'deletion', message: 'x' }, submitted_at: '2026-11-01T12:00:00.000Z' });
    api.put('form_submission', { form_key: 'other', email: 'z@example.test' });
    const rows = await make(api).list('deletion_requests');
    assert.equal(rows.length, 1);
    assert.deepEqual([rows[0].user_id, rows[0].email, rows[0].channel, rows[0].status, rows[0].reason, rows[0].requested_at], ['p1', 'ana@example.test', 'app', 'requested', 'x', '2026-11-01T12:00:00.000Z']);
  });

  // ------------------------------------------------------------------ legal documents
  await test('legal_documents: signup_consents decides which terms/privacy version is published', async () => {
    const api = fakeApi();
    api.modules.people.signup_consents = 'terms@2.0,privacy@1.0';
    const rows = await make(api).list('legal_documents');
    const status = Object.fromEntries(rows.map((r) => [r.id, r.status]));
    assert.equal(status.leg_terms_20, 'published'); assert.equal(status.leg_terms_es, 'draft'); assert.equal(status.leg_privacy_es, 'published');
    // A version the build doesn't have changes nothing (the recipe's dated versions today).
    const other = fakeApi(); // terms@2026-10-01
    const built = Object.fromEntries((await make(other).list('legal_documents')).map((r) => [r.id, r.status]));
    assert.equal(built.leg_terms_es, 'published'); assert.equal(built.leg_terms_20, 'published');
  });
  await test('legal_documents: publishing a version sign-up asks for bumps signup_consents; other documents are in the build', async () => {
    const api = fakeApi();
    const p = make(api);
    await p.update('legal_documents', 'leg_terms_20', { status: 'published', published_at: '2026-11-01T00:00:00.000Z' });
    assert.equal(api.modules.people.signup_consents, 'terms@2.0,privacy@2026-10-01');
    await p.update('legal_documents', 'leg_waiver_11', { status: 'published' });
    assert.equal(api.modules.people.signup_consents, 'terms@2.0,privacy@2026-10-01,waiver@1.1');
    await assert.rejects(p.update('legal_documents', 'leg_cancellation_10', { status: 'published' }), (e) => e.code === 'legal_document_in_build');
    await assert.rejects(p.update('legal_documents', 'leg_terms_20', { status: 'draft' }), (e) => e.code === 'legal_document_current');
    await assert.rejects(p.update('legal_documents', 'leg_terms_20', { title: { es: 'x', en: 'x' } }), (e) => e.code === 'legal_document_in_build');
    const staff = fakeApi({ role: 'front_desk', superAdmin: false });
    await assert.rejects(make(staff).update('legal_documents', 'leg_terms_20', { status: 'published' }), (e) => e.code === 'forbidden');
  });
  await test('legal_documents: a customer reads the versions sign-up asks for (GET /signup)', async () => {
    const api = fakeApi({ role: 'member', superAdmin: false });
    api.modules.people.signup_consents = 'terms@2.0,privacy@1.0';
    const status = Object.fromEntries((await make(api).list('legal_documents')).map((r) => [r.id, r.status]));
    assert.equal(status.leg_terms_20, 'published'); assert.equal(status.leg_terms_es, 'draft');
    assert.ok(!api.calls.some((c) => c.path.startsWith('/modules/')), 'a customer never asks for module settings');
  });

  // ------------------------------------------------------------------ emergency contact
  await test('profiles: the emergency contact is the person\'s two fields', () => {
    const row = fromRecord(adapters.profiles, { id: 'p1', data: { name: 'Ana', emergency_contact_name: 'Luis', emergency_contact_phone: '+573005550102' } });
    assert.deepEqual(row.emergency_contact, { name: 'Luis', phone: '+573005550102' });
    assert.equal(fromRecord(adapters.profiles, { id: 'p2', data: { name: 'Bea' } }).emergency_contact, null);
    assert.deepEqual(toData(adapters.profiles, { full_name: 'Ana', emergency_contact: { name: 'Eva', phone: '+57 300' } }, 'update'), { name: 'Ana', emergency_contact_name: 'Eva', emergency_contact_phone: '+57 300' });
    assert.deepEqual(toData(adapters.profiles, { emergency_contact: null }, 'update'), { emergency_contact_name: null, emergency_contact_phone: null });
  });
  await test('sign-up: the emergency contact goes on the person when /signup lists it as person fields (and on the facet for an older tenant)', () => {
    const form = { name: 'Ana Prueba', whatsapp: '300 555 0101', ecName: 'Luis', ecPhone: '300 555 0102', accepted: true };
    const person = parseSignupConfig({ enabled: true, consents: [], personFields: ['name', 'phone', 'emergency_contact_name', 'emergency_contact_phone'], facetFields: [] });
    const a = signupBody(form, person);
    assert.deepEqual(a.person, { name: 'Ana Prueba', phone: '3005550101', emergency_contact_name: 'Luis', emergency_contact_phone: '3005550102' });
    assert.deepEqual(a.facet, {});
    const facet = parseSignupConfig({ enabled: true, consents: [], personFields: ['name', 'phone'], facetFields: ['emergency_contact_name', 'emergency_contact_phone'] });
    assert.deepEqual(signupBody(form, facet).facet, { emergency_contact_name: 'Luis', emergency_contact_phone: '3005550102' });
  });

  // ------------------------------------------------------------------ signed-out mats
  await test('signed out: bookings read as booked mats (class and mat, nothing else)', async () => {
    const api = fakeApi();
    api.put('booking', { occurrence: 'o1', spot: 3, person: 'p1', status: 'booked' });
    api.put('booking', { occurrence: 'o1', spot: 5, person: 'p2', status: 'cancelled' });
    api.put('occurrence', { starts_at: new Date(Date.now() + 86400_000).toISOString() }, 'o1');
    api.put('occurrence', { starts_at: '2020-01-01T12:00:00.000Z' }, 'o0');
    api.put('booking', { occurrence: 'o0', spot: 7, person: 'p3', status: 'booked' });
    const rows = await signedOut(api).list('bookings', { where: { session_id: 'o1' } });
    assert.deepEqual(rows.map((r) => [r.session_id, r.mat_number, r.status, r.user_id]), [['o1', 3, 'booked', null]]);
    // Only classes still to come are asked for (review round 1): a visitor never pages the whole history.
    assert.deepEqual((await signedOut(api).list('bookings')).map((r) => r.mat_number), [3]);
    const q = api.calls.filter((c) => c.path === '/query' && c.body.entity === 'booking').pop();
    assert.ok(JSON.stringify(q.body.filter).includes('"ref":"occurrence"'));
  });

  // ------------------------------------------------------------------ copy
  await test('refusal copy: the new codes have Spanish and English lines', () => {
    for (const code of ['legal_document_in_build', 'legal_document_current', 'email_not_connected', 'unknown_form', 'unknown_answer']) assert.ok(hasRefusalCopy(code), code);
  });
  await test('the Hoy server forwards the new public entities signed out', async () => {
    const src = await readFile('server/app.mjs', 'utf8');
    const list = src.match(/PUBLIC_ENTITIES = new Set\(\[([^\]]*)\]\)/)[1];
    for (const e of ['setting', 'hours_override', 'booking']) assert.ok(list.includes(`'${e}'`), e);
  });
} finally {
  await rm(scratch, { recursive: true, force: true });
}
console.log(failures ? `\n${failures} failed, ${passed} passed` : `\nstudio data adapters passed (${passed})`);
process.exit(failures ? 1 : 0);
