/**
 * Lane H-SEO (Hoy 12 Nov, decision D11): the public website on real Spanish paths. The app keeps its routes as they are
 * (`/site/...` inside the router, `HashRouter` for the app, staff and the Hub); the production build shows the website's
 * routes at these paths instead (`SiteRouter`, src/app/SiteRouter.tsx). The Hoy server serves the same table
 * (server/seo.mjs `SITE_PATHS`; scripts/test-seo.mjs checks they match). Pure, no imports: the Node tests load it.
 */
export const SITE_PATHS: ReadonlyArray<readonly [route: string, path: string]> = [
  ['/site/legal/terms', '/legal/terminos'],
  ['/site/legal/privacy', '/legal/privacidad'],
  ['/site/delete-account', '/eliminar-cuenta'],
  ['/site/about', '/nosotros'],
  ['/site/classes', '/clases'],
  ['/site/modalities', '/metodologias'],
  ['/site/schedule', '/horario'],
  ['/site/teachers', '/profesores'],
  ['/site/plans', '/planes'],
  ['/site/faq', '/preguntas'],
  ['/site/contact', '/contacto'],
  ['/site', '/'],
];

const CLASS_ROUTE = '/site/classes/';
const CLASS_PATH = '/clases/';
const SLUG = /^[a-z0-9][a-z0-9-]*$/;

/** An app route → its public path: `/site/plans` → `/planes`, `/site` → `/`. Null for anything that isn't the website. */
export function cleanPathOf(route: string): string | null {
  if (route !== '/site' && !route.startsWith('/site/')) return null;
  const path = route.length > 5 ? route.replace(/\/+$/, '') : route;
  for (const [from, to] of SITE_PATHS) if (path === from) return to;
  if (path.startsWith(CLASS_ROUTE) && SLUG.test(path.slice(CLASS_ROUTE.length))) return CLASS_PATH + path.slice(CLASS_ROUTE.length);
  // A website route this table doesn't know (a retired page): the home rather than a dead end.
  return '/';
}

/**
 * A public path → the app route it shows: `/planes` → `/site/plans`. `/` stays `/`: the root entry decides between
 * Coming Soon and the home (SW-08). Null for anything else.
 */
export function internalPathOf(path: string): string | null {
  if (path === '/') return '/';
  for (const [from, to] of SITE_PATHS) if (to !== '/' && path === to) return from;
  if (path.startsWith(CLASS_PATH) && SLUG.test(path.slice(CLASS_PATH.length))) return CLASS_ROUTE + path.slice(CLASS_PATH.length);
  return null;
}

export type BootRoute = { mode: 'path' | 'hash'; replace?: string };

/**
 * Which router a URL opens with. Production: a hash route (`/#/app/…`, `/#/`) is the app's; an old `/#/site/…` moves to
 * its public path (`replace`, the address bar only); a plain path is the website's. The review build (GitHub Pages, no
 * server to answer real paths) keeps hash routes everywhere. The path itself doesn't decide: an unknown one is the
 * server's 404, and the routes' own `*` sends anything else home.
 */
export function bootRoute(_pathname: string, hash: string, production: boolean): BootRoute {
  if (!production) return { mode: 'hash' };
  const route = hash.startsWith('#/') ? hash.slice(1) : '';
  if (!route) return { mode: 'path' };
  const q = route.search(/[?#]/);
  const clean = cleanPathOf(q === -1 ? route : route.slice(0, q));
  if (clean === null) return { mode: 'hash' };
  return { mode: 'path', replace: clean + (q === -1 ? '' : route.slice(q)) };
}

export interface PathParts { pathname: string; search?: string; hash?: string }

/** The href of an app route seen from the website: its public path, or `/#<route>` for the app. */
export function hrefOf({ pathname, search = '', hash = '' }: PathParts): string {
  const clean = cleanPathOf(pathname);
  if (clean !== null) return clean + search + hash;
  if (pathname === '/') return '/' + search + hash;
  return `/#${pathname}${search}${hash}`;
}
