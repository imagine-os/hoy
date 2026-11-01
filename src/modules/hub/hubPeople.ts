import type { Role } from '../../auth/roles';
import { loadViewAsSample, VIEWABLE_ROLES, type ViewAsRead, type ViewAsSample, type ViewAsSampleFailure } from '../../auth/viewAs';

/** Per viewable role: the real person view-as samples, `null` when nobody holds it, `{ error }` when it can't be read. */
export type HubPeople = Partial<Record<Role, ViewAsSample | ViewAsSampleFailure | null>>;

/**
 * The real people the production Hub names (Hoy test-fixes, lane Y3): "Entrar como {first name}" on a card and the
 * persona dropdown. Each role's person is exactly the one view-as will sample (`loadViewAsSample`, by membership:
 * never the viewer, an active coach for Teacher, the first member by name for Customer), so the name on the button is
 * the person whose data the screens then show. Reads only; the directory (`GET /admin/users`, super admin) is read
 * once for every role and each identical query is asked once.
 */
export async function loadHubPeople(read: ViewAsRead, viewerUserId: string, roles: readonly Role[] = VIEWABLE_ROLES): Promise<HubPeople> {
  const cache = new Map<string, Promise<unknown>>();
  const cached: ViewAsRead = (method, path, body) => {
    const key = `${method} ${path} ${body === undefined ? '' : JSON.stringify(body)}`;
    let hit = cache.get(key);
    if (!hit) { hit = read(method, path, body); cache.set(key, hit); }
    return hit;
  };
  const answers = await Promise.all(roles.map((role) => loadViewAsSample(role, cached, viewerUserId)));
  return Object.fromEntries(roles.map((role, i) => [role, answers[i]])) as HubPeople;
}

/** "Ana Cliente" → "Ana" (the card's "Entrar como {name}"). */
export const firstName = (name: string): string => name.trim().split(/\s+/)[0] ?? '';
