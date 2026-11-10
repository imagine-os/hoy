// Hoy 12 Nov, lane H-IMG: one image per timetable class (decision D2), without a browser. The names Company OS fixes
// (`schedule.image`, file owner `schedule` kind `image`), what an upload saves on the schedule row and how replacing
// deletes the old file (same rules as the teacher photo), what the class's thumbnail shows (class image, then the
// method's Home photo, then the letter tile), an occurrence taking its schedule's image, and who may edit it.
// /media itself is entity-agnostic (the public_site policy in Company OS decides): scripts/test-hoy-server.mjs.
// Run: node scripts/test-class-images.mjs
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
      define: { 'import.meta.env': '{"VITE_HOY_BUILD":"production","DEV":false,"PROD":true,"BASE_URL":"/"}', __HOY_BUILD__: '"production"' },
    });
    return await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
  } catch (e) { return { __error: String(e.message).split('\n').slice(0, 2).join(' ') }; }
};
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const images = await load("export * from './src/data/companyos/publicImages.ts';");
const provider = await load("export * from './src/data/companyos/mapping.ts';");
const ops = await load("export * from './src/modules/classSchedule/live/scheduleOps.ts';");
const thumb = await load("export * from './src/components/molecule/ClassThumbnail/thumbnailSource.ts'; export { practiceStudioPhoto } from './src/modules/website/photography.ts';");
const needs = (m) => { if (m.__error) throw new Error(`does not load: ${m.__error}`); };

const ID = '0b0f6e1c-3c6a-4c0e-9a51-6f3f2c1d9e01';
const OLD = '3c1f6e1c-3c6a-4c0e-9a51-6f3f2c1d9e04';
const NEW_ID = '1c1f6e1c-3c6a-4c0e-9a51-6f3f2c1d9e02';
const HOSTILE = ['javascript:alert(1)', 'https://evil.example/x.png', '//evil.example/x.png', '../../etc/passwd', `/media/${ID}`, `${ID}/url`, `${ID} `, '<img src=x onerror=alert(1)>', 'data:image/svg+xml,<svg onload=alert(1)>', '', null, undefined, 42, {}, [ID]];
const OWNER = { ownerEntity: 'schedule', kind: 'image', ownerId: 's1' };

// ── The names Company OS fixes ───────────────────────────────────────────────────────────────────────────────────
await test('names: the schedule image is file owner schedule, kind image, on the tenant field schedule.image', () => {
  needs(images);
  assert.deepEqual(images.SCHEDULE_IMAGE, { ownerEntity: 'schedule', kind: 'image' });
  assert.equal(images.SCHEDULE_FIELDS.image, 'image');
});

// ── Read from Company OS ─────────────────────────────────────────────────────────────────────────────────────────
const template = (data) => provider.fromRecord(provider.adapters.class_templates, { id: 's1', data: { title: 'Fuego', weekday: 1, ...data } });
const session = (data, schedule) => provider.fromRecord(provider.adapters.class_sessions, { id: 'o1', data: { title: 'Fuego', ...(schedule ? { schedule: { id: 's1' }, schedule_row: schedule } : {}), ...data } });
await test('read: a timetable row carries its image as /media/<id>; none is null', () => {
  needs(provider);
  assert.equal(template({ image: ID }).image_url, `/media/${ID}`);
  assert.equal(template({}).image_url, null);
});
await test('read: the stored image is untrusted: only a uuid is an image', () => {
  needs(provider);
  for (const image of HOSTILE) { assert.equal(template({ image }).image_url, null, String(image)); assert.equal(session({}, { image }).image_url, null, String(image)); }
});
await test('read: an occurrence uses its schedule\'s image; an ad-hoc class without a schedule has none', () => {
  needs(provider);
  assert.equal(session({}, { image: ID }).image_url, `/media/${ID}`);
  assert.equal(session({}, {}).image_url, null);
  assert.equal(session({ image: ID }).image_url, null, 'a class with no schedule never reads an image of its own');
});
await test('read: the occurrence query asks for the schedule\'s image in the same hop', () => {
  needs(provider);
  const inc = provider.adapters.class_sessions.include.find((i) => i.field === 'schedule');
  assert.ok(inc.fields.includes('image') && inc.fields.includes('modality'), JSON.stringify(inc));
});

// ── Editor: what the form writes ─────────────────────────────────────────────────────────────────────────────────
const draft = { title: 'Fuego', weekday: 1, start_time: '07:00', resource: 'r1', coach: 'c1', capacity: 10, valid_from: '2026-11-12', active: true, modality: 'fuego' };
await test('editor: create writes the image as a bare id; none writes nothing', () => {
  needs(ops);
  assert.equal(ops.createScheduleOps({ ...draft, image: `/media/${ID}` })[0].data.image, ID);
  assert.ok(!('image' in ops.createScheduleOps({ ...draft, image: null })[0].data));
  assert.ok(!('image' in ops.createScheduleOps(draft)[0].data));
});
await test('editor: update writes a changed image over the value the form saw (ifMatch); the old one stays guarded', () => {
  needs(ops);
  const op = ops.updateScheduleOps('s1', { ...draft, image: `/media/${ID}`, imageAtOpen: OLD })[0];
  assert.equal(op.data.image, ID);
  assert.deepEqual(op.ifMatch, { field: 'image', value: OLD });
});
await test('editor: an unchanged image is not sent and not guarded; the rest of the update is as before', () => {
  needs(ops);
  const op = ops.updateScheduleOps('s1', { ...draft, image: `/media/${ID}`, imageAtOpen: ID })[0];
  assert.ok(!('image' in op.data)); assert.equal(op.ifMatch, undefined);
  assert.equal(op.data.modality, 'fuego'); assert.equal(op.data.title, 'Fuego');
  const noForm = ops.updateScheduleOps('s1', draft)[0];
  assert.ok(!('image' in noForm.data)); assert.equal(noForm.ifMatch, undefined);
});
await test('editor: removing stores null, guarded; a row that never had one is guarded as absent; an odd stored value counts as none', () => {
  needs(ops);
  const removed = ops.updateScheduleOps('s1', { ...draft, image: null, imageAtOpen: ID })[0];
  assert.equal(removed.data.image, null); assert.deepEqual(removed.ifMatch, { field: 'image', value: ID });
  const first = ops.updateScheduleOps('s1', { ...draft, image: `/media/${ID}` })[0];
  assert.equal(first.data.image, ID); assert.equal(JSON.stringify(first.ifMatch), '{"field":"image"}');
  const odd = ops.updateScheduleOps('s1', { ...draft, image: null, imageAtOpen: 'javascript:alert(1)' })[0];
  assert.ok(!('image' in odd.data)); assert.equal(odd.ifMatch, undefined);
});
await test('editor: a hostile image value in the form is never written', () => {
  needs(ops);
  for (const image of ['javascript:alert(1)', 'https://evil.example/x.png', '/media/../x', ID + 'x']) {
    const c = ops.createScheduleOps({ ...draft, image })[0].data;
    assert.ok(!('image' in c), image);
  }
});
await test('editor: the draft of a row reads its stored image back for the form', () => {
  needs(ops);
  assert.equal(ops.scheduleImageOf({ image: ID }), `/media/${ID}`);
  assert.equal(ops.scheduleImageOf({ image: 'javascript:alert(1)' }), null);
  assert.equal(ops.scheduleImageOf({}), null);
});

// ── Replacing deletes the old file, as for a teacher's photo ─────────────────────────────────────────────────────
function filePort({ files, holders = [] } = {}) {
  const log = [];
  const table = files ?? { [ID]: { owner_entity: 'schedule', owner_id: 's1', kind: 'image' }, [OLD]: { owner_entity: 'schedule', owner_id: 's1', kind: 'image' } };
  return {
    log,
    request: async (method, path, body) => {
      if (method === 'DELETE') { log.push(`DELETE ${path}`); return null; }
      log.push(`query ${body.entity}`);
      if (body.entity === 'file') { const d = table[body.filter.value]; return { data: d ? [{ id: body.filter.value, data: d }] : [] }; }
      if (body.entity === 'schedule') return { data: holders.map((image) => ({ id: 's1', data: { image } })) };
      return { data: [] };
    },
  };
}
const withUpload = (port, id) => { const d = new images.ImageDraft(port); d.add(`/media/${id}`, OWNER); return d; };
await test('replace: the schedule row is saved first, then the old file is read, checked and deleted', async () => {
  needs(images);
  const port = filePort({ files: { [ID]: { owner_entity: 'schedule', owner_id: 's1', kind: 'image' }, [NEW_ID]: { owner_entity: 'schedule', owner_id: 's1', kind: 'image' } }, holders: [NEW_ID] });
  const out = await images.saveThenRemoveOld(port, { saved: `/media/${ID}`, next: `/media/${NEW_ID}`, owner: OWNER, draft: withUpload(port, NEW_ID) }, async () => { port.log.push('patch'); return 'saved'; });
  assert.deepEqual(out, { result: 'saved', notice: null });
  assert.deepEqual(port.log, ['patch', 'query file', 'query schedule', `DELETE /api/file/${ID}`]);
});
await test('replace: removing the image deletes its file too; an unsaved form deletes nothing', async () => {
  needs(images);
  const port = filePort();
  await images.saveThenRemoveOld(port, { saved: `/media/${ID}`, next: null, owner: OWNER }, async () => true);
  assert.ok(port.log.includes(`DELETE /api/file/${ID}`));
  const port2 = filePort();
  const out = await images.saveThenRemoveOld(port2, { saved: `/media/${ID}`, next: null, owner: OWNER }, async () => null);
  assert.equal(out.result, null); assert.ok(!port2.log.some((l) => l.startsWith('DELETE')));
});
await test('replace: only a file of this schedule and kind is deleted; one a second schedule still holds stays', async () => {
  needs(images);
  const other = filePort({ files: { [ID]: { owner_entity: 'schedule', owner_id: 's2', kind: 'image' } } });
  await images.saveThenRemoveOld(other, { saved: `/media/${ID}`, next: null, owner: OWNER }, async () => true);
  assert.ok(!other.log.some((l) => l.startsWith('DELETE')), 'another schedule\'s file');
  const receipt = filePort({ files: { [ID]: { owner_entity: 'payment', owner_id: 'p1', kind: 'receipt' } } });
  await images.saveThenRemoveOld(receipt, { saved: ID, next: null, owner: OWNER }, async () => true);
  assert.ok(!receipt.log.some((l) => l.startsWith('DELETE')), 'a receipt');
  const held = filePort({ holders: [ID] });
  await images.saveThenRemoveOld(held, { saved: `/media/${ID}`, next: null, owner: OWNER }, async () => true);
  assert.ok(!held.log.some((l) => l.startsWith('DELETE')), 'still held');
});
await test('replace: a value that was neither saved nor uploaded in this form is refused, nothing written', async () => {
  needs(images);
  const port = filePort(); let patched = false;
  const out = await images.saveThenRemoveOld(port, { saved: `/media/${ID}`, next: `/media/${NEW_ID}`, owner: OWNER, draft: new images.ImageDraft(port) }, async () => { patched = true; return 'x'; });
  assert.equal(out.notice, 'image_not_current'); assert.equal(patched, false);
});
await test('upload: a class image is re-encoded like a photo (smaller, no metadata)', async () => {
  needs(images);
  let encoded = 0; const f = new File([new Uint8Array([1])], 'a.png', { type: 'image/png' });
  await images.prepareForUpload(images.SCHEDULE_IMAGE, f, async (x) => { encoded++; return x; });
  assert.equal(encoded, 1);
});

// ── The thumbnail's order ────────────────────────────────────────────────────────────────────────────────────────
await test('thumbnail: the class image first, then the method\'s Home photo, then the letter tile', () => {
  needs(thumb);
  assert.deepEqual(thumb.classThumbnailSource({ imageUrl: `/media/${ID}`, methodPhoto: '/images/fuego.webp' }), { kind: 'class', src: `/media/${ID}` });
  assert.deepEqual(thumb.classThumbnailSource({ imageUrl: null, methodPhoto: '/images/fuego.webp' }), { kind: 'method', src: '/images/fuego.webp' });
  assert.deepEqual(thumb.classThumbnailSource({ imageUrl: undefined, methodPhoto: undefined }), { kind: 'tile' });
});
await test('thumbnail: an image that is not a /media/<uuid> address is not trusted: the method photo shows', () => {
  needs(thumb);
  for (const imageUrl of ['javascript:alert(1)', 'https://evil.example/x.png', '/media/../x', `/media/${ID}x`, '']) assert.deepEqual(thumb.classThumbnailSource({ imageUrl, methodPhoto: '/m.webp' }), { kind: 'method', src: '/m.webp' }, imageUrl);
});
await test('thumbnail: a class image that fails to load falls back to the next one, not a broken picture', () => {
  needs(thumb);
  assert.deepEqual(thumb.classThumbnailSource({ imageUrl: `/media/${ID}`, methodPhoto: '/m.webp', classFailed: true }), { kind: 'method', src: '/m.webp' });
  assert.deepEqual(thumb.classThumbnailSource({ imageUrl: `/media/${ID}`, methodPhoto: '/m.webp', classFailed: true, methodFailed: true }), { kind: 'tile' });
});
await test('thumbnail: the method photo is the one the Home page shows for that class slug', () => {
  needs(thumb);
  assert.match(thumb.practiceStudioPhoto('fuego', 'latest'), /images\/studio-2026\//);
});

await test('thumbnail: a class image gets one retry (a fresh upload may answer file_not_ready) before it falls through', () => {
  needs(thumb);
  assert.equal(thumb.retrySrc(`/media/${ID}`, 0), `/media/${ID}`);
  assert.equal(thumb.retrySrc(`/media/${ID}`, 1), `/media/${ID}?r=1`);
  assert.equal(thumb.retrySrc('/images/x.webp', 1), '/images/x.webp', 'only /media addresses are retried');
  assert.equal(thumb.maxMediaRetries, 1);
});
const thumbSrc = readFileSync('src/components/molecule/ClassThumbnail/ClassThumbnail.tsx', 'utf8');
await test('thumbnail: the failed state resets when the class image or the method changes', () => {
  assert.match(thumbSrc, /setFailed\(\{\}\)[^\n]*\[imageUrl, slug\]/);
});
await test('form: the image notice is cleared on New, Edit and Cancel', () => {
  const page2 = readFileSync('src/modules/classSchedule/live/LiveSchedulePage.tsx', 'utf8');
  const classes = page2.slice(page2.indexOf('function Classes('), page2.indexOf('function Dates('));
  assert.ok((classes.match(/setImageNotice\(null\)/g) ?? []).length >= 4, 'save, new, edit, cancel');
});

// ── Who edits it, and where it is wired ──────────────────────────────────────────────────────────────────────────
const page = readFileSync('src/modules/classSchedule/live/LiveSchedulePage.tsx', 'utf8');
await test('form: the Clases form has the shared image field on the schedule row, for whoever may edit teacher photos only', () => {
  assert.match(page, /SCHEDULE_IMAGE/);
  assert.match(page, /owner=\{\{ \.\.\.SCHEDULE_IMAGE, ownerId: edit\.id \}\}/);
  assert.match(page, /can\('teachers\.write'\)/);
  assert.match(page, /canEditImage/);
});
const perms = readFileSync('src/auth/permissions.ts', 'utf8');
await test('gate: teachers.write is held by administration and Super Admin, not the coordinator', () => {
  assert.ok(!/coordinator: \[[^\]]*teachers\.write/.test(perms));
  assert.match(perms, /teachers\.write/);
});
await test('callers: the website calendar and the class page pass the class image to the thumbnail', () => {
  assert.match(readFileSync('src/components/organism/SessionCalendar/SessionCalendar.tsx', 'utf8'), /ClassThumbnail[^>]*imageUrl=\{x\.session\.image_url\}/);
  assert.match(readFileSync('src/modules/customer/pages/ClassDetailPage.tsx', 'utf8'), /ClassThumbnail[^>]*imageUrl=\{s\.image_url\}/);
});

console.log(`\n${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
