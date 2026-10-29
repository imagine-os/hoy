import type { BaseRow } from '../schema';
import { tenant } from '../../tenant/tenant';
import { modalities as seedModalities, plans as seedPlans, teachers as seedTeachers, rooms as seedRooms } from '../seed/catalog';
import { contentArticles, faqEntries } from '../seed/content';
import { mediaAssets } from '../seed/media';
import { legalDocuments } from '../seed/legal';
import { buildStudioPolicies } from '../seed/studioPolicies';
import { toDay, toInstant } from './dates';

/**
 * Frontend table ↔ Company OS entity, field by field (contract §2). One adapter per launch table.
 * Frontend ids are Company OS record ids, so a reference column (`user_id`, `session_id`…) holds the target record's id:
 * `users.id` = `profiles.id` = `profiles.user_id` = the `person` id.
 *
 * Kinds of table:
 * - entity: read and written through the runtime API (`entity`, optionally written as `writeEntity`);
 * - static: content shipped in the production build (contract (F)): read only;
 * - sink: rows only the server writes (audit, message log): a client write is accepted and dropped, reads are empty;
 * - anything not listed is hidden in production (contract (H)): reads are empty, writes refuse `not_in_launch`.
 */

export interface CosRecord { id: string; data: Record<string, unknown>; createdAt?: string; updatedAt?: string; createdBy?: string | null }
export type Row = BaseRow & Record<string, unknown>;
export type Filter = Record<string, unknown>;

export interface Col {
  /** The Company OS field (or the pseudo-field `id`). Absent for a derived or constant column. */
  field?: string;
  kind?: 'day' | 'instant';
  /** Frontend value → Company OS value; `undefined` leaves the field out. Marks the column lossy for server-side paging. */
  to?: (value: unknown, row: Record<string, unknown>) => unknown;
  /** Company OS value → frontend value. */
  from?: (value: unknown, rec: CosRecord) => unknown;
  /** Every Company OS value that reads back as this frontend value (for server filters on many-to-one maps). */
  expand?: (value: unknown) => unknown[];
  /** No server filter or sort on this column (the field may be missing from the tenant): the browser does it. */
  browserOnly?: boolean;
  /** Set by the server: read, never sent. */
  readOnly?: boolean;
  /** Derived from the record; read only. Filters on it run in the browser. */
  derive?: (rec: CosRecord) => unknown;
}

export interface EntityAdapter {
  kind: 'entity';
  table: string;
  entity: string;
  /** Writes go to another entity (class_ledger rows are read from credit_entry, written as credit_lot). */
  writeEntity?: string;
  cols: Record<string, Col>;
  /** Always ANDed into reads (rooms are the `room` resources). */
  base?: Filter[];
  include?: { field: string; fields?: string[] }[];
  /** Data added to every create (before the row's own values). */
  createDefaults?: (row: Record<string, unknown>) => Record<string, unknown>;
  /** Replaces the generic field-by-field write for this table. */
  toData?: (patch: Record<string, unknown>, mode: 'create' | 'update') => Record<string, unknown>;
  /** The frontend id for a record (default the record id). */
  idOf?: (rec: CosRecord) => string;
  /** Final touch on a read row (static enrichment). */
  enrich?: (row: Row, rec: CosRecord) => Row;
  /** Refuse writes with this code. */
  readOnly?: string;
  /**
   * A create the server makes itself (the frontend's own bookkeeping row): accepted and dropped unless this says
   * it's a real write. class_ledger: the server writes the booking debit and every return; the browser only comps.
   */
  clientCreate?: (row: Record<string, unknown>) => boolean;
}
export interface StaticAdapter { kind: 'static'; table: string; rows: () => Row[] }
export interface SinkAdapter { kind: 'sink'; table: string }
export interface SessionAdapter { kind: 'session'; table: 'user_roles' }
/** The studio settings (AD-05): the one `tenants` row's `settings` JSON is the comms `setting` record with this key. */
export interface SettingsAdapter { kind: 'settings'; table: 'tenants'; key: string }
export type Adapter = EntityAdapter | StaticAdapter | SinkAdapter | SessionAdapter | SettingsAdapter;

// ---------------------------------------------------------------- helpers
const str = (v: unknown) => (v == null || v === '' ? null : String(v));
const num = (v: unknown) => (v == null || v === '' ? null : Number(v));
const bool = (v: unknown) => v === true || v === 'true' || v === 1;
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const refId = (v: unknown): unknown => (v && typeof v === 'object' && 'id' in (v as object) ? (v as { id: unknown }).id : v);
const embedded = (rec: CosRecord, field: string): Record<string, unknown> | null => {
  const v = rec.data[field];
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : null;
};
const bi = (v: unknown) => {
  if (v && typeof v === 'object' && 'es' in (v as object)) return v;
  const s = str(v) ?? '';
  return { es: s, en: s };
};
const biToText = (v: unknown) => (v && typeof v === 'object' ? str((v as { es?: unknown }).es) : str(v));

/** A two-way value table; unknown values pass through unchanged. */
function valueMap(toCos: Record<string, string>, fromCos: Record<string, string>): Pick<Col, 'to' | 'from' | 'expand'> {
  const to = (v: unknown) => (typeof v === 'string' && v in toCos ? toCos[v] : v);
  const from = (v: unknown) => (typeof v === 'string' && v in fromCos ? fromCos[v] : v ?? null);
  const known = [...new Set([...Object.keys(fromCos), ...Object.values(toCos)])];
  return { to, from, expand: (v) => [...new Set([to(v), ...known.filter((c) => from(c) === v)])] };
}

// ---------------------------------------------------------------- value tables (contract §2)
/** bookings.paid_with ↔ booking.entitlement. A pack, a trial and a membership all spend a class credit. */
export const PAID_WITH = valueMap(
  { package: 'credit', trial: 'credit', membership: 'credit', single: 'single', comp: 'comp', guest: 'guest' },
  { credit: 'package', single: 'single', comp: 'comp', guest: 'guest' },
);
/** payments.method ↔ payment.method. PSE is the online gateway; a bank QR is a transfer. */
export const PAYMENT_METHOD = valueMap(
  { pse: 'online_gateway', qr: 'transfer', gift_card: 'other' },
  { online_gateway: 'pse', card_terminal: 'card' },
);
export const PAYMENT_PROVIDER = valueMap({ wompi: 'gateway' }, { gateway: 'wompi' });
/** transfer_receipts.status ↔ payment.status. */
export const RECEIPT_STATUS = valueMap({ rejected: 'declined' }, { declined: 'rejected', voided: 'rejected', refunded: 'approved' });
/** plans.family ← product.kind. */
const FAMILY_OF_KIND: Record<string, string> = { single: 'bienvenida', trial: 'bienvenida', pack: 'paquetes', private: 'privadas', gift: 'regalos' };
const KIND_OF_FAMILY: Record<string, string> = { bienvenida: 'single', paquetes: 'pack', privadas: 'private', regalos: 'gift' };
/** /me role keys → frontend roles (`src/auth/roles.ts`). */
export const ROLE_OF_KEY: Record<string, string> = { super_admin: 'super_admin', administrator: 'admin', front_desk: 'front_desk', member: 'customer', treasurer: 'finance', booking_manager: 'coordinator', coach: 'teacher' };
/** class_ledger.reason ← credit_entry.reason (and, for a grant, the lot's source). */
function ledgerReason(rec: CosRecord): string {
  const reason = str(rec.data.reason);
  const lot = embedded(rec, 'lot');
  if (reason === 'grant') return ({ purchase: 'purchase', trial: 'purchase', gift: 'gift', courtesy: 'gift', comp: 'comp' } as Record<string, string>)[str(lot?.source) ?? ''] ?? 'purchase';
  if (reason === 'studio_cancel') return 'cancel_return';
  if (reason === 'adjustment') return Number(rec.data.delta) >= 0 ? 'comp' : 'expiry';
  return reason ?? 'booking';
}

// ---------------------------------------------------------------- static enrichment
/** Modalities live in the frontend (names ES/EN); a class carries the tenant field `modality` = the slug. */
export const modalityId = (slug: unknown) => (slug ? `mod_${String(slug)}` : null);
const slugOf = (id: unknown) => (typeof id === 'string' ? id.replace(/^mod_/, '') : id);
/** A class without the `modality` field (recipe gap) is matched by its title, e.g. "Pulso" or "Pulso con Carolina". */
function modalityFromTitle(title: unknown): string | null {
  const t = fold(String(title ?? ''));
  const m = t ? seedModalities.find((x) => t.includes(fold(x.name_es)) || t.includes(x.slug)) : undefined;
  return m?.id ?? null;
}
const modalityCol: Col = {
  field: 'modality', browserOnly: true,
  to: (v) => slugOf(v),
  from: (v, rec) => modalityId(v) ?? modalityFromTitle(rec.data.title),
};

// ---------------------------------------------------------------- adapters
const entity = (a: Omit<EntityAdapter, 'kind'>): EntityAdapter => ({ kind: 'entity', ...a });

const users = entity({
  table: 'users', entity: 'person',
  cols: {
    email: { field: 'email' }, phone: { field: 'phone' }, locale: { field: 'locale' },
    status: { derive: (r) => (r.data.user ? 'active' : 'invited') },
    last_sign_in_at: { derive: () => null },
  },
});

const profiles = entity({
  table: 'profiles', entity: 'person',
  cols: {
    user_id: { field: 'id', readOnly: true },
    full_name: { field: 'name' },
    birthday: { field: 'dob', kind: 'day' },
    initials: { derive: (r) => (str(r.data.name) ?? '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || null },
    photo_url: { derive: () => null }, emergency_contact: { derive: () => null }, notes: { derive: () => null },
    marketing_optin: { derive: () => false }, whatsapp_verified: { derive: () => false },
  },
});

const teachers = entity({
  table: 'teachers', entity: 'coach', include: [{ field: 'person', fields: ['name'] }],
  cols: {
    user_id: { field: 'person', from: (v) => refId(v) ?? null, readOnly: true },
    display_name: { derive: (r) => str(embedded(r, 'person')?.name) ?? '' },
    active: { field: 'active', from: (v) => v !== false },
    rate_per_class: { derive: () => null }, rating_avg: { derive: () => null },
  },
  /** Bio, photo and specialties are website content, matched to the coach by name. */
  enrich: (row) => {
    const seed = seedTeachers.find((t) => fold(t.display_name) === fold(String(row.display_name)));
    return { ...row, bio: seed?.bio ?? { es: '', en: '' }, photo_url: seed?.photo_url ?? null, specialties: seed?.specialties ?? [], certifications: (seed as { certifications?: unknown } | undefined)?.certifications ?? null };
  },
});

const rooms = entity({
  table: 'rooms', entity: 'resource', base: [{ field: 'kind', op: 'eq', value: 'room' }],
  cols: { name: { field: 'name' }, capacity: { field: 'capacity', from: num }, heated: { derive: () => false }, notes: { derive: () => null } },
  createDefaults: () => ({ kind: 'room' }),
  enrich: (row) => ({ ...row, heated: seedRooms.find((r) => fold(r.name) === fold(String(row.name)))?.heated ?? false }),
});

const classTemplates = entity({
  table: 'class_templates', entity: 'schedule',
  cols: {
    title: { field: 'title' }, modality_id: modalityCol,
    teacher_id: { field: 'coach', from: str }, room_id: { field: 'resource', from: str },
    weekday: { field: 'weekday', from: num },
    start_time: { field: 'start_time', to: (v) => (typeof v === 'string' ? v.slice(0, 5) : v) },
    duration_min: { field: 'duration_minutes', from: num }, capacity: { field: 'capacity', from: num },
    start_date: { field: 'valid_from', kind: 'day' }, end_date: { field: 'valid_until', kind: 'day' },
    active: { field: 'active', from: (v) => v !== false },
    level: { derive: () => 'all' }, generation_mode: { derive: () => 'automatic' }, theme: { derive: () => null }, description: { derive: () => null },
  },
  createDefaults: () => ({ kind: 'class' }),
});

const classSessions = entity({
  table: 'class_sessions', entity: 'occurrence',
  cols: {
    template_id: { field: 'schedule', from: str }, title: { field: 'title' }, modality_id: modalityCol,
    teacher_id: { field: 'coach', from: str }, room_id: { field: 'resource', from: str },
    starts_at: { field: 'starts_at', kind: 'instant' }, ends_at: { field: 'ends_at', kind: 'instant' },
    capacity: { field: 'capacity', from: num },
    booked_count: { field: 'booked_count', from: (v) => num(v) ?? 0, readOnly: true },
    status: { field: 'status' }, cancel_reason: { field: 'cancel_reason' },
    spots_enabled: { field: 'spots_enabled', from: bool },
    level: { derive: () => 'all' }, theme_override: { derive: () => null }, description_override: { derive: () => null },
  },
  createDefaults: () => ({ kind: 'class' }),
});

const bookings = entity({
  table: 'bookings', entity: 'booking', base: [{ field: 'occurrence', op: 'is_not_null' }],
  cols: {
    user_id: { field: 'person', from: str }, session_id: { field: 'occurrence', from: str },
    /** booked · held · checked_in · cancelled · late_cancel · no_show (the server decides held vs booked, and late_cancel). */
    status: { field: 'status' },
    paid_with: { field: 'entitlement', ...PAID_WITH },
    mat_number: { field: 'spot', from: num },
    payment_method: { field: 'payment_method' }, source: { field: 'source' }, reason: { field: 'reason' },
    hold_until: { field: 'hold_until', kind: 'instant', readOnly: true },
    hold_frozen_at: { field: 'hold_frozen_at', kind: 'instant', readOnly: true },
    checked_in_at: { field: 'checked_in_at', kind: 'instant', readOnly: true },
    cancelled_at: { field: 'cancelled_at', kind: 'instant', readOnly: true },
    cancel_reason: { field: 'cancel_reason', readOnly: true },
    policy_late_cancel_hours: { field: 'policy_late_cancel_hours', from: num, readOnly: true },
    policy_reschedule_hours: { field: 'policy_reschedule_hours', from: num, readOnly: true },
    policy_hold_minutes: { field: 'policy_hold_minutes', from: num, readOnly: true },
    hold_left_minutes: { field: 'hold_left_minutes', from: num, readOnly: true },
    ledger_id: { derive: () => null }, payment_id: { derive: () => null }, rated: { derive: () => false },
  },
});

const plans = entity({
  table: 'plans', entity: 'product',
  cols: {
    slug: { field: 'key' }, name_es: { field: 'name' }, kind: { field: 'kind' },
    price: { field: 'price', from: (v) => num(v) ?? 0 },
    classes: { field: 'credits', from: num }, validity_days: { field: 'validity_days', from: num },
    active: { field: 'active', from: (v) => v !== false }, freezable: { field: 'freezable', from: bool },
    audience: { field: 'audience' },
    valid_from: { field: 'valid_from', from: str }, valid_until: { field: 'valid_until', from: str },
    family: { field: 'kind', from: (v) => FAMILY_OF_KIND[String(v)] ?? 'paquetes', to: (v, row) => (row.kind as string | undefined) ?? KIND_OF_FAMILY[String(v)] ?? 'pack' },
  },
  /** English name, description, badge and order are website content, matched by the product key. */
  enrich: (row) => {
    const seed = seedPlans.find((p) => p.slug === row.slug);
    return { ...row, name_en: seed?.name_en ?? row.name_es, description: seed?.description ?? { es: '', en: '' }, badge: seed?.badge ?? null, is_from_price: seed?.is_from_price ?? false, period: seed?.period ?? 'once', sort: seed?.sort ?? 999, family: seed?.family ?? row.family };
  },
});

const payments = entity({
  table: 'payments', entity: 'payment',
  cols: {
    user_id: { field: 'person', from: str }, plan_id: { field: 'product', from: str },
    amount: { field: 'amount', from: num },
    /** The desk approves with the amount received: it becomes the payment's amount (with a reason when it differs). */
    amount_paid: { field: 'amount', from: (v, r) => (r.data.status === 'approved' ? num(v) : null), to: (v) => (v == null ? undefined : v) },
    method: { field: 'method', ...PAYMENT_METHOD }, provider: { field: 'provider', ...PAYMENT_PROVIDER },
    provider_ref: { field: 'provider_ref' }, status: { field: 'status' }, note: { field: 'notes' },
    reference: { field: 'reference' }, concept: { field: 'concept' }, price_override_reason: { field: 'price_override_reason' },
    for_entity: { field: 'for_entity' }, for_id: { field: 'for_id' }, date: { field: 'date', kind: 'day' },
    paid_at: { derive: (r) => (r.data.status === 'approved' ? toInstant(r.updatedAt) : null) },
    currency: { derive: () => 'COP' }, taken_by: { derive: () => null }, frontend_receipt: { derive: () => null },
  },
  /** `concept` is required by payments; the desk or the screen may send its own. */
  createDefaults: () => ({ date: toDay(new Date()), provider: 'manual', concept: 'Compra' }),
});

const transferReceipts = entity({
  table: 'transfer_receipts', entity: 'payment', base: [{ field: 'method', op: 'eq', value: 'transfer' }],
  cols: {
    payment_id: { field: 'id', readOnly: true }, user_id: { field: 'person', from: str },
    product_id: { field: 'product', from: str }, amount_received: { field: 'amount', from: num },
    status: { field: 'status', ...RECEIPT_STATUS },
    booking_id: { field: 'for_id', from: (v, r) => (r.data.for_entity === 'booking' ? str(v) : null) },
    review_reason: { derive: (r) => str(r.data.price_override_reason) ?? str(r.data.notes) },
    reviewed_at: { derive: (r) => (r.data.status && r.data.status !== 'pending' ? toInstant(r.updatedAt) : null) },
    session_id: { derive: () => null }, mat_number: { derive: () => null }, product_name: { derive: () => null },
    classes: { derive: () => null }, expires_at: { derive: () => null }, image_data_url: { derive: () => null },
    file_name: { derive: () => null }, mime_type: { derive: () => null }, byte_size: { derive: () => null }, reviewed_by: { derive: () => null },
  },
  /** A receipt is a pending transfer payment for the booking; the image is a `receipt` file on it (`uploadFile`). */
  toData: (p, mode) => {
    const d: Record<string, unknown> = {};
    if (mode === 'create') Object.assign(d, { status: 'pending', method: 'transfer', provider: 'manual', date: toDay(new Date()), concept: 'Transferencia' });
    if ('concept' in p) d.concept = p.concept;
    if ('reference' in p) d.reference = p.reference;
    if ('user_id' in p) d.person = p.user_id;
    if ('product_id' in p) d.product = p.product_id;
    if ('amount_received' in p) d.amount = p.amount_received;
    if ('booking_id' in p) { d.for_entity = p.booking_id ? 'booking' : null; d.for_id = p.booking_id ?? null; }
    if ('status' in p) d.status = RECEIPT_STATUS.to!(p.status, p);
    if ('review_reason' in p) d[p.status === 'approved' ? 'price_override_reason' : 'notes'] = p.review_reason;
    return d;
  },
});

/**
 * class_ledger rows are credit entries, read with their lot. A lot's grant entry takes the lot's id, so the
 * frontend's "purchase row" is the lot: freezing it (`frozen_from`/`frozen_until`) or moving its expiry updates the lot.
 * A desk comp (insert with delta > 0) creates a lot; nothing else is written by the browser (the server issues lots).
 */
const classLedger = entity({
  table: 'class_ledger', entity: 'credit_entry', writeEntity: 'credit_lot',
  clientCreate: (r) => Boolean(r.voucher_code) || (['comp', 'gift'].includes(String(r.reason)) && Number(r.delta) > 0),
  include: [{ field: 'lot', fields: ['source', 'valid_until', 'frozen_from', 'frozen_until', 'product', 'payment', 'freezable', 'freezes_used'] }],
  idOf: (r) => (r.data.reason === 'grant' && refId(r.data.lot) ? String(refId(r.data.lot)) : r.id),
  cols: {
    user_id: { field: 'person', from: str }, delta: { field: 'delta', from: num },
    reason: { derive: ledgerReason },
    purchase_ledger_id: { derive: (r) => (r.data.reason === 'grant' ? null : str(refId(r.data.lot))) },
    lot_id: { field: 'lot', from: (v) => str(refId(v)), readOnly: true },
    plan_id: { derive: (r) => str(embedded(r, 'lot')?.product) },
    payment_id: { derive: (r) => str(embedded(r, 'lot')?.payment) },
    expires_at: { derive: (r) => toDay(embedded(r, 'lot')?.valid_until) },
    frozen_from: { derive: (r) => toDay(embedded(r, 'lot')?.frozen_from) },
    frozen_until: { derive: (r) => toDay(embedded(r, 'lot')?.frozen_until) },
    freezable: { derive: (r) => bool(embedded(r, 'lot')?.freezable) },
    booking_id: { field: 'booking', from: str, readOnly: true },
  },
  toData: (p, mode) => {
    const d: Record<string, unknown> = {};
    if (mode === 'create') {
      if (p.voucher_code) return { person: p.user_id, voucher_code: p.voucher_code };
      Object.assign(d, { person: p.user_id, source: p.reason === 'gift' ? 'gift' : 'comp', quantity: p.delta });
      if (p.expires_at) d.valid_until = toDay(p.expires_at);
      if (p.note) d.notes = p.note;
      return d;
    }
    if ('frozen_from' in p) d.frozen_from = toDay(p.frozen_from);
    if ('frozen_until' in p) d.frozen_until = toDay(p.frozen_until);
    if ('expires_at' in p) d.valid_until = toDay(p.expires_at);
    if ('adjustment_reason' in p) d.adjustment_reason = p.adjustment_reason;
    return d;
  },
});

/** The app's voucher extras (pesos, attendee caps, per-booking scope, restore-on-cancel) are hidden in production. */
const vouchers = entity({
  table: 'vouchers', entity: 'voucher',
  cols: {
    code: { field: 'code', readOnly: true },
    title: { field: 'note', from: (v) => str(v) ?? '' },
    message: { field: 'note', from: (v) => str(v) ?? '' },
    source: { field: 'kind', ...valueMap({ purchased_gift: 'gift', admin_invitation: 'courtesy' }, { gift: 'purchased_gift', courtesy: 'admin_invitation' }) },
    benefitTotal: { field: 'classes', from: num },
    balance: { derive: (r) => (Number(r.data.uses ?? 0) >= Number(r.data.max_uses ?? 1) ? 0 : Number(r.data.classes ?? 0)) },
    expiresAt: { field: 'valid_until', kind: 'day' },
    recipientName: { field: 'recipient_name', from: (v) => str(v) ?? '' },
    recipientContact: { field: 'recipient_email', from: (v) => str(v) ?? '' },
    claimedBy: { field: 'redeemed_by', from: (v) => str(refId(v)), readOnly: true },
    status: { derive: (r) => (Number(r.data.uses ?? 0) > 0 ? 'claimed' : 'issued') },
    uses: { field: 'uses', from: (v) => num(v) ?? 0, readOnly: true },
    max_uses: { field: 'max_uses', from: (v) => num(v) ?? 1 },
    benefitKind: { derive: () => 'classes' }, participantCap: { derive: () => 1 }, capScope: { derive: () => 'lifetime' },
    creditUnit: { derive: () => 'per_person' }, cancellationPolicy: { derive: () => 'forfeit' },
    issuedBy: { derive: (r) => str(r.createdBy) ?? '' },
  },
});

const invoices = entity({
  table: 'invoices', entity: 'invoice', readOnly: 'invoice_system_managed',
  cols: {
    payment_id: { field: 'payment', from: str }, number: { field: 'number', from: str },
    subtotal: { field: 'subtotal', from: num }, tax: { field: 'tax', from: (v) => num(v) ?? 0 }, total: { field: 'total', from: num },
    issued_at: { field: 'issued_at', kind: 'instant' }, kind: { field: 'kind' },
    pdf_url: { derive: () => null }, dian_cufe: { derive: () => null },
  },
});

const featureFlags = entity({
  table: 'feature_flags', entity: 'feature_flag',
  cols: {
    key: { field: 'key' }, enabled: { field: 'enabled', from: bool },
    label: { field: 'description', from: (v, r) => str(v) ?? str(r.data.key) },
    audience: { field: 'visible_to' }, page_code: { derive: () => null },
  },
});

const legalAcceptances = entity({
  table: 'legal_acceptances', entity: 'policy_acceptance',
  cols: {
    user_id: { field: 'person', from: str }, kind: { field: 'policy' }, version: { field: 'version' },
    accepted_at: { field: 'accepted_at', kind: 'instant', readOnly: true },
    document_id: { derive: () => null }, channel: { derive: () => 'app' }, ip: { derive: () => null },
  },
});

const consents = entity({
  table: 'consents', entity: 'consent',
  cols: {
    user_id: { field: 'person', from: str }, purpose: { field: 'purpose' }, version: { field: 'version' },
    accepted_at: { field: 'granted_at', kind: 'instant' }, revoked: { field: 'revoked', from: bool },
    legal_document_id: { derive: () => null }, ip: { derive: () => null },
  },
});

const notifications = entity({
  table: 'notifications', entity: 'notification',
  cols: {
    user_id: { field: 'person', from: str }, title: { field: 'title', from: bi, to: biToText }, body: { field: 'body', from: bi, to: biToText },
    kind: { field: 'category', from: (v) => str(v) ?? 'studio' }, deep_link: { field: 'link' },
    read_at: { field: 'read_at', kind: 'instant' }, sent_via: { derive: () => 'in_app' },
  },
});

const notificationPrefs = entity({
  table: 'notification_prefs', entity: 'notification_pref',
  cols: { user_id: { field: 'person', from: str }, channel: { field: 'channel' }, category: { field: 'category' }, enabled: { field: 'enabled', from: (v) => v !== false } },
});

const emailTemplates = entity({
  table: 'email_templates', entity: 'message_template',
  cols: {
    key: { field: 'key' }, name: { field: 'key', readOnly: true }, subject: { field: 'subject', from: bi, to: biToText },
    body_mjml: { field: 'body' }, active: { field: 'active', from: (v) => v !== false }, channel: { field: 'channel' },
    locale: { field: 'locale' },
    audience: { derive: () => 'customer' }, trigger: { derive: () => null }, priority: { derive: () => 'launch' }, version: { derive: () => 1 },
  },
});

const automations = entity({
  table: 'automations', entity: 'automation',
  cols: {
    name: { field: 'name' }, trigger: { field: 'event' }, template_key: { field: 'template' },
    channel: { field: 'channels', from: (v) => (Array.isArray(v) ? v[0] ?? 'email' : 'email'), to: (v) => [v] },
    delay_min: { field: 'delay_minutes', from: (v) => num(v) ?? 0 }, enabled: { field: 'active', from: (v) => v !== false },
    quiet_hours: { derive: () => null },
  },
});

/** Reception and admin expenses (Q-13, M-09c): tenant entities `expense` / `expense_template` with the frontend's own field names. */
const expenseCols = (names: string[], days: string[] = []): Record<string, Col> =>
  Object.fromEntries(names.map((n) => [n, days.includes(n) ? { field: n, kind: 'day' as const } : { field: n }]));
const expenses = entity({
  table: 'expenses', entity: 'expense',
  cols: { ...expenseCols(['kind', 'category', 'concept', 'amount', 'incurred_on', 'paid_on', 'method', 'vendor', 'note', 'template_id'], ['incurred_on', 'paid_on']), created_by: { derive: (r) => str(r.createdBy) } },
});
/** `ExpenseTemplateRow`: the app's `anchor_day` is the entity's `day_of_month`; a template has no kind or method. */
const expenseTemplates = entity({
  table: 'expense_templates', entity: 'expense_template',
  cols: { ...expenseCols(['concept', 'category', 'amount', 'cadence', 'vendor', 'note', 'active']), anchor_day: { field: 'day_of_month' } },
});

const fixed = (table: string, rows: () => BaseRow[]): StaticAdapter => ({ kind: 'static', table, rows: () => rows() as Row[] });

const ADAPTERS: Adapter[] = [
  users, profiles, teachers, rooms, classTemplates, classSessions, bookings, plans, payments, transferReceipts,
  classLedger, vouchers, invoices, featureFlags, legalAcceptances, consents, notifications, notificationPrefs,
  emailTemplates, automations, expenses, expenseTemplates,
  { kind: 'session', table: 'user_roles' },
  { kind: 'settings', table: 'tenants', key: 'studio_settings' },
  fixed('modalities', () => seedModalities),
  fixed('content_articles', () => contentArticles),
  fixed('faq_entries', () => faqEntries),
  fixed('media_assets', () => mediaAssets),
  fixed('studio_policies', buildStudioPolicies),
  fixed('legal_documents', () => legalDocuments),
  { kind: 'sink', table: 'audit_log' }, { kind: 'sink', table: 'message_log' }, { kind: 'sink', table: 'activity_events' },
];

export const adapters: Record<string, Adapter> = Object.fromEntries(ADAPTERS.map((a) => [a.table, a]));
export const adapterFor = (table: string): Adapter | null => adapters[table] ?? null;

/**
 * Tables whose rows a write to this one can change on the server, so their subscribers refetch after it
 * (a booking moves the class's count and the credit ledger; an approved payment confirms a hold and issues a lot…).
 */
export const RELATED: Record<string, string[]> = {
  bookings: ['class_sessions', 'class_ledger', 'payments', 'transfer_receipts'],
  class_sessions: ['bookings', 'class_ledger'],
  class_templates: ['class_sessions'],
  payments: ['bookings', 'class_ledger', 'invoices', 'transfer_receipts', 'class_sessions'],
  transfer_receipts: ['payments', 'bookings', 'class_ledger', 'invoices', 'class_sessions'],
  class_ledger: ['bookings'],
  vouchers: ['class_ledger'],
  users: ['profiles', 'user_roles'],
  profiles: ['users'],
  user_roles: ['users', 'profiles'],
};

// ---------------------------------------------------------------- conversion
export function fromRecord(a: EntityAdapter, rec: CosRecord): Row {
  const row: Row = { id: a.idOf ? a.idOf(rec) : rec.id, tenant_id: tenant.id, created_at: toInstant(rec.createdAt) ?? '', updated_at: toInstant(rec.updatedAt ?? rec.createdAt) ?? '' };
  for (const [col, c] of Object.entries(a.cols)) {
    if (c.derive) { row[col] = c.derive(rec); continue; }
    if (!c.field) continue;
    let v: unknown = c.field === 'id' ? rec.id : rec.data[c.field];
    if (c.kind === 'day') v = toDay(v);
    else if (c.kind === 'instant') v = toInstant(v);
    row[col] = c.from ? c.from(v, rec) : v ?? null;
  }
  return a.enrich ? a.enrich(row, rec) : row;
}

/** A frontend row or patch → Company OS `data`. Unknown, derived and server-set columns are dropped. */
export function toData(a: EntityAdapter, patch: Record<string, unknown>, mode: 'create' | 'update'): Record<string, unknown> {
  if (a.toData) return a.toData(patch, mode);
  const data: Record<string, unknown> = mode === 'create' && a.createDefaults ? { ...a.createDefaults(patch) } : {};
  for (const [col, value] of Object.entries(patch)) {
    const c = a.cols[col];
    if (!c || !c.field || c.field === 'id' || c.readOnly || c.derive) continue;
    let v = value;
    if (c.kind === 'day') v = toDay(v);
    else if (c.kind === 'instant') v = toInstant(v);
    const out = c.to ? c.to(v, patch) : v;
    if (out !== undefined) data[c.field] = out;
  }
  return data;
}
