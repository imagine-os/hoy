import type {StringTable} from '../../i18n/types';
export const pendingPreviewStrings:StringTable={
  'pendingPreview.title':{es:'Vista de email · SIN ENVIAR',en:'Email preview · UNSENT'},
  'pendingPreview.boundary':{es:'Vista previa ficticia local. No se envió ningún email ni se procesó dinero real.',en:'Local fictional preview. No email was sent and no real money was processed.'},
  'pendingPreview.loading':{es:'Comprobando la solicitud guardada…',en:'Checking the saved request…'},
  'pendingPreview.to':{es:'Para:',en:'To:'},
  'pendingPreview.contract':{es:'Copia bilingüe de prueba · pending-payment-request · revisión 1. No es una plantilla publicada ni un registro de envío.',en:'Bilingual mock copy · pending-payment-request · revision 1. This is not a published template or a send record.'},
  'pendingPreview.subject':{es:'Solicitud de pago guardada · SIN ENVIAR',en:'Payment request saved · UNSENT'},
  'pendingPreview.record':{es:'Solicitud guardada: {product}. Importe registrado: {amount}.',en:'Saved request: {product}. Recorded amount: {amount}.'},
  'pendingPreview.cash':{es:'La solicitud de pago en recepción está pendiente de revisión ficticia.',en:'The front-desk payment request is awaiting fictional review.'},
  'pendingPreview.transfer':{es:'El comprobante de transferencia ficticio está guardado y pendiente de revisión. Esto no confirma una transferencia bancaria.',en:'The fictional transfer receipt is saved and awaiting review. This does not confirm a bank transfer.'},
  'pendingPreview.noHold':{es:'Esta solicitud no crea una reserva ni retiene un cupo.',en:'No booking or spot hold exists for this request.'},
  'pendingPreview.noGrant':{es:'No se activaron ni descontaron clases por esta solicitud pendiente.',en:'No classes were activated or deducted by this pending request.'},
  'pendingPreview.history':{es:'Ver historial',en:'View history'},
  'pendingPreview.link':{es:'Enlace de ejemplo inerte al historial de este navegador de demostración.',en:'Inert example link to this demo browser’s history.'},
  'pendingPreview.retry':{es:'Reintentar vista previa',en:'Retry preview'},
  'pendingPreview.error':{es:'No se pudo comprobar la solicitud. Reintentar solo vuelve a leer el registro; no repite el pago.',en:'The request could not be checked. Retry only reads the record again; it does not repeat payment.'},
  'pendingPreview.unavailable':{es:'El registro ya no confirma esta solicitud pendiente. No se muestra copia de email. Revisa el historial antes de actuar.',en:'The record no longer confirms this pending request. No email copy is shown. Review history before acting.'},
};
