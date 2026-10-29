import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { Role } from './roles';
import { useSession } from './SessionProvider';
import { visitorSignIn } from './visitorSignIn';
import { matrixAllows } from '../config/roleMatrix';
import { isPublicDocument, useLaunchConfig } from '../config/launch';

/**
 * Guards a route. Public routes pass everyone; otherwise the effective role must match. PL-05: the launch permissions
 * matrix (src/config/roleMatrix.ts) then applies on top and can only take access away; a manual or docs path the owner
 * made public (SW-06) stays open.
 *
 * Production (PL-04): the role is the one Company OS `/me` returned. While the session is still loading a private route
 * waits instead of redirecting; a Clerk session that is not a studio member yet goes to finish sign-up; every other
 * unfinished state (unverified email, no launch role, an error) goes to sign-in, which explains it. These checks only
 * shape the screens: Company OS refuses whatever the role may not read or write.
 */
export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { hasRole, user, role, status, signedIn } = useSession();
  const config = useLaunchConfig();
  const loc = useLocation();
  const publicRoute = roles.includes('public');
  if (!publicRoute && status === 'loading') return <div className="lazy-fallback" aria-busy="true" />;
  if (hasRole(roles) && (matrixAllows(role, loc.pathname) || isPublicDocument(config, loc.pathname))) return <>{children}</>;
  if (status === 'needs-signup') return <Navigate to={visitorSignIn(loc.pathname + loc.search).replace('/auth/sign-in', '/auth/sign-up')} replace />;
  if (user.role === 'public' || (signedIn && status !== 'ready')) return <Navigate to={visitorSignIn(loc.pathname + loc.search)} replace />;
  return <Navigate to={`/no-access?from=${encodeURIComponent(loc.pathname)}`} replace />;
}
