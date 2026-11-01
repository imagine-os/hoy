import { ROLES, type Role } from './roles';
import { KEY_OF_ROLE } from './companyOsIdentity';

/**
 * Production "view as" (Hoy all-roles, lane D; Santa María's pattern in `os/lib/auth.js`). A super admin sees the
 * studio as any other signed-in role, **read-only**:
 * - the viewed role is kept in this tab's sessionStorage (`hoyos.viewAs`), so a reload keeps it; sign-out wipes every
 *   `hoyos.*` key (ProductionSession `clearLocalTraces`). Only the session decides whether it counts: for anyone but a
 *   super admin a stored value is ignored and removed;
 * - the session's effective role is the viewed one, `user` stays the real person, and `viewAsPerson` is a sample person
 *   of that role, chosen by membership (`loadViewAsSample`): never invented;
 * - the data provider aliases the session user to the sample person (`viewAsPersonId`), so screens that filter by
 *   `user.id` show that person's records;
 * - nothing but reads leaves the browser (`viewAsAllows`): the Company OS transport and `cosJson` refuse every other
 *   request with `view_as_read_only`. Company OS still decides what the super admin's token may read.
 *
 * No React here: the transport, the provider and the node tests share it. The review build never publishes a state
 * (its demo session keeps its own view-as) and keeps no `hoyos.viewAs`.
 */
export const VIEW_AS_KEY = 'hoyos.viewAs';
export const VIEW_AS_REFUSAL = 'view_as_read_only';

/** Every signed-in role but the super admin's own: `public` is the signed-out website, not a role to sign in as. */
export const VIEWABLE_ROLES: readonly Role[] = Object.freeze(ROLES.filter((r) => r !== 'super_admin' && r !== 'public'));
export const isViewableRole = (role: unknown): role is Role => typeof role === 'string' && (VIEWABLE_ROLES as readonly string[]).includes(role);

const storage = (): Storage | null => { try { return typeof sessionStorage === 'undefined' ? null : sessionStorage; } catch { return null; } };

/** The viewed role this tab keeps; a value that is not a viewable role is removed and answers null. */
export function readStoredViewAs(): Role | null {
  const s = storage();
  try {
    const raw = s?.getItem(VIEW_AS_KEY) ?? null;
    if (raw === null) return null;
    if (isViewableRole(raw)) return raw;
    s?.removeItem(VIEW_AS_KEY);
  } catch { /* storage blocked: nothing kept */ }
  return null;
}

/** Keeps (or with null, forgets) the viewed role for this tab. A role that is not viewable is not kept. */
export function storeViewAs(role: Role | null): void {
  const s = storage();
  try {
    if (role === null) s?.removeItem(VIEW_AS_KEY);
    else if (isViewableRole(role)) s?.setItem(VIEW_AS_KEY, role);
  } catch { /* storage blocked: view-as lasts until the next reload */ }
}

// ── The state the session publishes, read by the transport and the provider ─────────────────────────────────────────
let current: { personId: string | null } | null = null;
const listeners = new Set<() => void>();

/**
 * ProductionSession publishes whether a super admin is viewing as (and the sample person, when one was found), or null.
 * Listeners (the provider) hear only real changes.
 */
export function publishViewAs(next: { personId: string | null } | null): void {
  const value = next ? { personId: typeof next.personId === 'string' && next.personId ? next.personId : null } : null;
  if ((current === null) === (value === null) && current?.personId === value?.personId) return;
  current = value;
  for (const l of listeners) { try { l(); } catch { /* a listener's failure is its own */ } }
}

/**
 * Read-only is on while the session says so, and also while this tab keeps a viewed role the session has not checked
 * yet (fail closed: a stored view-as blocks writes until the session confirms or removes it).
 */
export function viewAsActive(): boolean {
  if (current) return true;
  try { return storage()?.getItem(VIEW_AS_KEY) != null; } catch { return false; }
}

/** The sample person's id while viewing as (the provider's alias for the session user), else null. */
export const viewAsPersonId = (): string | null => current?.personId ?? null;

export function onViewAsChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** While viewing as, only these leave the browser: any `GET`, and `POST /query` (Company OS's read). Exact match. */
export const viewAsAllows = (method: string, path: string): boolean => method === 'GET' || (method === 'POST' && path === '/query');

// ── The sample person ──────────────────────────────────────────────────────────────────────────────────────────────
const SAMPLE_BATCH = 50;
export interface ViewAsSample { userId: string; personId: string; name: string; email: string }
/** The sample person could not be read (refused, offline, an answer of the wrong shape): not the same as "nobody". */
export interface ViewAsSampleFailure { error: string }
export const isViewAsFailure = (v: ViewAsSample | ViewAsSampleFailure | null): v is ViewAsSampleFailure => !!v && 'error' in v;
/** A failure's code: the read's own when it is a plain key, `network_error` for a fetch that never answered. */
function failureCode(e: unknown): string {
  const code = e && typeof e === 'object' ? (e as { code?: unknown }).code : undefined;
  if (typeof code === 'string' && /^[a-z][a-z0-9_]{0,63}$/.test(code)) return code;
  if (e instanceof TypeError) return 'network_error';
  return 'view_as_unavailable';
}
class Malformed extends Error {}
/** A read against Company OS (`GET /admin/users`, `POST /query`): the parsed body, or a throw when refused. */
export type ViewAsRead = (method: 'GET' | 'POST', path: string, body?: unknown) => Promise<unknown>;

interface DirectoryUser { userId: string; email: string; name: string; keys: string[] }
const text = (v: unknown, max = 320) => (typeof v === 'string' && v.length <= max ? v : '');
function directoryUsers(body: unknown): DirectoryUser[] {
  const users = body && typeof body === 'object' ? (body as { users?: unknown }).users : null;
  if (!Array.isArray(users)) return [];
  return users.flatMap((u) => {
    const r = u && typeof u === 'object' ? u as Record<string, unknown> : {};
    const userId = text(r.userId, 128);
    if (!userId || !Array.isArray(r.memberships)) return [];
    const keys = r.memberships.flatMap((m) => (m && typeof m === 'object' && typeof (m as { roleKey?: unknown }).roleKey === 'string' ? [(m as { roleKey: string }).roleKey] : []));
    return [{ userId, email: text(r.email), name: text(r.name, 200), keys }];
  });
}
const records = (body: unknown): { id: string; data: Record<string, unknown> }[] => {
  const data = body && typeof body === 'object' ? (body as { data?: unknown }).data : null;
  return Array.isArray(data) ? data.filter((r): r is { id: string; data: Record<string, unknown> } => Boolean(r) && typeof r.id === 'string' && Boolean(r.data) && typeof r.data === 'object') : [];
};
const refOf = (v: unknown): string | null => (typeof v === 'string' ? v : v && typeof v === 'object' && typeof (v as { id?: unknown }).id === 'string' ? (v as { id: string }).id : null);

/**
 * The person a super admin sees the viewed role through, by membership (A2's test seed gives every role key a person
 * with a login): the people holding the role's Company OS key, by name, never the viewer; for Teacher the first one
 * with an active coach record (else the first holder); the first member for Customer. Null when nobody holds the role
 * or for a role that can't be viewed; `{ error }` when the directory or the persons can't be read (review round 2, L2:
 * the screen offers a retry instead of saying nobody holds the role). Reads only.
 */
export async function loadViewAsSample(role: Role, read: ViewAsRead, viewerUserId: string): Promise<ViewAsSample | ViewAsSampleFailure | null> {
  if (!isViewableRole(role)) return null;
  const key = KEY_OF_ROLE[role];
  if (!key) return null;
  try {
    const directory = await read('GET', '/admin/users');
    if (!directory || typeof directory !== 'object' || !Array.isArray((directory as { users?: unknown }).users)) throw new Malformed();
    const holders = directoryUsers(directory)
      .filter((u) => u.userId !== viewerUserId && u.keys.includes(key))
      // By name (a missing name last), then id: the same person every time.
      .sort((a, b) => Number(!a.name) - Number(!b.name) || a.name.localeCompare(b.name, 'es') || a.userId.localeCompare(b.userId));
    // The persons of the first holders, a batch at a time (a studio has hundreds of members; one batch usually does).
    const personOf = new Map<string, { id: string; data: Record<string, unknown> }>();
    let candidates: DirectoryUser[] = [];
    for (let i = 0; i < holders.length && !candidates.length && i < SAMPLE_BATCH * 4; i += SAMPLE_BATCH) {
      const batch = holders.slice(i, i + SAMPLE_BATCH);
      const people = records(await read('POST', '/query', { entity: 'person', filter: { field: 'user', op: 'in', value: batch.map((u) => u.userId) }, limit: SAMPLE_BATCH }));
      for (const p of people) { const u = refOf(p.data.user); if (u) personOf.set(u, p); }
      candidates = batch.filter((u) => personOf.has(u.userId));
    }
    if (!candidates.length) return null;
    if (role === 'teacher') {
      const ids = candidates.map((u) => personOf.get(u.userId)!.id);
      const active = new Set(records(await read('POST', '/query', { entity: 'coach', filter: { and: [{ field: 'person', op: 'in', value: ids }, { field: 'active', op: 'eq', value: true }] }, limit: 500 }))
        .filter((c) => c.data.active !== false).map((c) => refOf(c.data.person)));
      const coaching = candidates.filter((u) => active.has(personOf.get(u.userId)!.id));
      if (coaching.length) candidates = coaching;
    }
    const pick = candidates[0];
    const person = personOf.get(pick.userId)!;
    return { userId: pick.userId, personId: person.id, name: text(person.data.name, 200) || pick.name || pick.email, email: pick.email };
  } catch (e) {
    return { error: e instanceof Malformed ? 'view_as_malformed' : failureCode(e) };
  }
}
