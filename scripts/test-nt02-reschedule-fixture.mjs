// Fictional browser-local reschedule inputs. Installed before the real page/command reads them.
export async function installRescheduleFixture(page, lang) {
  return page.evaluate(({lang}) => {
    const stored=JSON.parse(localStorage.getItem('hoyos.db.v1')), db=stored.db;
    const tenant_id='ten_hoy', userId='usr_cust', stamp='2026-10-24T10:00:00Z';
    const row=(id,extra)=>({id,tenant_id,created_at:stamp,updated_at:stamp,...extra});
    const owner=db.users.find(r=>r.id===userId&&r.tenant_id===tenant_id);
    const profile=db.profiles.find(r=>r.user_id===userId&&r.tenant_id===tenant_id);
    if(!owner||!profile)throw Error('Expected fictional seeded customer');
    owner.email='nt02-move@example.test';owner.phone='+573000000099';owner.status='active';owner.locale=lang;
    profile.full_name='Fictional Reschedule Customer';
    const modality=db.modalities.find(r=>r.tenant_id===tenant_id&&r.active);
    const teacher=db.teachers.find(r=>r.tenant_id===tenant_id&&r.active);
    // RoomRow has no publication/active field; capacity and tenant are its admission inputs.
    const room=db.rooms.find(r=>r.tenant_id===tenant_id&&r.capacity>=3);
    const sample=db.class_sessions.find(r=>r.tenant_id===tenant_id);
    if(!modality||!teacher||!room||!sample)throw Error('Expected active fictional session dependencies');
    const oldTitle='FICTIONAL NT02 ORIGINAL',newTitle='FICTIONAL NT02 REPLACEMENT';
    const original={...sample,...row('qa_nt02_move_old',{title:oldTitle,template_id:null,modality_id:modality.id,teacher_id:teacher.id,room_id:room.id,starts_at:'2026-11-01T18:00:00Z',ends_at:'2026-11-01T18:50:00Z',status:'scheduled',capacity:3,booked_count:1})};
    const target={...original,id:'qa_nt02_move_new',title:newTitle,starts_at:'2026-11-03T18:00:00Z',ends_at:'2026-11-03T18:50:00Z',booked_count:0};
    db.class_sessions.push(original,target);
    db.bookings=db.bookings.filter(r=>r.user_id!==userId);
    db.bookings.push(row('qa_nt02_move_booking',{user_id:userId,session_id:original.id,status:'booked',paid_with:'package',ledger_id:'qa_nt02_move_debit',payment_id:'qa_nt02_move_payment',checked_in_at:null,cancelled_at:null,rated:false}));
    db.class_ledger=db.class_ledger.filter(r=>r.user_id!==userId);
    db.class_ledger.push(row('qa_nt02_move_purchase',{user_id:userId,plan_id:'plan_pack12',payment_id:'qa_nt02_move_payment',delta:1,reason:'purchase',expires_at:'2026-11-10',frozen_from:null,frozen_until:null}),row('qa_nt02_move_debit',{user_id:userId,delta:-1,reason:'booking',payment_id:'qa_nt02_move_payment',purchase_ledger_id:'qa_nt02_move_purchase',expires_at:null}));
    db.payments.push(row('qa_nt02_move_payment',{user_id:userId,plan_id:'plan_pack12',amount:120000,amount_paid:120000,method:'cash',provider:'manual',status:'approved',currency:'COP',note:'FICTIONAL NT02',paid_at:stamp}));
    const template=db.email_templates.find(r=>r.tenant_id===tenant_id&&r.key==='booking_changed');
    if(!template)throw Error('Expected saved booking_changed template');
    // Use the real saved template body/version/active state; do not activate or replace it.
    localStorage.setItem('hoyos.db.v1',JSON.stringify(stored));
    localStorage.setItem('hoyos.session',JSON.stringify({userId,devMode:false,viewAs:null}));
    return {userId,tenantId:tenant_id,oldId:'qa_nt02_move_booking',oldSessionId:original.id,newSessionId:target.id,oldTitle,newTitle,email:owner.email,name:profile.full_name,teacher:teacher.display_name,targetDay:'2026-11-03',templateId:template.id,templateVersion:template.version,templateActive:template.active};
  },{lang});
}
export const readRescheduleDb=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db);
export const financialTables=['payments','class_ledger','invoices','message_log','notifications'];
