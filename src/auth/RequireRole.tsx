import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { Role } from './roles';
import { useSession } from './SessionProvider';
import { visitorSignIn } from './visitorSignIn';

/** Guards a route. Public routes pass everyone; otherwise the effective role must match. */
export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { hasRole, user } = useSession();
  const loc = useLocation();
  if (hasRole(roles)) return <>{children}</>;
  if(user.role==='public')return <Navigate to={visitorSignIn(loc.pathname+loc.search)} replace />;
  return <Navigate to={`/no-access?from=${encodeURIComponent(loc.pathname)}`} replace />;
}
