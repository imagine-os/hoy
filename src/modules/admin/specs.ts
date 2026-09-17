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
  layout: ['ContentSubNav (Catálogo · Artículos · FAQ · Eventos · Medios)', 'EntityTabs (Classes / Teachers / Modalities / Rooms)', 'ListView (DataTable, search, publish toggle)', 'EditDrawer (fields, ES / EN, publish state)', 'PreviewPane'],
  data: ['class_templates', 'teachers', 'modalities', 'rooms', 'audit_log'],
  notes: [...(canvasSpecs['M-02'].notes ?? []), 'Pricing is not editable here: prices live in src/tenant/pricing.ts (P-01).', 'Publish state = the active column of each table.', 'M-02 is now a family: this page is the catalogue (the four scheduling entities); M-02a…M-02d are articles, FAQ, events and the media library, behind one shared sub-navigation.'],
});

/** M-02 family leaf. Each one keeps M-02's purpose and adds its own layout, data and rules. */
const contentSub = (code: string, name: { es: string; en: string }, purpose: { es: string; en: string }, layout: string[], extra: Partial<typeof M02> = {}) => defineSpec({
  ...canvasSpecs['M-02'], code, name, purpose, layout,
  roles: ['super_admin', 'admin', 'coordinator'],
  notes: [...(canvasSpecs['M-02'].notes ?? []), 'Sub-page of M-02; the sub-navigation is shared by all five.', 'Every write appends an audit_log row through useAudit(\'admin\').'],
  ...extra,
});

export const M02a = contentSub('M-02a',
  { es: 'Contenido · Artículos', en: 'Content · Articles' },
  { es: 'Editor de `content_articles`: título y cuerpo bilingües en markdown con vista previa en vivo, slug, categoría, publicación programada y “publicar ahora”.', en: 'Editor for `content_articles`: bilingual title and markdown body with a live preview, slug, category, scheduled publication and “publish now”.' },
  ['ContentSubNav', 'StatusFilter (todos / publicado / programado / borrador)', 'ArticleTable (título + slug, categoría, estado, fecha, orden)', 'EditDrawer', 'MarkdownEditor ES/EN + preview', 'ScheduleFields (publish_at, sort)', 'PublishNow / Unpublish'],
  {
    data: ['content_articles', 'audit_log'],
    logic: [
      'Status is derived, not stored: published = false is a draft; published = true with a future publish_at is scheduled; otherwise it is live.',
      '“Publish now” sets published = true and clears publish_at in one write, so a scheduled row can be pushed live early.',
      'Slug is lowercase a–z, digits and hyphens; C-13 and C-14/C-15 read the rows by section and sort.',
    ],
    states: ['Loading', 'Empty (no articles)', 'Filter with no matches', 'Draft / scheduled / published', 'Invalid slug', 'Read-only (sin content.write)', 'Unsaved changes'],
    integrations: [],
  },
);

export const M02b = contentSub('M-02b',
  { es: 'Contenido · Preguntas frecuentes', en: 'Content · FAQ' },
  { es: 'Editor de `faq_entries` por secciones: pregunta y respuesta bilingües, orden con ↑/↓, página 1 o 2 y estado de publicación.', en: 'Editor for `faq_entries` by section: bilingual question and answer, ↑/↓ ordering, page 1 or 2 and publish state.' },
  ['ContentSubNav', 'PageFilter (todas / 1 / 2)', 'SectionCard ×n', 'EntryRow (↑ ↓, pregunta, respuesta, publicado)', 'EditDrawer (Q/A, sección, página)', 'AddGroup / AddEntry'],
  {
    data: ['faq_entries', 'audit_log'],
    logic: [
      'Order is the `sort` column and moves one step at a time (↑/↓ swap the two sort values) — keyboard-reachable and impossible to do by accident, unlike drag-and-drop.',
      'group_title, group_lead and page belong to the section: saving them propagates to every sibling row of the same group_key.',
      'A new section is a new group_key with one unpublished entry; C-14 is page 1 and C-15 is page 2.',
    ],
    states: ['Loading', 'Empty', 'First / last entry (arrow disabled)', 'Unpublished entry', 'Read-only', 'New empty section'],
    integrations: [],
  },
);

export const M02c = contentSub('M-02c',
  { es: 'Contenido · Eventos', en: 'Content · Events' },
  { es: 'Publicador de `events`: crear y editar, publicar o despublicar, aforo, precio público y de socio, y las inscripciones ya recibidas.', en: 'Publisher for `events`: create and edit, publish or unpublish, capacity, public and member price, and the RSVPs already received.' },
  ['ContentSubNav', 'StatusFilter', 'EventTable (título, cuándo, inscritos / aforo, precios, estado)', 'EditDrawer (fechas, sala, anfitrión, aforo, precios)', 'Publish / Unpublish / Cancel'],
  {
    data: ['events', 'event_rsvps', 'rooms', 'teachers', 'audit_log'],
    logic: [
      'The RSVP count is event_rsvps rows with status going or attended, plus their guests — it is never stored on the event.',
      'Capacity cannot drop below the RSVPs already taken, and cannot exceed the studio mats (tenant.studio.mats).',
      'Publishing is the only thing that makes an event visible in C-23; cancelling keeps the row and its RSVPs for the refund conversation.',
      'A default price comes from src/tenant/pricing.ts (talleres); member_price_cop = 0 renders as “included”.',
    ],
    states: ['Loading', 'Empty', 'Draft / published / cancelled', 'Sold out (RSVPs = capacity)', 'Capacity below RSVPs: blocked', 'End before start: blocked', 'Delete blocked by RSVPs', 'Read-only'],
    integrations: ['Wompi'],
  },
);

export const M02d = contentSub('M-02d',
  { es: 'Contenido · Biblioteca de medios', en: 'Content · Media library' },
  { es: 'La lista de arte que el estudio debe: un cupo por lugar de la app y la web, con proporción, encargo y texto alternativo. Pegar una URL lo publica sin deploy.', en: 'The checklist of art the studio owes: one slot per place in the app and the site, with its ratio, brief and alt text. Pasting a URL publishes it with no deploy.' },
  ['ContentSubNav', 'ReadyKPIs (listas / pendientes / video)', 'StatusFilter', 'MediaGrid → MediaCard (marco con proporción, encargo, URL, alt)', 'MarkReady / MarkPending', 'AdvancedFields (slot_key, ratio, kind, credit, label, alt, brief)'],
  {
    data: ['media_assets', 'audit_log'],
    logic: [
      'slot_key is the contract between the table and the components: MediaPlaceholder({slotKey}) renders the URL when status = ready and a branded empty slot otherwise.',
      'A row can only be marked ready with a URL; marking it pending again hides the asset everywhere without deleting the record.',
      'The seed ships one pending row per known slot (class hero 16:9, teacher portrait 4:3, event 4:5, studio tour video 16:9, site hero 21:9, about 4:3, contact map), so the owner reads the page as a to-do list.',
      'HoyOS stores the URL, never the binary: uploads belong to Supabase Storage when it lands.',
    ],
    states: ['Loading', 'Empty', 'Pending slot (ratio + brief)', 'Ready photo', 'Ready video', 'Invalid URL', 'Read-only'],
    integrations: ['Supabase Storage'],
  },
);

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
const M08 = defineSpec({
  ...canvasSpecs['M-08'],
  layout: ['SettingsSubNav', 'General (M-08a)', 'Features (M-08b)', 'Payments (M-08c)', 'Communications (M-08d)', 'Branding (M-08e)', 'Content (M-08f)'],
  data: ['tenants', 'feature_flags', 'rooms', 'modalities', 'teachers', 'legal_documents', 'audit_log'],
  notes: [...(canvasSpecs['M-08'].notes ?? []), 'Stored in tenants.settings (json) via useSettings(); defaults from src/tenant/tenant.ts.', 'S-02 reads lateGraceMin, S-04 reads tax, M-05 reads quietHours.', 'usePolicy() (src/modules/admin/settings.ts) re-renders consumers when a section is saved.', '0018: the owner decisions of ROADMAP §E that are values, not code, live here — contact identity (M-08a), IVA-in-prices, payroll cadence and the teacher rate card (M-08c), public class naming, Respiración as its own class, map provider and which legal versions are published (M-08f).'],
});

const sub = (code: string, name: { es: string; en: string }, purpose: { es: string; en: string }, layout: string[], extra: Partial<typeof M08> = {}) => defineSpec({
  ...M08, code, name, purpose, layout,
  notes: [...(M08.notes ?? []), 'Sub-page of M-08; the sub-navigation is shared by all six.'],
  ...extra,
});

export const M08a = sub('M-08a',
  { es: 'Ajustes · General', en: 'Settings · General' },
  { es: 'Identidad de contacto (dirección, ciudad, WhatsApp, correo, Instagram, mapa) con su estado “pendiente”, horario de apertura, aforo y políticas: los números que todas las demás pantallas leen.', en: 'Contact identity (address, city, WhatsApp, email, Instagram, map) with its “pending” state, opening hours, capacity and policies: the numbers every other screen reads.' },
  ['SettingsSubNav', 'StudioProfile (contact + map + confirmed)', 'OpeningHours', 'Capacity', 'Policies', 'IntegrationsPointer (M-10)'],
  { logic: ['useContact() (src/modules/admin/settings.ts) is the one reader of address / city / WhatsApp / email / Instagram / map: M-08a first, src/tenant/tenant.ts as the default for every empty field. The site footer, W-06, MapSlot, the legal tokens, the email footer, the customer contact rows and the manual’s {{tenant:contact}} all read it.', 'Until “confirmed” is on, every consumer labels the values as pending (the tenant.ts placeholders were never presented as fact).'], states: ['Pending (default)', 'Confirmed', 'Saving', 'Read-only'] },
);
export const M08b = sub('M-08b',
  { es: 'Ajustes · Funciones', en: 'Settings · Features' },
  { es: 'Interruptores de funciones del estudio y de página (feature_flags), con escritura auditada. Vivían en el panel M-01 hasta 0.5.0.', en: 'Studio and per-page feature switches (feature_flags) with audited writes. They lived on the M-01 dashboard until 0.5.0.' },
  ['SettingsSubNav', 'StudioFeatures', 'FeatureFlagsByPage'],
  { logic: ['features.write gates every switch; without it the toggles render disabled.', 'A-06 and E-04 flags are locked: the demo needs them on.', 'Each flip writes audit_log flag.toggle with before/after.'], states: ['Loading', 'Read-only (sin features.write)', 'Flag bloqueado', 'Guardado'] },
);
export const M08c = sub('M-08c',
  { es: 'Ajustes · Pagos', en: 'Settings · Payments' },
  { es: 'Cuenta de consignación, NIT, IVA (incluido o no en los precios publicados) y resolución DIAN, el entorno de Wompi, y la nómina: cadencia mensual o quincenal, medio de pago, quién firma y la tarjeta de tarifas por modalidad y por profesor.', en: 'Payout account, NIT, IVA (included in published prices or not) and DIAN resolution, the Wompi environment, and payroll: monthly or biweekly cadence, payout method, who signs, and the rate card by modality and by teacher.' },
  ['SettingsSubNav', 'PayoutAccount', 'WompiEnvironment + SecretNotice', 'FiscalIdentity (NIT)', 'TaxAndInvoicing (pricesIncludeIva)', 'Payroll (cadence · payoutMethod · signedBy · withholding) + RateCard (byModality · byTeacher)'],
  { integrations: ['Wompi', 'DIAN e-invoicing'], data: ['tenants', 'modalities', 'teachers', 'audit_log'],
    logic: ['pricesIncludeIva drives splitTax() (S-04), OrderSummary (C-04) and the P-01 “¿Incluye IVA?” card.', 'cadence is programmed both ways: payrollCalc.periodsFor() returns one period per month or two (1–15, 16–end); M-09a generates one run per period, S-03 navigates by period, M-09’s default range follows it (30 d vs 15 d).', 'The rate card is resolved by payrollCalc.rateFor(): teacher override → modality rate → teachers.rate_per_class → 0. Editing a rate changes the S-03 estimate and the next draft; approved and paid runs keep their lines.', 'Every save writes audit_log settings.update with before/after.'],
    states: ['Monthly (default)', 'Biweekly', 'Rate row empty (falls through)', 'Saving', 'Read-only'],
    notes: [...(M08.notes ?? []), 'Sub-page of M-08.', 'Wompi private keys live in server environment variables, never in tenants.settings nor in the browser.'] },
);
export const M08d = sub('M-08d',
  { es: 'Ajustes · Comunicaciones', en: 'Settings · Communications' },
  { es: 'Horas de silencio y nombres de remitente de WhatsApp y email, que M-04 y M-05 usan al enviar.', en: 'Quiet hours and the WhatsApp and email sender names M-04 and M-05 use when sending.' },
  ['SettingsSubNav', 'QuietHours', 'SenderIdentity'],
  { integrations: ['WhatsApp Cloud API', 'Email'] },
);
export const M08f = sub('M-08f',
  { es: 'Ajustes · Contenido', en: 'Settings · Content' },
  { es: 'Decisiones de contenido del owner como ajustes: cómo se nombran las clases en público (disciplinas o movimientos), si Respiración es una clase propia o vive dentro de meditación, qué proveedor de mapa usa el sitio, y qué versiones legales están publicadas.', en: 'The owner’s content decisions as settings: how classes are named in public (disciplines or movements), whether Respiración is its own class or lives inside meditation, which map provider the site embeds, and which legal versions are published.' },
  ['SettingsSubNav', 'PublicNaming', 'BreathworkOwnClass', 'MapProvider + MapSlot preview', 'LegalVersions (publish toggle per version)'],
  { data: ['tenants', 'legal_documents', 'media_assets', 'audit_log'], integrations: ['Maps (OSM / Google embed)'],
    logic: ['publicNaming: classDisplay() titles a schedule row by the modality (disciplines) or by the movement with the modality next to the teacher (movements); C-03 and W-04 read it.', 'breathworkOwnClass: visibleModalities() hides the respiracion modality row from W-03, W-07, W-08 and the C-03 filter while it is off; W-08 then prints the “lives inside the guided classes” sentence.', 'mapProvider: MapSlot reads it when no prop is passed — none keeps the site offline-safe.', 'Publishing a legal version flips legal_documents.status and stamps published_at; A-06 shows the newest published version per kind. Each flip writes audit_log legal.publish / legal.unpublish.'],
    states: ['Disciplines (default)', 'Movements', 'Respiración hidden (default) / shown', 'Map none / osm / google', 'Legal: n of 7 published', 'Read-only'] },
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
  purpose: { es: 'Ingresos por producto y método, pagos pendientes, reembolsos, facturas con referencia DIAN y el resumen de la nómina de profesores.', en: 'Revenue by product and method, pending payments, refunds, invoices with the DIAN reference and the teacher-payroll roll-up.' },
  layout: ['KPIRow', 'BalanceCard (Ingresos − Nómina − Gastos = Balance, enlaces a M-09a y M-09c)', 'RevenueByProduct', 'RevenueByMethod', 'PayoutsSummary (M-09a: próxima, por aprobar, pagado en el trimestre)', 'PaymentsList + Refund', 'InvoicesTable (DIAN) + StatusFilter'],
  data: ['payments', 'invoices', 'plans', 'users', 'profiles', 'payroll_runs', 'payroll_lines', 'expenses', 'audit_log', 'tenants'],
  roles: ['super_admin', 'admin', 'finance'],
  logic: [
    'Revenue = approved payments in the selected range grouped by plan and by method.',
    'Refund flips payments.status to refunded and writes audit_log payment.refund; the credit return is a follow-up.',
    'E-invoicing requires a DIAN resolution in M-08; until then the CUFE column shows a badge instead.',
    'The invoice filter is the status of the payment behind the invoice (invoices carry no status of their own).',
    'Ranges are 7 / 15 / 30 / 90 days and all time: 15 days is there because Colombian studios settle biweekly, and it drives both the KPI tiles and the invoice table.',
    'The payouts tiles read payroll_runs: the draft total, the sum of approved-not-yet-paid runs, and runs paid in the last three months.',
    'Balance = approved payments in the range − payroll (every payroll_runs row whose period overlaps the range, at its current total; a draft counts because the classes were taught) − expenses (expenses rows with incurred_on in the range, paid or not). The card links to M-09a and M-09c; nothing on it is written here.',
  ],
  integrations: ['Wompi', 'DIAN e-invoicing'],
  states: ['Loading', 'Empty range', 'No refund permission: action hidden', 'E-invoicing off: notice', 'No draft run yet', 'Negative balance (expenses above revenue in the range)'],
  toggles: [{ label: 'Wompi payouts', on: true }, { label: 'Refunds', on: true }, { label: 'DIAN column', on: true }],
  notes: ['Payouts are real rows now (payroll_runs / payroll_lines); only the Wompi dispersion call is simulated, and the page says so.', 'The balance card (0.6.1) is the answer to “what did the studio spend”: it reads payments, payroll_runs and expenses with the same range chips, so the three numbers always describe one window.'],
});

const PAYOUT_NOTES = [
  'Teachers are paid per class taught: one completed class_sessions row = one payroll_lines row of kind class at teachers.rate_per_class. Bonuses and adjustments are lines finance adds by hand and are never derived.',
  'src/data/payrollCalc.ts is the single arithmetic: the seed (historical runs), M-09a (generate draft) and S-03 (the teacher statement) all use it, so the three screens can never disagree.',
  'A payout is NOT a payments row: payments is money in from members (it feeds M-09 revenue, C-11 history and M-01 KPIs). Money out lives on payroll_runs (status / paid_at / method / provider_ref) with an audit_log row per action.',
  'wompiPayout() in src/modules/admin/payouts.ts is the dispersion seam — simulated today, with the rejected path included; the badge says simulated on both pages.',
];

/** M-09a — the payroll runs list. */
export const M09a = defineSpec({
  code: 'M-09a',
  name: { es: 'Finanzas · Nóminas', en: 'Finance · Payroll runs' },
  purpose: { es: 'Las liquidaciones mensuales de profesores: qué se debe, qué está aprobado y qué ya se pagó, y el botón que genera el borrador del periodo.', en: 'The monthly teacher payroll runs: what is owed, what is approved and what is paid, plus the button that generates the period’s draft.' },
  layout: ['KPIRow (próxima corrida, por aprobar, pagado en el trimestre)', 'GeneratePanel (periodo + generar borrador)', 'RunsTable (periodo, estado, profesores, clases, total, medio, liquidada)', 'SeamNote'],
  data: ['payroll_runs', 'payroll_lines', 'class_sessions', 'bookings', 'teachers', 'special_charges', 'space_bookings', 'audit_log'],
  roles: ['super_admin', 'admin', 'finance'],
  logic: [
    'Generating a draft is idempotent: an existing draft for the same period has its lines deleted and recomputed, so pressing the button twice cannot double-pay. An approved or paid run is refused with a reason.',
    'The draft is class lines + manual lines: every special_charges row with a teacher and a teacher_payout whose service date (its space booking, else the sale) falls in the period becomes one payroll_lines row of kind manual, sourced by special_charge_id (src/data/payrollCalc.ts draftLinesFor). 0017.',
    'payroll.write gates every action; payroll.read is enough to look.',
    ...PAYOUT_NOTES,
  ],
  integrations: ['Wompi'],
  states: ['Loading', 'No runs yet', 'Draft exists for the period: regenerated', 'Period already approved/paid: blocked', 'Read-only (solo payroll.read)'],
  notes: PAYOUT_NOTES,
});

/** M-09b — one run, with the per-teacher statement. */
export const M09b = defineSpec({
  ...M09a,
  code: 'M-09b',
  name: { es: 'Finanzas · Detalle de nómina', en: 'Finance · Payroll run' },
  purpose: { es: 'Una corrida: el extracto por profesor con sus clases, bonos y ajustes, y las cuatro acciones de finanzas — aprobar, enviar por Wompi, marcar pagada por transferencia o efectivo, exportar CSV.', en: 'One run: the per-teacher statement with their classes, bonuses and adjustments, and finance’s four actions — approve, send via Wompi, mark paid by transfer or cash, export CSV.' },
  layout: ['RunHeader (periodo, estado, simulado)', 'KPIRow (total, medio, estado)', 'ActionBar (regenerar · aprobar · Wompi · transferencia · efectivo · CSV · imprimir)', 'Statement → TeacherCard (estado de pago, clases, líneas, subtotal, marcar como pagado)'],
  states: ['Draft: regenerate + approve', 'Approved: pay by Wompi / transfer / cash', 'Approved: one teacher settled, the rest pending', 'Paid: locked, read-only', 'Wompi rejected: reason shown', 'Run not found', 'Negative adjustment line'],
  logic: [
    'A run can be settled teacher by teacher: payroll_lines.paid_at + paid_method carry the stamp, so a bounced transfer for one teacher does not hold the other seven. The run closes itself as paid once every teacher is settled.',
    'Each teacher card shows the classes taught, the total attendance, the payment method and the settlement date — the payment detail finance is asked for on the phone.',
    'A run-level payment stamps every unpaid line with the same date and method, so the two paths can never disagree.',
    ...(M09a.logic ?? []),
  ],
});

const EXPENSE_NOTES = [
  'An expense is neither a payments row (money in from members) nor a payroll row (teacher pay): it lives in expenses / expense_templates and subtracts in the M-09 balance. Mixing it into payments would corrupt every revenue number.',
  'src/data/expenseCalc.ts is the single arithmetic: dueDatesFor() and fixedExpensesFor() are what the seed and the generator both call, so the fixed rows on screen and the ones a button creates cannot disagree.',
  'Generating a period is idempotent: one row per template per due day; a due day that already has its row is skipped (paid or not), nothing is deleted, inactive templates generate nothing. Regenerating never duplicates, and a paid row is never touched.',
  'expenses.write gates every action (finance, admin, super_admin); expenses.read is enough to look. Every write appends an audit_log row through useAudit(\'admin\').',
];

/** M-09c — the expenses ledger. */
export const M09c = defineSpec({
  code: 'M-09c',
  name: { es: 'Finanzas · Gastos', en: 'Finance · Expenses' },
  purpose: { es: 'El libro de gastos del estudio: fijos recurrentes (arriendo, servicios, aseo por quincena…) generados de plantillas con un botón idempotente, variables registrados a mano, pagado y por pagar, por categoría — la tercera pata del balance de M-09.', en: 'The studio’s expenses ledger: recurring fixed costs (rent, utilities, cleaning by the quincena…) generated from templates with one idempotent button, variable costs recorded by hand, paid and to pay, by category — the third leg of the M-09 balance.' },
  layout: ['RangeChips (7 / 15 / 30 / 90 días / Todo, los mismos de M-09)', 'KPIRow (fijos, variables, pagado, por pagar)', 'ByCategory (BarList)', 'AddExpenseForm (tipo, concepto, categoría, valor, fecha, pagado/por pagar, método, proveedor, nota)', 'TemplatesPanel (periodo + generar gastos fijos, tabla de plantillas con activar/desactivar, nueva plantilla)', 'ExpensesTable (fecha, concepto, categoría, tipo, método, valor, estado + marcar pagado)'],
  data: ['expenses', 'expense_templates', 'audit_log'],
  roles: ['super_admin', 'admin', 'finance'],
  logic: [
    'A template falls due on anchor_day of every month; a biweekly template also falls due 15 days later (the Colombian quincena, clamped to the month’s last day). One due day inside the period = one expenses row of kind fixed pointing at the template.',
    'Range = rows whose incurred_on is inside the window, paid or not; “por pagar” is paid_on = null. Marking paid stamps today as paid_on and writes expense.pay to audit_log.',
    'Only an unpaid row can be deleted; a paid row is history and a correction is a new row with a note.',
    ...EXPENSE_NOTES,
  ],
  integrations: [],
  states: ['Loading', 'Empty range', 'No templates yet', 'Generate: n created / all skipped', 'Unpaid row: marcar pagado', 'Paid row: locked', 'Read-only (solo expenses.read)', 'Invalid form (empty concept, zero amount)'],
  notes: EXPENSE_NOTES,
});

const DELETION_NOTES = [
  'A deletion request is a row, never a client-side delete: C-26 (member, signed in), W-09 (public page, no session) and the desk (front_desk channel, by hand in M-03 today) all insert into deletion_requests; this page moves the status and ticks the checklist. The anonymisation itself — profiles and users overwritten, auth user removed, notifications purged, payments and invoices kept under an anonymous id — is a server-side job (Supabase function) once the backend exists; until then the admin performs the steps in M-03 and ticks them here.',
  'Ley 1581 de 2012 gives fifteen business days for a deletion claim; App Store Review 5.1.1(v) and Google Play’s account-deletion policy require the request to be discoverable in-app and (Play) at a public URL. The queue is what proves the studio honoured each one: rows are never deleted.',
];

/** M-11 — the account-deletion queue (0019). */
export const M11 = defineSpec({
  code: 'M-11',
  name: { es: 'CRM · Solicitudes de eliminación', en: 'CRM · Deletion requests' },
  purpose: { es: 'La cola de peticiones de borrar una cuenta: quién la pidió y por dónde, en qué estado va, la lista de anonimización paso a paso, la nota interna y el enlace a la ficha del socio. Admin la mueve de pendiente a en proceso y a hecha; cancelada cierra sin borrar.', en: 'The queue of account-deletion requests: who asked and through which channel, its status, the step-by-step anonymisation checklist, the internal note and the link to the member record. Admin moves it from requested to processing to done; cancelled closes it without deleting.' },
  layout: ['KPIRow (abiertas · en proceso · hechas 90 días)', 'RuleNotice (15 días hábiles, qué se conserva)', 'StatusChips (abiertas / pendiente / en proceso / hecha / cancelada / todas)', 'RequestsTable (fecha + antigüedad, quién, canal, motivo, estado, checklist n/7)', 'RequestDrawer (ficha, enlace a M-06, checklist, nota, acciones)'],
  data: ['deletion_requests', 'users', 'profiles', 'audit_log'],
  roles: ['super_admin', 'admin'],
  logic: [
    'Status flow: requested → processing → done; cancelled from either open state. done and cancelled stamp resolved_at + resolved_by. Each move writes audit_log deletion.<status>; each checklist tick writes deletion.checklist.',
    '“Marcar hecha” is disabled until all seven checklist steps are ticked (profile, contact, notifications, messages, auth, payments, confirm), so a case cannot be closed with the member still identifiable.',
    'A public request (user_id null) shows the email or masked phone and no CRM link; matching it to a member is a human step, noted in the internal note.',
    ...DELETION_NOTES,
  ],
  integrations: ['Supabase Auth'],
  states: ['Loading', 'No open requests', 'Filter with no matches', 'Requested (mover a en proceso)', 'Processing with a partial checklist (hecha disabled)', 'All steps ticked (hecha enabled)', 'Done / cancelled (locked, read-only)', 'Public request without an account', 'Read-only (not admin)'],
  notes: DELETION_NOTES,
});

/** M-10 — Integraciones (0018): one card per external system, non-secret fields ready to fill, a status chip and the dev checklist. */
export const M10 = defineSpec({
  code: 'M-10',
  name: { es: 'Integraciones', en: 'Integrations' },
  purpose: { es: 'Una tarjeta por integración — Wompi, WhatsApp Business, correo, facturación DIAN, mapas, Supabase — con los campos no secretos listos para llenar (ids de comercio, número emisor, namespace de plantillas, proveedor, URL del proyecto), un estado simulado · configurado · conectado, el aviso de que las llaves viven en el servidor y la lista de lo que el dev debe terminar.', en: 'One card per integration — Wompi, WhatsApp Business, email, DIAN e-invoicing, maps, Supabase — with the non-secret fields ready to fill (merchant ids, sender number, template namespace, provider, project URL), a simulated · configured · connected status, the notice that keys live server-side and the checklist of what the dev must finish.' },
  layout: ['Intro', 'Cards', 'Order'],
  data: ['integrations', 'audit_log'],
  roles: ['super_admin', 'admin'],
  logic: [
    'The integrations table holds one row per key with status, a config json of NON-SECRET fields and notes; the definitions (which fields, which checklist, which secrets exist) live in src/modules/admin/integrationDefs.ts so the seed and the page agree.',
    'Status is moved by hand: simulated (seam only) → configured (ids filled, dev has not wired it) → connected (live). Nothing here performs a connection; the seams (wompiCheckout, wompiPayout, message_log, MockProvider) keep behaving as before until the dev replaces them.',
    'Secrets never enter the table or the browser; the card names the environment variables the dev must set instead.',
    'settings.write gates every save; each save writes audit_log integration.update with key, before and after.',
    'M-09a reads the Wompi row’s status for its “simulado” badge (useIntegrationStatus).',
  ],
  integrations: ['Wompi', 'WhatsApp Business (Meta)', 'Email provider', 'DIAN e-invoicing provider', 'Maps', 'Supabase'],
  states: ['Loading', 'All simulated (seed)', 'Configured: fields filled, dev pending', 'Connected', 'Dirty card (unsaved)', 'Saved', 'Read-only (no settings.write)'],
  notes: ['Sections: Intro = title · status counts · keys-live-server-side notice · manual link; Cards = one IntegrationCard per system (body · what is simulated today · fields · filled count · secrets named · checklist · notes · status select · save); Order = the connection order from ROADMAP §B and where each setting lives.', 'Manual chapter 26 is written around this page: what can be promised today and the order in which the systems get connected.', 'The M-08a “Integraciones” section became a pointer to this page in 0018; the old tenants.settings.integrations statuses are superseded by the table.'],
});
