// Pure S-02 display boundaries only; synthetic records, no provider reads/writes or backend claims.
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const temp=await mkdtemp(join(tmpdir(),'hoy-checkin-room-')),checks=[];
let failure=null;
function check(name,action){action();checks.push(name);}
try{
 const file=join(temp,'domain.mjs');
 await build({stdin:{contents:"export {canReadCheckinRoom,checkinRoomName} from './src/modules/staff/checkinRoom';",resolveDir:process.cwd()},bundle:true,format:'esm',platform:'node',outfile:file,logLevel:'silent'});
 const {canReadCheckinRoom,checkinRoomName}=await import(pathToFileURL(file));
 const tenant='qa_checkin_tenant',id='qa_checkin_room',room={id,tenant_id:tenant,name:'  FICTIONAL CHECK-IN ROOM  '};
 for(const role of['super_admin','admin','coordinator','front_desk'])check(`existing S-02 route role ${role} can read`,()=>assert.equal(canReadCheckinRoom('qa_actor',role,tenant),true));
 for(const role of['finance','teacher','maintenance','marketing','developer','customer','public',''])check(`non-desk role ${role||'missing'} cannot read`,()=>assert.equal(canReadCheckinRoom('qa_actor',role,tenant),false));
 check('missing actor cannot read',()=>assert.equal(canReadCheckinRoom('','front_desk',tenant),false));
 check('missing tenant cannot read',()=>assert.equal(canReadCheckinRoom('qa_actor','front_desk',''),false));
 check('exact tenant and ID resolve trimmed saved name without mutation',()=>{const rows=[structuredClone(room)],before=structuredClone(rows);assert.equal(checkinRoomName(rows,id,tenant),'FICTIONAL CHECK-IN ROOM');assert.deepEqual(rows,before);});
 check('empty exact query is unavailable rather than invented room',()=>assert.equal(checkinRoomName([],id,tenant),null));
 for(const[label,rows]of[
  ['foreign tenant',[{...room,tenant_id:'qa_foreign_tenant'}]],
  ['different room identity',[{...room,id:'qa_different_room'}]],
  ['duplicate identity',[room,{...room}]],
  ['extra mismatched row',[room,{...room,id:'qa_other_room'}]],
  ['missing rows',undefined],['null rows',null],['object instead of array',room],['string instead of array','qa_room'],
  ['null row',[null]],['primitive row',['room']],['empty row',[{}]],['blank name',[{...room,name:'   '}]],
  ['missing name',[{id,tenant_id:tenant}]],['nonstring name',[{...room,name:123}]],
 ])check(`invalid proof: ${label}`,()=>assert.throws(()=>checkinRoomName(rows,id,tenant),/^Error: checkin_room_invalid$/));
 check('missing selected room identity is invalid',()=>assert.throws(()=>checkinRoomName([], '',tenant),/^Error: checkin_room_invalid$/));
 check('missing tenant identity is invalid',()=>assert.throws(()=>checkinRoomName([room],id,''),/^Error: checkin_room_invalid$/));
 check('legacy room without active remains readable for existing assignment',()=>{assert.equal(Object.hasOwn(room,'active'),false);assert.equal(checkinRoomName([room],id,tenant),'FICTIONAL CHECK-IN ROOM');});
 check('unpublished room remains readable for existing assignment',()=>assert.equal(checkinRoomName([{...room,active:false}],id,tenant),'FICTIONAL CHECK-IN ROOM'));
 console.log(`PASS check-in room: ${checks.length} focused pure-domain cases; route roles, exact saved tenant/ID/name, malformed proof and existing unpublished assignments.`);
}catch(error){failure=error.stack??String(error);throw error;}finally{
 if(process.env.QA_OUTPUT){const out=resolve(process.env.QA_OUTPUT);assert(!out.startsWith(resolve(process.cwd())+'/'),'QA_OUTPUT must be outside source tree');await mkdir(out,{recursive:true});await writeFile(join(out,'checkin-room.json'),JSON.stringify({status:failure?'FAIL':'PASS',cases:checks.length,checks,failure,limits:['Synthetic pure module tests only; no browser, provider I/O, server authorization or backend readiness.','Existing room assignments remain displayable when publication is absent/false; no admission/publication policy changes.']},null,2));}
 await rm(temp,{recursive:true,force:true});
}
