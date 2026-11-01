import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const scratch = await mkdtemp(join(tmpdir(), 'hoy-availability-'));
try {
  const file = join(scratch, 'availability.mjs');
  await build({ entryPoints: ['src/data/sessionAvailability.ts'], bundle: true, platform: 'node', format: 'esm', outfile: file });
  const { sessionUnavailableReason: reason, templateActiveOf, joinSessionRows } = await import(pathToFileURL(file));
  const now = Date.parse('2026-10-15T15:00:00Z');
  const session = { status: 'scheduled', starts_at: '2026-10-15T16:00:00Z', ends_at: '2026-10-15T17:00:00Z', capacity: 4, booked_count: 4 };
  const row = { session, modality: { active: true }, templateActive: true };
  assert.equal(reason(row, now), null, 'full active future class keeps waitlist navigation');
  assert.equal(reason({ ...row, session: { ...session, status: 'cancelled' } }, now), 'cancelled');
  assert.equal(reason({ ...row, session: { ...session, status: 'completed' } }, now), 'completed');
  assert.equal(reason(row, Date.parse(session.starts_at)), 'started', 'booking closes at exact start');
  assert.equal(reason(row, Date.parse(session.ends_at)), 'ended', 'past scheduled data is still inactive');
  assert.equal(reason({ ...row, templateActive: false }, now), 'unpublished');
  assert.equal(reason({ ...row, modality: { active: false } }, now), 'unpublished');
  assert.equal(reason({ session, modality: { active: true } }, now), null, 'one-off sessions need no template');
  // Lane Y1: a class without a class type is not open for booking, and says so (the tile and the modal agree with admission).
  assert.equal(reason({ session }, now), 'no_class_type', 'no class type: not open for booking');
  assert.equal(reason({ session, templateActive: true }, now), 'no_class_type');
  assert.equal(reason({ session: { ...session, status: 'cancelled' } }, now), 'cancelled', 'a cancelled class says cancelled first');
  assert.equal(reason({ session }, Date.parse(session.starts_at)), 'started', 'a started class says started first');
  assert.equal(reason({ session: { ...session, starts_at: 'invalid' } }, now), 'unavailable');
  // Review round 1 (r1hoy, L7): a visitor reads only published timetable rows, so a class whose row is not among them was
  // made from a row that is switched off: "not published", not "not open for booking yet".
  const templates = [{ id: 'tpl_on', active: true }, { id: 'tpl_off_staff', active: false }];
  assert.equal(templateActiveOf?.('tpl_on', templates), true);
  assert.equal(templateActiveOf?.('tpl_off_staff', templates), false, 'a reader who sees the row (staff) reads its flag');
  assert.equal(templateActiveOf?.('tpl_hidden', templates), false, 'the row is not among the readable ones: switched off');
  assert.equal(templateActiveOf?.(null, templates), undefined, 'a one-off class has no row');
  assert.equal(templateActiveOf?.('', templates), undefined);
  assert.equal(templateActiveOf?.('tpl_on', []), undefined, 'a reader who reads no rows at all knows nothing (existing behaviour)');
  assert.equal(reason({ session, templateActive: templateActiveOf?.('tpl_hidden', templates) }, now), 'unpublished', 'a visitor sees "not published"');
  // L8: while the class types (or the timetable rows) are still loading, no class is joined, so nothing says "not open
  // for booking" for a moment before they arrive.
  const rows = { sessions: [{ ...session, id: 's1', modality_id: 'mod_a', teacher_id: 't', room_id: 'r', template_id: 'tpl_hidden' }], modalities: [{ id: 'mod_a', active: true }], teachers: [], rooms: [], templates };
  assert.deepEqual(joinSessionRows?.(rows, { loading: true }), [], 'still loading: nothing joined');
  const joined = joinSessionRows?.(rows, { loading: false }) ?? [];
  assert.equal(joined.length, 1);
  assert.equal(joined[0].modality?.id, 'mod_a');
  assert.equal(joined[0].templateActive, false);
  assert.equal(reason(joined[0], now), 'unpublished');
  assert.equal(joinSessionRows?.(rows, { loading: false, filter: () => false })?.length, 0, 'the filter still applies');
  console.log('PASS: future/full, cancelled, completed, exact start/end, unpublished template/type, one-off, no class type and invalid date states');
} finally { await rm(scratch, { recursive: true, force: true }); }
