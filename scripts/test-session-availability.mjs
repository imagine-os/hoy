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
  // Changed on purpose (owner 2026-11-01, r2 L3 "Stop new classes only"): a class whose timetable row is switched off is
  // still on the schedule and bookable; only a withdrawn class type (or a cancelled class) closes it.
  assert.equal(reason({ ...row, templateActive: false }, now), null, 'a switched-off row keeps its classes open');
  assert.equal(reason({ ...row, modality: { active: false } }, now), 'unpublished');
  assert.equal(reason({ session, modality: { active: true } }, now), null, 'one-off sessions need no template');
  // Lane Y1: a class without a class type is not open for booking, and says so (the tile and the modal agree with admission).
  assert.equal(reason({ session }, now), 'no_class_type', 'no class type: not open for booking');
  assert.equal(reason({ session, templateActive: true }, now), 'no_class_type');
  assert.equal(reason({ session: { ...session, status: 'cancelled' } }, now), 'cancelled', 'a cancelled class says cancelled first');
  assert.equal(reason({ session }, Date.parse(session.starts_at)), 'started', 'a started class says started first');
  assert.equal(reason({ session: { ...session, starts_at: 'invalid' } }, now), 'unavailable');
  // Review round 1 (r1hoy, L7) reversed by the owner (r2 L3): a class whose row is switched off (or not among the rows a
  // visitor reads) is not "not published": it stays open.
  const templates = [{ id: 'tpl_on', active: true }, { id: 'tpl_off_staff', active: false }];
  assert.equal(templateActiveOf?.('tpl_on', templates), true);
  assert.equal(templateActiveOf?.('tpl_off_staff', templates), false, 'a reader who sees the row (staff) reads its flag');
  assert.equal(templateActiveOf?.(null, templates), undefined, 'a one-off class has no row');
  assert.equal(reason({ session, modality: { active: true }, templateActive: templateActiveOf?.('tpl_hidden', templates) }, now), null, 'a visitor sees it open');
  assert.equal(reason({ session, modality: { active: true }, templateActive: false }, now), null);
  // L8: while the class types (or the timetable rows) are still loading, no class is joined, so nothing says "not open
  // for booking" for a moment before they arrive.
  const rows = { sessions: [{ ...session, id: 's1', modality_id: 'mod_a', teacher_id: 't', room_id: 'r', template_id: 'tpl_hidden' }], modalities: [{ id: 'mod_a', active: true }], teachers: [], rooms: [], templates };
  assert.deepEqual(joinSessionRows?.(rows, { loading: true }), [], 'still loading: nothing joined');
  const joined = joinSessionRows?.(rows, { loading: false }) ?? [];
  assert.equal(joined.length, 1);
  assert.equal(joined[0].modality?.id, 'mod_a');
  assert.equal(reason(joined[0], now), null, 'r2 L3: open although its row is not among the rows read');
  assert.equal(joinSessionRows?.(rows, { loading: false, filter: () => false })?.length, 0, 'the filter still applies');
  console.log('PASS: future/full, cancelled, completed, exact start/end, unpublished type, switched-off row stays open, one-off, no class type and invalid date states');
} finally { await rm(scratch, { recursive: true, force: true }); }
