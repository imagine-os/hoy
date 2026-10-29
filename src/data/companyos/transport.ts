/**
 * The wire to Company OS. The browser never calls the API directly: it calls the Hoy server (lane H-1), which checks the
 * Clerk session and forwards `<apiBase>/t/<tenant>/…` to the private API with the same bearer token.
 *
 * - Config: `{ tenant, apiBase }` from `GET /app-config.json` (the Hoy server's public settings), read once.
 * - Token: a fresh Clerk session token per request (`setCompanyOSTokenSource`, wired by the sign-in lane H-2).
 *   A 401 asks the source for a refreshed token once, then gives up with `unauthorized`.
 * - Retries: a lost response (network error, 502/504, or a 503 that is the Hoy server's own `upstream_unavailable` /
 *   `upstream_timeout`) is retried with the same body and the same `Idempotency-Key`, so the server answers the first
 *   attempt instead of writing twice (ADR 0040). A write without a key is never retried: it fails at once, `ambiguous`.
 */

export interface CompanyOSConfig { tenant: string; apiBase: string; /** The rest of /app-config.json (e.g. `launch`). */ extra?: Record<string, unknown> }
export type TokenSource = (options?: { refresh?: boolean }) => Promise<string | null>;
type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

/** A refusal or failure from Company OS (or the wire). `message` is the code, so `error.message` matches the mock's errors. */
export class CompanyOSError extends Error {
  readonly code: string;
  readonly status: number;
  readonly opIndex?: number;
  readonly details?: unknown;
  readonly requestId?: string;
  /** True when the server may have done the work (lost response): retry with the same idempotency key. */
  readonly ambiguous: boolean;
  /** The API's English fallback text, for logs only; the UI shows `refusalCopy(code)`. */
  readonly serverMessage?: string;
  constructor(code: string, init: { status?: number; opIndex?: number; details?: unknown; requestId?: string; ambiguous?: boolean; serverMessage?: string } = {}) {
    super(code);
    this.name = 'CompanyOSError';
    this.code = code;
    this.status = init.status ?? 0;
    this.opIndex = init.opIndex;
    this.details = init.details;
    this.requestId = init.requestId;
    this.ambiguous = init.ambiguous ?? false;
    this.serverMessage = init.serverMessage;
  }
}

/** The code of any thrown value: a CompanyOSError's code, else an Error's message, else `unknown`. */
export function refusalCode(error: unknown): string {
  if (error instanceof CompanyOSError) return error.code;
  if (error instanceof Error && /^[a-z][a-z0-9_]*$/.test(error.message)) return error.message;
  return 'unknown';
}

/** API error strings come in two styles (`occurrence_full`, `not found`); both become snake_case codes. */
export function normalizeCode(raw: unknown, status: number): string {
  if (typeof raw !== 'string' || !raw.trim()) {
    if (status === 401) return 'unauthorized';
    if (status === 403) return 'forbidden';
    if (status === 404) return 'not_found';
    return status >= 500 ? 'service_unavailable' : 'unknown';
  }
  const code = raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  // Permission-shaped answers share one line of copy.
  if (['super_admin_only', 'no_access_to_this_tenant', 'write_forbidden', 'read_only_identity'].includes(code)) return 'forbidden';
  if (['unknown_entity', 'tenant_not_found'].includes(code)) return 'not_found';
  if (code === 'storage_not_configured') return 'storage_unavailable';
  return code;
}

const KEY_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;
const keyAliases = new Map<string, string>();

export function newIdempotencyKey(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  const bytes = new Uint8Array(16);
  if (c?.getRandomValues) c.getRandomValues(bytes); else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const h = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/**
 * A caller's key as the API accepts it (8–128 of `A–Z a–z 0–9 _ -`). A key that doesn't fit is never derived or hashed:
 * it gets a random UUID, remembered for this page so the same caller key always sends the same header.
 */
export function wireKey(callerKey: string): string {
  if (KEY_PATTERN.test(callerKey)) return callerKey;
  let alias = keyAliases.get(callerKey);
  if (!alias) { alias = newIdempotencyKey(); keyAliases.set(callerKey, alias); }
  return alias;
}

export interface TransportOptions {
  fetch?: Fetch;
  /** A fixed config (tests) or the URL of the Hoy server's public settings (default `/app-config.json`). */
  config?: CompanyOSConfig;
  configUrl?: string;
  getToken?: TokenSource;
  /** Attempts after the first for a lost response. Default 2. */
  retries?: number;
  retryDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

export interface RequestOptions { body?: unknown; idempotencyKey?: string }
export interface CompanyOSResponse<T> { status: number; body: T; replayed: boolean }

let sharedTokenSource: TokenSource | null = null;
const tokenListeners = new Set<() => void>();

/** H-2 calls this once Clerk is loaded: `setCompanyOSTokenSource(({ refresh }) => clerk.session?.getToken({ skipCache: refresh }) ?? null)`. */
export function setCompanyOSTokenSource(source: TokenSource | null) {
  sharedTokenSource = source;
  for (const l of tokenListeners) l();
}
let unauthorizedHandler: (() => void) | null = null;
/** H-2's `onUnauthorized`: called when a request still answers 401 after a refreshed token (the session is gone). */
export function setCompanyOSUnauthorizedHandler(handler: (() => void) | null) { unauthorizedHandler = handler; }

export function onTokenSourceChange(listener: () => void): () => void {
  tokenListeners.add(listener);
  return () => { tokenListeners.delete(listener); };
}

export class Transport {
  private readonly fetchImpl: Fetch;
  private readonly opts: TransportOptions;
  private configPromise: Promise<CompanyOSConfig> | null = null;

  constructor(opts: TransportOptions = {}) {
    this.opts = opts;
    this.fetchImpl = opts.fetch ?? ((input, init) => fetch(input, init));
    if (opts.config) this.configPromise = Promise.resolve(opts.config);
  }

  config(): Promise<CompanyOSConfig> {
    if (!this.configPromise) {
      const url = this.opts.configUrl ?? 'app-config.json';
      this.configPromise = this.fetchImpl(url, { headers: { accept: 'application/json' } })
        .then(async (r) => {
          if (!r.ok) throw new CompanyOSError('service_unavailable', { status: r.status });
          const v = (await r.json()) as Partial<CompanyOSConfig>;
          if (typeof v.tenant !== 'string' || typeof v.apiBase !== 'string') throw new CompanyOSError('service_unavailable', { status: r.status });
          return { tenant: v.tenant, apiBase: v.apiBase.replace(/\/+$/, ''), extra: v as Record<string, unknown> };
        })
        .catch((e) => { this.configPromise = null; throw e instanceof CompanyOSError ? e : new CompanyOSError('network_error', { ambiguous: false }); });
    }
    return this.configPromise;
  }

  private token(refresh = false): Promise<string | null> {
    const source = this.opts.getToken ?? sharedTokenSource;
    return source ? source({ refresh }).catch(() => null) : Promise.resolve(null);
  }

  /** Whether someone is signed in now (a token source is wired and gives a token). */
  async signedIn(): Promise<boolean> { return Boolean(await this.token()); }

  /** Who the current token is for (its `sub`), so per-user caches reset when someone else signs in. Null signed out. */
  async subject(): Promise<string | null> {
    const token = await this.token();
    if (!token) return null;
    try {
      const part = token.split('.')[1];
      if (!part) return 'session';
      const json = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/'))) as { sub?: unknown };
      return typeof json.sub === 'string' ? json.sub : 'session';
    } catch { return 'session'; }
  }

  /** A plain request outside the API (the file storage upload link). */
  raw(input: string, init: RequestInit): Promise<Response> { return this.fetchImpl(input, init); }

  /**
   * A GET on the Hoy server itself (not under `apiBase`), with the session's bearer token: the stored files at
   * `/files/<id>`. A 401 asks the token source for a refreshed token once. Answers the response as it is.
   */
  async authorizedGet(path: string): Promise<Response> {
    let refreshed = false;
    for (;;) {
      const token = await this.token(refreshed);
      const headers: Record<string, string> = {};
      if (token) headers.authorization = `Bearer ${token}`;
      let res: Response;
      try { res = await this.fetchImpl(path, { method: 'GET', headers, credentials: 'omit' }); }
      catch { throw new CompanyOSError('network_error'); }
      if (res.status === 401 && !refreshed) { refreshed = true; continue; }
      // Only a token that was refused means the session ended (no token: Clerk not loaded yet, or signed out).
      if (res.status === 401 && token) unauthorizedHandler?.();
      return res;
    }
  }

  async request<T>(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', path: string, options: RequestOptions = {}): Promise<CompanyOSResponse<T>> {
    const { apiBase, tenant } = await this.config();
    const url = `${apiBase}/t/${encodeURIComponent(tenant)}${path}`;
    const body = options.body === undefined ? undefined : JSON.stringify(options.body);
    const retries = this.opts.retries ?? 2;
    const sleep = this.opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
    // `POST /query` only reads.
    const read = method === 'GET' || (method === 'POST' && path === '/query');
    let refreshed = false;
    for (let attempt = 0; ; attempt++) {
      const token = await this.token(refreshed);
      const headers: Record<string, string> = { accept: 'application/json' };
      // Bodyless requests send no content-type (the API refuses a DELETE that claims JSON).
      if (body !== undefined) headers['content-type'] = 'application/json';
      if (token) headers.authorization = `Bearer ${token}`;
      if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
      // A write is retried only under a key: without one the server could do it twice.
      const mayRetry = attempt < retries && (read || Boolean(options.idempotencyKey));
      let res: Response;
      try {
        res = await this.fetchImpl(url, { method, headers, body, credentials: 'omit' });
      } catch {
        if (mayRetry) { await sleep((this.opts.retryDelayMs ?? 400) * 2 ** attempt); continue; }
        throw new CompanyOSError('network_error', { ambiguous: !read });
      }
      const requestId = res.headers.get('x-request-id') ?? undefined;
      if (res.status === 401 && !refreshed) { refreshed = true; attempt--; continue; }
      const text = res.status === 204 ? '' : await res.text();
      let parsed: unknown = null;
      if (text) { try { parsed = JSON.parse(text); } catch { parsed = null; } }
      if (lostAnswer(res.status, parsed)) {
        if (mayRetry) { await sleep((this.opts.retryDelayMs ?? 400) * 2 ** attempt); continue; }
        throw new CompanyOSError('service_unavailable', { status: res.status, requestId, ambiguous: !read });
      }
      if (res.status === 401 && token) unauthorizedHandler?.();
      if (!res.ok) {
        const e = (parsed ?? {}) as { error?: unknown; message?: unknown; opIndex?: unknown; details?: unknown };
        throw new CompanyOSError(normalizeCode(e.error, res.status), {
          status: res.status, requestId, details: e.details,
          opIndex: typeof e.opIndex === 'number' ? e.opIndex : undefined,
          serverMessage: typeof e.message === 'string' ? e.message : undefined,
        });
      }
      return { status: res.status, body: parsed as T, replayed: res.headers.get('idempotency-replayed') === 'true' };
    }
  }
}

/**
 * 5xx answers that are the API's own result, not a lost answer: `502 invitation_failed` (the login was committed) and
 * `502 storage_unavailable` (the file store refused; the API answered, so retrying as if the answer were lost is wrong).
 */
const API_5XX = new Set(['invitation_failed', 'storage_unavailable']);

/**
 * An answer that says the request may not have reached the API, or its answer was lost on the way back: a 502 or 504
 * (the Hoy server's `upstream_unavailable` / `upstream_timeout`, or a gateway's), unless it carries one of the API's own
 * codes; a 503 only with the Hoy server's codes. Any other 503 (`storage_not_configured`…) is the API's refusal.
 */
function lostAnswer(status: number, body: unknown): boolean {
  const code = (body as { error?: unknown } | null)?.error;
  if (status === 502 || status === 504) return !(typeof code === 'string' && API_5XX.has(code));
  if (status !== 503) return false;
  return code === 'upstream_unavailable' || code === 'upstream_timeout';
}
