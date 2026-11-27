import assert from 'node:assert/strict';
import { createServer } from 'vite';
const vite = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom' });
try {
  const { attendanceRange, attendanceReport, attendanceSessions, attendanceCsv, loadAttendance } = await vite.ssrLoadModule('/src/modules/staff/attendanceReportData.ts');
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
  const calls = [];
  const many = Array.from({ length: 51 }, (_, i) => ({ id: 's' + i, data: { ...session('s' + i, '2026-11-26T05:00:00Z'), kind: 'class' } }));
  const withEvent = [...many, { id: 'event', data: { ...many[0].data, kind: 'event' } }];
  const cos = { request: async (method, path, spec) => {
    calls.push([method,path,spec]);
    if (spec.entity === 'occurrence') return { data: withEvent.filter(row => spec.filter.and.filter(f => f.field === 'kind').every(f => f.op === 'eq' && row.data.kind === f.value)) };
    const ids = spec.filter.and[0].value;
    if (ids.length === 1) return { data: [] };
    return { data: spec.offset ? [{ id: 'b500', data: { occurrence: ids[0], person: { id: 'p500' }, status: 'checked_in' } }] :
      Array.from({ length: 500 }, (_, i) => ({ id:'b'+i, data:{ occurrence: ids[0], person:'p'+i, status:'checked_in' } })) };
  }};
  const prod = await loadAttendance(cos,dates,+now);
  assert.equal(prod.length,51);
  assert.equal(prod[0].checkedIn,501);
  assert.equal(prod.reduce((sum,s)=>sum+s.checkedIn,0),501);
  assert.deepEqual(calls.map(([method,path,s]) => [method,path,s.entity,s.sort.map(x=>x.field),s.offset]), [
    ['POST','/query','occurrence',['starts_at','id'],0],['POST','/query','booking',['id'],0],
    ['POST','/query','booking',['id'],500],['POST','/query','booking',['id'],0],
  ]);
  assert.deepEqual(calls[0][2].filter.and.map(x=>x.value),['2026-11-26T05:00:00.000Z','2026-11-27T05:00:00.000Z','class']);
  assert.ok(!prod.some(s => s.session.id === 'event'));
  await assert.rejects(loadAttendance({request: async () => ({data:[withEvent.at(-1)]})},dates,+now), /incomplete/);
  assert.equal(calls[1][2].filter.and[0].value.length,50);
  assert.equal(calls[3][2].filter.and[0].value.length,1);
  assert.equal(calls[1][2].filter.and[1].value,'checked_in');
  let active = true;
  let requests = 0;
  await assert.rejects(loadAttendance({request:async () => { requests++; active=false; return {data:many}; }},dates,+now,()=>active), /context_changed/);
  assert.equal(requests,1);
  await assert.rejects(loadAttendance({request:async () => {throw new Error('forbidden');}},dates,+now), /forbidden/);
  await assert.rejects(loadAttendance({request:async (_m,_p,s) => ({data:Array.from({length:500},(_,i)=>({id:String(s.offset+i),data:{}}))})},dates,+now), /incomplete/);
  console.log('Bogotá boundaries, cancelled/ongoing exclusion, group/duplicate/no-show semantics, zero, counts-only CSV, complete production query paging, cutoff and context change passed');
} finally { await vite.close(); }
