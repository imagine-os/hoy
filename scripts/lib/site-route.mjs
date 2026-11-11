// The route a browser page shows, for the UI checks (lane H-SEO, D11). The app's routes are hash routes (`/#/app/…`);
// the production build shows the website on real paths (`/planes` is the route `/site/plans`;
// src/modules/website/paths.ts). `/` without a hash reads as `/site`: the home, once live.
import { internalPathOf } from '../../src/modules/website/paths.ts';

export function routeOf(url, { decode = true } = {}) {
  const u = new URL(url);
  if (u.hash.startsWith('#/')) return decode ? decodeURIComponent(u.hash.slice(1)) : u.hash.slice(1);
  const internal = internalPathOf(u.pathname);
  if (internal === null) return u.hash.slice(1);
  return `${internal === '/' ? '/site' : internal}${u.search}`;
}
