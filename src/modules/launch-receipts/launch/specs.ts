import { defineSpec } from '../../../specs/define';

export const receiptSpec = defineSpec({
  code: 'C-41', name: { es: 'Nota de compra', en: 'Purchase note' },
  purpose: { es: 'Mostrar e imprimir la nota de compra (sin IVA) que Company OS emite al confirmar un pago.', en: 'Show and print the purchase note (no VAT) Company OS issues when a payment is confirmed.' },
  roles: ['customer', 'super_admin', 'admin', 'front_desk'], layout: ['Header', 'Nota de compra'], data: ['payments', 'invoices'],
  logic: ['PG-08 / J9: payments payment_document = receipt; the server numbers it on approval. The browser never numbers or re-totals.', 'The email copy is a comms automation on payment.approved (H-9).', 'Recorder name only on the staff view (the members list is staff information).'],
  integrations: ['Company OS payments 2.6.0 (invoice kind receipt)'], states: ['loading', 'read error with retry', 'pending payment', 'receipt not yet issued', 'issued'],
});
export const myReceiptsSpec = defineSpec({
  code: 'C-42', name: { es: 'Mis notas de compra', en: 'My purchase notes' },
  purpose: { es: 'Listar los pagos propios con su estado y su nota de compra.', en: 'List your own payments with their status and purchase note.' },
  roles: ['customer'], layout: ['Payments list'], data: ['payments'],
  logic: ['Row policies limit the query to the caller\'s own payments.'], integrations: ['Company OS payments'], states: ['loading', 'error', 'empty', 'list'],
});
