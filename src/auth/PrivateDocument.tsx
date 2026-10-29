import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { isPublicDocument, useLaunchConfig } from '../config/launch';
import { useSession } from './SessionProvider';
import { visitorSignIn } from './visitorSignIn';

/**
 * SW-06 (Q-14) — the operations manual and the docs are internal (policies, processes, internal prices). A visitor who
 * is not signed in goes to sign-in, unless the owner listed the path in `publicDocuments` (src/config/launch.ts).
 * Customers are refused by the launch matrix in RequireRole (PL-05: manual and docs are team only).
 */
export function PrivateDocument({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const config = useLaunchConfig();
  const loc = useLocation();
  if (user.role !== 'public' || isPublicDocument(config, loc.pathname)) return <>{children}</>;
  return <Navigate to={visitorSignIn(loc.pathname + loc.search)} replace />;
}
