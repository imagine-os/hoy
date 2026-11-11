import { PAGES } from '../../../server/pageMeta.mjs';
import { cleanPathOf } from './paths';

/**
 * Review round 2 (M1): the title of a public website page is the one the server wrote into the page (the indexed one),
 * from the one table both read (server/pageMeta.mjs). The browser keeps it after the app loads instead of replacing it
 * with the route's internal spec name. `route` is the app's route (`/site/plans`); null for anything that isn't a public
 * page the server knows (the app, the root entry, an unknown class slug).
 */
export function siteRouteTitle(route: string): string | null {
  if (route !== '/site' && !route.startsWith('/site/')) return null;
  const path = cleanPathOf(route);
  if (path === null || !Object.prototype.hasOwnProperty.call(PAGES, path)) return null;
  // `cleanPathOf` sends a retired website route to the home; a class slug the server has no page for isn't the home's.
  if (path === '/' && route.replace(/\/+$/, '') !== '/site') return null;
  return PAGES[path].title;
}
