import type { RouteDef } from '../../specs/types';
import type { StringTable } from '../../i18n/types';

/** H-9 — copy for the launch emails screen (production `/admin/emails`). No routes: the admin module owns the path. */
export const routes: RouteDef[] = [];
export const strings: StringTable = {
  'notifications.launch.title': { es: 'Correos automáticos', en: 'Automated emails' },
  'notifications.launch.subtitle': { es: 'Los correos que {brand} envía solo, en español. Company OS los envía de 5 a 10 minutos después de cada evento.', en: 'The emails {brand} sends on its own, in Spanish. Company OS sends them 5 to 10 minutes after each event.' },
  'notifications.launch.boundary': { es: 'Esta app no envía correos ni marca ninguno como enviado. El estado de entrega es el que informa Company OS.', en: 'This app sends no email and marks none as sent. The delivery status is the one Company OS reports.' },
  'notifications.launch.templates': { es: 'Plantillas', en: 'Templates' },
  'notifications.launch.trigger': { es: 'Se envía cuando', en: 'Sent when' },
  'notifications.launch.sender.clerk': { es: 'Lo envía Clerk (inicio de sesión)', en: 'Sent by Clerk (sign-in)' },
  'notifications.launch.sender.company_os': { es: 'Lo envía Company OS', en: 'Sent by Company OS' },
  'notifications.launch.blocked': { es: 'Aún no se envía', en: 'Not sent yet' },
  'notifications.launch.blocked.body': { es: 'La plantilla está lista, pero falta un cambio en Company OS para enviarla:', en: 'The template is ready, but Company OS needs a change before it can send it:' },
  'notifications.launch.partial': { es: 'Se envía en parte', en: 'Partly sent' },
  'notifications.launch.preview': { es: 'Vista previa con datos de ejemplo', en: 'Preview with sample data' },
  'notifications.launch.show': { es: 'Ver el correo', en: 'Show the email' },
  'notifications.launch.hide': { es: 'Ocultar el correo', en: 'Hide the email' },
  'notifications.delivery.title': { es: 'Estado de entrega', en: 'Delivery status' },
  'notifications.delivery.loading': { es: 'Leyendo el estado de entrega…', en: 'Reading the delivery status…' },
  'notifications.delivery.error': { es: 'No pudimos leer el estado de entrega de Company OS.', en: 'We could not read the delivery status from Company OS.' },
  'notifications.delivery.retry': { es: 'Reintentar', en: 'Retry' },
  'notifications.delivery.unavailable': { es: 'Esta versión no está conectada a Company OS, así que no hay estado de entrega que mostrar.', en: 'This version is not connected to Company OS, so there is no delivery status to show.' },
  'notifications.delivery.empty': { es: 'Todavía no hay correos en el registro.', en: 'No emails in the log yet.' },
  'notifications.delivery.when': { es: 'Fecha', en: 'When' },
  'notifications.delivery.template': { es: 'Correo', en: 'Email' },
  'notifications.delivery.to': { es: 'Para', en: 'To' },
  'notifications.delivery.status': { es: 'Estado', en: 'Status' },
  'notifications.delivery.reason': { es: 'Motivo', en: 'Reason' },
  'notifications.status.queued': { es: 'En cola', en: 'Queued' },
  'notifications.status.scheduled': { es: 'Programado', en: 'Scheduled' },
  'notifications.status.sent': { es: 'Enviado', en: 'Sent' },
  'notifications.status.delivered': { es: 'Entregado', en: 'Delivered' },
  'notifications.status.failed': { es: 'Falló', en: 'Failed' },
  'notifications.status.bounced': { es: 'Rebotado', en: 'Bounced' },
  'notifications.status.skipped': { es: 'No enviado', en: 'Not sent' },
};
