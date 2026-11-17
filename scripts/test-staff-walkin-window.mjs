import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const dir = await mkdtemp(join(tmpdir(), 'hoy-walkin-'));
try {
 const outfile = join(dir, 'rule.mjs');
 await build({ entryPoints: ['src/modules/staff/desk/deskSale.ts'], bundle: true, platform: 'node', format: 'esm', outfile });
 const { staffWalkInOpen, walkInSessions, chosenSession, checkInOpen } = await import(pathToFileURL(outfile));
 const start = Date.parse('2026-11-17T23:55:00-05:00');
 const session = { id:'class', starts_at:'2026-11-18T04:55:00Z', ends_at:'2026-11-18T05:45:00Z', status:'scheduled' };
 for (const offset of [-1, 0, 1, 14 * 60_000, 15 * 60_000]) assert.equal(staffWalkInOpen(session, start + offset), true, `open at ${offset}`);
 for (const offset of [15 * 60_000 + 1, 16 * 60_000, 51 * 60_000]) assert.equal(staffWalkInOpen(session, start + offset), false, `closed at ${offset}`);
 assert.equal(staffWalkInOpen({...session,starts_at:'2026-11-17T23:55:00-05:00'},start+15*60_000),true,'offset-equivalent ISO date across UTC/local midnight');
 for(const status of ['cancelled','completed']) assert.equal(staffWalkInOpen({...session,status},start),false,status);
 for(const key of ['starts_at','ends_at']) assert.equal(staffWalkInOpen({...session,[key]:'junk'},start),false,key);
 assert.equal(staffWalkInOpen({...session, ends_at:'2026-11-18T05:00:00Z'},start+6*60_000),false,'short class already ended');
 const list=[{session}];
 assert.equal(chosenSession(walkInSessions(list,start+15*60_000),'class'),'class');
 assert.equal(chosenSession(walkInSessions(list,start+15*60_000+1),'class'),'','stale selection removed');
 assert.equal(checkInOpen(session,start+30*60_000),true,'existing reservations still check in after walk-in window');
 console.log('PASS staff-only walk-in boundaries, timezone, status, invalid dates, short class, stale selection and reserved arrival');
} finally { await rm(dir,{recursive:true,force:true}); }
