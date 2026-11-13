import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { EmailTestPanel } from './EmailTestPanel';
export default defineMeta({
  tier:'organism',name:'EmailTestPanel',
  description:{es:'Pruebas explícitas con datos ficticios y estado real del servidor.',en:'Explicit sample-data tests with real server delivery status.'},
  props:[{name:'request',type:'CosRequest | null',description:{es:'API autenticada; null nunca envía.',en:'Authenticated API; null never sends.'}},{name:'source / draft / version',type:'TestSource / TestCopy | null / number',description:{es:'Versión publicada y borrador sin publicar.',en:'Live source and unpublished draft.'}}],
  states:['unavailable','disabled','ready','sending','queued','sent','delivered','failed','bounced','history'],
  usages:[{title:{es:'API no disponible · sin envíos',en:'API unavailable · no sends'},render:()=>h(EmailTestPanel,{request:null,source:{id:'example',subject:'Sample',body:'Sample only'},draft:null,version:1})}],
  a11y:[{es:'Campos etiquetados, envío explícito y estados anunciados.',en:'Labeled fields, explicit sending and announced status.'}],usedBy:['M-04'],
});
