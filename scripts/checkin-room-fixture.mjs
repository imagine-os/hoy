// Fictional local-only S02 references; retain all original rows/history.
import {admissionFixture,admissionNow,admissionIds} from './session-admission-fixture.mjs';
export const checkinRoomNow=admissionNow;
export const checkinRoomIds={...admissionIds,legacy:'qa_checkin_room_legacy',draft:'qa_checkin_room_draft',second:'qa_checkin_room_second'};
export async function checkinRoomFixture(source=process.cwd()){
 const storage=globalThis.localStorage;let fixture;try{fixture=await admissionFixture(source);}finally{if(storage===undefined)delete globalThis.localStorage;else globalThis.localStorage=storage;}
 const db=fixture.db,first=db.class_sessions.find(r=>r.id===admissionIds.session),room=db.rooms[0];
 const legacy={...room,id:checkinRoomIds.legacy,name:'FICTIONAL S02 LEGACY ROOM',tenant_id:first.tenant_id,created_at:admissionNow,updated_at:admissionNow};delete legacy.active;
 db.rooms.push(legacy,{...legacy,id:checkinRoomIds.draft,name:'FICTIONAL S02 UNPUBLISHED ROOM',active:false});first.room_id=legacy.id;
 db.class_sessions.push({...first,id:checkinRoomIds.second,title:'FICTIONAL S02 SECOND CLASS',room_id:checkinRoomIds.draft});return fixture;
}
