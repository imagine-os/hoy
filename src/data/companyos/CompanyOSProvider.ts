import type { BaseRow } from '../schema';
import { applyQuery, type ChangeEvent, type DataProvider, type Query } from '../types';
import type { VoucherCommand, VoucherResult, VoucherRow } from '../vouchers';
import type { PromotionResult } from '../promotions';
import { tenant } from '../../tenant/tenant';
import { plans as seedPlans, teachers as seedTeachers, rooms as seedRooms } from '../seed/catalog';
import { adapterFor, fromRecord, toData, RELATED, ROLE_OF_KEY, type CosRecord, type EntityAdapter, type Row, type SettingsAdapter } from './mapping';
import { planQuery, PAGE, type QuerySpec } from './query';
import { CompanyOSError, Transport, newIdempotencyKey, normalizeCode, onTokenSourceChange, wireKey, type TransportOptions } from './transport';
import { toDay } from './dates';

/** Contract §1: `subscribe()` polls every 20 s on the screens that ask for it (`useLiveUpdates`). */
export const POLL_MS = 20_000;
/** A list reads at most this many pages of 500 rows (10 000 rows): studio scale, with a ceiling. */
const MAX_PAGES = 20;
const MAX_OPS = 200;

export interface CompanyOSProviderOptions extends TransportOptions { pollMs?: number }

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

/** Signed out, the website still shows the catalogue shipped in the build (no Company OS read without a session). */
// J4: the private class has no public price, so the signed-out catalogue leaves the private family out.
const SIGNED_OUT: Record<string, () => BaseRow[]> = { plans: () => seedPlans.filter((p) => p.family !== 'privadas'), teachers: () => seedTeachers, rooms: () => seedRooms };

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

  constructor(options: CompanyOSProviderOptions = {}) {
    this.transport = new Transport(options);
    this.pollMs = options.pollMs ?? POLL_MS;
    onTokenSourceChange(() => { this.meCache = null; this.emitAll(); });
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (!document.hidden && this.watchers.size) this.tick(); });
  }

  // ------------------------------------------------------------ reads
  async list<T extends BaseRow = BaseRow>(table: string, query?: Query): Promise<T[]> {
    const a = adapterFor(table);
    if (!a || a.kind === 'sink') return [];
    if (a.kind === 'static') return applyQuery(clone(a.rows()), query) as unknown as T[];
    if (!(await this.transport.signedIn())) return applyQuery(clone(SIGNED_OUT[table]?.() ?? []) as Row[], query) as unknown as T[];
    if (a.kind === 'session') return applyQuery(await this.roleRows(), query) as unknown as T[];
    if (a.kind === 'settings') return applyQuery([tenantRow(await this.settingsRecord(a))], query) as unknown as T[];
    const self = await this.self();
    const q = query?.where ? { ...query, where: inbound(table, query.where, self) } : query;
    const key = `${table}|${JSON.stringify(q ?? null)}`;
    let p = this.inflight.get(key);
    if (!p) {
      // A write drops the table's entries (`changed`), so the cleanup removes only this read's own entry.
      const read: Promise<Row[]> = (this.listEntity(a, q) as Promise<Row[]>).finally(() => { if (this.inflight.get(key) === read) this.inflight.delete(key); });
      p = read;
      this.inflight.set(key, p);
    }
    return (await p).map((r) => outbound(table, clone(r), self)) as unknown as T[];
  }

  /**
   * The signed-in user's two ids. The session (H-2) knows a Company OS **user** id; records point at the **person**.
   * Inbound, a `user_id` (and a `users` id) equal to the user id becomes the person id; outbound, the reverse, so
   * `where: { user_id: session.userId }` finds one's own rows. Other people's rows keep their person ids.
   */
  async self(): Promise<{ userId: string; personId: string } | null> {
    const me = await this.me().catch(() => null);
    return me?.userId && me.personId && me.userId !== me.personId ? { userId: me.userId, personId: me.personId } : null;
  }

  private async listEntity(a: EntityAdapter, q?: Query): Promise<Row[]> {
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
      const rows = await this.query({ entity: a.entity, include: a.include, filter: { or: [{ and: [{ field: 'lot', op: 'eq', value: id }, { field: 'reason', op: 'eq', value: 'grant' }] }, { field: 'id', op: 'eq', value: id }] }, limit: 2 });
      const row = rows.map((r) => fromRecord(a, r)).find((r) => r.id === id);
      return row ? (outbound(table, row, self) as unknown as T) : null;
    }
    if (!a || a.kind !== 'entity' || a.idOf || a.base) return ((await this.list<T>(table, { where: { id } }))[0] ?? null);
    if (!(await this.transport.signedIn())) return null;
    const self = await this.self();
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
    const a = this.writable(table);
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
    const a = this.writable(table);
    if (!a) return { ...this.sinkRow(patch as Record<string, unknown>), id } as unknown as T;
    if (a === 'member') throw new CompanyOSError('not_in_launch');
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
    const a = this.writable(table);
    if (!a) return;
    if (a === 'member') throw new CompanyOSError('not_in_launch');
    await this.transport.request('DELETE', `/api/${a.writeEntity ?? a.entity}/${encodeURIComponent(selfId(table, id, await this.self()))}`);
    this.changed([table]);
  }

  // ------------------------------------------------------------ studio settings (AD-05)
  settingsAdapter(table: string): SettingsAdapter | null {
    const a = adapterFor(table);
    return a?.kind === 'settings' ? a : null;
  }

  /** The `setting` record holding the studio settings, or null before the first save (or signed out). */
  async settingsRecord(a: SettingsAdapter = this.settingsAdapter('tenants')!): Promise<CosRecord | null> {
    if (!(await this.transport.signedIn())) return null;
    return (await this.query({ entity: 'setting', filter: { field: 'key', op: 'eq', value: a.key }, limit: 1 }))[0] ?? null;
  }

  /** The op that saves `settings` (whole JSON, like the mock's row update): an update of the record, or its create. */
  async settingsOp(a: SettingsAdapter, patch: Record<string, unknown>): Promise<{ op: Op; rec: CosRecord | null } | null> {
    if (!('settings' in patch)) return null;
    const rec = await this.settingsRecord(a);
    const op: Op = rec ? { op: 'update', entity: 'setting', id: rec.id, data: { value: patch.settings }, table: a.table } : { op: 'create', entity: 'setting', data: { key: a.key, value: patch.settings }, table: a.table };
    return { op, rec };
  }

  private async saveSettings(a: SettingsAdapter, patch: Record<string, unknown>): Promise<Row> {
    const planned = await this.settingsOp(a, patch);
    if (!planned) return tenantRow(await this.settingsRecord(a));
    const { op } = planned;
    const res = op.op === 'update'
      ? await this.transport.request('PATCH', `/api/setting/${encodeURIComponent(op.id!)}`, { body: op.data })
      : await this.transport.request('POST', '/api/setting', { body: op.data, idempotencyKey: newIdempotencyKey() });
    this.changed([a.table]);
    return tenantRow(unwrap(res.body));
  }

  /** The adapter a write goes to; null for a sink (accepted and dropped); `member` for a customer role grant. */
  private writable(table: string): EntityAdapter | 'member' | null {
    const a = adapterFor(table);
    if (!a) throw new CompanyOSError('not_in_launch');
    if (a.kind === 'settings') throw new CompanyOSError('read_only');
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
    const current = (this.touched.get(`${table}:${id}`) ?? (await this.real.get<Row>(table, id)) ?? tenantRow(null)) as Row;
    const planned = await this.real.settingsOp(a, patch);
    if (!planned) return current;
    const prior = this.ops.find((o) => o.table === table && !o.dropped);
    if (prior) prior.data = { ...prior.data, ...planned.op.data }; else this.ops.push(planned.op);
    const merged = { ...current, settings: patch.settings } as Row;
    this.touched.set(`${table}:${id}`, merged);
    return merged;
  }
  subscribe() { return () => {}; }
  atomic<T>(action: (data: DataProvider) => Promise<T>) { return action(this as unknown as DataProvider); }

  private adapter(table: string): EntityAdapter | null {
    const a = adapterFor(table);
    if (!a) throw new CompanyOSError('not_in_launch');
    if (a.kind === 'sink') return null;
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
    const a = this.adapter(table);
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

/** The single `tenants` row the frontend reads: tenant config from the build, `settings` from Company OS. */
function tenantRow(rec: CosRecord | null): Row {
  const at = toInstantOr(rec?.updatedAt);
  const value = rec?.data.value;
  return {
    id: tenant.id, tenant_id: tenant.id, created_at: toInstantOr(rec?.createdAt), updated_at: at,
    slug: tenant.slug, name: tenant.name, legal_name: tenant.legalName, timezone: tenant.timezone, currency: tenant.currency, default_locale: 'es',
    settings: value && typeof value === 'object' ? value : {},
  };
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
