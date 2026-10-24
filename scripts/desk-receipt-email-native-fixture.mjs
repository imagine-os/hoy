// Fresh browser-local fictional setup only; no command/handler replacement or real customer data.
export const deskReceiptEmailNow='2026-10-24T15:00:00.000Z';
export const deskReceiptEmailSession='qa_native_receipt_email_class';
export function installNativeDeskReceiptEmailFixture(){
 const stored=JSON.parse(localStorage.getItem('hoyos.db.v1')),db=stored.db,stamp=new Date().toISOString(),tenantId='ten_hoy';
 const row=(id,values)=>({id,tenant_id:tenantId,created_at:stamp,updated_at:stamp,...values});
 db.rooms.push(row('qa_native_receipt_email_room',{name:'FICTIONAL RECEIPT ROOM',capacity:8,heated:false}));
 db.modalities.push(row('qa_native_receipt_email_method',{slug:'qa-receipt-non-mat',active:true,name_es:'MÉTODO FICTICIO',name_en:'FICTIONAL METHOD'}));
 db.class_sessions.push({...db.class_sessions.find(s=>s.status==='scheduled'),...row('qa_native_receipt_email_class',{title:'FICTIONAL RECEIPT CLASS',template_id:null,modality_id:'qa_native_receipt_email_method',room_id:'qa_native_receipt_email_room',starts_at:'2026-10-24T18:00:00Z',ends_at:'2026-10-24T18:50:00Z',status:'scheduled',capacity:8,booked_count:0})});
 const staff=db.profiles.filter(p=>p.tenant_id===tenantId&&p.user_id==='usr_desk');if(staff.length!==1)throw Error('FICTIONAL recorder profile required');staff[0].full_name='FICTIONAL RECEIPT RECORDER';
 localStorage.setItem('hoyos.db.v1',JSON.stringify(stored));
}
