// Go-live lane H1: public images and teacher profiles, without a browser. The names Lane C1 fixed in Company OS, the real
// upload path through the provider (POST /files, PUT, confirm), the photo id treated as untrusted, the teacher's fields
// read from Company OS and never from the build's seed by name, what the editor writes, who sees which upload mode, and
// the refusals in words. Browser half: scripts/test-golive-images-ui.mjs. Run: node scripts/test-golive-images.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';

let failures = 0, passed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log(`ok   ${name}`); }
  catch (e) { failures++; console.log(`FAIL ${name}\n     ${e?.message ?? e}`); }
}

const load = async (contents) => {
  try {
    const out = await build({
      stdin: { contents, resolveDir: process.cwd(), loader: 'ts' },
      bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent', jsx: 'automatic',
      loader: { '.jpg': 'empty', '.png': 'empty', '.webp': 'empty', '.svg': 'empty', '.css': 'empty', '.md': 'text' },
      define: { 'import.meta.env': '{"VITE_HOY_BUILD":"production","DEV":false,"PROD":true}', __HOY_BUILD__: '"production"' },
    });
    return await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
  } catch (e) { return { __error: String(e.message).split('\n').slice(0, 2).join(' ') }; }
};
const images = await load("export * from './src/data/companyos/publicImages.ts';");
const provider = await load("export * from './src/data/companyos/CompanyOSProvider.ts'; export * from './src/data/companyos/mapping.ts'; export * from './src/data/companyos/refusals.ts';");
const ops = await load("export * from './src/modules/classSchedule/live/scheduleOps.ts'; export { liveScheduleStrings } from './src/modules/classSchedule/live/strings.ts'; export { strings as mediaStrings } from './src/modules/media/strings.ts';");
const pay = await load("import './src/tenant/tenant.ts'; import './src/modules/admin/settings.ts'; export { validPaymentImage } from './src/modules/admin/paymentInstructions.ts';");
const needs = (m) => { if (m.__error) throw new Error(`does not load: ${m.__error}`); };

const ID = '0b0f6e1c-3c6a-4c0e-9a51-6f3f2c1d9e01';
const HOSTILE_PHOTOS = ['javascript:alert(1)', 'https://evil.example/x.png', '//evil.example/x.png', '../../etc/passwd', `/media/${ID}`, `${ID}/url`, `${ID}%2F..`, `${ID} `, '<img src=x onerror=alert(1)>', 'data:image/svg+xml,<svg onload=alert(1)>', '', null, undefined, 42, {}, [ID], { id: ID }];

// ── A small Company OS: the real provider's calls, in order ──────────────────────────────────────────────────────
function fakeApi({ refuse } = {}) {
  const calls = [];
  const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  const fetch = async (url, init = {}) => {
    const u = new URL(url, 'http://hoy.test/');
    const method = init.method ?? 'GET';
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
    calls.push({ method, url: u.href, path: u.pathname.replace(/^\/api\/cos\/t\/hoy/, ''), body, headers: init.headers ?? {} });
    if (u.pathname === '/app-config.json') return json(200, { tenant: 'hoy', apiBase: '/api/cos', clerkPublishableKey: 'pk_test', launch: {} });
    if (refuse && u.pathname.endsWith(refuse.path)) return json(refuse.status, { error: refuse.code });
    if (u.hostname === 'storage.test') return new Response(null, { status: 200 });
    if (u.pathname.endsWith('/files')) return json(201, { file: { id: ID, ...body, status: 'pending' }, uploadUrl: `https://storage.test/upload/${ID}?token=signed` });
    if (u.pathname.endsWith(`/files/${ID}/confirm`)) return json(200, { file: { id: ID, data: { status: 'ready', published: true } } });
    if (u.pathname.endsWith('/query')) return json(200, { data: body.entity === 'setting' && body.filter?.value === 'studio_settings' ? [{ id: 'set-1', data: { key: 'studio_settings' } }] : [] });
    return json(404, { error: 'not_found' });
  };
  return { fetch, calls };
}
const make = (api) => new provider.CompanyOSProvider({ fetch: api.fetch, getToken: async () => 'tok-1', retryDelayMs: 1, sleep: async () => {} });
const png = () => new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: 'image/png' });

// ── The names Lane C1 fixed ──────────────────────────────────────────────────────────────────────────────────────
await test('names: the coach photo and the settings image, in one place, as Company OS declares them', () => {
  needs(images);
  assert.deepEqual(images.COACH_PHOTO, { ownerEntity: 'coach', kind: 'photo' });
  assert.deepEqual(images.SETTING_IMAGE, { ownerEntity: 'setting', kind: 'image' });
  assert.deepEqual(images.COACH_FIELDS, { bio: 'bio', specialties: 'specialties', photo: 'photo' });
});

// ── The real upload path ─────────────────────────────────────────────────────────────────────────────────────────
await test('upload: POST /files, PUT to the signed link, confirm, in that order; the app keeps /media/<id>, never the link', async () => {
  needs(images); needs(provider);
  const api = fakeApi(); const p = make(api);
  const url = await images.uploadPublicImage(p, { ...images.COACH_PHOTO, ownerId: 'coach-1' }, new File([png()], 'ana.png', { type: 'image/png' }));
  assert.equal(url, `/media/${ID}`);
  const steps = api.calls.filter((c) => c.path !== '/app-config.json');
  assert.deepEqual(steps.map((c) => [c.method, c.url.includes('storage.test') ? 'storage' : c.path]), [['POST', '/files'], ['PUT', 'storage'], ['POST', `/files/${ID}/confirm`]]);
  assert.deepEqual(steps[0].body, { ownerEntity: 'coach', ownerId: 'coach-1', kind: 'photo', filename: 'ana.png', mime: 'image/png', sizeBytes: 4 });
  assert.equal(steps[1].headers.authorization, undefined, 'the session token never goes to storage');
  assert.doesNotMatch(url, /signed|storage/);
});
await test('upload: the QR is owned by the studio_settings record, found by its key', async () => {
  needs(images); needs(provider);
  const api = fakeApi(); const p = make(api);
  assert.equal(await images.studioSettingsOwnerId(p), 'set-1');
  const q = api.calls.find((c) => c.path === '/query');
  assert.equal(q.body.entity, 'setting'); assert.deepEqual(q.body.filter, { field: 'key', op: 'eq', value: 'studio_settings' });
  const none = { request: async () => ({ data: [] }) };
  assert.equal(await images.studioSettingsOwnerId(none), null, 'no record yet: the field says to save first, no crash');
});
await test('upload: each refusal keeps its code (wrong type, too large, front desk 403), and nothing is stored after it', async () => {
  needs(images); needs(provider);
  for (const [status, code] of [[422, 'file_type_not_allowed'], [422, 'file_too_large'], [403, 'forbidden'], [422, 'file_kind_unknown']]) {
    const api = fakeApi({ refuse: { path: '/files', status, code } }); const p = make(api);
    await assert.rejects(images.uploadPublicImage(p, { ...images.SETTING_IMAGE, ownerId: 'set-1' }, new File([png()], 'q.png', { type: 'image/png' })), (e) => e.code === code, code);
    assert.ok(!api.calls.some((c) => c.url.includes('storage.test')), code);
  }
  const api = fakeApi({ refuse: { path: `/files/${ID}/confirm`, status: 422, code: 'file_upload_mismatch' } }); const p = make(api);
  await assert.rejects(images.uploadPublicImage(p, { ...images.SETTING_IMAGE, ownerId: 'set-1' }, new File([png()], 'q.png', { type: 'image/png' })), (e) => e.code === 'file_upload_mismatch');
});
await test('upload: a file not ready after confirm, or an odd id, is refused and never kept as a value', async () => {
  needs(images);
  const port = (rec) => ({ uploadFile: async () => rec });
  const owner = { ...images.SETTING_IMAGE, ownerId: 'set-1' };
  const f = new File([png()], 'q.png', { type: 'image/png' });
  await assert.rejects(images.uploadPublicImage(port({ id: ID, status: 'pending' }), owner, f), (e) => e.code === 'file_upload_missing');
  await assert.rejects(images.uploadPublicImage(port({ id: '../x', status: 'ready' }), owner, f), (e) => e.code === 'file_upload_missing');
  await assert.rejects(images.uploadPublicImage({}, owner, f), (e) => e.code === 'disconnected');
});

// ── Who gets which upload ────────────────────────────────────────────────────────────────────────────────────────
await test('field mode: review build always local, owner or not; production shared only with an owner and a provider that uploads', () => {
  needs(images);
  const owner = { ...images.COACH_PHOTO, ownerId: 'c1' };
  assert.equal(images.imageFieldMode({ name: 'mock' }, owner), 'local');
  assert.equal(images.imageFieldMode({ name: 'mock' }, undefined), 'local');
  assert.equal(images.imageFieldMode({ name: 'companyos', uploadFile() {} }, owner), 'shared');
  assert.equal(images.imageFieldMode({ name: 'companyos', uploadFile() {} }, undefined), 'none', 'the screens without an owner stay as they were');
  assert.equal(images.imageFieldMode({ name: 'companyos' }, owner), 'none');
});

// ── The photo id is untrusted ────────────────────────────────────────────────────────────────────────────────────
await test('photo: a uuid becomes /media/<id>; anything else is no photo', () => {
  needs(images);
  assert.equal(images.coachPhotoUrl(ID), `/media/${ID}`);
  assert.equal(images.coachPhotoUrl(ID.toUpperCase()), `/media/${ID}`, 'as Company OS stores ids');
  for (const v of HOSTILE_PHOTOS) assert.equal(images.coachPhotoUrl(v), null, String(v));
});
await test('photo: what is stored is the bare id, and only a /media/<id> value gives one', () => {
  needs(images);
  assert.equal(images.coachPhotoValue(`/media/${ID}`), ID);
  assert.equal(images.coachPhotoValue(null), null);
  for (const v of ['images/teachers/ana.webp', 'https://evil.example/x.png', `/media/${ID}/x`, `/media/../${ID}`, 'javascript:alert(1)', 7]) assert.equal(images.coachPhotoValue(v), null, String(v));
});
await test('the QR value: /media/<id> passes the payment image rule', () => {
  needs(pay);
  assert.equal(pay.validPaymentImage(`/media/${ID}`), true);
});

// ── The teacher, read from Company OS ────────────────────────────────────────────────────────────────────────────
const teacher = (data) => provider.fromRecord(provider.adapters.teachers, { id: 'c1', data: { person: { id: 'p9', name: 'Clara Zuluaga' }, active: true, ...data } });
await test('teacher: bio, specialties and photo come from the record', () => {
  needs(provider);
  const t = teacher({ bio: { es: 'Enseña Fuego.', en: 'Teaches Fuego.' }, specialties: ['fuego', 'pulso'], photo: ID });
  assert.deepEqual(t.bio, { es: 'Enseña Fuego.', en: 'Teaches Fuego.' });
  assert.deepEqual(t.specialties, ['mod_fuego', 'mod_pulso'], 'the ids the website and the app match against');
  assert.equal(t.photo_url, `/media/${ID}`);
});
await test('teacher: nothing is matched to the build by name; no bio or photo reads as empty, for a name the seed knows too', () => {
  needs(provider);
  const seeded = JSON.parse('{}');
  const t = teacher(seeded);
  assert.deepEqual(t.bio, { es: '', en: '' }); assert.deepEqual(t.specialties, []); assert.equal(t.photo_url, null); assert.equal(t.certifications ?? null, null);
  assert.doesNotMatch(readFileSync('src/data/companyos/mapping.ts', 'utf8'), /seedTeachers/, 'mapping.ts no longer reads the seed\'s teachers');
});
await test('teacher: English falls back to Spanish, and the other way', () => {
  needs(provider);
  assert.deepEqual(teacher({ bio: { es: 'Hola', en: '' } }).bio, { es: 'Hola', en: 'Hola' });
  assert.deepEqual(teacher({ bio: { en: 'Hello' } }).bio, { es: 'Hello', en: 'Hello' });
});
await test('teacher: hostile or wrongly typed stored values read as nothing and stay text', () => {
  needs(provider);
  for (const bio of ['plain string', 7, null, [], { es: 7, en: {} }]) assert.deepEqual(teacher({ bio }).bio, { es: '', en: '' }, JSON.stringify(bio));
  const x = '<img src=x onerror=alert(1)>';
  assert.deepEqual(teacher({ bio: { es: x, en: x } }).bio, { es: x, en: x }, 'text is kept as text: React shows it, nothing here turns it into markup');
  for (const specialties of ['fuego', 7, null, {}]) assert.deepEqual(teacher({ specialties }).specialties, [], JSON.stringify(specialties));
  assert.deepEqual(teacher({ specialties: ['fuego', 7, null, '<script>', 'no_such_class', 'fuego'] }).specialties, ['mod_fuego'], 'known class types, once each');
  for (const photo of HOSTILE_PHOTOS) assert.equal(teacher({ photo }).photo_url, null, String(photo));
});

// ── What the editor writes ───────────────────────────────────────────────────────────────────────────────────────
await test('editor: create and update write the three fields; the photo as a bare id, specialties as slugs', () => {
  needs(ops);
  const d = { name: 'Clara', active: true, profile: { bio: { es: ' Enseña ', en: ' Teaches ' }, specialties: ['fuego'], photo: `/media/${ID}` } };
  const created = ops.createCoachOps(d);
  assert.deepEqual(created[1].data, { person: { $ref: 0 }, kind: 'teacher', active: true, bio: { es: 'Enseña', en: 'Teaches' }, specialties: ['fuego'], photo: ID });
  const updated = ops.updateCoachOps('c1', 'p1', d);
  assert.deepEqual(updated[1], { op: 'update', entity: 'coach', id: 'c1', data: { active: true, bio: { es: 'Enseña', en: 'Teaches' }, specialties: ['fuego'], photo: ID } });
});
await test('editor: removing the photo stores nothing; without a profile the writes are what they were', () => {
  needs(ops);
  assert.equal(ops.updateCoachOps('c1', 'p1', { name: 'C', active: true, profile: { bio: { es: '', en: '' }, specialties: [], photo: null } })[1].data.photo, null);
  assert.deepEqual(ops.updateCoachOps('c1', 'p1', { name: 'C', active: false })[1].data, { active: false });
  assert.deepEqual(ops.createCoachOps({ name: 'C', active: true })[1].data, { person: { $ref: 0 }, kind: 'teacher', active: true });
});
await test('editor: reading a coach back for the form', () => {
  needs(ops);
  assert.deepEqual(ops.coachProfileOf({ bio: { es: 'a', en: 'b' }, specialties: ['fuego', 3], photo: ID }), { bio: { es: 'a', en: 'b' }, specialties: ['fuego'], photo: `/media/${ID}` });
  assert.deepEqual(ops.coachProfileOf({}), { bio: { es: '', en: '' }, specialties: [], photo: null });
  assert.deepEqual(ops.coachProfileOf({ bio: 'x', specialties: 'y', photo: 'javascript:alert(1)' }), { bio: { es: '', en: '' }, specialties: [], photo: null });
});

// ── The words ────────────────────────────────────────────────────────────────────────────────────────────────────
await test('copy: every refusal an upload can get has Spanish and English', () => {
  needs(provider);
  for (const code of ['file_type_not_allowed', 'file_too_large', 'forbidden', 'file_kind_unknown', 'file_upload_mismatch', 'file_upload_missing', 'file_upload_expired', 'file_not_ready', 'storage_not_configured']) {
    assert.ok(provider.hasRefusalCopy(code), code);
    assert.ok(provider.refusalCopy(code, 'es') && provider.refusalCopy(code, 'en') && provider.refusalCopy(code, 'es') !== provider.refusalCopy(code, 'en'), code);
  }
  assert.match(provider.refusalCopy('file_type_not_allowed', 'en'), /WebP/, 'the two new kinds take WebP too');
});
await test('copy: the new screen strings exist in both languages', () => {
  needs(ops);
  for (const key of ['live.f.bio', 'live.f.specialties', 'live.f.photo', 'live.f.photoAfterSave']) assert.ok(ops.liveScheduleStrings[key]?.es && ops.liveScheduleStrings[key]?.en, key);
  for (const key of ['media.picker.uploadShared', 'media.picker.sharedHint', 'media.picker.busyShared', 'media.picker.saveFirst']) assert.ok(ops.mediaStrings[key]?.es && ops.mediaStrings[key]?.en, key);
});

console.log(`\n${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
