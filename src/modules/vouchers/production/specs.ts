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
