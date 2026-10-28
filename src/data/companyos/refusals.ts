import type { Lang } from '../../i18n/types';

/**
 * Rule C7: every refusal code the launch flows can get from Company OS has a Spanish and an English line
 * (contract §4). A code that isn't listed falls back to a generic line that shows the code, so support can trace it.
 * The connector's own codes (transport, launch scope) are listed after the contract's.
 */
export type RefusalCopy = { es: string; en: string };

/** Contract §4, grouped as in the contract. */
export const CONTRACT_REFUSALS = {
  // Bookings
  occurrence_full: { es: 'Esta clase ya está llena.', en: 'This class is full.' },
  occurrence_not_open: { es: 'Esta clase ya no admite reservas: empezó, se canceló o terminó.', en: 'This class no longer takes bookings: it has started, been cancelled or ended.' },
  already_booked: { es: 'Ya tienes una reserva en esta clase.', en: 'You already have a booking in this class.' },
  daily_limit_reached: { es: 'Ya tienes una clase reservada ese día. Puedes reservar una clase por día.', en: 'You already have a class booked that day. You can book one class a day.' },
  spot_required: { es: 'Elige un tapete para reservar esta clase.', en: 'Choose a mat to book this class.' },
  spot_invalid: { es: 'Ese tapete no existe en esta sala. Elige otro.', en: 'That mat does not exist in this room. Choose another.' },
  spot_taken: { es: 'Alguien acaba de tomar ese tapete. Elige otro.', en: 'Someone just took that mat. Choose another.' },
  hold_expired: { es: 'Se acabó el tiempo para pagar y el cupo se liberó. Reserva de nuevo si aún hay lugar.', en: 'The time to pay ran out and the place was released. Book again if there is still room.' },
  reschedule_window_closed: { es: 'Ya no puedes mover esta reserva: el plazo para cambiarla terminó.', en: 'You can no longer move this booking: the window to change it has closed.' },
  invalid_transition: { es: 'Esta reserva ya no se puede cambiar así. Actualiza la página para ver su estado.', en: 'This booking can no longer be changed this way. Refresh to see its current status.' },
  booking_system_managed: { es: 'El estudio gestiona este cambio. Escríbenos si necesitas ayuda.', en: 'The studio handles this change. Write to us if you need help.' },
  reason_required: { es: 'Escribe un motivo nuevo para este cambio.', en: 'Write a new reason for this change.' },
  // Credits
  no_credits: { es: 'No te quedan clases disponibles. Compra un paquete o una clase.', en: 'You have no classes left. Buy a pack or a single class.' },
  lot_expired: { es: 'Tus clases vencieron. Compra un paquete nuevo para seguir reservando.', en: 'Your classes have expired. Buy a new pack to keep booking.' },
  lot_frozen: { es: 'Tu paquete está congelado. Reactívalo para reservar.', en: 'Your pack is frozen. Resume it to book.' },
  freeze_limit: { es: 'Este paquete ya usó todas sus congelaciones.', en: 'This pack has used all its freezes.' },
  freeze_too_long: { es: 'La congelación es más larga de lo permitido. Elige menos días.', en: 'The freeze is longer than allowed. Choose fewer days.' },
  freeze_not_allowed: { es: 'Este paquete no se puede congelar en esas fechas.', en: 'This pack cannot be frozen on those dates.' },
  trial_used: { es: 'Ya usaste tu clase de prueba. Elige una clase o un paquete.', en: 'You have already used your trial class. Choose a class or a pack.' },
  voucher_invalid: { es: 'Ese código no existe. Revísalo e inténtalo de nuevo.', en: 'That code does not exist. Check it and try again.' },
  voucher_expired: { es: 'Este bono ya venció.', en: 'This voucher has expired.' },
  voucher_redeemed: { es: 'Este bono ya se usó y no se puede cambiar.', en: 'This voucher has been used and cannot be changed.' },
  voucher_used_up: { es: 'Este bono ya se usó por completo, o ya lo canjeaste.', en: 'This voucher is fully used, or you have already redeemed it.' },
  // Payments
  product_inactive: { es: 'Este producto ya no está a la venta.', en: 'This product is no longer for sale.' },
  audience_not_allowed: { es: 'Este precio es solo para afiliados. Pregunta en recepción.', en: 'This price is for affiliates only. Ask at the front desk.' },
  amount_mismatch: { es: 'El monto no coincide con el precio. Escribe el motivo de la diferencia para aprobarlo.', en: 'The amount does not match the price. Write the reason for the difference to approve it.' },
  invalid_amount: { es: 'El monto no es válido. Usa un número entero mayor que cero.', en: 'The amount is not valid. Use a whole number above zero.' },
  invalid_status_transition: { es: 'Este pago ya no se puede cambiar así. Actualiza la página para ver su estado.', en: 'This payment can no longer be changed this way. Refresh to see its current status.' },
  refunds_disabled: { es: 'El estudio no hace reembolsos desde la app.', en: 'The studio does not issue refunds from the app.' },
  duplicate_provider_ref: { es: 'Ya hay un pago con esa referencia.', en: 'There is already a payment with that reference.' },
  invoice_system_managed: { es: 'El sistema emite las notas de compra; no se pueden editar.', en: 'Purchase receipts are issued by the system and cannot be edited.' },
  // Files
  file_too_large: { es: 'El archivo es demasiado grande. El máximo es 10 MB.', en: 'The file is too large. The maximum is 10 MB.' },
  file_type_not_allowed: { es: 'Sube una imagen PNG o JPG.', en: 'Upload a PNG or JPG image.' },
  file_upload_expired: { es: 'La subida tardó demasiado. Vuelve a subir el archivo.', en: 'The upload took too long. Upload the file again.' },
  file_upload_missing: { es: 'No recibimos el archivo. Vuelve a subirlo.', en: 'We did not receive the file. Upload it again.' },
  storage_unavailable: { es: 'No pudimos guardar el archivo ahora. Inténtalo en unos minutos.', en: 'We could not store the file right now. Try again in a few minutes.' },
  // Sign-up and people
  already_signed_up: { es: 'Ya tienes una cuenta. Inicia sesión.', en: 'You already have an account. Sign in.' },
  person_email_mismatch: { es: 'Ese correo ya pertenece a otra persona. Escríbenos para revisarlo.', en: 'That email belongs to someone else. Write to us so we can check it.' },
  consent_required: { es: 'Acepta los términos y la política de privacidad para continuar.', en: 'Accept the terms and the privacy policy to continue.' },
  // Requests
  idempotency_conflict: { es: 'Este envío no coincide con el anterior. Actualiza la página e inténtalo de nuevo.', en: 'This submission does not match the previous one. Refresh the page and try again.' },
  idempotency_key_invalid: { es: 'No pudimos enviar la solicitud. Actualiza la página e inténtalo de nuevo.', en: 'We could not send the request. Refresh the page and try again.' },
  forbidden: { es: 'No tienes permiso para hacer esto.', en: 'You do not have permission to do this.' },
} as const satisfies Record<string, RefusalCopy>;

/** The connector's own codes: transport, session and launch scope. */
export const CONNECTOR_REFUSALS = {
  unauthorized: { es: 'Tu sesión terminó. Inicia sesión de nuevo.', en: 'Your session has ended. Sign in again.' },
  account_not_invited: { es: 'Esta cuenta aún no tiene acceso. Escríbenos para activarla.', en: 'This account does not have access yet. Write to us to activate it.' },
  email_not_verified: { es: 'Confirma tu correo para continuar.', en: 'Confirm your email to continue.' },
  network_error: { es: 'Sin conexión. Revisa tu internet e inténtalo de nuevo con el mismo botón.', en: 'No connection. Check your internet and try again with the same button.' },
  service_unavailable: { es: 'El servicio no responde ahora. Inténtalo en unos minutos con el mismo botón.', en: 'The service is not responding right now. Try again in a few minutes with the same button.' },
  concept_required: { es: 'Falta el concepto del pago.', en: 'The payment needs a concept.' },
  reference_required: { es: 'Escribe la referencia de la transferencia.', en: 'Enter the transfer reference.' },
  not_found: { es: 'No encontramos este registro. Puede que ya no exista.', en: 'We could not find this record. It may no longer exist.' },
  validation: { es: 'Faltan datos o hay un dato no válido. Revisa el formulario.', en: 'Some details are missing or not valid. Check the form.' },
  not_in_launch: { es: 'Esta función aún no está disponible.', en: 'This feature is not available yet.' },
  promotions_disabled: { es: 'Las promociones aún no están disponibles.', en: 'Promotions are not available yet.' },
  read_only: { es: 'Este contenido no se edita desde la app.', en: 'This content is not edited from the app.' },
} as const satisfies Record<string, RefusalCopy>;

export type ContractRefusalCode = keyof typeof CONTRACT_REFUSALS;
export type RefusalCode = ContractRefusalCode | keyof typeof CONNECTOR_REFUSALS;

const COPY: Record<string, RefusalCopy> = { ...CONTRACT_REFUSALS, ...CONNECTOR_REFUSALS };

/** The generic line for a code without its own copy; `{code}` is replaced with the code. */
export const GENERIC_REFUSAL: RefusalCopy = {
  es: 'No pudimos completar la acción. Si se repite, escríbenos con este código: {code}.',
  en: 'We could not complete the action. If it happens again, write to us with this code: {code}.',
};

export const hasRefusalCopy = (code: string): boolean => Object.prototype.hasOwnProperty.call(COPY, code);

/** The line for a code in a language; English falls back to Spanish. */
export function refusalCopy(code: string, lang: Lang = 'es'): string {
  const copy = hasRefusalCopy(code) ? COPY[code] : null;
  if (copy) return (lang === 'en' ? copy.en : copy.es) || copy.es;
  const line = (lang === 'en' ? GENERIC_REFUSAL.en : GENERIC_REFUSAL.es) || GENERIC_REFUSAL.es;
  return line.replace('{code}', code || 'unknown');
}
