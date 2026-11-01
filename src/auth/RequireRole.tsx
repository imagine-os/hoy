import { Navigate, useLocation } from 'react-router-dom';
import { lazy, Suspense, useMemo, type ReactNode } from 'react';
import type { Role } from './roles';
import { roleCan } from './permissions';
import { useSession } from './SessionProvider';
import { SessionContext, heldRoles, type SessionCtx } from './sessionContext';
import { visitorSignIn } from './visitorSignIn';
import { joinsAsCustomer } from './purchaseEntry';
import { matrixAllows } from '../config/roleMatrix';
import { PRODUCTION_BUILD } from '../config/launch';

// Production only (it needs the Clerk session): folded away in the review build.
const JoinAsCustomer = PRODUCTION_BUILD ? lazy(() => import('./JoinAsCustomer')) : null;

/**
 * Guards a route. Public routes pass everyone; otherwise the effective role must match. PL-05: the launch permissions
 * matrix (src/config/roleMatrix.ts) then applies on top and can only take access away. (The owner's public manual and
 * docs paths, SW-06's public-documents switch, are retired, owner 2026-11-01: they are the super admin's only.)
 *
 * Production (PL-04): the role is the one Company OS `/me` returned. While the session is still loading a private route
 * waits instead of redirecting; a Clerk session that is not a studio member yet goes to finish sign-up; every other
 * unfinished state (unverified email, no launch role, an error) goes to sign-in, which explains it. These checks only
 * shape the screens: Company OS refuses whatever the role may not read or write.
 *
 * Lane Y2 (test-hoy fixes, owner 2026-11-01): a login whose primary role is staff but which also holds the customer
 * role opens the customer area as a customer (the screens below see `role: 'customer'`, the same person); a studio
 * login that isn't a customer yet is offered "Join as a customer" there instead of the no-access page.
 *
 * Review round 1 (r1hoy): never inside a read-only document (M1, `joinsAsCustomer`); and a real super admin, whom the
 * matrix lets into every area, gets the same offer on a customer page when they don't hold the customer role (L5),
 * instead of a checkout whose purchase Company OS would refuse. A super admin looks at the customer app through view-as.
 */
export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const session = useSession();
  const { hasRole, user, role, status, signedIn, viewAs } = session;
  const loc = useLocation();
  const publicRoute = roles.includes('public');
  const held = heldRoles(session);
  const asCustomer = !publicRoute && status === 'ready' && signedIn && viewAs === null && role !== 'customer' && held.includes('customer')
    && roles.includes('customer') && matrixAllows('customer', loc.pathname);
  const customerSession = useMemo<SessionCtx | null>(() => asCustomer ? {
    // Staff capabilities stay out of the customer screens (review round, L3); `roles` stays for the way back.
    ...session, role: 'customer', isSuperAdmin: false, canDevMode: false, devMode: false, caps: [],
    can: (p) => roleCan('customer', p), hasRole: (r) => r.includes('public') || r.includes('customer'),
  } : null, [asCustomer, session]);
  if (!publicRoute && status === 'loading') return <div className="lazy-fallback" aria-busy="true" />;
  const join = !!JoinAsCustomer && !publicRoute && joinsAsCustomer({ status, signedIn, viewAs, roles: held, routeRoles: roles, path: loc.pathname });
  const joinPage = JoinAsCustomer && <Suspense fallback={<div className="lazy-fallback" aria-busy="true" />}><JoinAsCustomer /></Suspense>;
  if (join && role === 'super_admin') return joinPage;
  if (hasRole(roles) && matrixAllows(role, loc.pathname)) return <>{children}</>;
  if (customerSession) return <SessionContext.Provider value={customerSession}>{children}</SessionContext.Provider>;
  if (join) return joinPage;
  if (status === 'needs-signup') return <Navigate to={visitorSignIn(loc.pathname + loc.search).replace('/auth/sign-in', '/auth/sign-up')} replace />;
  if (user.role === 'public' || (signedIn && status !== 'ready')) return <Navigate to={visitorSignIn(loc.pathname + loc.search)} replace />;
  return <Navigate to={`/no-access?from=${encodeURIComponent(loc.pathname)}`} replace />;
}

