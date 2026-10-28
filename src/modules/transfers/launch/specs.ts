import { defineSpec } from '../../../specs/define';

export const pendingPaymentsSpec = defineSpec({
  code: 'S-09', name: { es: 'Pagos por confirmar', en: 'Payments to confirm' },
  purpose: { es: 'Confirmar o rechazar transferencias, cobrar en recepción y vender en recepción.', en: 'Confirm or reject transfers, take desk payments and sell at the desk.' },
  roles: ['super_admin', 'admin', 'front_desk'], layout: ['Pending list', 'Review drawer', 'Desk payment drawer'],
  data: ['payments', 'transfer_receipts', 'bookings', 'plans', 'profiles'],
  logic: ['PG-05: pending payments (with receipt image) and held desk bookings in one list, soonest deadline first; polls every 20 s.', 'PG-04: approve with the amount received; a different amount needs a new reason (amount_mismatch override). Decline with a reason. ifMatch status=pending.', 'PG-07: the desk records cash / card terminal / transfer as approved; the desk user is createdBy.', 'PR-05: the Santa María pack shows and sets the member price_audience.', 'PG-09: every write is one /batch with an Idempotency-Key reused on retry.'],
  integrations: ['Company OS payments 2.6.0, bookings 1.4.0, files 1.1.0, people'],
  states: ['loading', 'read error with retry', 'empty', 'list', 'reviewing', 'receipt unavailable', 'refused with code copy', 'saved'],
});
export const transferPaySpec = defineSpec({
  code: 'C-40', name: { es: 'Pagar por transferencia', en: 'Pay by transfer' },
  purpose: { es: 'Mostrar valor, cuenta, QR y llave Bre-B, y subir el comprobante.', en: 'Show the amount, account, QR and Bre-B key, and upload the receipt.' },
  roles: ['customer'], layout: ['Amount due', 'Hold notice', 'Bank details', 'Receipt upload'],
  data: ['payments', 'transfer_receipts', 'bookings', 'plans'],
  logic: ['PG-01: amount = the product row in force today; the customer types it in their bank app.', 'PG-02: PNG/JPG up to 10 MB, checked by type, size and first bytes; pending payment first (one keyed batch), then files upload + confirm. A retry after the payment exists only re-sends the image.', 'Bookings 1.4.0 freezes the hold while the payment is pending.'],
  integrations: ['Company OS payments, files; Settings AD-05 for bank details'], states: ['loading', 'error', 'not found', 'private class', 'affiliate unverified', 'already pending', 'sending', 'partial (payment saved, image missing)', 'sent'],
});
export const paymentsReportSpec = defineSpec({
  code: 'M-21', name: { es: 'Reporte de pagos confirmados', en: 'Confirmed payments report' },
  purpose: { es: 'Descargar los pagos confirmados por rango de fechas en CSV.', en: 'Download confirmed payments by date range as CSV.' },
  roles: ['super_admin', 'admin', 'finance'], layout: ['Date range', 'Summary', 'Table', 'CSV'], data: ['payments', 'invoices', 'plans', 'profiles'],
  logic: ['PG-10: approved payments whose date is in the inclusive range; method, product, Nota de compra number, recorder (createdBy) and confirmer (server-set approved_by, payments 2.7.0).', 'CSV cells are formula-neutralised (reportCsv).'],
  integrations: ['Company OS payments'], states: ['loading', 'error', 'inverted range', 'empty', 'ready'],
});
