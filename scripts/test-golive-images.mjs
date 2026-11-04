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

const stubRegistry = {
  name: 'stub-registry',
  setup(b) {
    b.onResolve({ filter: /\/registry$/ }, (args) => (args.importer.includes('/src/app/') ? { path: 'registry-stub', namespace: 'stub' } : undefined));
    b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export const getRoutes = () => []; export const getStrings = () => []; export const getRedirects = () => [];', loader: 'js' }));
  },
};
const load = async (contents) => {
  try {
    const out = await build({
      stdin: { contents, resolveDir: process.cwd(), loader: 'ts' },
      bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent', jsx: 'automatic', plugins: [stubRegistry],
      loader: { '.jpg': 'empty', '.png': 'empty', '.webp': 'empty', '.svg': 'empty', '.css': 'empty', '.md': 'text' },
      define: { 'import.meta.env': '{"VITE_HOY_BUILD":"production","DEV":false,"PROD":true}', __HOY_BUILD__: '"production"' },
    });
    return await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
  } catch (e) { return { __error: String(e.message).split('\n').slice(0, 2).join(' ') }; }
};
const images = await load("export * from './src/data/companyos/publicImages.ts';");
const provider = await load("export * from './src/data/companyos/CompanyOSProvider.ts'; export * from './src/data/companyos/mapping.ts'; export * from './src/data/companyos/refusals.ts';");
const ops = await load("export * from './src/modules/classSchedule/live/scheduleOps.ts'; export { liveScheduleStrings } from './src/modules/classSchedule/live/strings.ts'; export { strings as mediaStrings } from './src/modules/media/strings.ts';");
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const pay = await load("export { MockProvider } from './src/data/MockProvider'; export { validPaymentImage } from './src/modules/admin/paymentInstructions.ts';");
const transport = await load("export { normalizeCode } from './src/data/companyos/transport.ts';");
const desk = await load("export { DESK_CODES, deskStrings } from './src/modules/staff/desk/strings.ts';");
const needs = (m) => { if (m.__error) throw new Error(`does not load: ${m.__error}`); };

const ID = '0b0f6e1c-3c6a-4c0e-9a51-6f3f2c1d9e01';
const OLD = '3c1f6e1c-3c6a-4c0e-9a51-6f3f2c1d9e04';
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

// ── Replacing or removing an image removes the old file (owner, 2026-11-04) ─────────────────────────────────────
const NEW_ID = '1c1f6e1c-3c6a-4c0e-9a51-6f3f2c1d9e02';
const OTHER_ID = '2c1f6e1c-3c6a-4c0e-9a51-6f3f2c1d9e03';
const COACH_OWNER = { ownerEntity: 'coach', kind: 'photo', ownerId: 'co1' };
const QR_OWNER = { ownerEntity: 'setting', kind: 'image', ownerId: 'set1' };
/** A port over a small file table: `files[id]` is what the record says; `holders` are coach rows still pointing at an id. */
function filePort({ owner = COACH_OWNER, files, holders = [], settingValue, failDelete = 0, failRead = false } = {}) {
  const log = [];
  let left = failDelete;
  const table = files ?? { [ID]: { owner_entity: owner.ownerEntity, owner_id: owner.ownerId, kind: owner.kind }, [OTHER_ID]: { owner_entity: owner.ownerEntity, owner_id: owner.ownerId, kind: owner.kind } };
  return {
    log,
    request: async (method, path, body) => {
      if (method === 'DELETE') {
        log.push(`DELETE ${path}`);
        if (left > 0) { left--; throw Object.assign(new Error('forbidden'), { code: 'forbidden' }); }
        return null;
      }
      log.push(`query ${body.entity}`);
      if (body.entity === 'file') {
        if (failRead) throw Object.assign(new Error('storage_unavailable'), { code: 'storage_unavailable' });
        assert.deepEqual(body.filter, { field: 'id', op: 'eq', value: body.filter.value });
        const d = table[body.filter.value];
        return { data: d ? [{ id: body.filter.value, data: d }] : [] };
      }
      if (body.entity === 'coach') return { data: holders.map((id) => ({ id, data: { photo: body.filter.value } })) };
      if (body.entity === 'setting') return { data: settingValue ? [{ id: 'set1', data: { value: settingValue } }] : [] };
      return { data: [] };
    },
  };
}
const silent = async (fn) => { const warned = []; const o = console.warn; console.warn = (...a) => warned.push(a.join(' ')); try { return [await fn(), warned]; } finally { console.warn = o; } };
await test('replace: the owner record is patched, the file is read and checked, and only then deleted', async () => {
  needs(images);
  const port = filePort();
  const out = await images.saveThenRemoveOld(port, { saved: `/media/${ID}`, next: `/media/${NEW_ID}`, owner: COACH_OWNER, draft: withUpload(port, NEW_ID) }, async () => { port.log.push('patch'); return 'saved'; });
  assert.deepEqual(out, { result: 'saved', notice: null });
  assert.deepEqual(port.log, ['patch', 'query file', 'query coach', `DELETE /api/file/${ID}`]);
});
function withUpload(port, id, owner = COACH_OWNER) { const d = new images.ImageDraft(port); d.add(`/media/${id}`, owner); return d; }
await test('remove: taking an image away with no replacement deletes the file too', async () => {
  needs(images);
  const port = filePort();
  const out = await images.saveThenRemoveOld(port, { saved: `/media/${ID}`, next: null, owner: COACH_OWNER }, async () => true);
  assert.equal(out.notice, null);
  assert.ok(port.log.includes(`DELETE /api/file/${ID}`));
});
await test('replace: the photo field\'s bare id works too; the same image saved again removes nothing', async () => {
  needs(images);
  const port = filePort();
  await images.saveThenRemoveOld(port, { saved: ID, next: `/media/${NEW_ID}`, owner: COACH_OWNER, draft: withUpload(port, NEW_ID) }, async () => true);
  assert.ok(port.log.includes(`DELETE /api/file/${ID}`));
  const same = filePort();
  await images.saveThenRemoveOld(same, { saved: `/media/${ID}`, next: ID.toUpperCase(), owner: COACH_OWNER }, async () => true);
  assert.deepEqual(same.log, []);
});
await test('replace: a refused patch (falsy or thrown) deletes nothing, and a thrown refusal still reaches the screen', async () => {
  needs(images);
  const a = filePort();
  const refused = await images.saveThenRemoveOld(a, { saved: `/media/${ID}`, next: `/media/${NEW_ID}`, owner: COACH_OWNER, draft: withUpload(a, NEW_ID) }, async () => null);
  assert.deepEqual(refused, { result: null, notice: null });
  assert.deepEqual(a.log, []);
  const b = filePort();
  await assert.rejects(images.saveThenRemoveOld(b, { saved: `/media/${ID}`, next: `/media/${NEW_ID}`, owner: COACH_OWNER, draft: withUpload(b, NEW_ID) }, async () => { throw Object.assign(new Error('x'), { code: 'forbidden' }); }), (e) => e.code === 'forbidden');
  assert.deepEqual(b.log, []);
});
await test('replace: a /media value that is neither the saved one nor uploaded in this form session is never saved (undo after a save)', async () => {
  needs(images);
  const port = filePort(); let patched = false;
  const out = await images.saveThenRemoveOld(port, { saved: `/media/${NEW_ID}`, next: `/media/${ID}`, owner: COACH_OWNER, draft: new images.ImageDraft(port) }, async () => { patched = true; return true; });
  assert.deepEqual(out, { result: null, notice: 'image_not_current' });
  assert.equal(patched, false);
  assert.deepEqual(port.log, [], 'and nothing is deleted');
  assert.ok(provider.hasRefusalCopy('image_not_current'));
});
await test('replace: one retry after a failed delete; if it works, nothing to say', async () => {
  needs(images);
  const port = filePort({ failDelete: 1 });
  const [out] = await silent(() => images.saveThenRemoveOld(port, { saved: `/media/${ID}`, next: `/media/${NEW_ID}`, owner: COACH_OWNER, draft: withUpload(port, NEW_ID) }, async () => 'saved'));
  assert.deepEqual(out, { result: 'saved', notice: null });
  assert.equal(port.log.filter((l) => l.startsWith('DELETE')).length, 2);
});
await test('replace: still failing, the new image stands; logged without the id, and a notice for the person', async () => {
  needs(images);
  const port = filePort({ failDelete: 5 });
  const [out, warned] = await silent(() => images.saveThenRemoveOld(port, { saved: `/media/${ID}`, next: `/media/${NEW_ID}`, owner: COACH_OWNER, draft: withUpload(port, NEW_ID) }, async () => 'saved'));
  assert.deepEqual(out, { result: 'saved', notice: 'old_image_remains' });
  assert.equal(port.log.filter((l) => l.startsWith('DELETE')).length, 2, 'one retry, no more');
  assert.ok(warned.some((w) => /forbidden/.test(w)));
  assert.ok(!warned.some((w) => w.includes(ID)));
  const noRead = filePort({ failRead: true });
  const [read] = await silent(() => images.saveThenRemoveOld(noRead, { saved: `/media/${ID}`, next: null, owner: COACH_OWNER }, async () => 'saved'));
  assert.equal(read.notice, 'old_image_remains', 'unable to check is unable to delete');
  assert.ok(!noRead.log.some((l) => l.startsWith('DELETE')));
});
await test('replace: only a file of this owner and kind is deleted: a receipt\'s id in photo is left alone, without alarming anyone', async () => {
  needs(images);
  for (const d of [{ owner_entity: 'payment', owner_id: 'pay1', kind: 'receipt' }, { owner_entity: 'coach', owner_id: 'other', kind: 'photo' }, { owner_entity: 'coach', owner_id: 'co1', kind: 'other' }]) {
    const port = filePort({ files: { [ID]: d } });
    const [out, warned] = await silent(() => images.saveThenRemoveOld(port, { saved: ID, next: null, owner: COACH_OWNER }, async () => 'saved'));
    assert.deepEqual(out, { result: 'saved', notice: null }, JSON.stringify(d));
    assert.ok(!port.log.some((l) => l.startsWith('DELETE')), JSON.stringify(d));
    assert.ok(warned.length > 0, 'logged');
  }
});
await test('replace: a file another coach still holds is left alone; a file already gone is nothing to do', async () => {
  needs(images);
  const held = filePort({ holders: ['co2'] });
  const [out] = await silent(() => images.saveThenRemoveOld(held, { saved: ID, next: null, owner: COACH_OWNER }, async () => 'saved'));
  assert.equal(out.notice, null);
  assert.ok(!held.log.some((l) => l.startsWith('DELETE')));
  const gone = filePort({ files: {} });
  const [g] = await silent(() => images.saveThenRemoveOld(gone, { saved: ID, next: null, owner: COACH_OWNER }, async () => 'saved'));
  assert.equal(g.notice, null);
  assert.ok(!gone.log.some((l) => l.startsWith('DELETE')));
});
await test('replace: the old id must be a uuid from a saved value: anything else deletes nothing', async () => {
  needs(images);
  for (const old of ['javascript:alert(1)', 'https://evil.example/x.png', `/media/../${ID}`, `/media/${ID}/x`, `/files/${ID}`, `${ID}/../x`, 'images/teachers/a.webp', '', null, undefined, 7, {}, [ID]]) {
    const port = filePort();
    await images.saveThenRemoveOld(port, { saved: old, next: null, owner: COACH_OWNER }, async () => true);
    assert.deepEqual(port.log, [], String(old));
  }
});
await test('no record to check against (owner not known): the old file stays and the person is told; no provider, nothing happens', async () => {
  needs(images);
  const port = filePort();
  const [out] = await silent(() => images.saveThenRemoveOld(port, { saved: `/media/${ID}`, next: null }, async () => 'saved'));
  assert.equal(out.notice, 'old_image_remains');
  assert.ok(!port.log.some((l) => l.startsWith('DELETE')));
  assert.deepEqual(await images.saveThenRemoveOld({}, { saved: `/media/${ID}`, next: `/media/${NEW_ID}`, owner: COACH_OWNER }, async () => 'saved'), { result: 'saved', notice: null }, 'the review build');
});
await test('unsaved uploads: replaced before saving, or the form closed: deleted, best effort, and never what is saved or in use', async () => {
  needs(images);
  const port = filePort();
  const draft = new images.ImageDraft(port);
  draft.add(`/media/${ID}`, COACH_OWNER); draft.add(`/media/${OTHER_ID}`, COACH_OWNER);
  await draft.discard(`/media/${OTHER_ID}`);
  assert.ok(port.log.includes(`DELETE /api/file/${ID}`));
  assert.ok(!port.log.includes(`DELETE /api/file/${OTHER_ID}`), 'the one on screen stays');
  assert.equal(draft.holds(`/media/${OTHER_ID}`), true); assert.equal(draft.holds(`/media/${ID}`), false);
  await draft.discard();
  assert.ok(port.log.includes(`DELETE /api/file/${OTHER_ID}`), 'the form closed');
  assert.equal(draft.holds(`/media/${OTHER_ID}`), false);
  // A save whose answer was lost may have stored it: a file its record holds is left alone.
  const held = filePort({ holders: ['co1'] }); const d2 = new images.ImageDraft(held); d2.add(`/media/${ID}`, COACH_OWNER);
  await silent(() => d2.discard());
  assert.ok(!held.log.some((l) => l.startsWith('DELETE')));
  const qr = filePort({ owner: QR_OWNER, settingValue: { payments: { qrImageUrl: `/media/${ID}` } } }); const d3 = new images.ImageDraft(qr); d3.add(`/media/${ID}`, QR_OWNER);
  await silent(() => d3.discard());
  assert.ok(!qr.log.some((l) => l.startsWith('DELETE')), 'the settings record still points at it');
  // Best effort: a failure never reaches the person.
  const failing = filePort({ failDelete: 9 }); const d4 = new images.ImageDraft(failing); d4.add(`/media/${ID}`, COACH_OWNER);
  await silent(() => d4.discard());
});
await test('an upload that finishes after its form closed is cleaned up, not left published', async () => {
  needs(images);
  const port = filePort();
  const draft = new images.ImageDraft(port);
  await draft.discard(); // the form closes while the upload runs
  draft.add(`/media/${ID}`, COACH_OWNER); await draft.discard(); // what the field does when the upload comes back
  assert.ok(port.log.includes(`DELETE /api/file/${ID}`));
});
await test('busy: only a real upload tells the form; leaving always ends it, so Save is never stuck', () => {
  needs(images);
  const seen = []; const tell = (b) => seen.push(b);
  const end = images.reportImageBusy(true, true, tell);
  assert.deepEqual(seen, [true]);
  end(); assert.deepEqual(seen, [true, false], 'unmounted during an upload');
  seen.length = 0;
  const none = images.reportImageBusy(false, true, tell);
  none?.(); assert.deepEqual(seen, [], 'the review build never calls it');
  assert.doesNotThrow(() => images.reportImageBusy(true, true, undefined)?.());
});
await test('a save keeps its new image and clears the other unsaved uploads', async () => {
  needs(images);
  const port = filePort();
  const draft = new images.ImageDraft(port);
  draft.add(`/media/${OTHER_ID}`, COACH_OWNER); draft.add(`/media/${NEW_ID}`, COACH_OWNER);
  await images.saveThenRemoveOld(port, { saved: null, next: `/media/${NEW_ID}`, owner: COACH_OWNER, draft }, async () => true);
  assert.ok(port.log.includes(`DELETE /api/file/${OTHER_ID}`));
  assert.ok(!port.log.includes(`DELETE /api/file/${NEW_ID}`));
  assert.equal(draft.holds(`/media/${NEW_ID}`), false, 'it is the saved one now');
});
await test('before upload: a teacher photo is re-encoded; the QR goes unchanged, so it still scans', async () => {
  needs(images);
  const original = new File([png()], 'qr.png', { type: 'image/png' });
  const encoded = new File([png()], 'ana.webp', { type: 'image/webp' });
  let calls = 0; const encode = async () => { calls++; return encoded; };
  assert.equal(await images.prepareForUpload(COACH_OWNER, original, encode), encoded);
  assert.equal(calls, 1);
  assert.equal(await images.prepareForUpload(QR_OWNER, original, encode), original);
  assert.equal(calls, 1);
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
  const t = teacher({});
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
await test('editor: create and update write the fields; the photo as a bare id, guarded by the value at form open', () => {
  needs(ops);
  const d = { name: 'Clara', active: true, profile: { bio: { es: ' Enseña ', en: ' Teaches ' }, specialties: ['fuego'], photo: `/media/${ID}` } };
  assert.deepEqual(ops.createCoachOps(d)[1].data, { person: { $ref: 0 }, kind: 'teacher', active: true, bio: { es: 'Enseña', en: 'Teaches' }, specialties: ['fuego'], photo: ID });
  const updated = ops.updateCoachOps('c1', 'p1', { ...d, photoAtOpen: OLD })[1];
  assert.deepEqual(updated.data, { active: true, bio: { es: 'Enseña', en: 'Teaches' }, specialties: ['fuego'], photo: ID });
  assert.deepEqual(updated.ifMatch, { field: 'photo', value: OLD });
});
await test('editor: an unchanged photo is not sent and not guarded; a stored odd value counts as no photo', () => {
  needs(ops);
  const same = ops.updateCoachOps('c1', 'p1', { name: 'C', active: true, photoAtOpen: ID, profile: { bio: { es: '', en: '' }, specialties: [], photo: `/media/${ID}` } })[1];
  assert.ok(!('photo' in same.data)); assert.equal(same.ifMatch, undefined);
  const odd = ops.updateCoachOps('c1', 'p1', { name: 'C', active: true, photoAtOpen: 'javascript:alert(1)', profile: { bio: { es: '', en: '' }, specialties: [], photo: null } })[1];
  assert.ok(!('photo' in odd.data)); assert.equal(odd.ifMatch, undefined);
});
await test('editor: removing the photo stores null, guarded; a teacher who never had one is guarded as absent (JSON leaves the value out); no profile, as before', () => {
  needs(ops);
  const removed = ops.updateCoachOps('c1', 'p1', { name: 'C', active: true, photoAtOpen: ID, profile: { bio: { es: '', en: '' }, specialties: [], photo: null } })[1];
  assert.equal(removed.data.photo, null); assert.deepEqual(removed.ifMatch, { field: 'photo', value: ID });
  const first = ops.updateCoachOps('c1', 'p1', { name: 'C', active: true, profile: { bio: { es: '', en: '' }, specialties: [], photo: `/media/${ID}` } })[1];
  assert.equal(JSON.stringify(first.ifMatch), '{"field":"photo"}');
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
  for (const code of ['file_type_not_allowed', 'file_too_large', 'forbidden', 'file_kind_unknown', 'file_upload_mismatch', 'file_upload_missing', 'file_upload_expired', 'file_not_ready', 'storage_not_configured', 'storage_unavailable', 'image_not_current']) {
    assert.ok(provider.hasRefusalCopy(code), code);
    assert.ok(provider.refusalCopy(code, 'es') && provider.refusalCopy(code, 'en') && provider.refusalCopy(code, 'es') !== provider.refusalCopy(code, 'en'), code);
  }
});
await test('stale form: the guard\'s 409 has words on the screen, in both languages', async () => {
  needs(transport); needs(desk);
  const code = transport.normalizeCode('ifMatch mismatch', 409);
  assert.equal(code, 'ifmatch_mismatch');
  assert.ok(desk.DESK_CODES.includes(code));
  assert.ok(desk.deskStrings[`desk.error.${code}`]?.es && desk.deskStrings[`desk.error.${code}`]?.en);
});
await test('copy: the new screen strings exist in both languages', () => {
  needs(ops);
  for (const key of ['live.f.bioEs', 'live.f.bioEn', 'live.f.specialties', 'live.f.photo', 'live.f.photoAfterSave']) assert.ok(ops.liveScheduleStrings[key]?.es && ops.liveScheduleStrings[key]?.en, key);
  for (const key of ['media.picker.uploadShared', 'media.picker.sharedHint', 'media.picker.busyShared', 'media.picker.saveFirst', 'media.picker.ownerFailed', 'media.picker.oldRemains', 'media.picker.previewUnavailable']) assert.ok(ops.mediaStrings[key]?.es && ops.mediaStrings[key]?.en, key);
});

console.log(`\n${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
