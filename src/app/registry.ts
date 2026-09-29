import type { RedirectDef, RouteDef } from '../specs/types';
import type { StringTable } from '../i18n/types';

/**
 * Collects every module. A module is src/modules/<name>/index.ts exporting { routes, strings } and, optionally,
 * `redirects` (retired paths that must keep resolving, e.g. /app/intention → /app since 0030).
 * Nobody edits this file to add a page.
 *
 * The getters are lazy on purpose: modules (dev tools, shells) may import this file, so reading
 * `m.routes` at module-evaluation time would hit an ESM cycle (TDZ). Call getRoutes() inside
 * functions/components, never at the top level of a module.
 */
interface ModuleExports { routes: RouteDef[]; strings: StringTable; redirects?: RedirectDef[] }

const found = import.meta.glob<ModuleExports>('../modules/*/index.ts', { eager: true });

let cache: { modules: { name: string; routes: RouteDef[]; strings: StringTable }[]; routes: RouteDef[]; strings: StringTable[]; redirects: RedirectDef[] } | null = null;

function build() {
  if (cache) return cache;
  const modules = Object.entries(found)
    .map(([path, m]) => ({ name: path.split('/')[2], routes: m.routes ?? [], strings: m.strings ?? {}, redirects: m.redirects ?? [] }))
    .sort((a, b) => a.name.localeCompare(b.name));
  // Splat routes (`/docs/*`) go last, so a lookup that takes the first match (shell title, inspector, route title)
  // finds a static route of another module (`/docs/source`, 0031) before the catch-all.
  const all = modules.flatMap((m) => m.routes);
  const routes = [...all.filter((r) => !r.path.endsWith('*')), ...all.filter((r) => r.path.endsWith('*'))];
  cache = { modules, routes, strings: modules.map((m) => m.strings), redirects: modules.flatMap((m) => m.redirects) };
  if (import.meta.env.DEV) {
    const seen = new Map<string, string>();
    for (const m of modules) for (const r of m.routes) {
      if (seen.has(r.path)) console.warn(`[registry] duplicate route ${r.path} in ${m.name} and ${seen.get(r.path)}`);
      seen.set(r.path, m.name);
      if (!r.spec) console.warn(`[registry] route ${r.path} has no spec`);
    }
  }
  return cache;
}

export const getRoutes = (): RouteDef[] => build().routes;
export const getStrings = (): StringTable[] => build().strings;
export const getRedirects = (): RedirectDef[] => build().redirects;
