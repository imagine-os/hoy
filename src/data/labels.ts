/**
 * 0044 — human names for the data model. The table manager (M-03) never shows a raw `snake_case` identifier as the
 * main text: column headers, field labels and enum badges read from here, and the raw name only appears as a quiet
 * mono line when "technical names" is on.
 *
 * Order of precedence for a column: `ColumnDef.label` (authored, bilingual) → the TERMS dictionary below →
 * `humanizeName()` (words from the identifier, `_id` stripped, word dictionary for Spanish). A later pass fills
 * `ColumnDef.label` column by column; the dictionary keeps every table readable until then.
 * Pure data + functions (no React), so node scripts can import it too.
 */
import type { Lang } from '../i18n/types';
import { tableRegistry, type BaseRow, type ColumnDef, type TableDef } from './schema';

type Term = readonly [es: string, en: string];

/** Whole identifiers (column names and common enum values). Checked before any word-by-word guess. */
const TERMS: Record<string, Term> = {
  // base columns and ids
  id: ['ID', 'ID'], tenant_id: ['Estudio', 'Studio'], created_at: ['Creado', 'Created'], updated_at: ['Actualizado', 'Updated'],
  created_by: ['Creado por', 'Created by'], updated_by: ['Actualizado por', 'Updated by'], edited_by: ['Editado por', 'Edited by'],
  user_id: ['Usuario', 'User'], teacher_id: ['Profesor', 'Teacher'], room_id: ['Sala', 'Room'], modality_id: ['Modalidad', 'Modality'],
  session_id: ['Clase', 'Class session'], class_session_id: ['Clase', 'Class session'], template_id: ['Plantilla', 'Template'],
  plan_id: ['Plan', 'Plan'], payment_id: ['Pago', 'Payment'], credit_id: ['Crédito', 'Credit'], event_id: ['Evento', 'Event'],
  customer_id: ['Cliente', 'Customer'], special_charge_id: ['Especial', 'Special charge'], space_booking_id: ['Reserva de espacio', 'Space booking'],
  legal_document_id: ['Documento', 'Document'], document_id: ['Documento', 'Document'], automation_id: ['Automatización', 'Automation'],
  run_id: ['Corrida de nómina', 'Payroll run'], replaces_id: ['Reemplaza a', 'Replaces'], actor_id: ['Quién', 'Actor'], entity_id: ['ID de la entidad', 'Entity id'],
  ref_id: ['ID de referencia', 'Reference id'], ref_table: ['Tabla de referencia', 'Reference table'], host_teacher_id: ['Anfitrión', 'Host teacher'],
  buyer_user_id: ['Comprador', 'Buyer'], inviter_user_id: ['Quien invita', 'Inviter'], invitee_user_id: ['Invitado', 'Invitee'], reward_credit_id: ['Crédito de premio', 'Reward credit'],
  // time
  starts_at: ['Inicio', 'Starts'], ends_at: ['Fin', 'Ends'], starts_on: ['Empieza el', 'Starts on'], start_date: ['Desde', 'From'], end_date: ['Hasta', 'To'],
  start_time: ['Hora', 'Start time'], open: ['Abre', 'Opens'], close: ['Cierra', 'Closes'], weekday: ['Día de la semana', 'Weekday'],
  paid_at: ['Pagado', 'Paid'], sent_at: ['Enviado', 'Sent'], read_at: ['Leído', 'Read'], accepted_at: ['Aceptado', 'Accepted'], issued_at: ['Emitida', 'Issued'],
  published_at: ['Publicado', 'Published'], publish_at: ['Publicar el', 'Publish on'], requested_at: ['Solicitado', 'Requested'], resolved_at: ['Resuelto', 'Resolved'],
  checked_in_at: ['Llegada', 'Checked in'], cancelled_at: ['Cancelado', 'Cancelled'], offered_at: ['Ofrecido', 'Offered'], claim_until: ['Reclamar hasta', 'Claim until'],
  expires_at: ['Vence', 'Expires'], expires: ['Vence', 'Expires'], renews_at: ['Renueva', 'Renews'], paused_until: ['Pausado hasta', 'Paused until'],
  deliver_at: ['Entregar el', 'Deliver on'], approved_at: ['Aprobado', 'Approved'], done_at: ['Completado', 'Done'], occurred_at: ['Ocurrió', 'Occurred'],
  last_sign_in_at: ['Último ingreso', 'Last sign-in'], last_used_at: ['Último uso', 'Last used'], revoked_at: ['Revocada', 'Revoked'], google_synced_at: ['Sincronizado con Google', 'Synced to Google'],
  effective_from: ['Vigente desde', 'Effective from'], incurred_on: ['Causado el', 'Incurred on'], paid_on: ['Pagado el', 'Paid on'], period_start: ['Periodo desde', 'Period from'], period_end: ['Periodo hasta', 'Period to'],
  birthday: ['Cumpleaños', 'Birthday'], duration_min: ['Duración (min)', 'Duration (min)'], delay_min: ['Espera (min)', 'Delay (min)'], anchor_day: ['Día del mes', 'Day of month'], validity_days: ['Vigencia (días)', 'Validity (days)'],
  // money
  amount: ['Monto', 'Amount'], amount_paid: ['Pagado', 'Paid'], price: ['Precio', 'Price'], price_cop: ['Precio', 'Price'], member_price_cop: ['Precio miembro', 'Member price'],
  total: ['Total', 'Total'], subtotal: ['Subtotal', 'Subtotal'], tax: ['Impuesto', 'Tax'], balance: ['Saldo', 'Balance'], rate: ['Tarifa', 'Rate'], rate_per_class: ['Tarifa por clase', 'Rate per class'],
  teacher_payout: ['Pago al profesor', 'Teacher payout'], currency: ['Moneda', 'Currency'], method: ['Método', 'Method'], paid_method: ['Método de pago', 'Payment method'], paid_with: ['Pagado con', 'Paid with'],
  provider: ['Proveedor', 'Provider'], provider_ref: ['Referencia del proveedor', 'Provider reference'], taken_by: ['Registrado por', 'Taken by'], is_from_price: ['Precio “desde”', '“From” price'],
  credits: ['Créditos', 'Credits'], delta: ['Movimiento', 'Change'], concept: ['Concepto', 'Concept'], vendor: ['Proveedor', 'Vendor'], number: ['Número', 'Number'],
  pdf_url: ['PDF', 'PDF'], dian_cufe: ['CUFE (DIAN)', 'CUFE (DIAN)'], last4: ['Últimos 4', 'Last 4'], brand: ['Marca', 'Brand'], token_ref: ['Token', 'Token'], is_default: ['Predeterminado', 'Default'],
  // people and text
  name: ['Nombre', 'Name'], name_es: ['Nombre (ES)', 'Name (ES)'], name_en: ['Nombre (EN)', 'Name (EN)'], full_name: ['Nombre completo', 'Full name'], display_name: ['Nombre visible', 'Display name'],
  legal_name: ['Razón social', 'Legal name'], initials: ['Iniciales', 'Initials'], email: ['Correo', 'Email'], phone: ['Teléfono', 'Phone'], photo_url: ['Foto', 'Photo'],
  contact_name: ['Contacto', 'Contact'], recipient_name: ['Destinatario', 'Recipient'], recipient_contact: ['Contacto del destinatario', 'Recipient contact'],
  invitee_phone: ['Teléfono del invitado', 'Invitee phone'], invitee_email: ['Correo del invitado', 'Invitee email'], emergency_contact: ['Contacto de emergencia', 'Emergency contact'],
  marketing_optin: ['Acepta marketing', 'Marketing opt-in'], whatsapp_verified: ['WhatsApp verificado', 'WhatsApp verified'], locale: ['Idioma', 'Language'], default_locale: ['Idioma por defecto', 'Default language'],
  bio: ['Biografía', 'Bio'], specialties: ['Especialidades', 'Specialties'], certifications: ['Certificaciones', 'Certifications'], rating_avg: ['Calificación media', 'Average rating'],
  role: ['Rol', 'Role'], granted_by: ['Otorgado por', 'Granted by'], approved_by: ['Aprobado por', 'Approved by'], resolved_by: ['Resuelto por', 'Resolved by'], redeemed_by: ['Canjeado por', 'Redeemed by'],
  signed_by: ['Firmado por', 'Signed by'], sent_by: ['Enviado por', 'Sent by'], read_by: ['Leído por', 'Read by'], requested_by: ['Solicitado por', 'Requested by'],
  title: ['Título', 'Title'], summary: ['Resumen', 'Summary'], description: ['Descripción', 'Description'], body: ['Mensaje', 'Body'], body_md: ['Contenido', 'Content'], body_mjml: ['Plantilla (MJML)', 'Template (MJML)'],
  subject: ['Asunto', 'Subject'], note: ['Nota', 'Note'], notes: ['Notas', 'Notes'], comment: ['Comentario', 'Comment'], reason: ['Motivo', 'Reason'], cancel_reason: ['Motivo de cancelación', 'Cancellation reason'],
  question: ['Pregunta', 'Question'], answer: ['Respuesta', 'Answer'], request: ['Petición', 'Request'], label: ['Etiqueta', 'Label'], alt: ['Texto alternativo', 'Alt text'], brief: ['Encargo', 'Brief'],
  // state and classification
  status: ['Estado', 'Status'], kind: ['Tipo', 'Kind'], category: ['Categoría', 'Category'], channel: ['Canal', 'Channel'], source: ['Origen', 'Source'], level: ['Nivel', 'Level'],
  tone: ['Tono', 'Tone'], family: ['Familia', 'Family'], period: ['Periodo', 'Period'], cadence: ['Frecuencia', 'Cadence'], visibility: ['Visibilidad', 'Visibility'], direction: ['Dirección', 'Direction'],
  environment: ['Entorno', 'Environment'], audience: ['Audiencia', 'Audience'], approval_status: ['Aprobación', 'Approval'], stage: ['Etapa', 'Stage'], tier: ['Nivel', 'Tier'], section: ['Sección', 'Section'],
  active: ['Activo', 'Active'], is_active: ['Activo', 'Active'], enabled: ['Encendido', 'Enabled'], published: ['Publicado', 'Published'], required: ['Obligatorio', 'Required'], closed: ['Cerrado', 'Closed'],
  heated: ['Con calor', 'Heated'], rated: ['Calificada', 'Rated'], shared: ['Compartida', 'Shared'], requires_acceptance: ['Requiere aceptación', 'Requires acceptance'],
  capacity: ['Cupo', 'Capacity'], booked_count: ['Reservados', 'Booked'], position: ['Posición', 'Position'], guests: ['Invitados', 'Guests'], attendees: ['Asistentes', 'Attendees'],
  rating: ['Calificación', 'Rating'], intensity: ['Intensidad', 'Intensity'], target: ['Meta', 'Target'], sort: ['Orden', 'Order'], page: ['Página', 'Page'], version: ['Versión', 'Version'],
  // system
  slug: ['Identificador', 'Slug'], key: ['Clave', 'Key'], code: ['Código', 'Code'], prefix: ['Prefijo', 'Prefix'], key_hash: ['Hash de la llave', 'Key hash'], scopes: ['Permisos', 'Scopes'],
  settings: ['Ajustes', 'Settings'], config: ['Configuración', 'Configuration'], payload: ['Datos', 'Payload'], diff: ['Cambios', 'Changes'], ip: ['IP', 'IP'], url: ['Enlace', 'URL'], path: ['Ruta', 'Path'],
  action: ['Acción', 'Action'], entity: ['Entidad', 'Entity'], trigger: ['Disparador', 'Trigger'], template_key: ['Plantilla', 'Template'], external_id: ['ID externo', 'External id'], deep_link: ['Enlace interno', 'Deep link'],
  sent_via: ['Enviado por', 'Sent via'], quiet_hours: ['Horas de silencio', 'Quiet hours'], timezone: ['Zona horaria', 'Time zone'], page_code: ['Página', 'Page'], page_codes: ['Páginas', 'Pages'],
  table_name: ['Tabla', 'Table'], sections: ['Secciones', 'Sections'], hidden: ['Ocultas', 'Hidden'], states: ['Estados', 'States'], used_by: ['Usado en', 'Used by'], lang: ['Idioma', 'Language'],
  chapter: ['Capítulo', 'Chapter'], chapter_slug: ['Capítulo', 'Chapter'], section_heading: ['Sección', 'Section'], item_key: ['Tarea', 'Item'], editable_by: ['Lo edita', 'Editable by'],
  value_es: ['Valor (ES)', 'Value (ES)'], value_en: ['Valor (EN)', 'Value (EN)'], slot_key: ['Lugar', 'Slot'], ratio: ['Proporción', 'Ratio'], credit: ['Crédito', 'Credit'], icon: ['Icono', 'Icon'],
  video_label: ['Video', 'Video'], checklist: ['Lista de chequeo', 'Checklist'], group_key: ['Grupo', 'Group'], group_title: ['Título del grupo', 'Group title'], group_lead: ['Entrada del grupo', 'Group lead'],
  cover_key: ['Portada', 'Cover'], bring: ['Qué traer', 'What to bring'], tags: ['Etiquetas', 'Tags'], badge: ['Distintivo', 'Badge'], source_item: ['Concepto de origen', 'Source item'], hours: ['Horas', 'Hours'],
  // common enum values (badges)
  booked: ['Reservada', 'Booked'], checked_in: ['Llegó', 'Checked in'], cancelled: ['Cancelada', 'Cancelled'], no_show: ['No vino', 'No-show'], late_cancel: ['Cancelación tardía', 'Late cancel'],
  scheduled: ['Programada', 'Scheduled'], completed: ['Completada', 'Completed'], pending: ['Pendiente', 'Pending'], ready: ['Lista', 'Ready'], draft: ['Borrador', 'Draft'],
  invited: ['Invitado', 'Invited'], locked: ['Bloqueado', 'Locked'], disabled: ['Desactivado', 'Disabled'], paused: ['En pausa', 'Paused'], past_due: ['Vencido el pago', 'Past due'], expired: ['Vencido', 'Expired'],
  approved: ['Aprobado', 'Approved'], declined: ['Rechazado', 'Declined'], refunded: ['Reembolsado', 'Refunded'], voided: ['Anulado', 'Voided'], paid: ['Pagado', 'Paid'],
  waiting: ['En espera', 'Waiting'], offered: ['Ofrecido', 'Offered'], claimed: ['Reclamado', 'Claimed'], left: ['Salió', 'Left'], going: ['Asiste', 'Going'], attended: ['Asistió', 'Attended'],
  requested: ['Solicitada', 'Requested'], processing: ['En proceso', 'Processing'], done: ['Hecha', 'Done'], held: ['Apartada', 'Held'], confirmed: ['Confirmada', 'Confirmed'],
  queued: ['En cola', 'Queued'], delivered: ['Entregado', 'Delivered'], read: ['Leído', 'Read'], failed: ['Falló', 'Failed'], received: ['Recibido', 'Received'], redeemed: ['Canjeada', 'Redeemed'],
  membership: ['Membresía', 'Membership'], single: ['Clase suelta', 'Single class'], trial: ['Prueba', 'Trial'], guest: ['Invitado', 'Guest'], comp: ['Cortesía', 'Complimentary'],
  cash: ['Efectivo', 'Cash'], card: ['Tarjeta', 'Card'], transfer: ['Transferencia', 'Transfer'], gift_card: ['Tarjeta regalo', 'Gift card'], inbound: ['Entrante', 'Inbound'], outbound: ['Saliente', 'Outbound'], internal: ['Interno', 'Internal'],
  all: ['Todos', 'All'], beginner: ['Principiante', 'Beginner'], intermediate: ['Intermedio', 'Intermediate'], advanced: ['Avanzado', 'Advanced'], live: ['En vivo', 'Live'], test: ['Pruebas', 'Test'],
  once: ['Una vez', 'Once'], month: ['Mes', 'Month'], year: ['Año', 'Year'], week: ['Semana', 'Week'], monthly: ['Mensual', 'Monthly'], biweekly: ['Quincenal', 'Biweekly'],
  holiday: ['Festivo', 'Holiday'], special: ['Especial', 'Special'], event: ['Evento', 'Event'], manual: ['Manual', 'Manual'], simulated: ['Simulada', 'Simulated'], configured: ['Configurada', 'Configured'], connected: ['Conectada', 'Connected'],
  anonymous: ['Anónima', 'Anonymous'], named: ['Con nombre', 'Named'], private: ['Privada', 'Private'], open_: ['Abierta', 'Open'], dismissed: ['Descartada', 'Dismissed'], reverted: ['Revertida', 'Reverted'],
  private_event: ['Evento privado', 'Private event'], rental: ['Alquiler', 'Rental'], private_class: ['Clase privada', 'Private class'], maintenance: ['Mantenimiento', 'Maintenance'], blocked: ['Bloqueado', 'Blocked'],
  website: ['Sitio web', 'Website'], app: ['App', 'App'], front_desk: ['Recepción', 'Front desk'], customer: ['Cliente', 'Customer'], customers: ['Clientes', 'Customers'], staff: ['Equipo', 'Staff'],
  photo: ['Foto', 'Photo'], video: ['Video', 'Video'], illustration: ['Ilustración', 'Illustration'], member: ['Miembro', 'Member'], suggested: ['Sugerida', 'Suggested'], purchase: ['Compra', 'Purchase'],
  refund: ['Reembolso', 'Refund'], expiry: ['Vencimiento', 'Expiry'], gift: ['Regalo', 'Gift'], adjustment: ['Ajuste', 'Adjustment'], bonus: ['Bono', 'Bonus'], fixed: ['Fijo', 'Fixed'], variable: ['Variable', 'Variable'], other: ['Otro', 'Other'],
  grid: ['Cuadrícula', 'Grid'], list: ['Lista', 'List'], gallery: ['Galería', 'Gallery'], kanban: ['Tablero', 'Board'], calendar: ['Calendario', 'Calendar'], timeline: ['Línea de tiempo', 'Timeline'], graph: ['Grafo', 'Graph'],
};

/** Single words for the Spanish guess when a whole identifier is not in TERMS. */
const WORDS: Record<string, string> = {
  user: 'usuario', users: 'usuarios', teacher: 'profesor', room: 'sala', class: 'clase', session: 'sesión', plan: 'plan', payment: 'pago', credit: 'crédito', event: 'evento',
  date: 'fecha', time: 'hora', at: '', on: '', by: 'por', count: 'cantidad', min: 'min', max: 'máx', total: 'total', name: 'nombre', type: 'tipo', status: 'estado', key: 'clave',
  url: 'enlace', email: 'correo', phone: 'teléfono', price: 'precio', amount: 'monto', start: 'inicio', end: 'fin', last: 'último', first: 'primero', is: '', has: 'tiene', code: 'código',
  template: 'plantilla', message: 'mensaje', notes: 'notas', note: 'nota', group: 'grupo', page: 'página', title: 'título', label: 'etiqueta', days: 'días', day: 'día', rate: 'tarifa',
};

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const term = (name: string, lang: Lang): string | null => {
  const hit = TERMS[name] ?? TERMS[`${name}_`];
  return hit ? hit[lang === 'es' ? 0 : 1] : null;
};

/**
 * `snake_case` (or `dot.case`, `kebab-case`) → human words. Uses the TERMS dictionary for the whole identifier first,
 * then for the name without its `_id` suffix, then word by word (a Spanish word dictionary; unknown words stay as they are).
 */
export function humanizeName(name: string, lang: Lang): string {
  if (!name) return '';
  const whole = term(name, lang);
  if (whole) return whole;
  const stem = name.replace(/_id$/, '');
  if (stem !== name) { const s = term(stem, lang); if (s) return s; }
  const words = stem.split(/[_.\-\s]+/).filter(Boolean);
  const out = words.map((w) => (lang === 'es' ? (WORDS[w] ?? w) : w)).filter(Boolean).join(' ');
  return cap(out || stem);
}

type AnyTable = TableDef | string;
const defOf = (table: AnyTable): (TableDef & { allColumns?: ColumnDef[] }) | undefined => (typeof table === 'string' ? tableRegistry[table] : table);

/** The column's human label: authored `label` → dictionary → humanize. */
export function columnLabel(table: AnyTable, col: ColumnDef | string, lang: Lang): string {
  const def = defOf(table);
  const c = typeof col === 'string' ? (def?.allColumns ?? def?.columns ?? []).find((x) => x.name === col) : col;
  const name = typeof col === 'string' ? col : col.name;
  if (c?.label) return c.label[lang] || c.label.es;
  return humanizeName(name, lang);
}

/** The table's human label (`TableDef.label`), falling back to the humanized name. */
export function tableLabel(table: AnyTable, lang: Lang): string {
  const def = defOf(table);
  if (!def) return humanizeName(typeof table === 'string' ? table : '', lang);
  return def.label[lang] || def.label.es;
}

/** An enum value as words ("checked_in" → "Llegó" / "Checked in"). */
export function enumLabel(value: string, lang: Lang): string {
  const own = TERMS[`${value}_`];
  return own ? own[lang === 'es' ? 0 : 1] : humanizeName(value, lang);
}

const isBi = (v: unknown): v is { es?: string; en?: string } => !!v && typeof v === 'object' && !Array.isArray(v) && ('es' in (v as object) || 'en' in (v as object));

/** A json `{es,en}` value in the current language (Spanish fallback); null when it is not bilingual. */
export function biText(v: unknown, lang: Lang): string | null {
  if (!isBi(v)) return null;
  return (lang === 'en' ? v.en || v.es : v.es || v.en) ?? null;
}

const TEXTY = /^(name|title|full_name|display_name|label|email|code|concept|subject|slug|key)$/;

/** Looks a row up by id; `reverse` (optional) finds the row of `table` whose `column` equals `id` (for `titleFrom`). */
export type RowResolver = ((table: string, id: string) => BaseRow | null | undefined) & { reverse?: (table: string, column: string, id: string) => BaseRow | null | undefined };

/**
 * The display title of a row: `titleFrom` (another table's row pointing here, when the resolver can look it up) → the table's `titleColumn` (a bilingual json reads the current language; a foreign key
 * resolves the referenced row's own title through `resolve`, one level deep) → the first text-like column → the id.
 */
export function rowTitle(table: AnyTable, row: BaseRow | null | undefined, lang: Lang, resolve?: RowResolver, depth = 0): string {
  if (!row) return '—';
  const def = defOf(table);
  if (!def) return String(row.id ?? '—');
  if (def.titleFrom && resolve?.reverse && depth < 2) {
    const from = resolve.reverse(def.titleFrom.table, def.titleFrom.column, row.id);
    if (from) return rowTitle(def.titleFrom.table, from, lang, resolve, depth + 1);
  }
  const cols = def.allColumns ?? def.columns;
  const read = (c: ColumnDef | undefined): string | null => {
    if (!c) return null;
    const v = row[c.name];
    if (v == null || v === '') return null;
    if (c.references && typeof v === 'string') {
      if (resolve && depth < 2) { const ref = resolve(c.references, v); if (ref) return rowTitle(c.references, ref, lang, resolve, depth + 1); }
      return null;
    }
    if (c.type === 'json') return biText(v, lang);
    if (c.enum && typeof v === 'string') return enumLabel(v, lang);
    return String(v);
  };
  const byName = (n?: string) => cols.find((c) => c.name === n);
  // a `name_es` title has a `name_en` sibling: read the one of the current language
  const tc = def.titleColumn && /_es$/.test(def.titleColumn) && lang === 'en' ? byName(def.titleColumn.replace(/_es$/, '_en')) ?? byName(def.titleColumn) : byName(def.titleColumn);
  const title = read(tc)
    ?? read(cols.find((c) => TEXTY.test(c.name) && c.type !== 'uuid'))
    ?? read(cols.find((c) => c.type === 'text'));
  return title ?? String(row.id);
}
