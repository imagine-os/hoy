import { canvasSpecs } from '../../specs/canvasSpecs';
import { defineSpec } from '../../specs/define';

export const M01 = defineSpec({
  ...canvasSpecs['M-01'],
  layout: ['KPIRow ×4', 'OccupancyChart', 'FeatureTable', 'AuditTrail'],
  data: ['memberships', 'payments', 'class_sessions', 'bookings', 'feature_flags', 'audit_log', 'users', 'profiles'],
  notes: [...(canvasSpecs['M-01'].notes ?? []), 'Sections are reorderable through useLayout (layout editor D-04).', 'Flag toggles write audit_log flag.toggle with before/after.'],
});

export const M02 = defineSpec({
  ...canvasSpecs['M-02'],
  layout: ['EntityTabs (Classes / Teachers / Modalities / Rooms)', 'ListView (DataTable, search, publish toggle)', 'EditDrawer (fields, ES / EN, publish state)', 'PreviewPane'],
  data: ['class_templates', 'teachers', 'modalities', 'rooms', 'audit_log'],
  notes: [...(canvasSpecs['M-02'].notes ?? []), 'Pricing is not editable here: prices live in src/tenant/pricing.ts (P-01).', 'Publish state = the active column of each table.'],
});

export const M04 = defineSpec({
  ...canvasSpecs['M-04'],
  layout: ['TemplateList (trigger, locale, status)', 'Canvas (EmailPreview)', 'VariablePanel + Editor', 'LocaleSwitch ES / EN', 'Versions + TestSend + SendLog'],
  data: ['email_templates', 'message_log', 'audit_log'],
  notes: [...(canvasSpecs['M-04'].notes ?? []), 'body_mjml stores a JSON {es,en} plain-text body until the MJML designer exists.', 'Versions are the audit_log rows of the template; rollback restores the before value.', 'Test send writes message_log with payload.test = true.'],
});

export const M05 = defineSpec({
  ...canvasSpecs['M-05'],
  layout: ['AutomationList (trigger → template → delay)', 'PhonePreview (bubble render)', 'TemplateEditor + variables', 'ApprovalStatus (Meta) + QuietHours + OptIn', 'MessageLog'],
  data: ['automations', 'wa_templates', 'message_log', 'profiles', 'users', 'tenants', 'audit_log'],
  notes: [...(canvasSpecs['M-05'].notes ?? []), 'Quiet hours come from M-08 settings (default 21:00–07:00).', 'An automation cannot be enabled while its template is not approved by Meta.'],
});

export const M06 = defineSpec({
  ...canvasSpecs['M-06'],
  layout: ['SegmentRail (all, at risk, new, no membership, birthdays)', 'MemberList (search, sort)', 'MemberDetail (IdentityHeader, MetricRow, Tabs, Timeline, NoteComposer)'],
  data: ['users', 'profiles', 'memberships', 'plans', 'bookings', 'class_sessions', 'payments', 'credits', 'message_log', 'consents', 'audit_log'],
  notes: [...(canvasSpecs['M-06'].notes ?? []), 'At risk = member with plan or credits and no check-in in 21 days.', 'Staff notes are audit_log rows (member.note) — internal, never visible to the member.', 'Opening a record writes member.view to audit_log (Ley 1581).'],
});

export const M07 = defineSpec({
  ...canvasSpecs['M-07'],
  layout: ['FilterBar (range, actor, entity, action)', 'SortableTable (When · Who · Action · Object · Source)', 'DetailDrawer (before / after)', 'ExportButton (CSV)', 'RetentionNotice'],
  data: ['audit_log', 'users', 'profiles', 'user_roles'],
  notes: [...(canvasSpecs['M-07'].notes ?? []), 'Append-only: the page has no write path.'],
});

export const M08 = defineSpec({
  ...canvasSpecs['M-08'],
  layout: ['SectionRail', 'StudioProfile', 'OpeningHours', 'Capacity', 'Policies', 'QuietHours', 'TaxAndInvoicing', 'FeatureFlags', 'Integrations'],
  data: ['tenants', 'feature_flags', 'rooms', 'audit_log'],
  notes: [...(canvasSpecs['M-08'].notes ?? []), 'Stored in tenants.settings (json) via useSettings(); defaults from src/tenant/tenant.ts.', 'S-02 reads lateGraceMin, S-04 reads tax, M-05 reads quietHours.'],
});

/** New code: finance view (revenue, payouts, refunds, invoices). */
export const M09 = defineSpec({
  code: 'M-09',
  name: { es: 'Finanzas', en: 'Finance' },
  purpose: { es: 'Ingresos por producto y método, pagos pendientes, reembolsos, facturas con referencia DIAN y el marcador de payouts de Wompi.', en: 'Revenue by product and method, pending payments, refunds, invoices with the DIAN reference and the Wompi payouts placeholder.' },
  layout: ['KPIRow', 'RevenueByProduct', 'RevenueByMethod', 'PayoutsPlaceholder (Wompi)', 'RefundsList', 'InvoicesTable (DIAN)'],
  data: ['payments', 'invoices', 'plans', 'users', 'profiles', 'audit_log', 'tenants'],
  roles: ['super_admin', 'admin', 'finance'],
  logic: ['Revenue = approved payments in the selected range grouped by plan and by method.', 'Refund flips payments.status to refunded and writes audit_log payment.refund; the credit return is a follow-up.', 'E-invoicing requires a DIAN resolution in M-08; until then the CUFE column shows —.'],
  integrations: ['Wompi', 'DIAN e-invoicing'],
  states: ['Loading', 'Empty range', 'No refund permission: action hidden', 'E-invoicing off: notice'],
  toggles: [{ label: 'Wompi payouts', on: false }, { label: 'Refunds', on: true }, { label: 'DIAN column', on: true }],
  notes: ['Placeholder payouts until the Wompi integration lands.'],
});
