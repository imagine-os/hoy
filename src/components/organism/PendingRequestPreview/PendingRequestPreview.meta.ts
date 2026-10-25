import {createElement as h} from 'react';
import {defineMeta} from '../../../design/meta';
import {PendingRequestPreview} from './PendingRequestPreview';
import type {PendingRequestPreviewState} from '../../../modules/customer/usePendingRequestPreview';
const ready:PendingRequestPreviewState={status:'ready',preview:{kind:'cash',paymentId:'fictional-payment',auditId:'fictional-audit',recipient:{email:'customer@example.test',name:'FICTIONAL CUSTOMER'},amount:25000,product:{es:'Clase ficticia',en:'Fictional class'},method:'cash',route:'/app/history',contract:{kind:'builtin-mock',key:'pending-payment-request',revision:1}}};
export default defineMeta({tier:'organism',name:'PendingRequestPreview',
  description:{es:'Email SIN ENVIAR para una solicitud ficticia pendiente comprobada; sin reserva, retención ni envío.',en:'UNSENT email for a verified fictional pending request; no booking, hold or sending.'},
  props:[{name:'result',type:'PendingRequestPreviewState',description:{es:'Carga, datos comprobados o estado sin copia.',en:'Loading, verified facts or no-copy state.'}},{name:'onRetry',type:'() => void',description:{es:'Repite solo la lectura.',en:'Repeats only the read.'}}],
  states:['loading','ready cash','ready transfer','unavailable','read failure / retry','cancelled / hidden'],
  usages:[{title:{es:'Efectivo ficticio',en:'Fictional cash'},render:()=>h(PendingRequestPreview,{result:ready})},{title:{es:'Transferencia ficticia',en:'Fictional transfer'},render:()=>h(PendingRequestPreview,{result:ready.status==='ready'?{status:'ready',preview:{...ready.preview,kind:'transfer',method:'transfer',receiptId:'fictional-receipt'}}:ready})},{title:{es:'Comprobando',en:'Checking'},render:()=>h(PendingRequestPreview,{result:{status:'loading'}})},{title:{es:'Sin confirmar',en:'Unconfirmed'},render:()=>h(PendingRequestPreview,{result:{status:'unavailable',reason:'proof_mismatch'},onRetry:()=>{}})},{title:{es:'Error de lectura',en:'Read error'},render:()=>h(PendingRequestPreview,{result:{status:'error',reason:'read_failed'},onRetry:()=>{}})},{title:{es:'Contexto cancelado',en:'Cancelled context'},render:()=>h(PendingRequestPreview,{result:{status:'cancelled',reason:'context_changed'}})}],
  usedBy:['C-04'],a11y:[{es:'Carga anunciada, destinatario visible, reintento de teclado y CTA inerte.',en:'Announced loading, visible recipient, keyboard retry and inert CTA.'}],
});
