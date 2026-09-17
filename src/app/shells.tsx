import type { ReactNode } from 'react';
import type { RouteDef } from '../specs/types';
import { PhoneShell } from '../components/template/PhoneShell/PhoneShell';
import { DesktopShell } from '../components/template/DesktopShell/DesktopShell';
import { getRoutes } from './registry';

/** Picks the shell for a route by surface. Public pages bring their own layout (SiteShell). */
export function withShell(route: RouteDef, children: ReactNode): ReactNode {
  const allRoutes = getRoutes();
  switch (route.surface) {
    case 'customer': return <PhoneShell surface="customer" routes={allRoutes} homeTo="/app">{children}</PhoneShell>;
    case 'teacher': return <PhoneShell surface="teacher" routes={allRoutes} homeTo="/teach">{children}</PhoneShell>;
    case 'staff': return <DesktopShell surfaces={['staff', 'admin']} routes={allRoutes} titleKey="core.nav.group.staff">{children}</DesktopShell>;
    case 'admin': return <DesktopShell surfaces={['admin', 'staff']} routes={allRoutes} titleKey="core.nav.group.admin">{children}</DesktopShell>;
    // the dev surface keeps the admin nav beside the design-system group so a super admin can go back
    case 'dev': return <DesktopShell surfaces={['dev', 'admin']} routes={allRoutes} titleKey="core.nav.group.design">{children}</DesktopShell>;
    case 'docs': return <DesktopShell surfaces={['docs']} routes={allRoutes} titleKey="core.nav.docs">{children}</DesktopShell>;
    default: return children;
  }
}
