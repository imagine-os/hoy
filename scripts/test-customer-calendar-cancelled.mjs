import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const dir = await mkdtemp(join(tmpdir(), 'hoy-calendar-'));
try {
  await build({entryPoints:['src/modules/customer/calendarVisibility.ts'],bundle:true,platform:'node',format:'esm',outfile:join(dir,'visibility.mjs')});
  const { customerCalendarSessions } = await import(pathToFileURL(join(dir,'visibility.mjs')));
  const rows = Object.freeze(['scheduled','cancelled','completed'].map((status,i)=>Object.freeze({id:String(i),status,booked_count:i})));
  const before = JSON.stringify(rows);
  assert.deepEqual(customerCalendarSessions(rows).map(r=>r.status),['scheduled','completed']);
  assert.equal(JSON.stringify(rows),before);
  assert.equal(customerCalendarSessions(rows)[0],rows[0]);
  assert.deepEqual(customerCalendarSessions([]),[]);
  assert.deepEqual(customerCalendarSessions([rows[1]]),[]);
  const source=await readFile('src/modules/customer/pages/SchedulePage.tsx','utf8');
  assert.match(source,/customerCalendarSessions\(sessions\.rows\)\.map/);
  assert.match(source,/useLiveUpdates\(\['class_sessions', 'bookings'\]\)/);
  assert.equal((source.match(/SessionCalendar sessions=\{filtered\}/g)||[]).length,3);
  console.log('PASS: canceled browse rows hidden; scheduled/completed and source records preserved; all customer calendar views use projection.');
} finally {await rm(dir,{recursive:true,force:true});}
