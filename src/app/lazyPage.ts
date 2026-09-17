import { createElement as h, lazy, type ComponentProps, type ComponentType } from 'react';

/**
 * Route-level code splitting that keeps the registry contract: a module's index.ts still exports
 * `{ routes, strings }` synchronously, but its page components live in a `pages.ts` barrel that is
 * imported on first visit. `App.tsx` holds the single <Suspense> the lazy elements resolve under.
 *
 *   const page = lazyPages(() => import('./pages'));
 *   routes = [{ path: '/dev', element: page('SpecsIndexPage'), … }]
 *
 * Every page of a module shares one chunk (Rollup dedupes the dynamic import), so a surface loads
 * in one request instead of one per screen.
 */
export function lazyPages<M extends Record<string, ComponentType<any>>>(load: () => Promise<M>) {
  const cache = new Map<keyof M, ComponentType<any>>();
  return <K extends keyof M>(name: K, props?: ComponentProps<M[K]>) => {
    let C = cache.get(name);
    if (!C) { C = lazy(() => load().then((m) => ({ default: m[name] as ComponentType<any> }))); cache.set(name, C); }
    return h(C, props ?? null);
  };
}
