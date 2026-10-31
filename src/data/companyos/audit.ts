import { CompanyOSError } from './transport';

/**
 * M-07 on Company OS: the tenant's audit trail, `GET /t/:t/audit` (integration guide, admin routes table).
 * Super admin only (Hoy's Administration holds the tenant Super Admin role, decision AD-04); anyone else gets
 * `403 super-admin only`, which the transport turns into `forbidden`. Newest first; `?limit` ≤ 500; paged with
 * `?before=<ISO time>` = the last row's `at`; `?since`, `?event` (prefix), `?result`, `?actor`, `?q` filter.
 *
 * Paging: the API keeps microseconds but answers milliseconds and pages with `created_at < before`, so rows that share
 * the boundary's millisecond would be skipped. Each next page therefore asks from one millisecond later and drops the
 * ids it has already seen; a page that brings nothing new ends the read.
 */

export type AuditRequest = <T>(method: 'GET', path: string) => Promise<T>;
export interface AuditEvent { id: string; at: string; actor: string | null; event: string; result: string; details: Record<string, unknown> | null }
export interface AuditFilter { since?: string; before?: string; event?: string; result?: 'OK' | 'UNAUTHORIZED' | 'ERROR'; actor?: string; q?: string; limit?: number }

export const AUDIT_PAGE = 500;
/** A read stops here and says so (the screen asks for a narrower range). */
export const AUDIT_MAX_ROWS = 5000;
/** Every code this read can end with; each has a line in the code→copy table (`refusals.ts`). */
export const AUDIT_REFUSALS = ['forbidden', 'invalid_query', 'unauthorized', 'network_error', 'service_unavailable'] as const;

/** The request path: documented parameters only, empty ones left out, values URL-encoded, the limit kept in 1…500. */
export function auditPath(filter: AuditFilter): string {
  const p = new URLSearchParams();
  const limit = Number.isFinite(filter.limit) ? Math.min(AUDIT_PAGE, Math.max(1, Math.trunc(filter.limit!))) : AUDIT_PAGE;
  p.set('limit', String(limit));
  for (const key of ['before', 'since', 'event', 'result', 'actor', 'q'] as const) {
    const v = filter[key];
    if (typeof v === 'string' && v.trim()) p.set(key, v);
  }
  return `/audit?${p.toString()}`;
}

function isEvent(v: unknown): v is AuditEvent {
  const e = v as AuditEvent | null;
  return !!e && typeof e === 'object' && typeof e.id === 'string' && typeof e.at === 'string' && typeof e.event === 'string'
    && (e.actor === null || typeof e.actor === 'string') && !Number.isNaN(Date.parse(e.at));
}

/** One page, checked: a malformed answer is `service_unavailable`, never shown as "no activity". */
export async function readAuditPage(request: AuditRequest, filter: AuditFilter): Promise<AuditEvent[]> {
  const body = await request<{ events?: unknown }>('GET', auditPath(filter));
  const events = body && typeof body === 'object' ? body.events : undefined;
  if (!Array.isArray(events) || !events.every(isEvent)) throw new CompanyOSError('service_unavailable');
  return events.map((e) => ({ ...e, result: typeof e.result === 'string' ? e.result : 'OK', details: e.details && typeof e.details === 'object' ? e.details : null }));
}

/**
 * Every page of the filter, newest first, each event once, up to `maxRows`. `truncated` says the cap was hit (it may
 * also be set when exactly `maxRows` rows exist) or that a group of 500+ rows sharing one timestamp stopped the read.
 */
export async function readAudit(request: AuditRequest, filter: AuditFilter & { maxRows?: number }): Promise<{ events: AuditEvent[]; truncated: boolean }> {
  const maxRows = filter.maxRows ?? AUDIT_MAX_ROWS;
  const out: AuditEvent[] = [];
  const seen = new Set<string>();
  let before = filter.before;
  for (;;) {
    const page = await readAuditPage(request, { ...filter, before, limit: AUDIT_PAGE });
    const fresh = page.filter((e) => !seen.has(e.id));
    for (const e of fresh) {
      if (out.length >= maxRows) return { events: out, truncated: true };
      seen.add(e.id); out.push(e);
    }
    if (page.length < AUDIT_PAGE) return { events: out, truncated: false };
    // A full page with nothing new: 500+ rows share one timestamp (one transaction), so older rows can't be reached
    // by time; say the list is incomplete rather than end as if it were all.
    if (fresh.length === 0) return { events: out, truncated: true };
    if (out.length >= maxRows) return { events: out, truncated: true };
    // One millisecond past the last row, so its millisecond's other rows come again (dropped above if seen).
    before = new Date(Date.parse(page[page.length - 1].at) + 1).toISOString();
  }
}

export type AuditSourceKey = 'app' | 'api' | 'platform' | 'automation';
export interface ActivityRow {
  id: string; created_at: string; actor_id: string | null; who: string; roleLabel: string; action: string; entity: string;
  entity_id: string | null; object: string; sourceKey: AuditSourceKey; source: string; result: string;
  diff: Record<string, unknown> | null;
}
export interface ActivityLabels { system: string; platform: string; unknown: (id: string) => string }

/**
 * Screen rows. Who: the member's name (`GET /members`), else the platform operator, the system (no actor), or the
 * login id. Object: `details.entity#details.id` for record events, else the event's first word. Source: what a
 * frontend reported (`clientReported`), the platform operator, the system, or the API.
 */
export function activityRows(events: AuditEvent[], names: Map<string, string>, labels: ActivityLabels): ActivityRow[] {
  return events.map((e) => {
    const d = e.details ?? {};
    const platform = typeof e.actor === 'string' && e.actor.startsWith('platform:');
    const entity = typeof d.entity === 'string' && d.entity ? d.entity : e.event.split('.')[0];
    const entityId = typeof d.id === 'string' && d.id ? d.id : null;
    const sourceKey: AuditSourceKey = d.clientReported === true ? 'app' : platform ? 'platform' : e.actor === null ? 'automation' : 'api';
    return {
      id: e.id, created_at: e.at, actor_id: e.actor,
      who: e.actor === null ? labels.system : platform ? labels.platform : names.get(e.actor) ?? labels.unknown(e.actor),
      roleLabel: '', action: e.event, entity, entity_id: entityId, object: entityId ? `${entity}#${entityId}` : entity,
      sourceKey, source: sourceKey, result: e.result, diff: e.details,
    };
  });
}
