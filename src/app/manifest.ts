import type { RouteDef } from '../specs/types';
import { PageStub } from '../components/template/PageStub/PageStub';
import { demoUsers } from '../auth/demoUsers';

/** What `scripts/screenshots.mjs` and `gen-page-doc.mjs` read from the running app: every route with its real spec and roles. */
export interface RouteManifestEntry { path: string; code: string; surface: RouteDef['surface']; status: 'built' | 'stub'; roles: RouteDef['roles']; spec: RouteDef['spec'] }

const isStub = (el: RouteDef['element']) => !!el && typeof el === 'object' && 'type' in el && (el as { type: unknown }).type === PageStub;

function buildManifest(routes: RouteDef[]): RouteManifestEntry[] {
  return routes.map((r) => ({ path: r.path, code: r.spec.code, surface: r.surface, status: isStub(r.element) ? 'stub' : 'built', roles: r.roles, spec: r.spec }));
}

/** Exposes the manifest (and the demo users per role) on window.__hoyos so tooling can pick a signed-in user per route without parsing TypeScript. */
export function publishManifest(routes: RouteDef[]): void {
  if (typeof window === 'undefined') return;
  const users = demoUsers.map((u) => ({ id: u.id, role: u.role }));
  (window as unknown as { __hoyos?: { routes: RouteManifestEntry[]; users: typeof users } }).__hoyos = { routes: buildManifest(routes), users };
}
