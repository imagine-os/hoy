import type { BaseRow } from '../schema';
import { applyQuery, type ChangeEvent, type DataProvider, type Query } from '../types';
import type { VoucherCommand, VoucherResult, VoucherRow } from '../vouchers';
import type { PromotionResult } from '../promotions';
import { tenant } from '../../tenant/tenant';
import { adapterFor, fromRecord, refId, toData, RELATED, ROLE_OF_KEY, type CosRecord, type EntityAdapter, type LegalAdapter, type MessagesAdapter, type Row, type SettingsAdapter } from './mapping';
import { mergeSettingsRecords, sameJson, splitSettings } from './settingsSplit';
import { closedDatesOf, formatClosedDates, parseClosedDates } from './closedDates';
import { planQuery, PAGE, type QuerySpec } from './query';
import { CompanyOSError, Transport, newIdempotencyKey, normalizeCode, onTokenSourceChange, wireKey, type TransportOptions } from './transport';
import { toDay, today as studioToday } from './dates';
import { onViewAsChange, viewAsPersonId } from '../../auth/viewAs';

/** Contract §1: `subscribe()` polls every 20 s on the screens that ask for it (`useLiveUpdates`). */
export const POLL_MS = 20_000;
/** A list reads at most this many pages of 500 rows (10 000 rows): studio scale, with a ceiling. */
const MAX_PAGES = 20;
const MAX_OPS = 200;

export interface CompanyOSProviderOptions extends TransportOptions {
  pollMs?: number;
  /** How long after the last hours-override write the bookings closed dates are synced (coalesces an import). */
  closedDatesDelayMs?: number;
  /** The studio's today (YYYY-MM-DD); tests pin it. */
  today?: () => string;
}

export interface CompanyOSMe {
  personId: string | null;
  userId: string | null;
  roleKeys: string[];
  /** The frontend roles (`src/auth/roles.ts`) for those keys. */
  roles: string[];
  caps: string[];
  isSuperAdmin: boolean;
  timezone: string | null;
}

/**
 * Signed out, the website reads these live: the Hoy server answers them with its read-only identity (`public_site`,
 * ADR 0029), whose policies hide the private class (J4), who booked and people's contact details. Every other table
 * reads as empty signed out, without asking Company OS. Lane H2 adds the studio's public settings record (`tenants`),
 * the holiday hours and the booked mats (a booking's class and mat only).
 */
const PUBLIC_TABLES = new Set(['plans', 'teachers', 'rooms', 'class_templates', 'class_sessions', 'tenants', 'hours_overrides', 'bookings']);
const isForbidden = (e: unknown) => e instanceof CompanyOSError && e.code === 'forbidden';

type Op = { op: 'create' | 'update' | 'delete'; entity: string; id?: string; data?: Record<string, unknown>; token?: string; table: string; dropped?: boolean };
type Pending = { body: { ops: unknown[] }; result: unknown; tokens: string[]; tables: string[] };

const TOKEN = /^cos-new-\d+-\d+$/;
const stamp = () => new Date().toISOString();
const unwrap = (body: unknown): CosRecord => (body as { data: CosRecord }).data;
const clone = <T>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)) as T);

const plain = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && [Object.prototype, null].includes(Object.getPrototypeOf(v));

/** Every string token in a value replaced by the id the batch gave it (plain objects and arrays only). */
function resolveTokens<T>(value: T, ids: Map<string, string>): T {
  if (typeof value === 'string') return (ids.get(value) ?? value) as T;
  if (Array.isArray(value)) return value.map((v) => resolveTokens(v, ids)) as T;
  if (plain(value)) return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveTokens(v, ids)])) as T;
  return value;
}
function hasToken(value: unknown): boolean {
  if (typeof value === 'string') return TOKEN.test(value);
  if (Array.isArray(value)) return value.some(hasToken);
  if (value && typeof value === 'object') return Object.values(value).some(hasToken);
  return false;
}

/**
 * The production `DataProvider`: every page read and write goes to Company OS through the Hoy server.
 * - `list/get/insert/update/remove` → `POST /query`, `GET|POST|PATCH|DELETE /api/:entity[/:id]`, mapped by `mapping.ts`.
 * - `atomic(fn, { idempotencyKey })` → the callback's writes become one `POST /batch` (all or nothing), sent with one
 *   `Idempotency-Key` per user action. After a lost answer, a retry with the same key resends the first body when the
 *   callback produces it again; a changed body goes out under the same key, so the server answers `idempotency_conflict`
 *   if the first one had committed (ADR 0040): never a second write, never the old choice booked silently.
 * - `subscribe` → refetch after every own write (and the tables it changes on the server), plus 20-second polling only
 *   while a screen holds `watch()` (`useLiveUpdates`).
 */
export class CompanyOSProvider implements DataProvider {
  readonly name = 'companyos';
  readonly transport: Transport;
  private readonly pollMs: number;
  private listeners = new Map<string, Set<(e: ChangeEvent) => void>>();
  private watchers = new Map<number, string[]>();
  private watchSeq = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private inflight = new Map<string, Promise<Row[]>>();
  private pending = new Map<string, Pending>();
  private meCache: Promise<CompanyOSMe | null> | null = null;
  private meFor: string | null = null;
  private tokenSeq = 0;
  private running = new Map<string, Promise<unknown>>();
  private readonly closedDatesDelayMs: number;
  private readonly today: () => string;
  private closedTimer: ReturnType<typeof setTimeout> | null = null;
  private closedRun: Promise<void> = Promise.resolve();

  constructor(options: CompanyOSProviderOptions = {}) {
    this.transport = new Transport(options);
    this.pollMs = options.pollMs ?? POLL_MS;
    this.closedDatesDelayMs = options.closedDatesDelayMs ?? 1500;
    this.today = options.today ?? studioToday;
    onTokenSourceChange(() => { this.meCache = null; this.emitAll(); });
    // View-as (lane D): "my" records become the sample person's (or the real person's again); every screen reads again.
    onViewAsChange(() => { this.inflight.clear(); this.emitAll(); });
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (!document.hidden && this.watchers.size) this.tick(); });
  }

  // ------------------------------------------------------------ reads
  async list<T extends BaseRow = BaseRow>(table: string, query?: Query): Promise<T[]> {
    const a = adapterFor(table);
    if (!a || a.kind === 'sink') return [];
    if (a.kind === 'static') return applyQuery(clone(a.rows()), query) as unknown as T[];
    if (a.kind === 'legal') return applyQuery(await this.legalRows(a), query) as unknown as T[];
    if (!(await this.transport.signedIn())) {
      if (!PUBLIC_TABLES.has(table)) return [];
      if (a.kind === 'settings') return applyQuery([tenantRow(await this.settingsRecords(a))], query) as unknown as T[];
      return (a.kind === 'entity' ? await this.publicList(a, query) : []) as unknown as T[];
    }
    if (a.kind === 'session') return applyQuery(await this.roleRows(), query) as unknown as T[];
    if (a.kind === 'settings') return applyQuery([tenantRow(await this.settingsRecords(a))], query) as unknown as T[];
    if (a.kind === 'messages') return this.listMessages(a, query) as unknown as Promise<T[]>;
    const self = await this.self();
    const q = query?.where ? { ...query, where: inbound(table, query.where, self) } : query;
    const key = `${table}|${JSON.stringify(q ?? null)}`;
    let p = this.inflight.get(key);
    if (!p) {
      // A write drops the table's entries (`changed`), so the cleanup removes only this read's own entry.
      const read: Promise<Row[]> = (this.listEntity(a, q) as Promise<Row[]>)
        .catch((e) => { if (a.forbiddenAsEmpty && isForbidden(e)) return [] as Row[]; throw e; })
        .finally(() => { if (this.inflight.get(key) === read) this.inflight.delete(key); });
      p = read;
      this.inflight.set(key, p);
    }
    return (await p).map((r) => outbound(table, clone(r), self)) as unknown as T[];
  }

  /** A signed-out read of a public table, shared by concurrent callers; never shared with a signed-in read. */
  private async publicList(a: EntityAdapter, query?: Query): Promise<Row[]> {
    const key = `public|${a.table}|${JSON.stringify(query ?? null)}`;
    let p = this.inflight.get(key);
    if (!p) {
      const scoped = a.signedOutBase ? { ...a, base: [...(a.base ?? []), ...a.signedOutBase()] } : a;
      const read: Promise<Row[]> = this.listEntity(scoped, query).finally(() => { if (this.inflight.get(key) === read) this.inflight.delete(key); });
      p = read;
      this.inflight.set(key, p);
    }
    return (await p).map((r) => (a.signedOutRow ? a.signedOutRow(clone(r)) : clone(r)));
  }

  /** The staff inbox: the comms log and the staff notes this role may read, as one list. */
  private async listMessages(a: MessagesAdapter, query?: Query): Promise<Row[]> {
    const self = await this.self();
    const q = query?.where ? { ...query, where: inbound(a.table, query.where, self) } : query;
    const parts = await Promise.all([a.log, a.note].map((part) => this.listEntity(part, q ? { where: q.where } : undefined).catch((e) => {
      if (isForbidden(e)) return [] as Row[];
      throw e;
    })));
    return applyQuery(parts.flat(), q).map((r) => outbound(a.table, clone(r), self));
  }

  /**
   * The signed-in user's two ids. The session (H-2) knows a Company OS **user** id; records point at the **person**.
   * Inbound, a `user_id` (and a `users` id) equal to the user id becomes the person id; outbound, the reverse, so
   * `where: { user_id: session.userId }` finds one's own rows. Other people's rows keep their person ids.
   * While a super admin views as another role (lane D), the session user is aliased to the sample person instead, so the
   * same screens show that person's records (read-only: the transport refuses writes).
   */
  async self(): Promise<{ userId: string; personId: string } | null> {
    const me = await this.me().catch(() => null);
    const personId = viewAsPersonId() ?? me?.personId;
    return me?.userId && personId && me.userId !== personId ? { userId: me.userId, personId } : null;
  }

  /**
   * credits 1.2.0 (lane H3): a studio cancel of a paid single class issues a one-class lot whose only entry is its
   * `studio_cancel` return, with no `grant`. The ledger reads that entry as the lot's opening (id = the lot id, no
   * purchase row), so the class counts in the balance and later debits on the lot attach to it (lane H2).
   */
  private async ledgerOpenings(rows: Row[]): Promise<Row[]> {
    const returns = rows.filter((r) => r.reason === 'cancel_return' && typeof r.purchase_ledger_id === 'string');
    if (!returns.length) return rows;
    const lots = [...new Set(returns.map((r) => r.purchase_ledger_id as string))];
    const granted = new Set((await this.query({ entity: 'credit_entry', filter: { and: [{ field: 'lot', op: 'in', value: lots }, { field: 'reason', op: 'eq', value: 'grant' }] }, limit: lots.length + 1 }))
      .map((e) => String(refId(e.data.lot))));
    const opened = new Set<string>();
    return rows.map((r) => {
      const lot = r.purchase_ledger_id as string;
      if (r.reason !== 'cancel_return' || typeof lot !== 'string' || granted.has(lot) || opened.has(lot) || rows.some((x) => x.id === lot)) return r;
      opened.add(lot);
      return { ...r, id: lot, purchase_ledger_id: null };
    });
  }

  private async listEntity(a: EntityAdapter, q?: Query): Promise<Row[]> {
    if (a.table === 'class_ledger') return this.ledgerOpenings(await this.listEntityRaw(a, q));
    return this.listEntityRaw(a, q);
  }

  private async listEntityRaw(a: EntityAdapter, q?: Query): Promise<Row[]> {
    const { spec, exact } = planQuery(a, q);
    const want = q?.limit != null ? (q.offset ?? 0) + q.limit : null;
    if (exact && want != null && want <= PAGE) {
      const rows = await this.query({ ...spec, limit: q!.limit, offset: q!.offset });
      return rows.map((r) => fromRecord(a, r));
    }
    const all = new Map<string, CosRecord>();
    for (let page = 0; ; page++) {
      if (page === MAX_PAGES) { console.warn(`[companyos] ${a.table}: stopped at ${MAX_PAGES * PAGE} rows; narrow the query`); break; }
      const rows = await this.query({ ...spec, limit: PAGE, offset: page * PAGE });
      for (const r of rows) all.set(r.id, r); // offset pages can overlap while rows are written
      if (rows.length < PAGE || (exact && want != null && all.size >= want)) break;
    }
    return applyQuery([...all.values()].map((r) => fromRecord(a, r)), q);
  }

  private async query(spec: QuerySpec): Promise<CosRecord[]> {
    const res = await this.transport.request<{ data: CosRecord[] }>('POST', '/query', { body: spec });
    return res.body?.data ?? [];
  }

  async get<T extends BaseRow = BaseRow>(table: string, id: string): Promise<T | null> {
    const a = adapterFor(table);
    if (table === 'class_ledger' && a?.kind === 'entity' && (await this.transport.signedIn())) {
      // A ledger id is a lot id (its grant row) or an entry id: one query for either, not a scan of the ledger.
      const self = await this.self();
      const rows = await this.query({ entity: a.entity, include: a.include, filter: { or: [{ and: [{ field: 'lot', op: 'eq', value: id }, { field: 'reason', op: 'in', value: ['grant', 'studio_cancel'] }] }, { field: 'id', op: 'eq', value: id }] }, limit: 50 });
      const row = (await this.ledgerOpenings(rows.map((r) => fromRecord(a, r)))).find((r) => r.id === id);
      return row ? (outbound(table, row, self) as unknown as T) : null;
    }
    if (!a || a.kind !== 'entity' || a.idOf || a.base) return ((await this.list<T>(table, { where: { id } }))[0] ?? null);
    const signedIn = await this.transport.signedIn();
    if (!signedIn && !PUBLIC_TABLES.has(table)) return null;
    const self = signedIn ? await this.self() : null;
    try {
      const res = await this.transport.request('GET', `/api/${a.entity}/${encodeURIComponent(selfId(table, id, self))}`);
      return outbound(table, fromRecord(a, unwrap(res.body)), self) as unknown as T;
    } catch (e) {
      if (e instanceof CompanyOSError && e.code === 'not_found') return null;
      throw e;
    }
  }

  /** The signed-in user: `GET /me` plus their own `person` record. Null when signed out. */
  async me(): Promise<CompanyOSMe | null> {
    const subject = await this.transport.subject();
    if (subject !== this.meFor) { this.meCache = null; this.meFor = subject; }
    if (!this.meCache) {
      this.meCache = (async () => {
        if (!(await this.transport.signedIn())) { this.meCache = null; return null; }
        const me = (await this.transport.request<{ user?: { id?: string }; roleKeys?: string[]; caps?: string[]; isSuperAdmin?: boolean; tenant?: { timezone?: string } }>('GET', '/me')).body ?? {};
        const person = (await this.query({ entity: 'person', filter: { field: 'user', op: 'eq', value: { $me: true } }, limit: 1 }))[0];
        const roleKeys = [...(me.roleKeys ?? []), ...(me.isSuperAdmin && !(me.roleKeys ?? []).includes('super_admin') ? ['super_admin'] : [])];
        return {
          personId: person?.id ?? null, userId: me.user?.id ?? null, roleKeys,
          roles: [...new Set(roleKeys.map((k) => ROLE_OF_KEY[k] ?? k))], caps: me.caps ?? [],
          isSuperAdmin: Boolean(me.isSuperAdmin), timezone: me.tenant?.timezone ?? null,
        };
      })().catch((e) => { this.meCache = null; throw e; });
    }
    return this.meCache;
  }

  /** `user_roles` for the signed-in person only, from `/me` (no client reads another user's roles). */
  private async roleRows(): Promise<Row[]> {
    const me = await this.me();
    if (!me?.personId) return [];
    const at = stamp();
    return me.roles.map((role) => ({ id: `role_${me.personId}_${role}`, tenant_id: tenant.id, created_at: at, updated_at: at, user_id: me.userId ?? me.personId, role, granted_by: null }));
  }

  // ------------------------------------------------------------ writes
  /** `options.idempotencyKey`: pass the action's key (`useActionKey`) so a user's own retry can't create twice. */
  async insert<T extends BaseRow = BaseRow>(table: string, row: Partial<T>, options: { idempotencyKey?: string } = {}): Promise<T> {
    const settings = this.settingsAdapter(table);
    if (settings) return this.saveSettings(settings, row as Record<string, unknown>) as unknown as Promise<T>;
    const a = this.writable(table, row as Record<string, unknown>);
    const self = a ? await this.self() : null;
    const r = inbound(table, row as Record<string, unknown>, self);
    if (!a || a !== 'member' && a.clientCreate && !a.clientCreate(r)) return this.sinkRow(r) as unknown as T;
    const key = options.idempotencyKey ? wireKey(options.idempotencyKey) : newIdempotencyKey();
    if (a === 'member') {
      const res = await this.transport.request('POST', '/api/member', { body: { person: r.user_id, source: 'desk' }, idempotencyKey: key });
      this.changed([table]);
      return { ...this.sinkRow(r), id: unwrap(res.body).id } as unknown as T;
    }
    if (table === 'profiles' && typeof r.user_id === 'string') return this.update<T>(table, r.user_id, r as Partial<T>);
    const res = await this.transport.request('POST', `/api/${a.writeEntity ?? a.entity}`, { body: toData(a, r, 'create'), idempotencyKey: key });
    this.changed([table]);
    const rec = unwrap(res.body);
    return outbound(table, a.writeEntity ? { ...this.sinkRow(r), id: rec.id } : fromRecord(a, rec), self) as unknown as T;
  }

  async update<T extends BaseRow = BaseRow>(table: string, id: string, patch: Partial<T>): Promise<T> {
    const settings = this.settingsAdapter(table);
    if (settings) return this.saveSettings(settings, patch as Record<string, unknown>) as unknown as Promise<T>;
    const legal = adapterFor(table);
    if (legal?.kind === 'legal') return this.updateLegal(legal, id, patch as Record<string, unknown>) as unknown as Promise<T>;
    if (legal?.kind === 'messages') return this.updateMessage(legal, id, patch as Record<string, unknown>) as unknown as Promise<T>;
    const a = this.writable(table);
    if (!a) return { ...this.sinkRow(patch as Record<string, unknown>), id } as unknown as T;
    if (a === 'member') throw new CompanyOSError('not_in_launch');
    if (a.createOnly) throw new CompanyOSError(a.createOnly);
    const self = await this.self();
    const target = selfId(table, id, self);
    const body = toData(a, inbound(table, patch as Record<string, unknown>, self), 'update');
    // Only derived or server-set columns (booked_count, ledger_id…): the server keeps those itself; nothing to send.
    if (!Object.keys(body).length) return ((await this.get<T>(table, id)) ?? ({ ...this.sinkRow(patch as Record<string, unknown>), id } as unknown as T));
    const res = await this.transport.request('PATCH', `/api/${a.writeEntity ?? a.entity}/${encodeURIComponent(target)}`, { body });
    this.changed([table]);
    if (a.writeEntity) return ((await this.get<T>(table, id)) ?? ({ ...this.sinkRow(patch as Record<string, unknown>), id } as unknown as T));
    return outbound(table, fromRecord(a, unwrap(res.body)), self) as unknown as T;
  }

  async remove(table: string, id: string): Promise<void> {
    const m = adapterFor(table);
    if (m?.kind === 'messages') {
      const part = await this.messagePartOf(m, id);
      // The log is the record of what was sent: only a note is removed (Administration).
      if (part !== m.note) throw new CompanyOSError('read_only');
      await this.transport.request('DELETE', `/api/${part.entity}/${encodeURIComponent(id)}`);
      this.changed([table]);
      return;
    }
    const a = this.writable(table);
    if (!a) return;
    if (a === 'member') throw new CompanyOSError('not_in_launch');
    if (a.createOnly) throw new CompanyOSError(a.createOnly);
    await this.transport.request('DELETE', `/api/${a.writeEntity ?? a.entity}/${encodeURIComponent(selfId(table, id, await this.self()))}`);
    this.changed([table]);
  }

  // ------------------------------------------------------------ studio settings (AD-05)
  settingsAdapter(table: string): SettingsAdapter | null {
    const a = adapterFor(table);
    return a?.kind === 'settings' ? a : null;
  }

  /**
   * The two `setting` records behind the studio settings (decision F-01): the public one and `studio_private`, in one
   * query. A role the policies keep from the private record (everyone but Administration and Finance), and the
   * signed-out site, get the public one only. Either is null before its first save.
   */
  async settingsRecords(a: SettingsAdapter = this.settingsAdapter('tenants')!): Promise<SettingsRecords> {
    const signedIn = await this.transport.signedIn();
    const filter = signedIn ? { field: 'key', op: 'in', value: [a.key, a.privateKey] } : { field: 'key', op: 'eq', value: a.key };
    const rows = await this.query({ entity: 'setting', filter, limit: 2 });
    return { pub: rows.find((r) => r.data.key === a.key) ?? null, priv: rows.find((r) => r.data.key === a.privateKey) ?? null };
  }

  /**
   * The ops that save `settings` (the whole JSON, like the mock's row update), split into its two records: each is
   * created or updated only when its part changed. A private part is written only when it has sections (a role that
   * reads the defaults never creates one), and a legacy public record holding the pay data is rewritten without it.
   */
  async settingsOps(a: SettingsAdapter, patch: Record<string, unknown>, always = false): Promise<Op[] | null> {
    if (!('settings' in patch)) return null;
    const recs = await this.settingsRecords(a);
    const { pub, priv } = splitSettings(patch.settings);
    const ops: Op[] = [];
    const plan = (key: string, rec: CosRecord | null, value: Record<string, unknown>) => {
      if (!always && rec && sameJson(rec.data.value, value)) return;
      ops.push(rec ? { op: 'update', entity: 'setting', id: rec.id, data: { value }, table: a.table } : { op: 'create', entity: 'setting', data: { key, value }, table: a.table });
    };
    plan(a.key, recs.pub, pub);
    if (Object.keys(priv).length || recs.priv) plan(a.privateKey, recs.priv, priv);
    return ops;
  }

  private async saveSettings(a: SettingsAdapter, patch: Record<string, unknown>): Promise<Row> {
    const ops = await this.settingsOps(a, patch);
    if (!ops) return tenantRow(await this.settingsRecords(a));
    // Both records change together or not at all (a legacy row's pay data moves in the same /batch, never lost between).
    if (ops.length > 1) await this.transport.request('POST', '/batch', { body: { ops: serialize(ops) }, idempotencyKey: newIdempotencyKey() });
    else for (const op of ops) {
      if (op.op === 'update') await this.transport.request('PATCH', `/api/setting/${encodeURIComponent(op.id!)}`, { body: op.data });
      else await this.transport.request('POST', '/api/setting', { body: op.data, idempotencyKey: newIdempotencyKey() });
    }
    if (ops.length) this.changed([a.table]);
    return tenantRow(await this.settingsRecords(a));
  }

  // ------------------------------------------------------------ the staff inbox (lane H2)
  /** Which entity a new inbox row goes to: a note is a staff note, a WhatsApp a logged message; email is refused. */
  messagePart(a: MessagesAdapter, row: Record<string, unknown>): EntityAdapter {
    if (row.channel === 'note' || row.direction === 'internal') return a.note;
    // H-9: email is sent only through Company OS (comms delivery, A-02); a hand-logged email would be a simulated send.
    if (row.channel !== 'whatsapp') throw new CompanyOSError('email_not_connected');
    return a.log;
  }

  private async messagePartOf(a: MessagesAdapter, id: string): Promise<EntityAdapter> {
    const row = await this.get<Row>(a.table, id);
    if (!row) throw new CompanyOSError('not_found');
    return row.channel === 'note' ? a.note : a.log;
  }

  /** Read stamps aren't stored (no inbound messages, R-04); a note's text is Administration's to correct. */
  private async updateMessage(a: MessagesAdapter, id: string, patch: Record<string, unknown>): Promise<Row> {
    const fields = Object.keys(patch).filter((k) => !['read_at', 'read_by', 'id', 'tenant_id', 'updated_at'].includes(k));
    if (!fields.length) return (await this.get<Row>(a.table, id)) ?? ({ ...this.sinkRow(patch), id } as Row);
    const part = await this.messagePartOf(a, id);
    if (part !== a.note || fields.some((k) => k !== 'body')) throw new CompanyOSError('read_only');
    const res = await this.transport.request('PATCH', `/api/${part.entity}/${encodeURIComponent(id)}`, { body: toData(part, patch, 'update') });
    this.changed([a.table]);
    return outbound(a.table, fromRecord(part, unwrap(res.body)), await this.self());
  }

  // ------------------------------------------------------------ legal documents (lane H2)
  /** The versions sign-up asks for: the people setting for a Super Admin, `GET /signup` for anyone else; null if unknown. */
  private async signupConsents(): Promise<{ document: string; version: string }[] | null> {
    if (!(await this.transport.signedIn())) return null;
    try {
      const me = await this.me();
      if (me?.isSuperAdmin) {
        const res = await this.transport.request<{ settings?: { signup_consents?: unknown } }>('GET', '/modules/people/settings');
        return parseConsentList(res.body?.settings?.signup_consents);
      }
      const res = await this.transport.request<{ enabled?: boolean; consents?: { document?: unknown; version?: unknown }[] }>('GET', '/signup');
      if (res.body?.enabled !== true || !Array.isArray(res.body.consents)) return null;
      return res.body.consents.flatMap((c) => (typeof c.document === 'string' && typeof c.version === 'string' ? [{ document: c.document, version: c.version }] : []));
    } catch { return null; }
  }

  /** The build's legal rows; when sign-up names a version the build has, that one is published and its siblings drafts. */
  private async legalRows(a: LegalAdapter): Promise<Row[]> {
    const rows = clone(a.rows());
    const consents = await this.signupConsents();
    for (const c of consents ?? []) {
      if (!rows.some((r) => r.kind === c.document && r.version === c.version)) continue;
      for (const r of rows) if (r.kind === c.document) r.status = r.version === c.version ? 'published' : 'draft';
    }
    return rows;
  }

  /**
   * Publishing a legal version the customer accepts (`requires_acceptance`) sets it in the people setting
   * `signup_consents` (the Super Admin; Hoy's Administration, AD-04): sign-up asks for it, and a signed-in customer
   * accepts it in the app. The texts stay in the build, so every other change is refused.
   */
  private async updateLegal(a: LegalAdapter, id: string, patch: Record<string, unknown>): Promise<Row> {
    const row = a.rows().find((r) => r.id === id);
    if (!row) throw new CompanyOSError('not_found');
    if (Object.keys(patch).some((k) => !['status', 'published_at', 'updated_at'].includes(k)) || !row.requires_acceptance) throw new CompanyOSError('legal_document_in_build');
    if (!('status' in patch)) return (await this.legalRows(a)).find((r) => r.id === id)!;
    const res = await this.transport.request<{ settings?: { signup_consents?: unknown } }>('GET', '/modules/people/settings');
    const list = parseConsentList(res.body?.settings?.signup_consents);
    const current = list.find((c) => c.document === row.kind);
    if (patch.status === 'published') {
      if (current?.version !== row.version) {
        const next = current ? list.map((c) => (c.document === row.kind ? { document: c.document, version: String(row.version) } : c)) : [...list, { document: String(row.kind), version: String(row.version) }];
        await this.transport.request('PATCH', '/modules/people/settings', { body: { settings: { signup_consents: next.map((c) => `${c.document}@${c.version}`).join(',') } } });
        this.changed([a.table]);
      }
    } else if (current?.version === row.version) throw new CompanyOSError('legal_document_current');
    return (await this.legalRows(a)).find((r) => r.id === id)!;
  }

  // ------------------------------------------------------------ holiday hours → bookings closed dates (lane H2)
  /** Re-syncs bookings `review_closed_dates` shortly after the last hours-override write (an import coalesces). */
  private scheduleClosedDates() {
    if (this.closedTimer) clearTimeout(this.closedTimer);
    this.closedTimer = setTimeout(() => {
      this.closedTimer = null;
      this.closedRun = this.closedRun.then(() => this.syncClosedDates());
    }, this.closedDatesDelayMs);
  }

  /** Resolves once a scheduled closed-dates sync has run (tests, and a screen that must wait for it). */
  async closedDatesSettled(): Promise<void> {
    while (this.closedTimer) await new Promise((r) => setTimeout(r, Math.max(5, this.closedDatesDelayMs)));
    await this.closedRun;
  }

  /** Every closed override's dates from today on → bookings `review_closed_dates`, written only when they differ. */
  private async syncClosedDates(): Promise<void> {
    try {
      const rows = await this.list<Row>('hours_overrides');
      const dates = closedDatesOf(rows as never, this.today());
      const res = await this.transport.request<{ settings?: { review_closed_dates?: unknown } }>('GET', '/modules/bookings/settings');
      if (sameJson(parseClosedDates(res.body?.settings?.review_closed_dates), dates)) return;
      await this.transport.request('PATCH', '/modules/bookings/settings', { body: { settings: { review_closed_dates: formatClosedDates(dates) } } });
    } catch (e) {
      // Only the Super Admin edits module settings (Hoy's Administration holds it, AD-04); the override is saved anyway.
      console.warn('[companyos] bookings review_closed_dates not synced:', e instanceof CompanyOSError ? e.code : e);
    }
  }

  /** The adapter a write goes to; null for a sink (accepted and dropped); `member` for a customer role grant. */
  private writable(table: string, row?: Record<string, unknown>): EntityAdapter | 'member' | null {
    const a = adapterFor(table);
    if (!a) throw new CompanyOSError('not_in_launch');
    if (a.kind === 'messages') {
      if (!row) throw new CompanyOSError('read_only');
      return this.messagePart(a, row);
    }
    if (a.kind === 'settings' || a.kind === 'legal') throw new CompanyOSError('read_only');
    if (a.kind === 'sink') return null;
    if (a.kind === 'static') throw new CompanyOSError('read_only');
    if (a.kind === 'session') return 'member';
    if (a.readOnly) throw new CompanyOSError(a.readOnly);
    return a;
  }

  private sinkRow(r: Record<string, unknown>): Row {
    const at = stamp();
    return { id: `local_${newIdempotencyKey()}`, tenant_id: tenant.id, created_at: at, updated_at: at, ...r } as Row;
  }

  // ------------------------------------------------------------ atomic → one /batch
  async atomic<T>(action: (data: DataProvider) => Promise<T>, options: { idempotencyKey?: string } = {}): Promise<T> {
    const key = wireKey(options.idempotencyKey ?? newIdempotencyKey());
    // A double tap: the second call waits for the first one's answer instead of racing it.
    const running = this.running.get(key);
    if (running) return running as Promise<T>;
    const run = this.runAtomic(action, key).finally(() => this.running.delete(key));
    this.running.set(key, run);
    return run;
  }

  private async runAtomic<T>(action: (data: DataProvider) => Promise<T>, key: string): Promise<T> {
    const stage = new Stage(this, ++this.tokenSeq);
    const result = await action(stage as unknown as DataProvider);
    const live = stage.ops.filter((o) => !o.dropped);
    if (!live.length) return result;
    if (live.length > MAX_OPS) throw new CompanyOSError('atomic_too_large');
    let pending: Pending = { body: { ops: serialize(live) }, result, tokens: live.map((o) => o.token ?? ''), tables: [...new Set(stage.ops.map((o) => o.table))] };
    // After a lost answer: the same body again → resend the first attempt exactly (its tokens and result included).
    const lost = this.pending.get(key);
    if (lost && sameBody(lost.body, pending.body)) pending = lost;
    try {
      const res = await this.transport.request<{ ids: string[] }>('POST', '/batch', { body: pending.body, idempotencyKey: key });
      this.pending.delete(key);
      const ids = new Map<string, string>();
      pending.tokens.forEach((t, i) => { if (t) ids.set(t, res.body.ids[i]!); });
      this.changed(pending.tables);
      return resolveTokens(pending.result as T, ids);
    } catch (e) {
      // Only a lost answer may have committed: keep the exact body so a retry with this key replays it.
      if (e instanceof CompanyOSError && e.ambiguous) this.pending.set(key, pending);
      else this.pending.delete(key);
      throw e;
    }
  }

  // ------------------------------------------------------------ commands
  /** Credits vouchers (contract BO): issue → `voucher`, claim → a `credit_lot` redeeming the code. The app's extras refuse. */
  async voucher(command: VoucherCommand | (VoucherCommand & { code?: string })): Promise<VoucherResult> {
    const key = wireKey(command.requestId || newIdempotencyKey());
    const a = adapterFor('vouchers') as EntityAdapter;
    const event = (voucherId: string) => ({ id: `evt_${key}`, tenant_id: tenant.id, created_at: stamp(), updated_at: stamp(), voucherId, bookingId: null, kind: command.type, actorId: command.actorId, requestId: command.requestId, fingerprint: '', payload: {} });
    if (command.type === 'issue') {
      if (command.benefitKind !== 'classes') throw new CompanyOSError('not_in_launch');
      const contact = command.recipientContact ?? '';
      const body = {
        kind: 'courtesy', classes: command.benefitTotal, valid_until: toDay(command.expiresAt), max_uses: 1,
        recipient_name: command.recipientName || null, recipient_email: contact.includes('@') ? contact : null,
        note: command.message || command.title || null,
      };
      const rec = unwrap((await this.transport.request('POST', '/api/voucher', { body, idempotencyKey: key })).body);
      this.changed(['vouchers']);
      return { voucher: fromRecord(a, rec) as unknown as VoucherRow, event: event(rec.id) as VoucherResult['event'] };
    }
    if (command.type === 'claim') {
      const given = (command as { code?: string }).code;
      const code = given ?? (/^[A-HJ-NP-Z2-9]{8}$/i.test(command.voucherId) ? command.voucherId : String((await this.get<Row>('vouchers', command.voucherId))?.code ?? ''));
      if (!code) throw new CompanyOSError('voucher_invalid');
      const lot = unwrap((await this.transport.request('POST', '/api/credit_lot', { body: { person: command.userId, voucher_code: code.toUpperCase() }, idempotencyKey: key })).body);
      this.changed(['vouchers', 'class_ledger']);
      const voucherId = String((lot.data.voucher as string | undefined) ?? command.voucherId);
      const known = await this.get<Row>('vouchers', voucherId).catch(() => null);
      const at = stamp();
      const voucher = known ?? { id: voucherId, tenant_id: tenant.id, created_at: at, updated_at: at, code: code.toUpperCase(), status: 'claimed', claimedBy: command.userId, balance: 0, benefitKind: 'classes', benefitTotal: Number(lot.data.quantity ?? 0), expiresAt: toDay(lot.data.valid_until) };
      return { voucher: voucher as unknown as VoucherRow, event: event(voucherId) as VoucherResult['event'] };
    }
    throw new CompanyOSError('not_in_launch');
  }

  /** Promotions are not in the launch (contract (H)). */
  async promotion(): Promise<PromotionResult> { throw new CompanyOSError('promotions_disabled'); }

  /**
   * A call with no table behind it (module settings, a custom query), path relative to `/t/<tenant>`. Answers the raw
   * Company OS body (not mapped); refusals throw `CompanyOSError`. Writes refetch every subscribed table.
   */
  async request<T>(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', path: string, body?: unknown, opts: { idempotencyKey?: string } = {}): Promise<T> {
    const res = await this.transport.request<T>(method, path, { body, idempotencyKey: opts.idempotencyKey && wireKey(opts.idempotencyKey) });
    if (method !== 'GET' && path !== '/query') this.emitAll();
    return res.body;
  }

  /** Attach a file to a record (a transfer receipt: `ownerEntity: 'payment', kind: 'receipt'`): link, upload, confirm. */
  /** Resolves to the confirmed file record as the API returns it, plus its `id` and `status` at the top level. */
  async uploadFile(input: { ownerEntity: string; ownerId: string; kind: string; file: Blob; filename?: string }): Promise<Record<string, unknown> & { id: string; status: string }> {
    const { ownerEntity, ownerId, kind, file } = input;
    const filename = input.filename ?? (file as Blob & { name?: string }).name ?? 'upload';
    const link = (await this.transport.request<{ file: { id: string }; uploadUrl: string }>('POST', '/files', { body: { ownerEntity, ownerId, kind, filename, mime: file.type, sizeBytes: file.size } })).body;
    let put: Response;
    try { put = await this.transport.raw(link.uploadUrl, { method: 'PUT', headers: { 'content-type': file.type }, body: file }); }
    catch { throw new CompanyOSError('file_upload_missing'); }
    if (!put.ok) throw new CompanyOSError('file_upload_missing', { status: put.status });
    const done = (await this.transport.request<{ file: Record<string, unknown> & { id: string; status?: string; data?: { status?: string } } }>('POST', `/files/${encodeURIComponent(link.file.id)}/confirm`)).body;
    this.changed(['transfer_receipts', 'payments']);
    return { ...done.file, id: done.file.id, status: String(done.file.data?.status ?? done.file.status ?? '') };
  }

  /**
   * A stored file's bytes (a transfer receipt), from the Hoy server's `GET /files/<id>` at the site root: the server
   * asks the API for the link with this user's token (the API's read permission decides) and streams the file.
   */
  async fileBlob(fileId: string): Promise<Blob> {
    const res = await this.transport.authorizedGet(`/files/${encodeURIComponent(fileId)}`);
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: unknown } | null;
      throw new CompanyOSError(normalizeCode(body?.error, res.status), { status: res.status });
    }
    return res.blob();
  }

  /** The launch settings the Hoy server publishes in /app-config.json (`launch`), for `configureLaunch`. */
  async launchSettings(): Promise<Record<string, unknown> | null> {
    const extra = (await this.transport.config().catch(() => null))?.extra;
    const launch = extra?.launch;
    return launch && typeof launch === 'object' ? (launch as Record<string, unknown>) : null;
  }

  // ------------------------------------------------------------ change feed
  subscribe(table: string | '*', cb: (e: ChangeEvent) => void): () => void {
    let set = this.listeners.get(table);
    if (!set) { set = new Set(); this.listeners.set(table, set); }
    set.add(cb);
    return () => { set!.delete(cb); };
  }

  /** Poll these tables (every subscribed table when empty) every 20 s until the returned function is called. */
  watch(tables: string[] = []): () => void {
    const id = ++this.watchSeq;
    this.watchers.set(id, tables);
    if (!this.timer) this.timer = setInterval(() => this.tick(), this.pollMs);
    return () => {
      this.watchers.delete(id);
      if (!this.watchers.size && this.timer) { clearInterval(this.timer); this.timer = null; }
    };
  }

  /** One poll: every watched table's subscribers refetch. Skipped while the page is hidden. */
  tick() {
    if (typeof document !== 'undefined' && document.hidden) return;
    const lists = [...this.watchers.values()];
    const tables = lists.some((t) => !t.length) ? [...this.listeners.keys()].filter((t) => t !== '*') : [...new Set(lists.flat())];
    for (const table of tables) this.emit({ table, type: 'reset' });
  }

  private changed(tables: string[]) {
    if (tables.includes('hours_overrides')) this.scheduleClosedDates();
    const all = new Set<string>();
    for (const t of tables) { all.add(t); for (const r of RELATED[t] ?? []) all.add(r); }
    // A read that started before the write may answer with the old rows: the refetch below must not join it.
    for (const key of [...this.inflight.keys()]) if (all.has(key.slice(0, key.indexOf('|')))) this.inflight.delete(key);
    for (const table of all) this.emit({ table, type: 'reset' });
  }

  private emitAll() { for (const table of this.listeners.keys()) if (table !== '*') this.emit({ table, type: 'reset' }); }

  private emit(e: ChangeEvent) {
    for (const cb of this.listeners.get(e.table) ?? []) cb(e);
    for (const cb of this.listeners.get('*') ?? []) cb(e);
  }
}

/** Two batch bodies equal up to the batch's own token numbering. */
function sameBody(a: { ops: unknown[] }, b: { ops: unknown[] }): boolean {
  const norm = (x: unknown) => JSON.stringify(x).replace(/cos-new-\d+-(\d+)/g, 'cos-new-$1');
  return norm(a) === norm(b);
}

/** The ops as `/batch` takes them: a token in a later op's top-level value becomes `{ $ref: n }`. */
function serialize(ops: Op[]): unknown[] {
  const index = new Map<string, number>();
  return ops.map((o, i) => {
    const data = o.data && Object.fromEntries(Object.entries(o.data).map(([k, v]) => {
      if (typeof v === 'string' && TOKEN.test(v)) {
        const n = index.get(v);
        if (n == null) throw new CompanyOSError('atomic_ref_invalid');
        return [k, { $ref: n }];
      }
      if (hasToken(v)) throw new CompanyOSError('atomic_ref_invalid');
      return [k, v];
    }));
    if (o.token) index.set(o.token, i);
    return o.op === 'delete' ? { op: o.op, entity: o.entity, id: o.id } : o.op === 'create' ? { op: o.op, entity: o.entity, data } : { op: o.op, entity: o.entity, id: o.id, data };
  });
}

/**
 * The provider an `atomic` callback writes to. Reads go to Company OS as they are (they don't see the staged writes,
 * except `get` of a row created in this callback); writes are recorded as batch ops. A created row's id is a token
 * until the batch answers; the callback's result has its tokens replaced by the real ids.
 */
class Stage {
  readonly name = 'companyos';
  readonly ops: Op[] = [];
  private seq = 0;
  private created = new Map<string, Row>();
  /** Existing rows as this callback has updated them, so a read-back inside the callback sees its own change. */
  private touched = new Map<string, Row>();
  constructor(private readonly real: CompanyOSProvider, private readonly batch: number) {}

  list<T extends BaseRow>(table: string, q?: Query) { return this.real.list<T>(table, q); }
  async get<T extends BaseRow>(table: string, id: string): Promise<T | null> {
    return (this.created.get(id) ?? this.touched.get(`${table}:${id}`) ?? this.touched.get(`${table}:${selfId(table, id, await this.real.self())}`) ?? (await this.real.get<T>(table, id))) as T | null;
  }

  private async saveSettings(a: SettingsAdapter, table: string, id: string, patch: Record<string, unknown>): Promise<Row> {
    const current = (this.touched.get(`${table}:${id}`) ?? (await this.real.get<Row>(table, id)) ?? tenantRow({ pub: null, priv: null })) as Row;
    // A second save in the same callback restates both parts, so a section put back to its stored value isn't lost.
    const planned = await this.real.settingsOps(a, patch, this.ops.some((o) => o.table === table && !o.dropped));
    if (!planned) return current;
    for (const op of planned) {
      const prior = this.ops.find((o) => o.table === table && !o.dropped && o.entity === op.entity && (op.op === 'update' ? o.id === op.id : o.op === 'create' && o.data?.key === op.data?.key));
      if (prior) prior.data = { ...prior.data, ...op.data }; else this.ops.push(op);
    }
    const merged = { ...current, settings: patch.settings } as Row;
    this.touched.set(`${table}:${id}`, merged);
    return merged;
  }
  subscribe() { return () => {}; }
  atomic<T>(action: (data: DataProvider) => Promise<T>) { return action(this as unknown as DataProvider); }

  private adapter(table: string, row?: Record<string, unknown>): EntityAdapter | null {
    const a = adapterFor(table);
    if (!a) throw new CompanyOSError('not_in_launch');
    if (a.kind === 'sink') return null;
    if (a.kind === 'messages' && row) return this.real.messagePart(a, row);
    if (a.kind === 'messages' || a.kind === 'legal') throw new CompanyOSError('read_only');
    if (a.kind === 'static') throw new CompanyOSError('read_only');
    if (a.kind === 'session') throw new CompanyOSError('not_in_launch');
    if (a.kind === 'settings') throw new CompanyOSError('read_only');
    if (a.readOnly) throw new CompanyOSError(a.readOnly);
    return a;
  }

  async insert<T extends BaseRow>(table: string, row: Partial<T>): Promise<T> {
    const settings = this.real.settingsAdapter(table);
    if (settings) return this.saveSettings(settings, table, tenant.id, row as Record<string, unknown>) as unknown as Promise<T>;
    const at = stamp();
    const a = this.adapter(table, row as Record<string, unknown>);
    const r = a ? inbound(table, row as Record<string, unknown>, await this.real.self()) : (row as Record<string, unknown>);
    if (!a || a.clientCreate && !a.clientCreate(r)) return { id: `local_${newIdempotencyKey()}`, tenant_id: tenant.id, created_at: at, updated_at: at, ...r } as unknown as T;
    // A profile is the person's name: written onto the person created (or existing) under that user id.
    if (table === 'profiles' && typeof r.user_id === 'string') {
      const { user_id, ...rest } = r;
      await this.update(table, user_id, rest);
      return { ...(this.created.get(user_id) ?? {}), ...r, id: user_id } as unknown as T;
    }
    const token = `cos-new-${this.batch}-${++this.seq}`;
    this.ops.push({ op: 'create', entity: a.writeEntity ?? a.entity, data: toData(a, r, 'create'), token, table });
    const full = { tenant_id: tenant.id, created_at: at, updated_at: at, ...r, id: token } as Row;
    this.created.set(token, full);
    return full as unknown as T;
  }

  async update<T extends BaseRow>(table: string, id: string, patch: Partial<T>): Promise<T> {
    const settings = this.real.settingsAdapter(table);
    if (settings) return this.saveSettings(settings, table, id, patch as Record<string, unknown>) as unknown as Promise<T>;
    const a = this.adapter(table);
    if (!a) return { ...(patch as Record<string, unknown>), id } as unknown as T;
    if (a.createOnly) throw new CompanyOSError(a.createOnly);
    const self = await this.real.self();
    const p = inbound(table, patch as Record<string, unknown>, self);
    id = selfId(table, id, self);
    const data = toData(a, p, 'update');
    const own = this.ops.find((o) => o.token === id && !o.dropped);
    if (own) {
      Object.assign(own.data!, data);
      const merged = { ...this.created.get(id)!, ...p, id } as Row;
      this.created.set(id, merged);
      return merged as unknown as T;
    }
    if (Object.keys(data).length) this.ops.push({ op: 'update', entity: a.writeEntity ?? a.entity, id, data, table });
    const key = `${table}:${id}`;
    const current = this.touched.get(key) ?? (await this.real.get<Row>(table, selfId(table, id, null)).catch(() => null));
    const merged = { ...(current ?? {}), ...(patch as Record<string, unknown>), id: (patch as { id?: string }).id ?? current?.id ?? id } as Row;
    this.touched.set(key, merged);
    return merged as unknown as T;
  }

  async remove(table: string, id: string): Promise<void> {
    const a = this.adapter(table);
    if (!a) return;
    if (a.createOnly) throw new CompanyOSError(a.createOnly);
    id = selfId(table, id, await this.real.self());
    const own = this.ops.find((o) => o.token === id && !o.dropped);
    if (own) {
      if (this.ops.some((o) => !o.dropped && o !== own && hasTokenValue(o.data, id))) throw new CompanyOSError('atomic_ref_invalid');
      own.dropped = true;
      this.created.delete(id);
      return;
    }
    this.ops.push({ op: 'delete', entity: a.writeEntity ?? a.entity, id, table });
  }
}

type SettingsRecords = { pub: CosRecord | null; priv: CosRecord | null };
/** The single `tenants` row the frontend reads: tenant config from the build, `settings` from the two records merged. */
function tenantRow(recs: SettingsRecords): Row {
  const { pub, priv } = recs;
  const latest = [pub?.updatedAt, priv?.updatedAt].filter((v): v is string => Boolean(v)).sort().pop();
  return {
    id: tenant.id, tenant_id: tenant.id, created_at: toInstantOr(pub?.createdAt ?? priv?.createdAt), updated_at: toInstantOr(latest),
    slug: tenant.slug, name: tenant.name, legal_name: tenant.legalName, timezone: tenant.timezone, currency: tenant.currency, default_locale: 'es',
    settings: mergeSettingsRecords(pub?.data.value, priv?.data.value),
  };
}

/** `"terms@2.0,privacy@2026-10-01"` → its entries. */
function parseConsentList(value: unknown): { document: string; version: string }[] {
  return (typeof value === 'string' ? value.split(',') : []).map((e) => e.trim()).filter((e) => /^[^@\s]+@[^@\s]+$/.test(e)).map((e) => ({ document: e.split('@')[0]!, version: e.split('@')[1]! }));
}
const toInstantOr = (v: unknown) => (typeof v === 'string' && v ? new Date(v).toISOString() : stamp());

type Self = { userId: string; personId: string } | null;
/** Tables whose own id is the person id (so the session's user id stands for it). */
const PERSON_ID_TABLES = new Set(['users', 'profiles']);
const selfId = (table: string, id: string, self: Self) => (self && PERSON_ID_TABLES.has(table) && id === self.userId ? self.personId : id);
function inbound<R extends Record<string, unknown>>(table: string, row: R, self: Self): R {
  if (!self) return row;
  const swap = (v: unknown) => (v === self.userId ? self.personId : Array.isArray(v) ? v.map((x) => (x === self.userId ? self.personId : x)) : v);
  const out: Record<string, unknown> = { ...row };
  if ('user_id' in out) out.user_id = swap(out.user_id);
  if (table === 'users' && 'id' in out) out.id = swap(out.id);
  return out as R;
}
function outbound(table: string, row: Row, self: Self): Row {
  if (!self) return row;
  if (row.user_id === self.personId) row.user_id = self.userId;
  if (table === 'users' && row.id === self.personId) row.id = self.userId;
  return row;
}

const hasTokenValue = (data: Record<string, unknown> | undefined, token: string) => Boolean(data && Object.values(data).includes(token));
