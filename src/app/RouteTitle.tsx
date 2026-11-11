import { useEffect } from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import type { RouteDef } from '../specs/types';
import { useI18n } from '../i18n/I18nProvider';
import { tenant } from '../tenant/tenant';
import { PRODUCTION_BUILD } from '../config/launch';
import { siteRouteTitle } from '../modules/website/pageMeta';

/**
 * `document.title` follows the route: "Horario · HOY" on /app/schedule, the studio name alone on the hub. In the production
 * build the public website keeps the title the server sent for its address (`siteRouteTitle`; "Fuego: Enciende tu energía ·
 * HOY Human Club" on /clases/fuego), never a spec name such as "Sitio · Clase"; and the root entry (Coming Soon, or on its
 * way to the home) leaves the server's title alone.
 */
export function RouteTitle({ routes }: { routes: RouteDef[] }) {
  const { pathname } = useLocation();
  const { bi, lang } = useI18n();
  useEffect(() => {
    if (PRODUCTION_BUILD) {
      const site = siteRouteTitle(pathname);
      if (site) { document.title = site; return; }
      if (pathname === '/') return;
    }
    const route = routes.find((r) => matchPath({ path: r.path, end: true }, pathname));
    const name = route && route.path !== '/hub' ? bi(route.spec.name) : '';
    document.title = name ? `${name} · ${tenant.name}` : `${tenant.name} · HoyOS`;
  }, [pathname, routes, bi, lang]);
  return null;
}
