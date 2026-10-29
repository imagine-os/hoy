/**
 * H-9 — the launch emails (tracker rows NT-02 and NT-03), as Company OS comms 1.6.0 templates and automations.
 *
 * This file is the source; `node scripts/gen-launch-emails.mjs` writes `deploy/comms/hoy-templates.json`, which the Company OS
 * setup recipe (lane CO-4) loads. Company OS sends them: an automation listens to an audit event, matches its `filter`
 * (equality on the event's details), loads `record_entity` by the id in `event[record_key]` and renders the template
 * 5 to 10 minutes later. Nothing in the app sends or pretends to send.
 *
 * Copy rules:
 * - Spanish only (`locale: ""`, Company OS's fallback); the tenant's `default_locale` is `es`.
 * - Company OS paths only: `person.name`, `tenant.name`, `links.base`, `event.<detail>`, `record.<field>`, with
 *   `|date`, `|time`, `|datetime` (tenant timezone). An unknown path renders empty, so the test checks every path.
 * - `{brand}` and `{contact_email}` are filled from the app's tenant config when the JSON is written (one source with
 *   the website, SW-05). Links are `{{links.base}}/#/…`: the comms setting `link_base_url` is the app address.
 * - Amounts render as plain numbers (comms has no money format yet), so they read "38000 COP".
 */
import type { Bi } from '../specs/types';
import { tenant } from '../tenant/tenant';

export type LaunchRow = 'NT-02' | 'NT-03';

/** One Company OS `automation` row (comms 1.6.0). Paths are `event.<detail>` or `record.<field>`. */
export interface LaunchAutomation {
  name: string;
  event: string;
  filter?: Record<string, string | number | boolean | null>;
  record_entity?: string;
  record_key?: string;
  recipient?: string;
  recipient_email?: string;
  category: string;
  channels: ['email'];
  respect_quiet_hours: boolean;
  _note?: string;
}

/** Why an automation can't be loaded yet: `summary` for the admin screen, `gap` / `needs` for the hand-over. */
export interface LaunchBlocker { summary: Bi; gap: string; needs: string }

export interface LaunchEmail {
  key: string;
  row: LaunchRow;
  name: Bi;
  /** Who sends it: Company OS comms, or Clerk (the sign-in code; documented here, configured in Clerk). */
  sender: 'company_os' | 'clerk';
  /** When it is sent, for the admin screen and the hand-over. */
  trigger: Bi;
  subject: string;
  body: string;
  automations: LaunchAutomation[];
  /** Automations designed but not loadable on the current platform; the template is still loaded, inactive use. */
  blocked?: { automations: LaunchAutomation[]; blockers: LaunchBlocker[] };
}

const SIGN_OFF = '\n\nEquipo {brand}\n{contact_email}';
const email = (o: Omit<LaunchEmail, 'body'> & { body: string }): LaunchEmail => ({ ...o, body: o.body + (o.sender === 'company_os' ? SIGN_OFF : '') });
const auto = (a: Omit<LaunchAutomation, 'channels' | 'respect_quiet_hours'> & { respect_quiet_hours?: boolean }): LaunchAutomation =>
  ({ channels: ['email'], respect_quiet_hours: false, ...a });

export const LAUNCH_EMAILS: LaunchEmail[] = [
  email({
    key: 'welcome', row: 'NT-02', sender: 'company_os',
    name: { es: 'Bienvenida', en: 'Welcome' },
    trigger: { es: 'Alguien crea su cuenta de cliente', en: 'Someone creates a customer account' },
    subject: 'Te damos la bienvenida a {brand}, {{person.name}}',
    body: 'Hola {{person.name}}:\n\nYa tienes tu cuenta en {brand}. Desde la app reservas tus clases, compras tu paquete y ves tu historial.\n\nTu primera clase es el mejor comienzo: elige un horario y llega 10 minutos antes.\n\nReservar: {{links.base}}/#/app/schedule',
    automations: [auto({ name: 'welcome', event: 'user.signed_up', filter: { role: 'member' }, recipient: 'event.personId', category: 'account',
      _note: 'Sign-up (ADR 0038) writes user.signed_up { userId, personId, facetId, role, linkedExisting }. Customers sign up as member.' })],
  }),
  email({
    key: 'sign_in_code', row: 'NT-02', sender: 'clerk',
    name: { es: 'Código para entrar', en: 'Sign-in code' },
    trigger: { es: 'Alguien pide un código para entrar (lo envía Clerk)', en: 'Someone asks for a sign-in code (Clerk sends it)' },
    subject: 'Tu código para entrar a {brand}: {{otp_code}}',
    body: 'Hola:\n\nTu código para entrar a {brand} es {{otp_code}}. Vence en 10 minutos.\n\nSi no lo pediste, ignora este correo: nadie puede entrar sin el código.\n\nEquipo {brand}\n{contact_email}',
    automations: [],
  }),
  email({
    key: 'booking_pending_payment', row: 'NT-02', sender: 'company_os',
    name: { es: 'Reserva pendiente de pago', en: 'Booking pending payment' },
    trigger: { es: 'Llega el comprobante de una reserva retenida y recepción lo revisa', en: 'A held booking’s receipt arrives and reception reviews it' },
    subject: 'Tu reserva está pendiente de confirmar el pago',
    body: 'Hola {{person.name}}:\n\nRegistramos el pago de tu clase del {{record.start|datetime}} y recepción lo está revisando. Te escribimos cuando quede confirmado.\n\nMientras recepción lo revisa, tu cupo queda guardado.\n\nVer mis reservas: {{links.base}}/#/app',
    automations: [auto({ name: 'booking_pending_payment', event: 'booking.hold_frozen', record_entity: 'booking', recipient: 'record.person', category: 'bookings',
      _note: 'bookings 1.4.0 with hold_frozen_while_payment_pending: a pending payment for a held booking freezes the hold (details { id, payment }).' })],
  }),
  email({
    key: 'payment_confirmed', row: 'NT-02', sender: 'company_os',
    name: { es: 'Pago confirmado', en: 'Payment confirmed' },
    trigger: { es: 'Se aprueba un pago sin producto (los pagos de un producto reciben la Nota de compra)', en: 'A payment without a product is approved (product payments get the purchase note)' },
    subject: 'Confirmamos tu pago en {brand}',
    body: 'Hola {{person.name}}:\n\nConfirmamos tu pago de {{event.amount}} COP.\n\nEn la app ves el estado de tus reservas y tu historial de pagos.\n\nVer mi historial: {{links.base}}/#/app/history',
    automations: [auto({ name: 'payment_confirmed', event: 'payment.approved', filter: { product: null }, record_entity: 'payment', recipient: 'event.person', category: 'payments',
      _note: 'payments 2.5.0: payment.approved { id, person, amount, product } once per payment. A product payment also gets invoice.issued, so it is answered by purchase_note instead: one email per approval.' })],
  }),
  email({
    key: 'payment_rejected', row: 'NT-02', sender: 'company_os',
    name: { es: 'Pago rechazado', en: 'Payment rejected' },
    trigger: { es: 'Recepción rechaza un pago (el comprobante de una reserva o la compra de un paquete)', en: 'Reception declines a payment (a booking’s receipt or a package purchase)' },
    subject: 'No pudimos confirmar tu pago',
    body: 'Hola {{person.name}}:\n\nRevisamos tu pago de {{event.amount}} COP y no pudimos confirmarlo.\n\nSi era para una reserva, ábrela en la app para ver si todavía puedes enviar un comprobante nuevo. Si crees que es un error, escríbenos.\n\nVer mis reservas: {{links.base}}/#/app',
    automations: [auto({ name: 'payment_rejected', event: 'payment.declined', filter: { from: 'pending' }, record_entity: 'payment', recipient: 'event.person', category: 'payments',
      _note: 'payments 2.7.0: payment.declined { id, person, amount, product, from, reason } once, when a pending payment (a booking receipt or a package) is declined. A payment the desk records already declined (a card refused at the counter), a void, a delete or a re-point sends nothing.' })],
  }),
  email({
    key: 'booking_released', row: 'NT-02', sender: 'company_os',
    name: { es: 'Reserva liberada', en: 'Booking released' },
    trigger: { es: 'Se acaba el tiempo para pagar una reserva retenida y el cupo se libera', en: 'A held booking’s time to pay runs out and the place is released' },
    subject: 'Liberamos tu cupo de la clase del {{record.start|date}}',
    body: 'Hola {{person.name}}:\n\nTu reserva de la clase del {{record.start|datetime}} no quedó confirmada con un pago a tiempo, así que liberamos el cupo para otra persona.\n\nSi ya pagaste o crees que es un error, escríbenos. Si todavía quieres venir, revisa si quedan cupos y reserva de nuevo.\n\nVer horario: {{links.base}}/#/app/schedule',
    automations: [auto({ name: 'booking_released', event: 'booking.hold_released', record_entity: 'booking', recipient: 'event.person', category: 'bookings',
      _note: 'bookings 1.2.0: booking.hold_released { id, occurrence, person, hold_until } (the job, or the next write that reads the class).' })],
  }),
  email({
    key: 'booking_moved', row: 'NT-02', sender: 'company_os',
    name: { es: 'Reserva cambiada', en: 'Booking moved' },
    trigger: { es: 'Una reserva pasa a otra clase', en: 'A booking moves to another class' },
    subject: 'Tu reserva cambió: ahora es el {{record.start|date}}',
    body: 'Hola {{person.name}}:\n\nTu reserva ahora es para la clase del {{record.start|datetime}}. El cupo anterior quedó libre.\n\nVer mis reservas: {{links.base}}/#/app',
    automations: [auto({ name: 'booking_moved', event: 'booking.moved', record_entity: 'booking', recipient: 'event.person', category: 'bookings',
      _note: 'bookings 1.4.0: booking.moved { id, person, from, to }; the booking keeps its id, its start follows the new class.' })],
  }),
  email({
    key: 'class_cancelled', row: 'NT-02', sender: 'company_os',
    name: { es: 'Clase cancelada por el estudio', en: 'Class cancelled by the studio' },
    trigger: { es: 'El estudio cancela una clase con reservas', en: 'The studio cancels a class that has bookings' },
    subject: 'Cancelamos la clase del {{record.start|date}}',
    body: 'Hola {{person.name}}:\n\nTuvimos que cancelar la clase del {{record.start|datetime}}. Lo sentimos.\n\nSi la reservaste con una clase de tu paquete, la clase vuelve a tu paquete. Si la pagaste aparte, te escribimos para reprogramarla.\n\nVer horario: {{links.base}}/#/app/schedule',
    automations: [auto({ name: 'class_cancelled', event: 'booking.cancelled_by_studio', record_entity: 'booking', recipient: 'event.person', category: 'bookings',
      _note: 'bookings 1.5.0: booking.cancelled_by_studio { id, occurrence, person } for each active booking a studio cancel cancels.' })],
  }),
  email({
    key: 'voucher_received', row: 'NT-02', sender: 'company_os',
    name: { es: 'Bono recibido', en: 'Voucher received' },
    trigger: { es: 'Se crea un bono de regalo o de cortesía con el correo de quien lo recibe', en: 'A gift or courtesy voucher is created with the recipient’s email' },
    subject: 'Tienes un bono de clases en {brand}',
    body: 'Hola:\n\nTienes un bono de clases para usar en {brand} (clases incluidas: {{record.classes}}).\n\nTu código: {{record.code}}\nVálido hasta: {{record.valid_until|date}}\n\nPara usarlo, entra a la app (o crea tu cuenta con este correo) y canjea el código; las clases quedan en tu cuenta. También puedes presentarlo en recepción.\n\nCanjear el bono: {{links.base}}/#/app/vouchers/{{record.code}}',
    automations: [
      auto({ name: 'voucher_received_gift', event: 'voucher.created', filter: { kind: 'gift' }, record_entity: 'voucher', recipient_email: 'record.recipient_email', category: 'gifts',
        _note: 'credits 1.1.0: voucher.created { id, kind, classes, valid_until, recipient_email, recipient_name, buyer }; the code is read from the record.' }),
      auto({ name: 'voucher_received_courtesy', event: 'voucher.created', filter: { kind: 'courtesy' }, record_entity: 'voucher', recipient_email: 'record.recipient_email', category: 'gifts',
        _note: 'A courtesy voucher without a recipient email is logged skipped (recipient_missing); the desk hands the code over.' }),
    ],
  }),
  email({
    key: 'gift_sent', row: 'NT-02', sender: 'company_os',
    name: { es: 'Regalo enviado (a quien lo compró)', en: 'Gift sent (to the buyer)' },
    trigger: { es: 'Se crea el bono de un regalo que alguien compró', en: 'The voucher for a gift someone bought is created' },
    subject: 'Tu regalo ya fue enviado',
    body: 'Hola {{person.name}}:\n\nTu regalo para {{record.recipient_name}} ya fue enviado a {{record.recipient_email}} (clases incluidas: {{record.classes}}).\n\nTe avisamos cuando lo use.',
    automations: [auto({ name: 'gift_sent_buyer', event: 'voucher.created', filter: { kind: 'gift' }, record_entity: 'voucher', recipient: 'record.buyer', category: 'gifts',
      _note: 'BO-06. A gift voucher with no buyer (sold at the desk without one) is logged skipped (recipient_missing).' })],
  }),
  email({
    key: 'gift_used', row: 'NT-02', sender: 'company_os',
    name: { es: 'Regalo usado (a quien lo compró)', en: 'Gift used (to the buyer)' },
    trigger: { es: 'Quien recibió el regalo canjea el bono', en: 'The recipient redeems the gift voucher' },
    subject: '{{record.recipient_name}} ya usó tu regalo',
    body: 'Hola {{person.name}}:\n\n{{record.recipient_name}} ya usó el regalo que le diste (clases incluidas: {{record.classes}}). ¡Gracias por compartir {brand}!',
    automations: [auto({ name: 'gift_used_buyer', event: 'voucher.redeemed', filter: { source: 'gift' }, record_entity: 'voucher', record_key: 'voucher', recipient: 'record.buyer', category: 'gifts',
      _note: 'BO-06. credits 1.1.0: voucher.redeemed { voucher, lot, person, source, classes } per redemption; a gift has max_uses 1, so it fires once.' })],
  }),
  email({
    key: 'purchase_note', row: 'NT-02', sender: 'company_os',
    name: { es: 'Nota de compra', en: 'Purchase note' },
    trigger: { es: 'Se aprueba el pago de un producto y Company OS emite la Nota de compra', en: 'A product payment is approved and Company OS issues the purchase note' },
    subject: 'Tu Nota de compra n.º {{record.number}} · {brand}',
    body: 'Hola {{person.name}}:\n\nConfirmamos tu pago. Esta es tu Nota de compra.\n\nNota de compra n.º {{record.number}}\nFecha: {{record.issued_at|date}}\nTotal: {{record.total}} COP\n\nNo es una factura electrónica. En la app ves el estado de tus reservas y tus clases.\n\nVer mi historial: {{links.base}}/#/app/history',
    automations: [auto({ name: 'purchase_note', event: 'invoice.issued', filter: { kind: 'receipt' }, record_entity: 'invoice', recipient: 'record.person', category: 'payments',
      _note: 'payments 2.6.0: invoice.issued { id, kind, number, payment, product, total }; Hoy issues receipts (payment_document: receipt, no VAT, J9).' })],
  }),
  email({
    key: 'receipt_uploaded_team', row: 'NT-03', sender: 'company_os',
    name: { es: 'Comprobante nuevo (a recepción y administración)', en: 'New receipt (to the front desk and administration)' },
    trigger: { es: 'Un cliente sube un comprobante de pago', en: 'A customer uploads a payment receipt' },
    subject: 'Comprobante nuevo por revisar',
    body: 'Hola:\n\nUn cliente subió un comprobante de pago. Revísalo en la cola de pagos para confirmar o rechazar el pago.\n\nAbrir la cola: {{links.base}}/#/staff/transfers',
    automations: [],
    blocked: {
      automations: [
        auto({ name: 'receipt_uploaded_front_desk', event: 'file.confirmed', filter: { kind: 'receipt' }, record_entity: 'file', record_key: 'fileId', recipient_email: '<front desk inbox>', category: 'team',
          _note: 'files 1.1.0: file.confirmed { fileId, kind, published } once the upload is confirmed; payments declares kind receipt on payment.' }),
        auto({ name: 'receipt_uploaded_admin', event: 'file.confirmed', filter: { kind: 'receipt' }, record_entity: 'file', record_key: 'fileId', recipient_email: '<administration inbox>', category: 'team' }),
      ],
      blockers: [
        { summary: { es: 'Falta definir los buzones de recepción y administración (Jas).', en: 'The front desk and administration inboxes are still to be decided (Jas).' },
          gap: 'Which inboxes receive it (J6, PC-03). comms 1.6.0 sends to a literal address listed in the setting fixed_recipients.',
          needs: 'Jas: the front desk and administration addresses, on the verified sender domain; then list them in comms fixed_recipients and load these automations with those addresses.' },
      ],
    },
  }),
];

/** Every Company OS path a template may use, by root; record fields per `record_entity` (the modules named above). */
export const RECORD_FIELDS: Record<string, string[]> = {
  booking: ['id', 'occurrence', 'person', 'spot', 'entitlement', 'source', 'status', 'start', 'end', 'title', 'hold_until', 'payment_method'],
  payment: ['id', 'person', 'amount', 'status', 'product', 'method', 'for_entity', 'for_id'],
  invoice: ['id', 'kind', 'number', 'payment', 'person', 'product', 'subtotal', 'tax', 'total', 'issued_at'],
  voucher: ['id', 'kind', 'code', 'classes', 'valid_until', 'max_uses', 'recipient_email', 'recipient_name', 'buyer', 'product'],
  file: ['id', 'owner_entity', 'owner_id', 'kind'],
};

/** The details each audit event carries (Company OS integration guide), for path checks. */
export const EVENT_DETAILS: Record<string, string[]> = {
  'user.signed_up': ['userId', 'personId', 'facetId', 'role', 'linkedExisting', 'email'],
  'booking.hold_frozen': ['id', 'payment'],
  'booking.hold_resumed': ['id', 'payment', 'hold_until'],
  'booking.hold_released': ['id', 'occurrence', 'person', 'hold_until'],
  'booking.moved': ['id', 'person', 'from', 'to'],
  'booking.cancelled_by_studio': ['id', 'occurrence', 'person'],
  'payment.approved': ['id', 'person', 'amount', 'product'],
  'payment.declined': ['id', 'person', 'amount', 'product', 'from', 'reason'],
  'voucher.redeemed': ['voucher', 'lot', 'person', 'source', 'classes'],
  'invoice.issued': ['id', 'kind', 'number', 'payment', 'product', 'total'],
  'voucher.created': ['id', 'kind', 'classes', 'valid_until', 'recipient_email', 'recipient_name', 'buyer'],
  'file.confirmed': ['fileId', 'kind', 'published'],
};

/** The app's values for `{brand}` and `{contact_email}` (tenant config; the brand and the address are pending with Jas, J5). */
export const launchBrand = () => ({ brand: tenant.name, contact_email: tenant.contact.email });

/** Fills `{brand}` / `{contact_email}`; Company OS `{{…}}` placeholders are left for the server. */
export function fillBrand(text: string, brand = launchBrand()): string {
  return text.replace(/\{(brand|contact_email)\}/g, (_, k: 'brand' | 'contact_email') => brand[k]);
}

/** Renders `{{path}}` / `{{path|filter}}` from sample values, for the admin preview only (never sent). */
export function renderSample(text: string, sample: Record<string, string>): string {
  return fillBrand(text).replace(/\{\{\s*([\w.]+)(?:\|(\w+))?\s*\}\}/g, (_, path: string) => sample[path] ?? '');
}

/** Fictional values for the preview: a Spanish-speaking customer and a class on a launch-week evening. */
export const LAUNCH_SAMPLE: Record<string, string> = {
  'person.name': 'Valentina', 'links.base': '…', 'otp_code': '482 913',
  'record.start': 'martes 3 de noviembre, 6:00 p. m.', 'event.hold_until': 'martes 3 de noviembre, 8:15 a. m.',
  'event.amount': '38000', 'record.number': '1042', 'record.issued_at': '3 de noviembre de 2026', 'record.total': '38000',
  'record.recipient_name': 'Juliana', 'record.classes': '4', 'record.code': 'K7M2QX9A', 'record.valid_until': '31 de enero de 2027',
};
