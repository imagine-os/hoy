/**
 * Table definitions shaped like the future Supabase (Postgres) schema.
 * Every table gets id, tenant_id, created_at, updated_at (see BASE_COLUMNS) — multi-tenant from day one.
 * supabase/schema.sql and docs/data-model.md are generated from here (npm run sql). Keep them in sync.
 */
import type { Bi } from '../specs/types';

export type ColumnType = 'uuid' | 'text' | 'int' | 'numeric' | 'bool' | 'timestamptz' | 'date' | 'time' | 'json' | 'enum';

export interface ColumnDef {
  name: string;
  type: ColumnType;
  nullable?: boolean;
  /** Referenced table (column `id`). */
  references?: string;
  enum?: readonly string[];
  description?: string;
  /** Hide in default table view (long text, json). */
  wide?: boolean;
}

export type TableGroup = 'core' | 'people' | 'schedule' | 'commerce' | 'comms' | 'system' | 'design';

export interface TableDef {
  name: string;
  label: Bi;
  description: Bi;
  group: TableGroup;
  columns: ColumnDef[];
  /** Column used as the human-readable title of a row. */
  titleColumn?: string;
}

export const BASE_COLUMNS: ColumnDef[] = [
  { name: 'id', type: 'uuid', description: 'Primary key' },
  { name: 'tenant_id', type: 'uuid', references: 'tenants', description: 'Owning studio (multi-tenant)' },
  { name: 'created_at', type: 'timestamptz' },
  { name: 'updated_at', type: 'timestamptz' },
];

export interface BaseRow {
  id: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

const money = (name: string, description?: string): ColumnDef => ({ name, type: 'int', description: description ?? 'COP, integer' });

export const tables: TableDef[] = [
  // ---- core ----
  { name: 'tenants', group: 'core', titleColumn: 'name', label: { es: 'Estudios (tenants)', en: 'Tenants' }, description: { es: 'Cada estudio que usa HoyOS. Hoy: HOY.', en: 'Each studio using HoyOS. Today: HOY.' },
    columns: [{ name: 'slug', type: 'text' }, { name: 'name', type: 'text' }, { name: 'legal_name', type: 'text', nullable: true }, { name: 'timezone', type: 'text' }, { name: 'currency', type: 'text' }, { name: 'default_locale', type: 'text' }, { name: 'settings', type: 'json', wide: true }] },
  { name: 'feature_flags', group: 'core', titleColumn: 'key', label: { es: 'Interruptores de funciones', en: 'Feature flags' }, description: { es: 'Bloques y flujos que Admin → Features enciende o apaga por página.', en: 'Blocks and flows Admin → Features turns on or off per page.' },
    columns: [{ name: 'key', type: 'text' }, { name: 'page_code', type: 'text', nullable: true }, { name: 'label', type: 'text' }, { name: 'enabled', type: 'bool' }, { name: 'audience', type: 'enum', enum: ['all', 'staff', 'customers', 'beta'] }] },
  { name: 'legal_documents', group: 'core', titleColumn: 'title', label: { es: 'Documentos legales', en: 'Legal documents' }, description: { es: 'Términos, privacidad y políticas, versionados.', en: 'Terms, privacy and policies, versioned.' },
    columns: [{ name: 'kind', type: 'enum', enum: ['terms', 'privacy', 'waiver', 'policy'] }, { name: 'version', type: 'text' }, { name: 'locale', type: 'text' }, { name: 'title', type: 'text' }, { name: 'body_md', type: 'text', wide: true }, { name: 'published_at', type: 'timestamptz', nullable: true }] },
  { name: 'consents', group: 'core', label: { es: 'Consentimientos', en: 'Consents' }, description: { es: 'Qué versión de cada documento aceptó cada usuario.', en: 'Which document version each user accepted.' },
    columns: [{ name: 'user_id', type: 'uuid', references: 'users' }, { name: 'legal_document_id', type: 'uuid', references: 'legal_documents' }, { name: 'accepted_at', type: 'timestamptz' }, { name: 'ip', type: 'text', nullable: true }] },

  // ---- people ----
  { name: 'users', group: 'people', titleColumn: 'email', label: { es: 'Usuarios', en: 'Users' }, description: { es: 'Cuentas de acceso (espejo de auth.users en Supabase).', en: 'Login accounts (mirrors auth.users in Supabase).' },
    columns: [{ name: 'email', type: 'text' }, { name: 'phone', type: 'text', nullable: true }, { name: 'status', type: 'enum', enum: ['active', 'invited', 'locked', 'disabled'] }, { name: 'last_sign_in_at', type: 'timestamptz', nullable: true }, { name: 'locale', type: 'text', nullable: true }] },
  { name: 'profiles', group: 'people', titleColumn: 'full_name', label: { es: 'Perfiles', en: 'Profiles' }, description: { es: 'Datos de la persona: nombre, foto, emergencia, preferencias.', en: 'Person data: name, photo, emergency contact, preferences.' },
    columns: [{ name: 'user_id', type: 'uuid', references: 'users' }, { name: 'full_name', type: 'text' }, { name: 'initials', type: 'text', nullable: true }, { name: 'photo_url', type: 'text', nullable: true }, { name: 'birthday', type: 'date', nullable: true }, { name: 'emergency_contact', type: 'json', nullable: true, wide: true }, { name: 'marketing_optin', type: 'bool' }, { name: 'whatsapp_verified', type: 'bool' }, { name: 'notes', type: 'text', nullable: true, wide: true }] },
  { name: 'user_roles', group: 'people', label: { es: 'Roles de usuario', en: 'User roles' }, description: { es: 'Asignación de roles; un usuario puede tener varios.', en: 'Role assignments; a user may hold several.' },
    columns: [{ name: 'user_id', type: 'uuid', references: 'users' }, { name: 'role', type: 'enum', enum: ['super_admin', 'admin', 'coordinator', 'front_desk', 'finance', 'teacher', 'maintenance', 'customer'] }, { name: 'granted_by', type: 'uuid', nullable: true, references: 'users' }] },
  { name: 'teachers', group: 'people', titleColumn: 'display_name', label: { es: 'Profesores', en: 'Teachers' }, description: { es: 'Perfil público y contractual de cada profesor.', en: 'Public and contractual profile of each teacher.' },
    columns: [{ name: 'user_id', type: 'uuid', references: 'users', nullable: true }, { name: 'display_name', type: 'text' }, { name: 'bio', type: 'json', wide: true, description: '{es,en}' }, { name: 'photo_url', type: 'text', nullable: true }, { name: 'specialties', type: 'json', description: 'modality ids' }, { name: 'certifications', type: 'json', nullable: true, wide: true }, { name: 'rate_per_class', type: 'int', nullable: true, description: 'COP' }, { name: 'active', type: 'bool' }, { name: 'rating_avg', type: 'numeric', nullable: true }] },

  // ---- schedule ----
  { name: 'modalities', group: 'schedule', titleColumn: 'name_es', label: { es: 'Modalidades', en: 'Modalities' }, description: { es: 'Tipos de clase del club, cada uno con su movimiento.', en: 'Class types of the club, each with its movement.' },
    columns: [{ name: 'slug', type: 'text' }, { name: 'name_es', type: 'text' }, { name: 'name_en', type: 'text' }, { name: 'movement', type: 'enum', enum: ['enraiza', 'fluye', 'arde', 'libera'] }, { name: 'description', type: 'json', wide: true }, { name: 'intensity', type: 'int', description: '1–5' }, { name: 'heated', type: 'bool' }, { name: 'duration_min', type: 'int' }, { name: 'active', type: 'bool' }] },
  { name: 'rooms', group: 'schedule', titleColumn: 'name', label: { es: 'Salas', en: 'Rooms' }, description: { es: 'Salas físicas y su capacidad en mats.', en: 'Physical rooms and their mat capacity.' },
    columns: [{ name: 'name', type: 'text' }, { name: 'capacity', type: 'int' }, { name: 'heated', type: 'bool' }, { name: 'notes', type: 'text', nullable: true }] },
  { name: 'class_templates', group: 'schedule', titleColumn: 'title', label: { es: 'Plantillas de clase', en: 'Class templates' }, description: { es: 'Reglas de recurrencia que generan sesiones.', en: 'Recurrence rules that generate sessions.' },
    columns: [{ name: 'title', type: 'text' }, { name: 'modality_id', type: 'uuid', references: 'modalities' }, { name: 'teacher_id', type: 'uuid', references: 'teachers' }, { name: 'room_id', type: 'uuid', references: 'rooms' }, { name: 'weekday', type: 'int', description: '0=Sun … 6=Sat' }, { name: 'start_time', type: 'time' }, { name: 'duration_min', type: 'int' }, { name: 'capacity', type: 'int' }, { name: 'level', type: 'enum', enum: ['all', 'beginner', 'intermediate', 'advanced'] }, { name: 'active', type: 'bool' }] },
  { name: 'class_sessions', group: 'schedule', titleColumn: 'title', label: { es: 'Sesiones de clase', en: 'Class sessions' }, description: { es: 'Cada clase concreta en el calendario, con cupos en vivo.', en: 'Each concrete class on the calendar, with live capacity.' },
    columns: [{ name: 'template_id', type: 'uuid', references: 'class_templates', nullable: true }, { name: 'title', type: 'text' }, { name: 'modality_id', type: 'uuid', references: 'modalities' }, { name: 'teacher_id', type: 'uuid', references: 'teachers' }, { name: 'room_id', type: 'uuid', references: 'rooms' }, { name: 'starts_at', type: 'timestamptz' }, { name: 'ends_at', type: 'timestamptz' }, { name: 'capacity', type: 'int' }, { name: 'booked_count', type: 'int' }, { name: 'level', type: 'enum', enum: ['all', 'beginner', 'intermediate', 'advanced'] }, { name: 'status', type: 'enum', enum: ['scheduled', 'cancelled', 'completed'] }, { name: 'cancel_reason', type: 'text', nullable: true }] },
  { name: 'bookings', group: 'schedule', label: { es: 'Reservas', en: 'Bookings' }, description: { es: 'Un cupo de una persona en una sesión.', en: 'One person’s spot in a session.' },
    columns: [{ name: 'user_id', type: 'uuid', references: 'users' }, { name: 'session_id', type: 'uuid', references: 'class_sessions' }, { name: 'status', type: 'enum', enum: ['booked', 'checked_in', 'cancelled', 'no_show', 'late_cancel'] }, { name: 'paid_with', type: 'enum', enum: ['membership', 'credit', 'single', 'trial', 'guest', 'comp'] }, { name: 'credit_id', type: 'uuid', references: 'credits', nullable: true }, { name: 'checked_in_at', type: 'timestamptz', nullable: true }, { name: 'cancelled_at', type: 'timestamptz', nullable: true }, { name: 'rated', type: 'bool' }] },
  { name: 'waitlist', group: 'schedule', label: { es: 'Lista de espera', en: 'Waitlist' }, description: { es: 'Posiciones en espera y ventana de reclamo.', en: 'Waiting positions and claim window.' },
    columns: [{ name: 'user_id', type: 'uuid', references: 'users' }, { name: 'session_id', type: 'uuid', references: 'class_sessions' }, { name: 'position', type: 'int' }, { name: 'status', type: 'enum', enum: ['waiting', 'offered', 'claimed', 'expired', 'left'] }, { name: 'offered_at', type: 'timestamptz', nullable: true }, { name: 'claim_until', type: 'timestamptz', nullable: true }] },
  { name: 'intentions', group: 'schedule', label: { es: 'Intenciones del día', en: 'Daily intentions' }, description: { es: 'Respuesta a “¿Cómo quieres sentirte hoy?” (A-05).', en: 'Answer to “How do you want to feel today?” (A-05).' },
    columns: [{ name: 'user_id', type: 'uuid', references: 'users' }, { name: 'date', type: 'date' }, { name: 'movement', type: 'enum', enum: ['enraiza', 'fluye', 'arde', 'libera'] }] },

  // ---- commerce ----
  { name: 'plans', group: 'commerce', titleColumn: 'name_es', label: { es: 'Planes y precios', en: 'Plans & prices' }, description: { es: 'Modelo de Valor v3: pases, membresías, pausas, regalos, espacio.', en: 'Value model v3: passes, memberships, pauses, gifts, space.' },
    columns: [{ name: 'slug', type: 'text' }, { name: 'family', type: 'enum', enum: ['bienvenida', 'membresia', 'pausas', 'regalos', 'espacio'] }, { name: 'name_es', type: 'text' }, { name: 'name_en', type: 'text' }, { name: 'description', type: 'json', wide: true }, money('price'), { name: 'period', type: 'enum', enum: ['once', 'month', 'year'], nullable: true }, { name: 'credits', type: 'int', nullable: true }, { name: 'validity_days', type: 'int', nullable: true }, { name: 'is_from_price', type: 'bool' }, { name: 'badge', type: 'json', nullable: true }, { name: 'active', type: 'bool' }, { name: 'sort', type: 'int' }] },
  { name: 'memberships', group: 'commerce', label: { es: 'Membresías', en: 'Memberships' }, description: { es: 'Suscripción activa de una persona a un plan.', en: 'A person’s active subscription to a plan.' },
    columns: [{ name: 'user_id', type: 'uuid', references: 'users' }, { name: 'plan_id', type: 'uuid', references: 'plans' }, { name: 'status', type: 'enum', enum: ['active', 'paused', 'past_due', 'cancelled', 'expired'] }, { name: 'starts_at', type: 'date' }, { name: 'renews_at', type: 'date', nullable: true }, { name: 'ends_at', type: 'date', nullable: true }, { name: 'paused_until', type: 'date', nullable: true }] },
  { name: 'credits', group: 'commerce', label: { es: 'Créditos', en: 'Credits' }, description: { es: 'Libro mayor de clases compradas y usadas.', en: 'Ledger of purchased and used classes.' },
    columns: [{ name: 'user_id', type: 'uuid', references: 'users' }, { name: 'plan_id', type: 'uuid', references: 'plans', nullable: true }, { name: 'payment_id', type: 'uuid', references: 'payments', nullable: true }, { name: 'delta', type: 'int', description: '+ purchase, − use' }, { name: 'reason', type: 'enum', enum: ['purchase', 'booking', 'refund', 'expiry', 'gift', 'comp', 'cancel_return'] }, { name: 'expires_at', type: 'date', nullable: true }] },
  { name: 'payments', group: 'commerce', label: { es: 'Pagos', en: 'Payments' }, description: { es: 'Cada cobro, por Wompi o manual.', en: 'Each charge, via Wompi or manual.' },
    columns: [{ name: 'user_id', type: 'uuid', references: 'users' }, { name: 'plan_id', type: 'uuid', references: 'plans', nullable: true }, money('amount'), { name: 'currency', type: 'text' }, { name: 'method', type: 'enum', enum: ['card', 'pse', 'nequi', 'cash', 'transfer', 'gift_card'] }, { name: 'provider', type: 'enum', enum: ['wompi', 'manual'] }, { name: 'provider_ref', type: 'text', nullable: true }, { name: 'status', type: 'enum', enum: ['pending', 'approved', 'declined', 'refunded', 'voided'] }, { name: 'paid_at', type: 'timestamptz', nullable: true }, { name: 'taken_by', type: 'uuid', references: 'users', nullable: true, description: 'staff user for manual payments' }] },
  { name: 'invoices', group: 'commerce', titleColumn: 'number', label: { es: 'Facturas', en: 'Invoices' }, description: { es: 'Documento fiscal por pago (DIAN más adelante).', en: 'Fiscal document per payment (DIAN later).' },
    columns: [{ name: 'payment_id', type: 'uuid', references: 'payments' }, { name: 'number', type: 'text' }, money('subtotal'), money('tax'), money('total'), { name: 'issued_at', type: 'timestamptz' }, { name: 'pdf_url', type: 'text', nullable: true }, { name: 'dian_cufe', type: 'text', nullable: true }] },
  { name: 'gift_cards', group: 'commerce', titleColumn: 'code', label: { es: 'Tarjetas de regalo', en: 'Gift cards' }, description: { es: 'Bonos comprados para regalar, con entrega programada.', en: 'Vouchers bought to give away, with scheduled delivery.' },
    columns: [{ name: 'code', type: 'text' }, { name: 'buyer_user_id', type: 'uuid', references: 'users', nullable: true }, { name: 'recipient_name', type: 'text' }, { name: 'recipient_contact', type: 'text' }, money('amount'), money('balance'), { name: 'deliver_at', type: 'timestamptz', nullable: true }, { name: 'redeemed_by', type: 'uuid', references: 'users', nullable: true }, { name: 'status', type: 'enum', enum: ['scheduled', 'sent', 'redeemed', 'expired'] }] },

  // ---- comms ----
  { name: 'email_templates', group: 'comms', titleColumn: 'name', label: { es: 'Plantillas de email', en: 'Email templates' }, description: { es: 'Emails transaccionales versionados (M-04).', en: 'Versioned transactional emails (M-04).' },
    columns: [{ name: 'key', type: 'text' }, { name: 'name', type: 'text' }, { name: 'trigger', type: 'text' }, { name: 'subject', type: 'json' }, { name: 'body_mjml', type: 'text', wide: true }, { name: 'version', type: 'int' }, { name: 'active', type: 'bool' }] },
  { name: 'wa_templates', group: 'comms', titleColumn: 'name', label: { es: 'Plantillas de WhatsApp', en: 'WhatsApp templates' }, description: { es: 'Plantillas aprobadas por Meta con variables.', en: 'Meta-approved templates with variables.' },
    columns: [{ name: 'key', type: 'text' }, { name: 'name', type: 'text' }, { name: 'category', type: 'enum', enum: ['utility', 'marketing', 'authentication'] }, { name: 'body', type: 'json', wide: true }, { name: 'approval_status', type: 'enum', enum: ['draft', 'pending', 'approved', 'rejected'] }, { name: 'active', type: 'bool' }] },
  { name: 'automations', group: 'comms', titleColumn: 'name', label: { es: 'Automatizaciones', en: 'Automations' }, description: { es: 'Disparador → canal → plantilla, con horas de silencio.', en: 'Trigger → channel → template, with quiet hours.' },
    columns: [{ name: 'name', type: 'text' }, { name: 'trigger', type: 'text' }, { name: 'channel', type: 'enum', enum: ['whatsapp', 'email', 'push'] }, { name: 'template_key', type: 'text' }, { name: 'delay_min', type: 'int' }, { name: 'quiet_hours', type: 'json', nullable: true }, { name: 'enabled', type: 'bool' }] },
  { name: 'message_log', group: 'comms', label: { es: 'Registro de mensajes', en: 'Message log' }, description: { es: 'Todo lo enviado por WhatsApp, email o push.', en: 'Everything sent via WhatsApp, email or push.' },
    columns: [{ name: 'user_id', type: 'uuid', references: 'users', nullable: true }, { name: 'channel', type: 'enum', enum: ['whatsapp', 'email', 'push'] }, { name: 'template_key', type: 'text', nullable: true }, { name: 'automation_id', type: 'uuid', references: 'automations', nullable: true }, { name: 'status', type: 'enum', enum: ['queued', 'sent', 'delivered', 'read', 'failed'] }, { name: 'sent_at', type: 'timestamptz', nullable: true }, { name: 'payload', type: 'json', nullable: true, wide: true }] },

  // ---- system ----
  { name: 'audit_log', group: 'system', label: { es: 'Registro de actividad', en: 'Audit log' }, description: { es: 'Quién hizo qué, sobre qué entidad, cuándo (M-07).', en: 'Who did what, on which entity, when (M-07).' },
    columns: [{ name: 'actor_id', type: 'uuid', references: 'users', nullable: true }, { name: 'action', type: 'text' }, { name: 'entity', type: 'text' }, { name: 'entity_id', type: 'text', nullable: true }, { name: 'diff', type: 'json', nullable: true, wide: true }, { name: 'ip', type: 'text', nullable: true }] },
  { name: 'docs_entries', group: 'system', titleColumn: 'title', label: { es: 'Entradas de documentación', en: 'Docs entries' }, description: { es: 'Índice de docs/ para búsqueda y enlaces (los .md son la fuente).', en: 'Index of docs/ for search and links (the .md files are the source).' },
    columns: [{ name: 'path', type: 'text' }, { name: 'title', type: 'text' }, { name: 'kind', type: 'enum', enum: ['prompt', 'changelog', 'rule', 'guide', 'manual'] }, { name: 'page_codes', type: 'json', nullable: true }] },

  // ---- design ----
  { name: 'components', group: 'design', titleColumn: 'name', label: { es: 'Componentes', en: 'Components' }, description: { es: 'Índice de la biblioteca D-02 (los .meta.ts son la fuente).', en: 'Index of the D-02 library (the .meta.ts files are the source).' },
    columns: [{ name: 'name', type: 'text' }, { name: 'tier', type: 'enum', enum: ['atom', 'molecule', 'organism', 'template'] }, { name: 'states', type: 'json', nullable: true }, { name: 'used_by', type: 'json', nullable: true }] },
  { name: 'page_layouts', group: 'design', titleColumn: 'page_code', label: { es: 'Layouts de página', en: 'Page layouts' }, description: { es: 'Orden de secciones por página guardado desde el editor drag-and-drop.', en: 'Per-page section order saved from the drag-and-drop editor.' },
    columns: [{ name: 'page_code', type: 'text' }, { name: 'sections', type: 'json', description: 'ordered section names' }, { name: 'hidden', type: 'json', nullable: true, description: 'section names hidden' }, { name: 'updated_by', type: 'uuid', references: 'users', nullable: true }] },
];

export const tableRegistry: Record<string, TableDef & { allColumns: ColumnDef[] }> = Object.fromEntries(
  tables.map((t) => [t.name, { ...t, allColumns: [...BASE_COLUMNS, ...t.columns] }]),
);

export const tableNames = tables.map((t) => t.name);
export const TABLE_GROUPS: { id: TableGroup; label: Bi }[] = [
  { id: 'core', label: { es: 'Núcleo', en: 'Core' } },
  { id: 'people', label: { es: 'Personas', en: 'People' } },
  { id: 'schedule', label: { es: 'Horario', en: 'Schedule' } },
  { id: 'commerce', label: { es: 'Comercio', en: 'Commerce' } },
  { id: 'comms', label: { es: 'Comunicaciones', en: 'Comms' } },
  { id: 'system', label: { es: 'Sistema', en: 'System' } },
  { id: 'design', label: { es: 'Diseño', en: 'Design' } },
];

// ---- typed rows for the tables pages use directly ----
export interface ModalityRow extends BaseRow { slug: string; name_es: string; name_en: string; movement: 'enraiza' | 'fluye' | 'arde' | 'libera'; description: { es: string; en: string }; intensity: number; heated: boolean; duration_min: number; active: boolean }
export interface TeacherRow extends BaseRow { user_id: string | null; display_name: string; bio: { es: string; en: string }; photo_url: string | null; specialties: string[]; rate_per_class: number | null; active: boolean; rating_avg: number | null }
export interface RoomRow extends BaseRow { name: string; capacity: number; heated: boolean }
export interface ClassSessionRow extends BaseRow { template_id: string | null; title: string; modality_id: string; teacher_id: string; room_id: string; starts_at: string; ends_at: string; capacity: number; booked_count: number; level: string; status: 'scheduled' | 'cancelled' | 'completed'; cancel_reason: string | null }
export interface BookingRow extends BaseRow { user_id: string; session_id: string; status: 'booked' | 'checked_in' | 'cancelled' | 'no_show' | 'late_cancel'; paid_with: string; credit_id: string | null; checked_in_at: string | null; cancelled_at: string | null; rated: boolean }
export interface PlanRow extends BaseRow { slug: string; family: 'bienvenida' | 'membresia' | 'pausas' | 'regalos' | 'espacio'; name_es: string; name_en: string; description: { es: string; en: string }; price: number; period: 'once' | 'month' | 'year' | null; credits: number | null; validity_days: number | null; is_from_price: boolean; badge: { es: string; en: string } | null; active: boolean; sort: number }
export interface MembershipRow extends BaseRow { user_id: string; plan_id: string; status: string; starts_at: string; renews_at: string | null; ends_at: string | null }
export interface UserRow extends BaseRow { email: string; phone: string | null; status: string; locale: string | null }
export interface ProfileRow extends BaseRow { user_id: string; full_name: string; initials: string | null; photo_url: string | null; marketing_optin: boolean; whatsapp_verified: boolean }
export interface PaymentRow extends BaseRow { user_id: string; plan_id: string | null; amount: number; currency: string; method: string; provider: string; status: string; paid_at: string | null }
export interface IntentionRow extends BaseRow { user_id: string; date: string; movement: 'enraiza' | 'fluye' | 'arde' | 'libera' }
export interface PageLayoutRow extends BaseRow { page_code: string; sections: string[]; hidden: string[] | null; updated_by: string | null }
export interface CreditRow extends BaseRow { user_id: string; delta: number; reason: string; expires_at: string | null }
