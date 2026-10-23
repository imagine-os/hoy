// Fictional approved package, shared by RS-02 recovery regressions only.
import {admissionFixture,admissionIds,admissionNow} from './session-admission-fixture.mjs';
export {admissionIds as packageBookingIds,admissionNow as packageBookingNow};
export async function packageBookingFixture(source=process.cwd(),lastClass=false){
 const fixture=await admissionFixture(source),db=fixture.db,user=admissionIds.user;
 const grant=db.class_ledger.find(row=>row.id===user+'_grant');
 Object.assign(grant,{delta:12,reason:'purchase',payment_id:'qa_package_payment',plan_id:'plan_pack12'});
 db.payments.push({...db.payments[0],id:'qa_package_payment',tenant_id:'ten_hoy',user_id:user,plan_id:'plan_pack12',status:'approved',paid_at:admissionNow,amount:600000,amount_paid:600000,currency:'COP'});
 if(lastClass)db.class_ledger.push({...grant,id:'qa_package_prior_use',delta:-11,reason:'booking',purchase_ledger_id:grant.id,expires_at:null});
 return fixture;
}
