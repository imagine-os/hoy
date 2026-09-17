import type { RouteDef } from '../specs/types';
import { PageStub } from '../components/template/PageStub/PageStub';

/** What `scripts/screenshots.mjs` and `gen-page-doc.mjs` read from the running app: every route with its real spec. */
export interface RouteManifestEntry { path: string; code: string; surface: RouteDef['surface']; status: 'built' | 'stub'; spec: RouteDef['spec'] }

const isStub = (el: RouteDef['element']) => !!el && typeof el === 'object' && 'type' in el && (el as { type: unknown }).type === PageStub;

export function buildManifest(routes: RouteDef[]): RouteManifestEntry[] {
  return routes.map((r) => ({ path: r.path, code: r.spec.code, surface: r.surface, status: isStub(r.element) ? 'stub' : 'built', spec: r.spec }));
}

/** Exposes the manifest on window.__hoyos so tooling can read spec codes without parsing TypeScript. */
export function publishManifest(routes: RouteDef[]): void {
  if (typeof window === 'undefined') return;
  (window as unknown as { __hoyos?: { routes: RouteManifestEntry[] } }).__hoyos = { routes: buildManifest(routes) };
}
