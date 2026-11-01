import { matrixArea } from '../config/roleMatrix';
import { ROLE_HOME, type Role } from './roles';
import { heldRoles, type SessionCtx, type SessionStatus } from './sessionContext';
import { signInReturn } from './signInReturn';
import { visitorSignIn } from './visitorSignIn';

/**
 * The website's purchase and booking buttons (Book on Plans, Give a gift, the schedule's "Continue booking"; test-hoy
 * fixes, lane Y2). Signed out: sign-in, keeping where the visitor was going (as before). Signed in, whatever the role:
 * straight to the purchase or booking page. A login holding the customer role opens it as a customer; a studio login
 * that isn't a customer yet is offered "Join as a customer" there (`joinsAsCustomer`). The target is validated
 * like a sign-in return; anything else goes to the customer home. Navigation only: the page keeps its guard.
 */
export function purchaseEntry(user: { role: Role }, target: string): string {
  if (user.role === 'public') return visitorSignIn(target);
  return signInReturn(target) ?? '/app';
}

export interface JoinCase {
  status: SessionStatus;
  signedIn: boolean;
  viewAs: Role | null;
  /** Every role the login holds. */
  roles: readonly Role[];
  /** The route's own roles. */
  routeRoles: readonly Role[];
  path: string;
}

/**
 * Whether a customer page the session can't open offers "Join as a customer" instead of the no-access page: a
 * signed-in studio login, ready, not viewing as (read-only), not a customer yet, on a page of the customer area that
 * customers open. Company OS decides the rest (`POST /t/:t/signup`, ADR 0038 amendment 2026-11-01).
 */
export function joinsAsCustomer(c: JoinCase): boolean {
  return c.status === 'ready' && c.signedIn && c.viewAs === null && !c.roles.includes('customer') && c.roles.length > 0
    && c.routeRoles.includes('customer') && matrixArea(c.path)?.id === 'customer-app';
}

/**
 * The primary role's home while a staff login is in the customer area as a customer (lane Y2): the customer shell's
 * way back. Null for a customer, a visitor, or a staff role on its own screens.
 */
export function primaryHomeOf(session: Pick<SessionCtx, 'role' | 'roles' | 'signedIn'>): { home: string; role: Role } | null {
  const primary = heldRoles(session)[0];
  return session.signedIn && session.role === 'customer' && primary && primary !== 'customer' ? { home: ROLE_HOME[primary], role: primary } : null;
}

/** Whether a staff login also holds the customer role (the staff menu's "My classes"). */
export const alsoCustomer = (session: Pick<SessionCtx, 'role' | 'roles' | 'signedIn' | 'viewAs'>): boolean =>
  session.signedIn && session.viewAs === null && session.role !== 'customer' && heldRoles(session).includes('customer');
