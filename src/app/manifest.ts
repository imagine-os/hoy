import type { RouteDef } from '../specs/types';
import { PageStub } from '../components/template/PageStub/PageStub';
import { demoUsers } from '../auth/demoUsers';
import { listActions, run, type DeclaredAction, type ActionResult } from '../actions';

/** What `scripts/screenshots.mjs` and `gen-page-doc.mjs` read from the running app: every route with its real spec and roles. */
export interface RouteManifestEntry { path: string; code: string; surface: RouteDef['surface']; status: 'built' | 'stub'; roles: RouteDef['roles']; spec: RouteDef['spec'] }

const isStub = (el: RouteDef['element']) => !!el && typeof el === 'object' && 'type' in el && (el as { type: unknown }).type === PageStub;

/** The manifest as data. The hub and D-05 read it to badge a surface built / stub. */
export function routeManifest(routes: RouteDef[]): RouteManifestEntry[] {
  return routes.map((r) => ({ path: r.path, code: r.spec.code, surface: r.surface, status: isStub(r.element) ? 'stub' : 'built', roles: r.roles, spec: r.spec }));
}

/** What `window.__hoyos` carries. `actions` + `run` are the WebMCP surface (docs/reference/surfaces.md). */
export interface HoyosGlobal {
  routes: RouteManifestEntry[];
  users: { id: string; role: RouteDef['roles'][number] }[];
  actions: DeclaredAction[];
  run: (id: string, params?: Record<string, string>) => Promise<ActionResult>;
}

/**
 * Exposes the manifest on `window.__hoyos` so tooling can pick a signed-in user per route without
 * parsing TypeScript, plus the declared actions and the `run(id, params)` entry point an agent
 * (WebMCP, and later the voice controller) drives the app through.
 */
export function publishManifest(routes: RouteDef[]): void {
  if (typeof window === 'undefined') return;
  const users = demoUsers.map((u) => ({ id: u.id, role: u.role }));
  // `actions` is a getter: `mounted` has to answer for the page that is open right now, not for
  // whatever was mounted when the app booted.
  const g: HoyosGlobal = { routes: routeManifest(routes), users, get actions() { return listActions(); }, run };
  (window as unknown as { __hoyos?: HoyosGlobal }).__hoyos = g;
}
