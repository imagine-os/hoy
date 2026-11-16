import type { StringTable } from '../../../i18n/types';
export const emailDuplicateStrings:StringTable={
 'desk.email.retryContext':{es:'Hay una venta anterior sin confirmar. No se iniciará otra venta desde este contexto. Vuelve al usuario, la sesión y los datos originales para recuperar el resultado con la misma clave; si no es posible, pide que revisen la venta antes de continuar.',en:'A previous sale is still unconfirmed. Another sale cannot start from this context. Return to the original user, session and sale details to recover the same-key result; if that is not possible, have the sale checked before continuing.'},
 'desk.email.retrySame':{es:'La venta anterior puede haberse guardado. Reintenta la misma venta para consultar su resultado; no crees otra ni cambies de ficha.',en:'The previous sale may have been saved. Retry this same sale to recover its result; do not create another or switch records.'},
 'desk.email.checking':{es:'Revisando clientes visibles con este correo…',en:'Checking visible clients with this email…'},
 'desk.email.found':{es:'Este correo ya aparece en otra ficha de cliente.',en:'This email already appears on another client record.'},
 'desk.email.shared':{es:'Si es la misma persona, usa su ficha. Si comparten correo, puedes mantener fichas separadas.',en:'If this is the same person, use their record. People sharing an inbox can keep separate records.'},
 'desk.email.use':{es:'Usar esta ficha',en:'Use this record'},
 'desk.email.continue':{es:'Continuar con una ficha separada',en:'Continue with a separate record'},
 'desk.email.unavailable':{es:'No se pudo revisar el correo. Puedes reintentar o continuar con el registro normal.',en:'The email check is unavailable. Retry or continue with normal registration.'},
 'desk.email.incomplete':{es:'La revisión es parcial; puede haber más coincidencias.',en:'This check is partial; more matches may exist.'},
 'desk.email.none':{es:'No se encontraron coincidencias en las fichas visibles revisadas.',en:'No matching email was found in the visible records checked.'},
 'desk.email.changed':{es:'La ficha o el contexto cambiaron. Vuelve a revisar antes de seleccionarla.',en:'The record or context changed. Check again before selecting it.'},
 'desk.email.more':{es:'Se muestran las primeras cinco coincidencias.',en:'Showing the first five matches.'},
};
