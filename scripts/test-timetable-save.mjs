// Lane Y5 (owner 2026-11-01, "Open timetable saves") · the M-02 timetable editor saves in the production build:
// a timetable row (`class_templates`) is a Company OS `schedule` with its coach, room and class type (`modality`,
// lane Y1). Administration, the Coordinator and Super Admin create, edit and deactivate rows (decision A-02: the
// coordinator holds classes.write and the bookings module's timetable writes); every other role is refused before
// anything is sent. Fields Company OS doesn't store (theme, description, level) are hidden in production, never sent.
// A refusal (resource_overlap from bookings 1.6.0's enforce_no_overlap, validation, a stale row) is a code with copy.
// The rest of M-02 (teachers, class types, rooms, FAQ…) stays refused `content_later` until Wave 3.
// Runs the real CompanyOSProvider (production build) against a fake Company OS in its real shapes ({ id, data }
// records, { error } refusals, Idempotency-Key replay, the schedule's required fields and the room rule).
// It is NOT Company OS; fictional data only. Run: node scripts/test-timetable-save.mjs
import { build } from 'esbuild';
import assert from 'node:assert/strict';

let failures = 0, passed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log(`ok   ${name}`); }
  catch (e) { failures++; console.log(`FAIL ${name}\n     ${String(e?.stack ?? e).split('\n').slice(0, 3).join('\n     ')}`); }
}
const values = new Map();
globalThis.localStorage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, String(v)), removeItem: (k) => values.delete(k) };
globalThis.sessionStorage = globalThis.localStorage;

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
const m = await load([
  "export { CompanyOSProvider } from './src/data/companyos/CompanyOSProvider';",
  "export { adapters } from './src/data/companyos/mapping';",
  "export { refusalCopy, hasRefusalCopy } from './src/data/companyos/refusals';",
  "export { writeContent } from './src/modules/admin/contentRecovery';",
  "export * from './src/modules/admin/timetableSave';",
  "export { strings as adminStrings } from './src/modules/admin/strings';",
].join('\n'));

// ── A fake Company OS: schedule (bookings), coach, resource, person ──────────────────────────────────────────────
const SCHEDULE = {
  title: { req: true }, kind: {}, resource: {}, coach: {}, weekday: { req: true }, start_time: { req: true }, duration_minutes: { req: true },
  capacity: { req: true }, spots_enabled: {}, valid_from: {}, valid_until: {}, active: {}, modality: { enum: ['alineacion', 'centro', 'fuego', 'hibrido', 'ligereza', 'pulso', 'solido'] },
};
const WRITERS = ['administrator', 'booking_manager'];
const json = (status, body) => new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function fakeCos({ role = 'administrator', superAdmin = false } = {}) {
  const db = { schedule: new Map(), coach: new Map(), resource: new Map(), person: new Map() };
  const calls = [], keys = new Map();
  let seq = 0, lose = 0;
  const put = (entity, data, id = `${entity}_${String(++seq).padStart(3, '0')}`) => { const at = new Date(Date.UTC(2026, 10, 1, 12, 0, seq)).toISOString(); const rec = { id, data: { ...data }, createdAt: at, updatedAt: at, createdBy: 'usr_1' }; db[entity].set(id, rec); return rec; };
  put('person', { name: 'Fictional Staff', user: 'usr_1' }, 'per_1');
  put('person', { name: 'Fictional Teacher' }, 'per_t');
  put('coach', { person: 'per_t', kind: 'teacher', active: true }, 'coach_1');
  put('resource', { name: 'Sala principal', kind: 'room', capacity: 12 }, 'room_main');
  put('resource', { name: 'Sala pequeña', kind: 'room', capacity: 8 }, 'room_small');
  const minutes = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
  /** bookings 1.6.0 with enforce_no_overlap: two active rows in one room meeting on the same weekday clash. */
  const clash = (data, selfId) => {
    if (data.active === false || !data.resource) return false;
    const a = Number(data.weekday) * 1440 + minutes(data.start_time), aEnd = a + Number(data.duration_minutes);
    return [...db.schedule.values()].some((s) => {
      if (s.id === selfId || s.data.active === false || s.data.resource !== data.resource) return false;
      const b = Number(s.data.weekday) * 1440 + minutes(s.data.start_time), bEnd = b + Number(s.data.duration_minutes);
      return a < bEnd && b < aEnd;
    });
  };
  const refuse = (status, code) => Object.assign(new Error(code), { status, code });
  function write(op, entity, id, body) {
    if (!(WRITERS.includes(role) || superAdmin)) throw refuse(403, 'forbidden');
    if (entity !== 'schedule') throw refuse(403, 'forbidden');
    for (const [k, v] of Object.entries(body ?? {})) {
      if (!SCHEDULE[k]) throw refuse(400, 'validation');
      if (v != null && v !== '' && SCHEDULE[k].enum && !SCHEDULE[k].enum.includes(v)) throw refuse(400, 'validation');
    }
    if (op === 'create') {
      const data = { kind: 'class', spots_enabled: false, active: true, ...Object.fromEntries(Object.entries(body).map(([k, v]) => [k, v === '' ? null : v])) };
      for (const [k, f] of Object.entries(SCHEDULE)) if (f.req && (data[k] == null || data[k] === '')) throw refuse(400, 'validation');
      if (clash(data, null)) throw refuse(422, 'resource_overlap');
      return put('schedule', data);
    }
    const rec = db.schedule.get(id);
    if (!rec) throw refuse(404, 'not_found');
    const merged = { ...rec.data, ...Object.fromEntries(Object.entries(body).map(([k, v]) => [k, v === '' ? null : v])) };
    for (const [k, f] of Object.entries(SCHEDULE)) if (f.req && (merged[k] == null || merged[k] === '')) throw refuse(400, 'validation');
    if (clash(merged, id)) throw refuse(422, 'resource_overlap');
    rec.data = merged; rec.updatedAt = new Date(Date.UTC(2026, 10, 2, 0, 0, ++seq)).toISOString();
    return rec;
  }
  const filterOk = (rec, f) => {
    if (!f) return true;
    if (f.and) return f.and.every((x) => filterOk(rec, x));
    if (f.or) return f.or.some((x) => filterOk(rec, x));
    const v = f.field === 'id' ? rec.id : rec.data[f.field];
    if (f.op === 'eq') return v === f.value;
    if (f.op === 'in') return f.value.includes(v);
    return true;
  };
  const withInclude = (rec, include) => {
    const r = structuredClone(rec);
    for (const inc of include ?? []) {
      const t = db[inc.field]?.get(r.data[inc.field]);
      if (t) r.data[inc.field] = { id: t.id, ...Object.fromEntries(Object.entries(t.data).filter(([k]) => !inc.fields || inc.fields.includes(k))) };
    }
    return r;
  };
  async function fetch(url, init = {}) {
    const u = new URL(url, 'http://hoy.test/'), method = init.method ?? 'GET', body = init.body ? JSON.parse(init.body) : undefined, key = init.headers?.['idempotency-key'];
    if (u.pathname.endsWith('app-config.json')) return json(200, { tenant: 'hoy', apiBase: '/api/cos' });
    const path = u.pathname.replace('/api/cos/t/hoy', '');
    calls.push({ method, path, body: structuredClone(body), key });
    const answer = (r) => { if (lose > 0 && method === 'POST' && path.startsWith('/api/')) { lose--; throw new TypeError('fetch failed'); } return r; };
    if (key && method !== 'GET') {
      const prior = keys.get(key);
      if (prior) return answer(JSON.stringify(prior.body) === JSON.stringify(body) ? json(prior.status, prior.response) : json(409, { error: 'idempotency_conflict' }));
      const r = run(); if (r.ok) keys.set(key, { body, status: r.status, response: await r.clone().json() }); return answer(r);
    }
    return answer(run());
    function run() {
      try {
        if (path === '/me') return json(200, { user: { id: 'usr_1' }, roleKeys: [role], caps: [], isSuperAdmin: superAdmin });
        if (path === '/query') {
          const rows = [...(db[body.entity]?.values() ?? [])].filter((r) => filterOk(r, body.filter)).map((r) => withInclude(r, body.include));
          return json(200, { data: rows.slice(body.offset ?? 0, (body.offset ?? 0) + (body.limit ?? 100)) });
        }
        const mm = path.match(/^\/api\/([a-z_]+)(?:\/([^/]+))?$/);
        if (!mm) return json(404, { error: 'not_found' });
        const [, entity, rawId] = mm, id = rawId && decodeURIComponent(rawId);
        if (method === 'POST') return json(201, { data: write('create', entity, null, body) });
        if (method === 'PATCH') return json(200, { data: write('update', entity, id, body) });
        if (method === 'DELETE') return json(403, { error: 'forbidden' });
        const rec = db[entity]?.get(id);
        return rec ? json(200, { data: withInclude(rec) }) : json(404, { error: 'not_found' });
      } catch (e) { return json(e.status ?? 422, { error: e.code ?? e.message }); }
    }
  }
  return { db, calls, put, fetch, loseNextCreate(n = 1) { lose = n; }, writes: () => calls.filter((c) => c.method !== 'GET' && c.path !== '/query' && c.path !== '/me') };
}
const provider = (api) => new m.CompanyOSProvider({ fetch: api.fetch, config: { tenant: 'hoy', apiBase: '/api/cos' }, getToken: async () => 'tok', retryDelayMs: 1, sleep: async () => {} });
const has = (code) => (e) => String(e?.code ?? e?.message ?? e) === code || String(e?.message ?? e).includes(code);
const actorOf = (role) => ({ id: 'usr_1', role });
const save = (p, role, intent, requestId = `req-${Math.random().toString(36).slice(2, 10)}`) => m.writeContent(p, actorOf(role), intent, requestId, { currentActor: () => actorOf(role) });
/** The editor's draft for a new row, as ContentPage sends it (BLANK, production title). */
const NEW_ROW = { generation_mode: 'manual', start_date: '2026-11-02', end_date: null, title: 'Nueva clase', modality_id: '', teacher_id: '', room_id: '', weekday: 1, start_time: '07:00', duration_min: 50, capacity: 12, level: 'all', active: false };
const listRow = async (p, id) => (await p.list('class_templates')).find((r) => r.id === id);
/** A saved active row: Tuesday 09:00 in the small room, Pulso with the teacher. */
async function seeded(api, p, extra = {}) {
  const rec = api.put('schedule', { title: 'Pulso', kind: 'class', modality: 'pulso', coach: 'coach_1', resource: 'room_small', weekday: 2, start_time: '09:00', duration_minutes: 50, capacity: 8, spots_enabled: false, active: true, ...extra });
  return listRow(p, rec.id);
}

// ── Who saves ───────────────────────────────────────────────────────────────────────────────────────────────────
await test('who: Administration, the Coordinator and Super Admin save the timetable (classes.write); no other role does', () => {
  for (const r of ['admin', 'coordinator', 'super_admin']) assert.equal(m.canSaveTimetable(r), true, r);
  for (const r of ['marketing', 'front_desk', 'finance', 'teacher', 'maintenance', 'developer', 'customer', 'public']) assert.equal(m.canSaveTimetable(r), false, r);
});

// ── Create, edit, deactivate ────────────────────────────────────────────────────────────────────────────────────
await test('create: one keyed POST /api/schedule with the stored fields only (no theme, description, level, generation mode)', async () => {
  const api = fakeCos(), p = provider(api);
  const id = await save(p, 'admin', { kind: 'create', table: 'class_templates', patch: { ...NEW_ROW } }, 'req-create-1');
  const writes = api.writes();
  assert.equal(writes.length, 1);
  assert.equal(writes[0].method, 'POST'); assert.equal(writes[0].path, '/api/schedule'); assert.ok(writes[0].key, 'Idempotency-Key');
  assert.deepEqual(Object.keys(writes[0].body).sort(), ['active', 'capacity', 'coach', 'duration_minutes', 'kind', 'modality', 'resource', 'start_time', 'title', 'valid_from', 'valid_until', 'weekday']);
  assert.equal(writes[0].body.active, false, 'a new row starts as a draft');
  assert.equal(api.db.schedule.get(id).data.title, 'Nueva clase');
});
await test('create: a lost answer retried with the same request makes one row (same Idempotency-Key)', async () => {
  const api = fakeCos(), p = provider(api);
  // Every answer lost: the save fails (the transport's own retries reuse the key); the person's retry reuses it too.
  api.loseNextCreate(50);
  await assert.rejects(save(p, 'admin', { kind: 'create', table: 'class_templates', patch: { ...NEW_ROW } }, 'req-lost-1'));
  api.loseNextCreate(0);
  const id = await save(p, 'admin', { kind: 'create', table: 'class_templates', patch: { ...NEW_ROW } }, 'req-lost-1');
  assert.equal(api.db.schedule.size, 1);
  assert.ok(api.db.schedule.has(id));
  const keysSent = new Set(api.writes().map((w) => w.key));
  assert.equal(keysSent.size, 1);
});
await test('edit: coach, room, class type, weekday and time go out as schedule fields; the row reads back mapped', async () => {
  const api = fakeCos(), p = provider(api);
  const before = await seeded(api, p);
  await save(p, 'admin', { kind: 'update', table: 'class_templates', before, patch: { modality_id: 'mod_solido', title: 'Sólido', teacher_id: 'coach_1', room_id: 'room_main', weekday: 3, start_time: '10:00', duration_min: 55 } });
  const patch = api.writes().find((w) => w.method === 'PATCH');
  assert.equal(patch.path, `/api/schedule/${before.id}`);
  assert.deepEqual(patch.body, { modality: 'solido', title: 'Sólido', coach: 'coach_1', resource: 'room_main', weekday: 3, start_time: '10:00', duration_minutes: 55 });
  const after = await listRow(p, before.id);
  assert.equal(after.modality_id, 'mod_solido'); assert.equal(after.room_id, 'room_main'); assert.equal(after.start_time, '10:00');
});
await test('edit: a lost answer retried finds its own save and reports it saved (no false content_conflict)', async () => {
  const api = fakeCos(), p = provider(api);
  const before = await seeded(api, p);
  await save(p, 'admin', { kind: 'update', table: 'class_templates', before, patch: { capacity: 6, start_time: '09:30' } });
  // The editor never heard back and retries the same edit from the same basis.
  assert.equal(await save(p, 'admin', { kind: 'update', table: 'class_templates', before, patch: { capacity: 6, start_time: '09:30' } }), before.id);
  assert.equal(api.writes().filter((w) => w.method === 'PATCH').length, 1);
  // A different edit from that stale basis in another tab (its own provider) is still a conflict. (In this tab it is the
  // same editor's next save, which review round 1's L4 lets through: see the r1 L4 tests.)
  await assert.rejects(save(provider(api), 'admin', { kind: 'update', table: 'class_templates', before, patch: { capacity: 5 } }), has('content_conflict'));
});
await test('deactivate: Published off sends active false; the row stays (deactivated, never deleted)', async () => {
  const api = fakeCos(), p = provider(api);
  const before = await seeded(api, p);
  await save(p, 'coordinator', { kind: 'update', table: 'class_templates', before, patch: { active: false } });
  assert.deepEqual(api.writes().map((w) => [w.method, w.body]), [['PATCH', { active: false }]]);
  assert.equal(api.db.schedule.get(before.id).data.active, false);
});
await test('delete: refused timetable_deactivate_instead before anything is sent, with copy', async () => {
  const api = fakeCos(), p = provider(api);
  const before = await seeded(api, p);
  await assert.rejects(save(p, 'admin', { kind: 'delete', table: 'class_templates', before }), has('timetable_deactivate_instead'));
  assert.equal(api.writes().length, 0);
  assert.ok(m.hasRefusalCopy('timetable_deactivate_instead'));
});
await test('super admin saves too', async () => {
  const api = fakeCos({ role: 'administrator', superAdmin: true }), p = provider(api);
  const before = await seeded(api, p);
  await save(p, 'super_admin', { kind: 'update', table: 'class_templates', before, patch: { capacity: 7 } });
  assert.equal(api.db.schedule.get(before.id).data.capacity, 7);
});

// ── Refused before anything is sent ─────────────────────────────────────────────────────────────────────────────
await test('roles without classes.write are refused content_denied, nothing sent (marketing keeps content.write but not the timetable)', async () => {
  for (const role of ['marketing', 'front_desk', 'teacher', 'customer', 'finance']) {
    const api = fakeCos({ role: role === 'teacher' ? 'coach' : role }), p = provider(api);
    const before = await seeded(api, p);
    await assert.rejects(save(p, role, { kind: 'update', table: 'class_templates', before, patch: { active: false } }), has('content_denied'), role);
    await assert.rejects(save(p, role, { kind: 'create', table: 'class_templates', patch: { ...NEW_ROW } }), has('content_denied'), role);
    assert.equal(api.writes().length, 0, role);
  }
});
await test('a field Company OS does not store (theme, description, level) is refused content_invalid, never silently dropped', async () => {
  const api = fakeCos(), p = provider(api);
  const before = await seeded(api, p);
  for (const patch of [{ theme: { es: 'Respira', en: 'Breathe' } }, { description: { es: 'x' } }, { level: 'advanced' }, { generation_mode: 'automatic' }, { title: 'Ok', theme: { es: 'y' } }]) {
    await assert.rejects(save(p, 'admin', { kind: 'update', table: 'class_templates', before, patch }), has('content_invalid'), JSON.stringify(patch));
  }
  assert.equal(api.writes().length, 0);
});
await test('hostile values are refused content_invalid before anything is sent', async () => {
  const api = fakeCos(), p = provider(api);
  const before = await seeded(api, p);
  const bad = [
    { modality_id: 'mod_unknown' }, { modality_id: 'mod_../x' }, { modality_id: 42 }, { start_time: '25:00' }, { start_time: '7:00' }, { weekday: 7 }, { weekday: -1 },
    { weekday: 1.5 }, { capacity: 0 }, { capacity: -3 }, { duration_min: 0 }, { title: '' }, { title: '   ' }, { title: 'x'.repeat(501) }, { active: 'yes' },
    { teacher_id: { $ref: 0 } }, { room_id: ['room_main'] }, { start_date: '2026-13-40' }, { id: 'other' }, { tenant_id: 'ten_other' }, {},
  ];
  for (const patch of bad) await assert.rejects(save(p, 'admin', { kind: 'update', table: 'class_templates', before, patch }), has('content_invalid'), JSON.stringify(patch));
  await assert.rejects(save(p, 'admin', { kind: 'create', table: 'class_templates', patch: { ...NEW_ROW, title: '' } }), has('content_invalid'));
  await assert.rejects(save(p, 'admin', { kind: 'create', table: 'class_templates', patch: { ...NEW_ROW, active: true } }), has('content_invalid'), 'a new row starts as a draft');
  assert.equal(api.writes().length, 0);
});
await test('a stale row (someone saved it meanwhile) is refused content_conflict before the PATCH, with copy', async () => {
  const api = fakeCos(), p = provider(api);
  const before = await seeded(api, p);
  api.db.schedule.get(before.id).updatedAt = '2026-11-03T00:00:00.000Z';
  await assert.rejects(save(p, 'admin', { kind: 'update', table: 'class_templates', before, patch: { capacity: 6 } }), has('content_conflict'));
  assert.equal(api.writes().length, 0);
  assert.ok(m.hasRefusalCopy('content_conflict'));
});

// ── Refused by Company OS: a code with copy ─────────────────────────────────────────────────────────────────────
await test('a room clash is refused resource_overlap by Company OS; the error is a definite refusal with ES and EN copy', async () => {
  const api = fakeCos(), p = provider(api);
  await seeded(api, p, { resource: 'room_main', weekday: 1, start_time: '07:00' });
  const draft = await listRow(p, (await save(p, 'admin', { kind: 'create', table: 'class_templates', patch: { ...NEW_ROW, room_id: 'room_main', start_time: '07:20', modality_id: 'mod_fuego' } })));
  const err = await save(p, 'admin', { kind: 'update', table: 'class_templates', before: draft, patch: { active: true } }).then(() => null, (e) => e);
  assert.ok(err, 'refused');
  assert.equal(m.definiteRefusal(err), 'resource_overlap');
  assert.ok(m.hasRefusalCopy('resource_overlap'));
  assert.match(m.refusalCopy('resource_overlap', 'es'), /sala/i);
  assert.match(m.refusalCopy('resource_overlap', 'en'), /room/i);
  assert.equal(api.db.schedule.get(draft.id).data.active, false);
});
await test('definiteRefusal: a 4xx answer and the client refusals are definite (no retry); a lost answer or a 5xx is not', async () => {
  const err = (code, init) => Object.assign(new Error(code), { code, ...init });
  assert.equal(m.definiteRefusal(err('validation', { status: 400, ambiguous: false })), 'validation');
  assert.equal(m.definiteRefusal(err('forbidden', { status: 403, ambiguous: false })), 'forbidden');
  for (const code of ['content_invalid', 'content_conflict', 'content_denied', 'timetable_deactivate_instead']) assert.equal(m.definiteRefusal(m.timetableRefusal(code)), code);
  assert.equal(m.definiteRefusal(err('network_error', { status: 0, ambiguous: true })), null);
  assert.equal(m.definiteRefusal(err('some_new_code', { status: 422, ambiguous: false })), null, 'a code without copy is never shown raw');
  assert.equal(m.definiteRefusal(err('service_unavailable', { status: 503, ambiguous: true })), null);
  assert.equal(m.definiteRefusal(new Error('content_context_changed')), null);
  assert.equal(m.definiteRefusal('boom'), null);
  for (const code of ['content_invalid', 'content_denied']) assert.ok(m.hasRefusalCopy(code), code);
});

// ── Review round 1 (r1hoy): publishing needs a class type; an unchanged save; a second quick save ───────────────
await test('r1 M2: Published on for a row without a class type is refused timetable_class_type_required, nothing sent, with ES and EN copy', async () => {
  const api = fakeCos(), p = provider(api);
  const draft = await listRow(p, await save(p, 'admin', { kind: 'create', table: 'class_templates', patch: { ...NEW_ROW } }));
  const writesBefore = api.writes().length;
  for (const patch of [{ active: true }, { active: true, modality_id: '' }, { active: true, modality_id: null }, { active: true, title: 'Otra' }]) {
    const err = await save(p, 'admin', { kind: 'update', table: 'class_templates', before: draft, patch }).then(() => null, (e) => e);
    assert.equal(err?.code, 'timetable_class_type_required', JSON.stringify(patch));
    assert.equal(m.definiteRefusal(err), 'timetable_class_type_required');
  }
  assert.equal(api.writes().length, writesBefore, 'nothing sent');
  assert.equal(api.db.schedule.get(draft.id).data.active, false);
  assert.ok(m.hasRefusalCopy('timetable_class_type_required'));
  assert.match(m.refusalCopy('timetable_class_type_required', 'es'), /modalidad/i);
  assert.match(m.refusalCopy('timetable_class_type_required', 'en'), /class type/i);
});
await test('r1 M2: a published row can\'t lose its class type either; one save that sets the class type and publishes goes through', async () => {
  const api = fakeCos(), p = provider(api);
  const live = await seeded(api, p);
  for (const patch of [{ modality_id: '' }, { modality_id: null }]) await assert.rejects(save(p, 'admin', { kind: 'update', table: 'class_templates', before: live, patch }), has('timetable_class_type_required'), JSON.stringify(patch));
  assert.equal(api.writes().length, 0);
  const draft = await listRow(p, await save(p, 'admin', { kind: 'create', table: 'class_templates', patch: { ...NEW_ROW } }));
  await save(p, 'admin', { kind: 'update', table: 'class_templates', before: draft, patch: { modality_id: 'mod_fuego', active: true } });
  assert.equal(api.db.schedule.get(draft.id).data.active, true);
  assert.equal(api.db.schedule.get(draft.id).data.modality, 'fuego');
});
await test('r1 M2: existing rows unchanged: a draft without a class type still edits other fields, and any row still deactivates', async () => {
  const api = fakeCos(), p = provider(api);
  const draft = await listRow(p, await save(p, 'admin', { kind: 'create', table: 'class_templates', patch: { ...NEW_ROW } }));
  await save(p, 'admin', { kind: 'update', table: 'class_templates', before: draft, patch: { capacity: 10 } });
  assert.equal(api.db.schedule.get(draft.id).data.capacity, 10);
  // A published row saved before the class type was required (no modality): it can still be switched off.
  const legacy = await seeded(api, p, { modality: null, title: 'Clase' });
  await save(p, 'admin', { kind: 'update', table: 'class_templates', before: legacy, patch: { active: false } });
  assert.equal(api.db.schedule.get(legacy.id).data.active, false);
});
await test('r1 M2: the drawer\'s Published toggle is off-limits for a row without a class type (the screen\'s rule)', () => {
  assert.equal(m.timetablePublishBlocked({ modality_id: '' }), true);
  assert.equal(m.timetablePublishBlocked({ modality_id: null }), true);
  assert.equal(m.timetablePublishBlocked({}), true);
  assert.equal(m.timetablePublishBlocked({ modality_id: 'mod_unknown' }), true);
  assert.equal(m.timetablePublishBlocked({ modality_id: 'mod_pulso' }), false);
  // A published row without one may always be switched off.
  assert.equal(m.timetablePublishBlocked({ modality_id: '', active: true }), false);
  const s = m.adminStrings['admin.content.classTypeToPublish'];
  assert.ok(s?.es && s?.en, 'the toggle\'s hint exists in Spanish and English');
});
await test('r1 L3: Save with nothing changed sends nothing and is not an error (an empty patch is a no-op)', () => {
  const basis = { id: 'x', title: 'Pulso', capacity: 8, theme: { es: 'a', en: 'b' } };
  assert.deepEqual(m.draftPatch({ title: 'Pulso', capacity: 8, theme: { es: 'a', en: 'b' } }, basis), {});
  assert.deepEqual(m.draftPatch({ title: 'Pulso', capacity: 6 }, basis), { capacity: 6 });
  assert.equal(m.nothingToSave({ title: 'Pulso', capacity: 8 }, basis), true);
  assert.equal(m.nothingToSave({ title: 'Pulso', capacity: 6 }, basis), false);
});
await test('r1 L4: a second quick save from the same editor (before the table refreshes) is not a false content_conflict', async () => {
  const api = fakeCos(), p = provider(api);
  const before = await seeded(api, p);
  await save(p, 'admin', { kind: 'update', table: 'class_templates', before, patch: { capacity: 6 } });
  // The editor's basis is still the row it opened; its draft now differs from it in A (saved) and B (new).
  await save(p, 'admin', { kind: 'update', table: 'class_templates', before, patch: { capacity: 6, start_time: '09:30' } });
  await save(p, 'admin', { kind: 'update', table: 'class_templates', before, patch: { capacity: 6, start_time: '09:30', duration_min: 45 } });
  const rec = api.db.schedule.get(before.id).data;
  assert.equal(rec.capacity, 6); assert.equal(rec.start_time, '09:30'); assert.equal(rec.duration_minutes, 45);
});
await test('r1 L4: someone else\'s save in between is still a conflict (own saves only)', async () => {
  const api = fakeCos(), p = provider(api);
  const before = await seeded(api, p);
  await save(p, 'admin', { kind: 'update', table: 'class_templates', before, patch: { capacity: 6 } });
  // Another editor saves the row after us.
  const rec = api.db.schedule.get(before.id); rec.data.title = 'Cambiado'; rec.updatedAt = '2026-11-05T00:00:00.000Z';
  await assert.rejects(save(p, 'admin', { kind: 'update', table: 'class_templates', before, patch: { capacity: 6, start_time: '09:30' } }), has('content_conflict'));
  assert.equal(api.db.schedule.get(before.id).data.start_time, '09:00');
});
await test('r1 L6: the problem report\'s form codes have a line in the code→copy table (ES and EN)', () => {
  for (const code of ['invalid_answers', 'answer_too_long', 'invalid_email', 'write_forbidden']) {
    assert.ok(m.hasRefusalCopy(code), code);
    assert.ok(m.refusalCopy(code, 'es') && m.refusalCopy(code, 'en') && !m.refusalCopy(code, 'es').includes(code), code);
  }
});

// ── The rest of M-02 stays refused until Wave 3 ─────────────────────────────────────────────────────────────────
await test('teachers, class types and rooms still refuse content_later in production, nothing sent', async () => {
  const api = fakeCos(), p = provider(api);
  const before = { id: 'x', tenant_id: 'ten_hoy', created_at: '', updated_at: '' };
  for (const table of ['teachers', 'modalities', 'rooms', 'faq_entries']) {
    await assert.rejects(save(p, 'admin', { kind: 'update', table, before, patch: { name: 'X' } }), has('content_later'), table);
    await assert.rejects(save(p, 'admin', { kind: 'create', table, patch: { name: 'X' } }), has('content_later'), table);
  }
  assert.equal(api.writes().length, 0);
});

// ── The editor's fields match what Company OS stores ────────────────────────────────────────────────────────────
await test('the fields the production editor shows are the class_templates columns stored on schedule; the hidden ones are derived', () => {
  const cols = m.adapters.class_templates.cols;
  for (const f of m.TIMETABLE_FIELDS) assert.ok(cols[f]?.field && !cols[f].derive, `${f} is stored`);
  for (const f of m.TIMETABLE_UNSTORED) assert.ok(cols[f]?.derive, `${f} is derived (not stored)`);
});
await test('strings: the production notice, the new row title and the read-only line exist in Spanish and English', () => {
  for (const key of ['admin.content.later', 'admin.content.timetableLive', 'admin.content.newClassTitle', 'admin.content.timetableReadOnly']) {
    const s = m.adminStrings[key];
    assert.ok(s?.es && s?.en, key);
  }
});

console.log(`\n${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
