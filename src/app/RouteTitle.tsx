import { useEffect } from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import type { RouteDef } from '../specs/types';
import { useI18n } from '../i18n/I18nProvider';
import { tenant } from '../tenant/tenant';

/** `document.title` follows the route: "Horario · HOY" on /app/schedule, the studio name alone on the hub. */
export function RouteTitle({ routes }: { routes: RouteDef[] }) {
  const { pathname } = useLocation();
  const { bi, lang } = useI18n();
  useEffect(() => {
    const route = routes.find((r) => matchPath({ path: r.path, end: true }, pathname));
    const name = route && route.path !== '/' ? bi(route.spec.name) : '';
    document.title = name ? `${name} · ${tenant.name}` : `${tenant.name} · HoyOS`;
  }, [pathname, routes, bi, lang]);
  return null;
}
