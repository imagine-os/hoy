// Synthetic room-state inventory only; existing rows and financial history remain intact.
import {admissionFixture,admissionNow,admissionIds} from './session-admission-fixture.mjs';
export {admissionNow as roomPublicationNow};
export const roomPublicationIds={...admissionIds,legacy:'qa_room_legacy',published:'qa_room_published',draft:'qa_room_draft',malformed:'qa_room_malformed',foreign:'qa_room_foreign'};
export async function roomPublicationFixture(source=process.cwd()){
 const fixture=await admissionFixture(source),db=fixture.db,base={tenant_id:'ten_hoy',created_at:admissionNow,updated_at:admissionNow},original=db.rooms[0];
 for(const [key,active]of [['legacy',undefined],['published',true],['draft',false],['malformed','false'],['foreign',true]]){const row={...original,...base,id:roomPublicationIds[key],name:`FICTIONAL ROOM ${key.toUpperCase()}`,capacity:8};delete row.active;if(active!==undefined)row.active=active;if(key==='foreign')row.tenant_id='ten_fictional_other';db.rooms.push(row);}
 const target=db.class_sessions.find(row=>row.id===admissionIds.session);target.room_id=roomPublicationIds.draft;target.capacity=8;target.theme_override=null;target.description_override=null;db.modalities.find(row=>row.id===admissionIds.modality).slug='qa_room_non_mat';return fixture;
}
