import { customerReturn } from '../modules/customer/auth/customerReturn';
import { LAUNCH_ROUTES, isLaunchRoute } from '../config/launchRoutes';
import { matrixAllows } from '../config/roleMatrix';
import { ROLE_HOME, type Role } from './roles';

/** Path segments only: no query, no fragment, no dots, no encoded characters; at most 8 segments. */
const STRICT_PATH = /^(?:\/[A-Za-z0-9_-]{1,80}){1,8}$/;
/** The areas a sign-in may send someone back into (never `/auth`, the website or the error pages: no loops). */
const AREAS = new Set(['app', 'staff', 'admin']);

/** A launch route pattern (`/app/receipts/:paymentId`, `/staff/transfers/*`) that matches this concrete path. */
function matchesLaunchRoute(path: string): boolean {
  if (isLaunchRoute(path)) return true;
  const parts = path.split('/');
  return LAUNCH_ROUTES.some((pattern) => {
    if (!pattern.includes(':')) return false;
    const want = pattern.split('/');
    return want.length === parts.length && want.every((seg, i) => seg.startsWith(':') || seg === parts[i]);
  });
}

/**
 * Where sign-in may return to (`next`): the customer allowlist (`customerReturn`, query strings included), or any
 * internal launch route in the app, staff or admin areas given as a strict path (`/staff/transfers`,
 * `/app/receipts/<id>`, `/app/booking/<id>`, `/app/pay/<what>/<id>`). Anything else is null. Navigation only: the
 * destination keeps its role guard.
 */
export function signInReturn(value: string | null | undefined): string | null {
  const customer = customerReturn(value);
  if (customer) return customer;
  if (!value || !STRICT_PATH.test(value)) return null;
  if (!AREAS.has(value.split('/')[1])) return null;
  return matchesLaunchRoute(value) ? value : null;
}

/** Where a signed-in person lands: the validated `next` when it is in their own area, else their home. */
export function homeFor(role: Role, next: string | null): string {
  const target = signInReturn(next);
  if (!target) return ROLE_HOME[role];
  const area = target.split('/')[1];
  if (role === 'customer') return area === 'app' ? target : ROLE_HOME[role];
  if (area === 'app') return ROLE_HOME[role];
  return matrixAllows(role, target.split('?')[0]) ? target : ROLE_HOME[role];
}

/** A sign-in or sign-up link keeping a validated `next` and the invitation, like `customerAuthLink` with launch routes. */
export function authLink(path: '/auth/sign-in' | '/auth/sign-up', params: URLSearchParams): string {
  const result = new URLSearchParams();
  const next = signInReturn(params.get('next'));
  if (next) result.set('next', next);
  const invite = params.get('invite');
  if (invite) result.set('invite', invite);
  return `${path}${result.size ? `?${result}` : ''}`;
}
