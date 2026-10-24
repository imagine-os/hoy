// Synthetic complete/incomplete account fixtures for actual shared admission UI regressions.
import {admissionFixture,admissionIds,admissionNow} from './session-admission-fixture.mjs';
export const contactNow=admissionNow;
export const contactIds={...admissionIds,original:'qa_contact_original',booking:'qa_contact_original_booking',debit:'qa_contact_original_debit',offer:'qa_contact_offer'};
export async function bookingContactFixture({missing=null,paid=false,offered=false,full=false,original=false,actor=contactIds.user,customerMissing=null}={},source=process.cwd()) {
 const seed=await admissionFixture(source),db=seed.db,ids=contactIds,row={tenant_id:'ten_hoy',created_at:contactNow,updated_at:contactNow};
 // Use a real seeded super-admin only for explicit view-as/context invalidation tests.
 if(actor!==ids.user){const user=db.users.find(u=>u.id===actor),profile=db.profiles.find(p=>p.user_id===actor);Object.assign(user,{email:'fictional-contact-owner@example.test',phone:'+573000000001',status:'active'});profile.full_name='FICTIONAL CONTACT OWNER';db.class_ledger.push({...row,id:'qa_contact_super_grant',user_id:actor,delta:3,reason:'comp',plan_id:null,payment_id:null,purchase_ledger_id:null,expires_at:'2026-12-01',frozen_from:null,frozen_until:null});}
 const contactOwner=customerMissing?ids.user:actor;missing=customerMissing??missing;
 const user=db.users.find(u=>u.id===contactOwner),profile=db.profiles.find(p=>p.user_id===contactOwner);
 if(missing==='name')profile.full_name='';if(missing==='email')user.email='';if(missing==='phone')user.phone=null;if(missing==='placeholder')user.email='573000000001@sin-email.hoyos.test';
 if(paid)db.class_ledger=db.class_ledger.filter(g=>g.user_id!==actor);
 const target=db.class_sessions.find(s=>s.id===ids.session);target.booked_count=full?target.capacity:0;
 if(full)for(let n=0;n<target.capacity;n++)db.bookings.push({...row,id:'qa_contact_occupant_'+n,user_id:'fictional_occupant_'+n,session_id:ids.session,status:'booked',paid_with:'comp',ledger_id:null,checked_in_at:null,cancelled_at:null,rated:false,mat_number:null});
 if(offered)db.waitlist.push({...row,id:ids.offer,user_id:actor,session_id:ids.session,status:'offered',position:1,offered_at:contactNow,claim_until:'2026-10-23T15:30:00Z'});
 if(original){db.class_sessions.push({...target,id:ids.original,title:'FICTIONAL ORIGINAL CONTACT CLASS',starts_at:'2026-10-25T23:00:00Z',ends_at:'2026-10-26T00:00:00Z',booked_count:1});db.class_ledger.push({...row,id:ids.debit,user_id:actor,delta:-1,reason:'booking',purchase_ledger_id:actor===ids.user?ids.user+'_grant':'qa_contact_super_grant',plan_id:null,payment_id:null,expires_at:null,frozen_from:null,frozen_until:null});db.bookings.push({...row,id:ids.booking,user_id:actor,session_id:ids.original,status:'booked',paid_with:'package',ledger_id:ids.debit,checked_in_at:null,cancelled_at:null,rated:false,mat_number:null});}
 return seed;
}
