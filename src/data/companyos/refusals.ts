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
  payment_under_review: { es: 'Recepción está revisando el comprobante de esta reserva. Decide sobre el pago primero.', en: 'Reception is reviewing this booking\'s receipt. Decide on the payment first.' },
  reschedule_window_closed: { es: 'Ya no puedes mover esta reserva: el plazo para cambiarla terminó.', en: 'You can no longer move this booking: the window to change it has closed.' },
  invalid_transition: { es: 'Esta reserva ya no se puede cambiar así. Actualiza la página para ver su estado.', en: 'This booking can no longer be changed this way. Refresh to see its current status.' },
  booking_system_managed: { es: 'El estudio gestiona este cambio. Escríbenos si necesitas ayuda.', en: 'The studio handles this change. Write to us if you need help.' },
  // Lane Y5: a room holds one class at a time (bookings enforce_no_overlap): a class, or a timetable row since bookings 1.6.0.
  // Review round 2 (r2hoy): switching the other row off doesn't free the room for the classes it already made, so that is
  // no longer offered; with bookings 1.6.0's details the timetable editor names the clash (timetableSave.ts refusalText).
  resource_overlap: { es: 'Esa sala ya tiene una clase a esa hora. Elige otra hora u otra sala. Si este horario reemplaza a otro, haz que empiece después de la última clase ya creada del otro, o cancela esas clases solo si nadie las reservó.', en: 'That room already has a class at that time. Choose another time or room. If this row replaces another one, start it after the other row\'s last class already made, or cancel those classes only if nobody has booked them.' },
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
  // Review round 2 (r2hoy): the sign-up codes (the sign-up and Join forms use their own lines in identity/strings.ts:
  // signupNoticeKey; these are for anywhere else that meets them). already_registered: done only if /me says so.
  already_registered: { es: 'Este correo ya tiene una cuenta en el estudio. Inicia sesión, o escríbele a administración si no puedes entrar.', en: 'This email already has an account at the studio. Sign in, or contact the studio administration if you cannot.' },
  email_linked_to_other_login: { es: 'Este correo ya está en la ficha de una persona que entra con otra cuenta. Escríbele a administración para revisarlo.', en: 'This email is already on the profile of someone who signs in with another account. Please contact the studio administration.' },
  duplicate_person_user: { es: 'Esta ficha ya está unida a otra cuenta. Escríbele a administración para revisarla.', en: 'This profile is already linked to another account. Please contact the studio administration.' },
  person_email_mismatch: { es: 'Ese correo ya pertenece a otra persona. Escríbenos para revisarlo.', en: 'That email belongs to someone else. Write to us so we can check it.' },
  consent_required: { es: 'Acepta los términos y la política de privacidad para continuar.', en: 'Accept the terms and the privacy policy to continue.' },
  email_change_not_allowed: { es: 'El estudio cambia el correo con el que entras. Escríbenos para hacerlo.', en: 'The studio changes the email you sign in with. Write to us to do it.' },
  // Comms (notification preferences)
  notification_pref_duplicate: { es: 'Esta preferencia ya se guardó. Actualiza la página para ver tu elección.', en: 'This preference was already saved. Refresh the page to see your choice.' },
  // Requests
  idempotency_conflict: { es: 'Este envío no coincide con el anterior. Actualiza la página e inténtalo de nuevo.', en: 'This submission does not match the previous one. Refresh the page and try again.' },
  idempotency_key_invalid: { es: 'No pudimos enviar la solicitud. Actualiza la página e inténtalo de nuevo.', en: 'We could not send the request. Refresh the page and try again.' },
  forbidden: { es: 'No tienes permiso para hacer esto.', en: 'You do not have permission to do this.' },
  // The cash book (Company OS expenses 1.0.0, ADR 0041).
  invalid_option: { es: 'Elige una de las opciones de la lista.', en: 'Choose one of the options in the list.' },
  invalid_date: { es: 'Revisa la fecha: no es válida, o la fecha de pago está en el futuro.', en: 'Check the date: it is not valid, or the payment date is in the future.' },
  template_not_found: { es: 'Ese gasto fijo ya no existe. Actualiza la página.', en: 'That recurring expense no longer exists. Refresh the page.' },
  invalid_day_of_month: { es: 'El día del mes debe estar entre 1 y 28.', en: 'The day of the month must be between 1 and 28.' },
  template_in_use: { es: 'Hay gastos registrados con este gasto fijo: desactívalo en lugar de borrarlo.', en: 'Expenses were recorded with this recurring expense: deactivate it instead of deleting it.' },
  // The activity log (GET /t/:t/audit, M-07): a filter the API refused.
  invalid_query: { es: 'No pudimos leer el registro con ese filtro. Cambia el rango o la búsqueda e inténtalo de nuevo.', en: 'We could not read the log with that filter. Change the range or the search and try again.' },
  // Forms (the privacy request, lane H2).
  unknown_form: { es: 'Este formulario no está disponible. Escríbenos por WhatsApp.', en: 'This form is not available. Write to us on WhatsApp.' },
  unknown_answer: { es: 'El formulario tiene un dato que no esperábamos. Actualiza la página e inténtalo de nuevo.', en: 'The form has a detail we did not expect. Refresh the page and try again.' },
  server_set_field: { es: 'No pudimos enviar la solicitud. Actualiza la página e inténtalo de nuevo.', en: 'We could not send the request. Refresh the page and try again.' },
  // Review round 1 (r1hoy, L6): the other form codes (the Hub's Report a problem meets them too, with its own staff copy).
  invalid_answers: { es: 'Faltan respuestas o alguna no es válida. Revisa el formulario e inténtalo de nuevo.', en: 'Some answers are missing or not valid. Check the form and try again.' },
  answer_too_long: { es: 'Una de las respuestas es demasiado larga. Acórtala e inténtalo de nuevo.', en: 'One of the answers is too long. Shorten it and try again.' },
  invalid_email: { es: 'Ese correo no es válido. Revísalo e inténtalo de nuevo.', en: 'That email is not valid. Check it and try again.' },
  write_forbidden: { es: 'Tu cuenta no puede enviar este formulario. Si crees que es un error, escríbenos.', en: 'Your account cannot send this form. If you think this is a mistake, write to us.' },
} as const satisfies Record<string, RefusalCopy>;

/** The connector's own codes: transport, session and launch scope. */
export const CONNECTOR_REFUSALS = {
  unauthorized: { es: 'Tu sesión terminó. Inicia sesión de nuevo.', en: 'Your session has ended. Sign in again.' },
  account_not_invited: { es: 'Esta cuenta aún no tiene acceso. Escríbenos para activarla.', en: 'This account does not have access yet. Write to us to activate it.' },
  email_not_verified: { es: 'Confirma tu correo para continuar.', en: 'Confirm your email to continue.' },
  network_error: { es: 'Sin conexión. Revisa tu internet e inténtalo de nuevo con el mismo botón.', en: 'No connection. Check your internet and try again with the same button.' },
  service_unavailable: { es: 'El servicio no responde ahora. Inténtalo en unos minutos con el mismo botón.', en: 'The service is not responding right now. Try again in a few minutes with the same button.' },
  // The Hoy server's per-visitor limit on the website's signed-out reads (lane F).
  rate_limited: { es: 'Demasiadas solicitudes seguidas. Espera un momento y vuelve a intentarlo.', en: 'Too many requests in a row. Wait a moment and try again.' },
  concept_required: { es: 'Falta el concepto.', en: 'A concept is needed.' },
  reference_required: { es: 'Escribe la referencia de la transferencia.', en: 'Enter the transfer reference.' },
  not_found: { es: 'No encontramos este registro. Puede que ya no exista.', en: 'We could not find this record. It may no longer exist.' },
  validation: { es: 'Faltan datos o hay un dato no válido. Revisa el formulario.', en: 'Some details are missing or not valid. Check the form.' },
  not_in_launch: { es: 'Esta función aún no está disponible.', en: 'This feature is not available yet.' },
  promotions_disabled: { es: 'Las promociones aún no están disponibles.', en: 'Promotions are not available yet.' },
  read_only: { es: 'Este contenido no se edita desde la app.', en: 'This content is not edited from the app.' },
  // Lane H2: email goes out only through Company OS; legal texts live in the build.
  email_not_connected: { es: 'El envío de correos desde aquí aún no está disponible. Escribe por WhatsApp.', en: 'Sending email from here is not available yet. Write on WhatsApp.' },
  legal_document_in_build: { es: 'Este documento se publica con una nueva versión de la app; aquí solo se publican los que el cliente acepta.', en: 'This document is published with a new version of the app; only the documents customers accept are published here.' },
  legal_document_current: { es: 'Esta es la versión que se pide al registrarse. Publica otra versión en su lugar.', en: 'This is the version asked for at sign-up. Publish another version instead.' },
  // Hoy all-roles, lane H1: refusals the app gives itself before asking Company OS.
  // Lane Y5: the M-02 timetable editor's own refusals, before anything is sent.
  content_invalid: { es: 'Hay un dato del horario que no es válido. Revisa el formulario; no se guardó nada.', en: 'A timetable detail is not valid. Check the form; nothing was saved.' },
  content_denied: { es: 'Solo Administración y Coordinación cambian el horario. No se guardó nada.', en: 'Only Administration and the Coordinator change the timetable. Nothing was saved.' },
  content_conflict: { es: 'Alguien cambió esta fila mientras la editabas. Cierra y vuelve a abrirla para ver la versión actual; tu cambio no se guardó.', en: 'Someone changed this row while you were editing it. Close and reopen it to see the current version; your change was not saved.' },
  timetable_class_type_required: { es: 'Elige la modalidad de esta fila antes de publicarla: sin modalidad sus clases no se pueden reservar. No se guardó nada.', en: 'Choose this row\'s modality (its class type) before publishing it: without one its classes can\'t be booked. Nothing was saved.' },
  // Owner 2026-11-01 (r2 L3, "Stop new classes only"): switching a row off stops new classes; the ones already made stay bookable.
  timetable_deactivate_instead: { es: 'Las filas del horario no se borran: desactívala (Publicado: no) para que no se creen clases nuevas. Las clases ya creadas siguen abiertas a reservas; para suspender una, cancela esa clase.', en: 'Timetable rows are not deleted: switch it off (Published: off) so no new classes are made. Classes already made stay open for booking; to call one off, cancel that class.' },
  content_later: { es: 'Editar este contenido desde la app llega en una próxima actualización. Por ahora no se guardó nada.', en: 'Editing this content from the app arrives in a coming update. Nothing was saved for now.' },
  checkout_server_only: { es: 'Esta compra se hace desde la página de pago. Vuelve a elegir el paquete.', en: 'This purchase is made from the payment page. Choose the pack again.' },
  // View-as (Hoy all-roles, lane D): a super admin viewing as another role can look, not change (src/auth/viewAs.ts).
  view_as_read_only: { es: 'Estás viendo como otro rol: es solo lectura. Sal de «Ver como» para hacer cambios.', en: 'You are viewing as another role: it is read-only. Exit “View as” to make changes.' },
  // Review round 1 (M3, M5): a holiday is saved, but the bookings closed days (a module setting) could not follow it.
  closed_dates_admin_only: { es: 'Se guardó. Los días cerrados de las reservas solo los cambia Administración: pídele que abra Ajustes › Horario, revise los días cerrados de recepción (añadir o quitar este) y guarde.', en: 'Saved. Only Administration changes the bookings’ closed days: ask them to open Settings › Hours, check the front desk closed days (add or remove this one) and save.' },
  closed_dates_not_synced: { es: 'Se guardó, pero no pudimos marcar el día como cerrado en las reservas. Vuelve a guardar en un momento.', en: 'Saved, but we could not mark the day closed in bookings. Save again in a moment.' },
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

/**
 * The line a screen shows for a failed action: the code's copy when the error carries a code this table knows, else
 * the screen's own `fallback` (a network failure, a bug). Never the raw code (review round 1, M5, L5, L6).
 */
export function failureCopy(e: unknown, lang: Lang, fallback: string): string {
  const code = e && typeof e === 'object' && typeof (e as { code?: unknown }).code === 'string' ? (e as { code: string }).code : '';
  return code && hasRefusalCopy(code) ? refusalCopy(code, lang) : fallback;
}

/** The two codes that mean "the holiday is saved; only the bookings closed days did not follow" (a warning, not a failure). */
export const SAVED_BUT_NOT_SYNCED: readonly string[] = ['closed_dates_admin_only', 'closed_dates_not_synced'];
