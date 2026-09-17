import { canvasSpecs } from '../../specs/canvasSpecs';
import { defineSpec } from '../../specs/define';

export const M01 = defineSpec({
  ...canvasSpecs['M-01'],
  layout: ['KPIRow ×4', 'OccupancyChart', 'TodayAtAGlance', 'AuditTrail'],
  data: ['memberships', 'payments', 'class_sessions', 'bookings', 'modalities', 'teachers', 'audit_log', 'users', 'profiles'],
  notes: [...(canvasSpecs['M-01'].notes ?? []), 'Sections are reorderable through useLayout (layout editor D-04).', 'The feature switches moved to M-08b (/admin/settings/features) in 0.5.0; the dashboard no longer writes feature_flags.', 'TodayAtAGlance lists today\'s sessions with occupancy and who is already in the room (bookings.checked_in).'],
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

/**
 * M-08 is now a group of five sub-pages behind one sub-navigation (0.5.0). M-08 keeps the family spec and
 * routes to General; M-08a…M-08e are the leaves. Every group saves one `tenants.settings` section and
 * writes audit_log settings.update with before/after.
 */
export const M08 = defineSpec({
  ...canvasSpecs['M-08'],
  layout: ['SettingsSubNav', 'General (M-08a)', 'Features (M-08b)', 'Payments (M-08c)', 'Communications (M-08d)', 'Branding (M-08e)'],
  data: ['tenants', 'feature_flags', 'rooms', 'audit_log'],
  notes: [...(canvasSpecs['M-08'].notes ?? []), 'Stored in tenants.settings (json) via useSettings(); defaults from src/tenant/tenant.ts.', 'S-02 reads lateGraceMin, S-04 reads tax, M-05 reads quietHours.', 'usePolicy() (src/modules/admin/settings.ts) re-renders consumers when a section is saved.'],
});

const sub = (code: string, name: { es: string; en: string }, purpose: { es: string; en: string }, layout: string[], extra: Partial<typeof M08> = {}) => defineSpec({
  ...M08, code, name, purpose, layout,
  notes: [...(M08.notes ?? []), 'Sub-page of M-08; the sub-navigation is shared by all five.'],
  ...extra,
});

export const M08a = sub('M-08a',
  { es: 'Ajustes · General', en: 'Settings · General' },
  { es: 'Identidad de contacto, horario de apertura, aforo y políticas: los números que todas las demás pantallas leen.', en: 'Contact identity, opening hours, capacity and policies: the numbers every other screen reads.' },
  ['SettingsSubNav', 'StudioProfile', 'OpeningHours', 'Capacity', 'Policies', 'Integrations'],
);
export const M08b = sub('M-08b',
  { es: 'Ajustes · Funciones', en: 'Settings · Features' },
  { es: 'Interruptores de funciones del estudio y de página (feature_flags), con escritura auditada. Vivían en el panel M-01 hasta 0.5.0.', en: 'Studio and per-page feature switches (feature_flags) with audited writes. They lived on the M-01 dashboard until 0.5.0.' },
  ['SettingsSubNav', 'StudioFeatures', 'FeatureFlagsByPage'],
  { logic: ['features.write gates every switch; without it the toggles render disabled.', 'A-06 and E-04 flags are locked: the demo needs them on.', 'Each flip writes audit_log flag.toggle with before/after.'], states: ['Loading', 'Read-only (sin features.write)', 'Flag bloqueado', 'Guardado'] },
);
export const M08c = sub('M-08c',
  { es: 'Ajustes · Pagos', en: 'Settings · Payments' },
  { es: 'Cuenta de consignación, NIT, IVA y resolución DIAN, y el entorno de Wompi. Las llaves secretas nunca se guardan aquí.', en: 'Payout account, NIT, IVA and DIAN resolution, and the Wompi environment. Secret keys are never stored here.' },
  ['SettingsSubNav', 'PayoutAccount', 'WompiEnvironment + SecretNotice', 'FiscalIdentity (NIT)', 'TaxAndInvoicing'],
  { integrations: ['Wompi', 'DIAN e-invoicing'], notes: [...(M08.notes ?? []), 'Sub-page of M-08.', 'Wompi private keys live in server environment variables, never in tenants.settings nor in the browser.'] },
);
export const M08d = sub('M-08d',
  { es: 'Ajustes · Comunicaciones', en: 'Settings · Communications' },
  { es: 'Horas de silencio y nombres de remitente de WhatsApp y email, que M-04 y M-05 usan al enviar.', en: 'Quiet hours and the WhatsApp and email sender names M-04 and M-05 use when sending.' },
  ['SettingsSubNav', 'QuietHours', 'SenderIdentity'],
  { integrations: ['WhatsApp Cloud API', 'Email'] },
);
export const M08e = sub('M-08e',
  { es: 'Ajustes · Marca', en: 'Settings · Branding' },
  { es: 'Nombre visible del estudio, variante del wordmark e idioma por defecto; la vista previa usa el wordmark real.', en: 'Studio display name, wordmark variant and default language; the preview uses the real wordmark.' },
  ['SettingsSubNav', 'DisplayName', 'WordmarkVariant', 'DefaultLanguage', 'Preview'],
  { notes: [...(M08.notes ?? []), 'Sub-page of M-08.', 'Empty display name falls back to src/tenant/tenant.ts; nothing is hardcoded per studio.'] },
);

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
