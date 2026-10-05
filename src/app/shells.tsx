import type { ReactNode } from 'react';
import type { RouteDef, Surface } from '../specs/types';
import { AppShell } from '../components/template/AppShell/AppShell';
import { DesktopShell } from '../components/template/DesktopShell/DesktopShell';
import { getRoutes } from './registry';

/** DesktopShell nav groups and title per surface (the dev surface keeps the admin nav beside the design-system group). */
const DESKTOP: Record<Surface, { surfaces: Surface[]; titleKey: string }> = {
  public: { surfaces: ['docs'], titleKey: 'core.nav.docs' },
  customer: { surfaces: ['customer'], titleKey: 'core.nav.home' },
  teacher: { surfaces: ['teacher'], titleKey: 'core.nav.classes' },
  staff: { surfaces: ['staff', 'admin'], titleKey: 'core.nav.group.staff' },
  admin: { surfaces: ['admin', 'staff'], titleKey: 'core.nav.group.admin' },
  dev: { surfaces: ['dev', 'admin'], titleKey: 'core.nav.group.design' },
  docs: { surfaces: ['docs'], titleKey: 'core.nav.docs' },
};
const APP_HOME: Partial<Record<Surface, string>> = { customer: '/app', teacher: '/teach' };

/**
 * Picks the shell for a route. `RouteDef.layout` decides first — `mobile` → the responsive app shell (column + dock
 * below 900 px, top-bar nav above), `desktop` → DesktopShell (sidebar); `auto` (or unset) falls back to the surface's
 * default. Public pages bring their own layout (SiteShell, AuthShell) whatever they declare.
 */
export function withShell(route: RouteDef, children: ReactNode): ReactNode {
  if (route.surface === 'public') return children;
  const allRoutes = getRoutes();
  const mode = route.layout === 'mobile' || route.layout === 'desktop' ? route.layout : (route.surface === 'customer' || route.surface === 'teacher' ? 'mobile' : 'desktop');
  if (mode === 'mobile') return <AppShell surface={route.surface} routes={allRoutes} homeTo={APP_HOME[route.surface] ?? '/hub'}>{children}</AppShell>;
  const d = DESKTOP[route.surface];
  return <DesktopShell surfaces={d.surfaces} routes={allRoutes} titleKey={d.titleKey}>{children}</DesktopShell>;
}
