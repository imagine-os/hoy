import { customerReturn } from '../modules/customer/auth/customerReturn';
import { CUSTOMER_AUTO_ENROL_STAFF } from '../config/launch';
import { LAUNCH_ROUTES, isLaunchRoute } from '../config/launchRoutes';
import { matrixAllows } from '../config/roleMatrix';
import { ROLE_HOME, type Role } from './roles';

/** Path segments only: no query, no fragment, no dots, no encoded characters; at most 8 segments. */
const STRICT_PATH = /^(?:\/[A-Za-z0-9_-]{1,80}){1,8}$/;
/**
 * The areas a sign-in may send someone back into (never `/auth`, the website or the error pages: no loops). `teach`,
 * `hub` and `dev` (Hoy all-roles): only their launch routes, like the others.
 */
const AREAS = new Set(['app', 'staff', 'admin', 'teach', 'hub', 'dev']);

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
 * internal launch route in the app, staff, admin, teacher, hub or dev areas given as a strict path (`/staff/transfers`,
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

/**
 * Where a signed-in person lands: the validated `next` when it is in their own area, else their home. `held` is every
 * role the login holds (lane Y2). An `/app` next is followed for a login holding the customer role, and, with the staff
 * enrolment switch on (`CUSTOMER_AUTO_ENROL_STAFF`), for every login, whose customer page enrols it. A staff next is still judged by the primary role's matrix.
 */
export function homeFor(role: Role, next: string | null, held: readonly Role[] = [role], autoEnrolStaff: boolean = CUSTOMER_AUTO_ENROL_STAFF): string {
  const target = signInReturn(next);
  if (!target) return ROLE_HOME[role];
  const area = target.split('/')[1];
  if (role === 'customer') return area === 'app' ? target : ROLE_HOME[role];
  // Owner 2026-11-01 (lane review): every registered login is a customer; the customer page enrols a staff login. With
  // the staff enrolment switch off (a build that turns it off), only a login holding the customer role follows an /app next.
  if (area === 'app') return autoEnrolStaff || held.includes('customer') ? target : ROLE_HOME[role];
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
