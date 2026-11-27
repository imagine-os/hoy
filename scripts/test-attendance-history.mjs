import assert from 'node:assert/strict';
import { createServer } from 'vite';
const vite = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom' });
try {
  const { attendanceRange, attendanceReport, attendanceSessions, attendanceCsv } = await vite.ssrLoadModule('/src/modules/staff/attendanceHistory.ts');
  const session = (id, starts_at, status = 'completed', title = id, ends_at = starts_at) => ({ id, starts_at, ends_at, status, title });
  const all = [
    session('ends-late', '2026-11-26T23:30:00Z', 'scheduled', 'late', '2026-11-27T16:00:00Z'),
    session('excluded', '2026-11-27T05:00:00Z'),
    session('last', '2026-11-27T04:59:59Z', 'scheduled', '=Unsafe, "title"'),
    session('early', '2026-11-26T05:00:00Z'),
    session('cancelled', '2026-11-26T07:00:00Z', 'cancelled'),
  ];
  const now = new Date('2026-11-27T12:00:00Z');
  const dates = attendanceRange('2026-11-26', '2026-11-26', '2026-11-27');
  assert.deepEqual(dates, { from: '2026-11-26', to: '2026-11-26' });
  assert.equal(attendanceRange('2026-11-31', '2026-12-01', '2026-12-10'), null);
  assert.equal(attendanceRange('2026-10-01', '2026-11-26', '2026-11-27'), null);
  assert.equal(attendanceRange('2026-11-26', '2026-11-27', '2026-11-27'), null);
  assert.equal(attendanceRange('2026-11-26', '2026-11-25', '2026-11-27'), null);
  const sessions = attendanceSessions(all, dates, +now);
  assert.deepEqual(sessions.map(s => s.id), ['early','last']);
  const row = (session_id, user_id, status = 'checked_in', extra = {}) => ({ session_id, user_id, status, ...extra });
  const counts = attendanceReport(sessions, [row('early','person1'), row('early','person1'), row('early','person2','checked_in',{ party_size: 5 }), row('early','person3','no_show'), row('early','person4','booked'), row('early','person5','late_cancel'), row('early','person6','cancelled'), row('early','person7','held'), row('early',''), row('other','person9')]);
  assert.deepEqual(counts.map(({checkedIn}) => checkedIn), [2,0]);
  const csv = attendanceCsv(counts, ['Date', 'Time', 'Class', 'Checked in'], 'en');
  assert.match(csv, /"'=Unsafe, ""title""",0/);
  assert.ok(!csv.includes('person'));
  console.log('Bogotá boundaries, cancelled/ongoing exclusion, group/duplicate/no-show semantics, zero and counts-only CSV passed');
} finally { await vite.close(); }
