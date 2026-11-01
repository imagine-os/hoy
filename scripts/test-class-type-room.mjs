// Lane Y1 (test-hoy fixes, 2026-11-01): the schedule shows each class's real room and class type.
// - ClassCard joins only the parts it has (no stray " · " when the teacher is empty);
// - the signed-out schedule's booking drawer names the class's room (rooms adapter), never a fixed "Main studio";
// - a class without a class type says why it can't be booked, in Spanish and English, on the site and in the app;
// - the admin timetable requires the class type.
//   node scripts/test-class-type-room.mjs
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const failures = [];
const check = async (name, fn) => { try { await fn(); console.log(`ok   ${name}`); } catch (err) { failures.push(name); console.log(`FAIL ${name}\n     ${err.message.split('\n').join('\n     ')}`); } };
const src = (path) => readFile(path, 'utf8');
const scratch = await mkdtemp(join(tmpdir(), 'hoy-class-type-'));
try {
  const file = join(scratch, 'bundle.mjs');
  await build({
    stdin: { contents: "export { classCardMeta } from './src/components/organism/ClassCard/classCardMeta';\nexport { strings as site } from './src/modules/website/strings';", resolveDir: process.cwd(), loader: 'ts' },
    bundle: true, platform: 'node', format: 'esm', outfile: file, logLevel: 'silent',
  });
  const { classCardMeta, site } = await import(pathToFileURL(file));

  await check('ClassCard joins only the parts it has: no stray dot for an empty teacher or room', () => {
    assert.equal(classCardMeta(['Lucía Montoya', 'Main room', 'all']), 'Lucía Montoya · Main room');
    assert.equal(classCardMeta(['', 'Main room']), 'Main room');
    assert.equal(classCardMeta(['Lucía Montoya', undefined]), 'Lucía Montoya');
    assert.equal(classCardMeta(['', '  ', null]), '');
    assert.equal(classCardMeta(['Lucía Montoya', 'Small room', 'beginner']), 'Lucía Montoya · Small room · beginner');
  });

  await check('a class without a class type says it is not open for booking, in Spanish and English', () => {
    const copy = site['site.calendar.status.no_class_type'];
    assert.ok(copy?.es && copy?.en, 'site.calendar.status.no_class_type');
    assert.match(copy.en, /not open for booking/i);
    assert.ok(!('site.mat.room' in site), 'the fixed room name is gone');
  });

  await check('the site\'s booking drawer names the class\'s room from the rooms table', async () => {
    const page = await src('src/modules/website/pages/SchedulePage.tsx');
    assert.ok(!page.includes("t('site.mat.room')"), 'no fixed room');
    assert.match(page, /useTable<RoomRow>\('rooms'\)/);
    assert.match(page, /room=\{[^}]*room_id/);
  });

  await check('the customer home\'s next class names its own room (review round, lane Y1)', async () => {
    const page = await src('src/modules/customer/HomePage.tsx');
    assert.ok(!page.includes('room="Sala principal"'), 'no fixed room');
    assert.match(page, /room=\{next\.room\?\.name\}/);
    assert.match(await src('src/modules/website/hooks.ts'), /room: rooms\.find\(\(r\) => r\.id === s\.room_id\)/);
  });

  await check('the app\'s class detail refuses a class without a class type with that reason', async () => {
    const page = await src('src/modules/customer/pages/ClassDetailPage.tsx');
    assert.match(page, /no_class_type/);
  });

  await check('the admin timetable requires the class type', async () => {
    const page = await src('src/modules/admin/ContentPage.tsx');
    assert.match(page, /\{ name: 'modality_id', kind: 'ref', ref: 'modalities',[^\n]*required: true \}/);
  });
} finally { await rm(scratch, { recursive: true, force: true }); }

if (failures.length) { console.log(`\n${failures.length} check(s) failed`); process.exit(1); }
console.log('\nclass type and room: all checks passed');
