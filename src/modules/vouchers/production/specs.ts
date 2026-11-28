import type { PageSpec } from '../../../specs/types';

/** H-6 production specs: Company OS credits vouchers, no browser voucher rules and none of the review build's extras. */
const base = {
  data: ['vouchers', 'credit_lots', 'plans', 'payments'],
  integrations: ['Company OS credits (voucher, credit_lot)', 'Company OS payments (gift product, transfer approval)', 'Company OS comms automations (voucher.created, voucher.redeemed)'],
};
export const redeemSpec: PageSpec = {
  ...base, code: 'C-28', name: { es: 'Canjear bono', en: 'Redeem a voucher' },
  purpose: { es: 'Abrir el enlace del correo, entrar o registrarse y sumar las clases del bono al saldo.', en: "Open the emailed link, sign in or sign up, and add the voucher's classes to the balance." },
  roles: ['super_admin', 'customer'], layout: ['redeem'],
  logic: ['A redemption is a credit_lot create with the person and the code; the server decides classes and expiry.', 'Refusals voucher_invalid, voucher_expired, voucher_used_up show their own copy; nothing is added.', 'One Idempotency-Key per submit, reused on retry.'],
  states: ['Code from link', 'Typed code', 'Invalid format', 'Redeeming', 'Added', 'Invalid', 'Expired', 'Used up', 'Error'],
};
export const giftSpec: PageSpec = {
  ...base, code: 'C-38', name: { es: 'Regalar clases', en: 'Give classes as a gift' },
  purpose: { es: 'Elegir un regalo de clases, la persona que lo recibe y pagar por transferencia.', en: 'Choose a class gift and its recipient, then pay by bank transfer.' },
  roles: ['super_admin', 'customer'], layout: ['product', 'recipient', 'pay'],
  logic: ['Gift products are product kind gift; an approved gift payment issues no lot.', "The recipient travels on the pending payment's notes; the desk issues the voucher after approval."],
  states: ['No gift for sale', 'Choosing', 'Invalid recipient', 'To payment'],
};
export const studioSpec: PageSpec = {
  ...base, code: 'M-13', name: { es: 'Invitaciones y bonos', en: 'Invitations and vouchers' },
  purpose: { es: 'Crear cortesías con clases, vencimiento y límite de usos; emitir los regalos pagados; ver usos.', en: 'Create courtesies with classes, expiry and usage limit; issue paid gifts; follow their use.' },
  roles: ['super_admin', 'admin'], layout: ['courtesy', 'gifts', 'list'],
  logic: ['The voucher create sends the email with the link (comms automation on voucher.created).', 'Only Company OS fields: kind, classes, valid_until, max_uses, recipient.'],
  states: ['Empty', 'Invalid form', 'Sending', 'Sent', 'Gift to issue', 'Available', 'Used', 'Expired', 'Refused'],
};
export const deskSpec: PageSpec = {
  ...studioSpec, code: 'S-08', name: { es: 'Recepción · bonos de regalo', en: 'Front desk · gift vouchers' },
  purpose: { es: 'Emitir el bono de un regalo pagado y ver los bonos emitidos.', en: 'Issue the voucher of a paid gift and see issued vouchers.' },
  roles: ['super_admin', 'admin', 'coordinator', 'front_desk'], layout: ['gifts', 'list'],
};
export const teacherCodesSpec: PageSpec = {
  ...base, code: 'M-14', name: { es: 'Códigos de profesores', en: 'Teacher codes' },
  purpose: { es: 'Crear códigos de clases gratis para cada profesor, compartir su enlace y ver cuántas personas los canjearon y cuántas compraron después.', en: 'Create free-class codes for each teacher, share their link, and see how many people redeemed them and how many bought afterwards.' },
  roles: ['super_admin', 'admin'], layout: ['create', 'codes', 'funnel'],
  logic: ['A code is a courtesy voucher with a coach and first_time_only; it has no recipient, so no email goes out.', 'Only people new to Hoy can redeem it (voucher_first_time_only).', 'Bought later: an approved payment by the person dated after their redemption, any product.'],
  states: ['Empty', 'Invalid form', 'Creating', 'Created', 'Refused', 'Copied', 'Funnel loading', 'Funnel failed'],
};
/** ADR 0045 · the group pass: one code from an approved group purchase books one class for its group. */
const groupBase = {
  data: ['vouchers', 'bookings', 'class_sessions'],
  integrations: ['Company OS credits (voucher kind group: code, places, joined, occurrence)', 'Company OS bookings (entitlement pass + pass_code; party stamps set by the server)'],
};
export const groupPassesSpec: PageSpec = {
  ...groupBase, code: 'C-43', name: { es: 'Mis pases grupales', en: 'My group passes' },
  purpose: { es: 'Ver los códigos de los pases grupales que compré, cuántos lugares tienen nombre y compartir el enlace con el grupo.', en: 'See the codes of the group passes I bought, how many places have a name, and share the link with the group.' },
  roles: ['super_admin', 'customer'], layout: ['list', 'share'],
  logic: ['A member reads only group vouchers whose buyer is their own person (recipe policy).', 'The link is /#/app/pass/<code>, with ?c=<class> once the class is booked.', 'The clipboard write runs in the click handler; a refusal says so and the link stays selectable.'],
  states: ['Loading', 'Read failed', 'Empty', 'Unused', 'Used', 'Expired', 'Voided', 'Copied', 'Copy failed'],
};
export const passJoinSpec: PageSpec = {
  ...groupBase, code: 'C-44', name: { es: 'Usar un pase grupal', en: 'Use a group pass' },
  purpose: { es: 'Con el código, reservar la clase para el grupo (primer uso) o tomar mi lugar en la clase ya reservada.', en: 'With the code, book the class for the group (first use) or take my place in the class already booked.' },
  roles: ['super_admin', 'customer'], layout: ['class', 'book', 'share'],
  logic: ['A place is a booking of my own person with entitlement pass and pass_code; Company OS decides the class, the room for the group and the places left.', 'One Idempotency-Key per submit, reused on retry.', 'Refusals pass_unresolved, pass_class_only, group_does_not_fit, party_full, voucher_wrong_kind, pass_occurrence_mismatch and the reused voucher and booking codes show their own copy.'],
  states: ['Bad code', 'Pick a class', 'No class with room', 'Class from the link', 'Booking', 'Booked', 'Refused', 'Outcome unknown'],
};
