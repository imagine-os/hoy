import type { RouteDef } from '../../specs/types';
import type { StringTable } from '../../i18n/types';
export const routes: RouteDef[] = [];
export const strings: StringTable = {
  'giftRetained.checking': { es: 'Revisando la compra ficticia guardada…', en: 'Checking the saved fictional purchase…' },
  'giftRetained.unknown': { es: 'El resultado todavía no se pudo verificar. Este regalo podría estar guardado. Revisa el intento guardado antes de reintentar.', en: 'The result could not yet be verified. This gift may already be saved. Check the saved attempt before retrying.' },
  'giftRetained.blocked': { es: 'No se pudo verificar el intento guardado. No se inició otra compra. Revisa de nuevo con la misma cuenta y el mismo rol.', en: 'The saved attempt could not be verified. No new purchase was started. Check again with the same account and role.' },
  'giftRetained.check': { es: 'Revisar resultado guardado', en: 'Check saved result' },
  'giftRetained.retryable': { es: 'No se encontró un resultado guardado para este intento exacto. Puedes reintentar este mismo regalo o cancelar el intento sin confirmar.', en: 'No saved result was found for this exact attempt. Retry this same gift or cancel the unconfirmed attempt.' },
  'giftRetained.retry': { es: 'Reintentar este regalo ficticio', en: 'Retry this fictional gift' },
  'giftRetained.cancel': { es: 'Cancelar intento sin confirmar', en: 'Cancel unconfirmed attempt' },
  'giftRetained.saved': { es: 'Regalo ficticio guardado y verificado', en: 'Fictional gift saved and verified' },
  'giftRetained.declined': { es: 'Resultado rechazado guardado. No se creó un regalo ficticio.', en: 'Saved declined result. No fictional gift was created.' },
  'giftRetained.acknowledge': { es: 'Revisé el resultado · preparar otro regalo', en: 'I reviewed the result · prepare another gift' },
  'giftRetained.snapshot': { es: 'Se conservan el destinatario, la fecha y la cotización de este intento. No se cambia el precio al revisar un resultado guardado.', en: 'This attempt retains its recipient, date and quote. Checking a saved result does not reprice it.' },
  'giftRetained.boundary': { es: 'Solo se guarda un borrador monetario ficticio en este navegador. No se entrega ni se activa un bono, y no se envía ningún mensaje.', en: 'Only a fictional monetary draft is saved in this browser. No voucher is delivered or activated, and no message is sent.' },
};
