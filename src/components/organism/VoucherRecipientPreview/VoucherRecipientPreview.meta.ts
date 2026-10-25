import {createElement as h} from 'react';
import {defineMeta} from '../../../design/meta';
import {VoucherRecipientPreview} from './VoucherRecipientPreview';
import type {VoucherRecipientPreviewResult} from '../../../modules/voucher-gifts/recipientPreview';

const ready:VoucherRecipientPreviewResult={status:'ready',preview:{
  purchaseId:'gift-purchase:fictional-payment',paymentId:'fictional-payment',voucherId:'fictional-voucher',approvalRequestId:'gift-purchase-request:fictional-admin:example',auditId:'fictional-audit',issueEventId:'fictional-issue',
  recipient:{email:'recipient@example.test',name:'FICTIONAL RECIPIENT'},
  copy:{subject:{es:'Tu bono de clases está disponible',en:'Your class voucher is available'},body:{es:'Tienes 12 clases ficticias. Este ejemplo no envía ningún email.',en:'You have 12 fictional classes. This example sends no email.'},ctaLabel:{es:'Ver bono de prueba',en:'View demo voucher'}},
  route:'/app/voucher-gifts?gift=fictional-payment',contract:{kind:'builtin-mock',key:'class-voucher-recipient-ready',revision:1},
}};
export default defineMeta({
  tier:'organism',name:'VoucherRecipientPreview',
  description:{es:'Vista de email SIN ENVIAR para el destinatario protegido de una aprobación ficticia de bono de clases.',en:'UNSENT email preview for the protected recipient of a fictional class-voucher approval.'},
  props:[{name:'result',type:'RecipientPreviewState',description:{es:'Carga, datos comprobados o estado sin copia; el componente no consulta ni escribe.',en:'Loading, verified copy or no-copy state; the component does not read or write data.'}},{name:'onRetry',type:'() => void',description:{es:'Repite solo la lectura de la misma aprobación.',en:'Retries only the same approval read.'}}],
  states:['loading','ready / recipient without account or known locale','unavailable','read failure / retry','cancelled / hidden'],
  usages:[
    {title:{es:'Datos ficticios comprobados',en:'Verified fictional facts'},render:()=>h(VoucherRecipientPreview,{result:ready})},
    {title:{es:'Comprobando',en:'Checking'},render:()=>h(VoucherRecipientPreview,{result:{status:'loading'}})},
    {title:{es:'Datos no confirmados',en:'Unconfirmed facts'},render:()=>h(VoucherRecipientPreview,{result:{status:'unavailable',reason:'proof_mismatch'},onRetry:()=>{}})},
    {title:{es:'Lectura fallida',en:'Read failed'},render:()=>h(VoucherRecipientPreview,{result:{status:'error',reason:'read_failed'},onRetry:()=>{}})},
    {title:{es:'Contexto cancelado · sin vista',en:'Cancelled context · no preview'},render:()=>h(VoucherRecipientPreview,{result:{status:'cancelled',reason:'context_changed'}})},
  ],usedBy:['S-09'],
  a11y:[{es:'Carga anunciada, destinatario visible y reintento de teclado; CTA de email inerte y rotulado de prueba.',en:'Announced loading, visible recipient and keyboard retry; inert email CTA labeled as a demo.'}],
});
