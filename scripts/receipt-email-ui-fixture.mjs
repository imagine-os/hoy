// Reserved synthetic saved snapshots. Values intentionally differ from mutable live contact.
export const receiptSavedName='FICTIONAL Saved Buyer {{literal_name}}';
export const receiptSavedRecorder='FICTIONAL Saved Recorder {{literal_recorder}}';
export const receiptSavedEmail='fictional-saved-buyer@example.test';
export function receiptEmailUIFixture(state='available') {
 const payment={id:'qa_receipt_email_ui',tenant_id:'ten_hoy',user_id:'qa_receipt_email_owner',plan_id:null,amount:35000,amount_paid:35000,currency:'COP',method:'cash',provider:'manual',paid_at:'2026-10-23T15:00:00Z',taken_by:'qa_receipt_email_recorder',status:'approved',note:null,created_at:'2026-10-23T15:00:00Z',updated_at:'2026-10-23T15:00:00Z'};
 const receipt={version:1,kind:'fictional-payment-receipt',reference:'DEMO-RECEIPT-'+payment.id,source:'desk-sale',facts:{paymentId:payment.id,tenantId:payment.tenant_id,customerId:payment.user_id,planId:null,amountCharged:payment.amount,amountReceived:payment.amount_paid,currency:payment.currency,method:payment.method,provider:payment.provider,confirmedAt:payment.paid_at,recordedBy:payment.taken_by,quote:null},item:{en:'FICTIONAL SAVED ITEM',es:'CONCEPTO FICTICIO GUARDADO'},recordedTax:null,previewChannels:['email'],delivery:'preview-only'};
 receipt.emailPreview={version:1,status:'unsent-preview',paymentId:payment.id,reference:receipt.reference,recipient:{tenantId:payment.tenant_id,customerId:payment.user_id,name:receiptSavedName,email:receiptSavedEmail,locale:'es',availability:'available',reason:null},subject:{en:'EN saved subject {{literal_subject}} <not-markup>',es:'ES asunto guardado {{asunto_literal}} <sin-marcado>'},body:{en:'EN saved body {{literal_body}}. Unsent preview only.\n\n<script>window.receiptInjected=true</script> & literal text.',es:'ES cuerpo guardado {{cuerpo_literal}}. Solo vista previa sin enviar.\n\n<script>window.receiptInjected=true</script> & texto literal.'}};
 receipt.recordedBySnapshot={userId:payment.taken_by,name:receiptSavedRecorder};payment.frontend_receipt=receipt;
 if(['missing-customer','ambiguous-customer','missing-email','invalid-email','placeholder-email'].includes(state)){Object.assign(receipt.emailPreview.recipient,{availability:'unavailable',reason:state,email:null});if(['missing-customer','ambiguous-customer'].includes(state))receipt.emailPreview.recipient.name=null;}
 if(state==='no-name')receipt.emailPreview.recipient.name=null;
 if(state==='unknown-recorder')receipt.recordedBySnapshot.name=null;
 if(state==='no-recorder'){payment.taken_by=null;receipt.facts.recordedBy=null;receipt.recordedBySnapshot=null;}
 if(state==='legacy'){delete receipt.emailPreview;delete receipt.recordedBySnapshot;}
 if(state==='malformed'){receipt.emailPreview.body.en=null;receipt.emailPreview.subject.es='PRIVATE INVALID SNAPSHOT MUST NOT RENDER';}
 if(state==='pending')payment.status='pending';
 return payment;
}
