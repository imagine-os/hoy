import { matrixArea } from '../config/roleMatrix';
import { ROLE_HOME, type Role } from './roles';
import { heldRoles, type SessionCtx, type SessionStatus } from './sessionContext';
import { signInReturn } from './signInReturn';
import { visitorSignIn } from './visitorSignIn';
import { viewAsActive } from './viewAs';
import { isFramed } from '../app/frameMode';
import { CUSTOMER_AUTO_ENROL_STAFF } from '../config/launch';

/**
 * The website's purchase and booking buttons (Book on Plans, Give a gift, the schedule's "Continue booking"; test-hoy
 * fixes, lane Y2). Signed out: sign-in, keeping where the visitor was going (as before). Signed in, whatever the role:
 * straight to the purchase or booking page. A login holding the customer role opens it as a customer; a studio login
 * that isn't a customer yet is enrolled automatically there (`enrolsAsCustomer`, owner 2026-11-01). The target is validated
 * like a sign-in return; anything else goes to the customer home. Navigation only: the page keeps its guard.
 */
export function purchaseEntry(user: { role: Role }, target: string): string {
  if (user.role === 'public') return visitorSignIn(target);
  return signInReturn(target) ?? '/app';
}

export interface EnrolCase {
  status: SessionStatus;
  signedIn: boolean;
  viewAs: Role | null;
  /** Every role the login holds. */
  roles: readonly Role[];
  /** The route's own roles. */
  routeRoles: readonly Role[];
  path: string;
  /** This document is read-only (a preview frame, or a tab holding a view-as value). Also read from the document itself. */
  readOnly?: boolean;
  /** The staff enrolment switch (default `CUSTOMER_AUTO_ENROL_STAFF`, on: owner decision C-01). */
  autoEnrolStaff?: boolean;
}

/** Whether this document only reads: a preview frame (always read-only, `productionFrame.ts`) or an active view-as. */
export const readOnlyDocument = (): boolean => isFramed() || viewAsActive();

/**
 * Whether a customer page the session can't open enrols the login as a customer instead of the no-access page (owner
 * 2026-11-01: every registered login is a customer): a signed-in studio login, ready, not viewing as (read-only), not a
 * customer yet, on a page of the customer area that customers open. Company OS decides the rest (`POST /t/:t/signup`,
 * ADR 0038 amendment 2026-11-01).
 *
 * Review round 1 (r1hoy, M1): never in a read-only document. A preview frame or a tab still holding a view-as value
 * refuses every write, so an enrolment could only fail: it falls through to the no-access page instead. A real super
 * admin without the customer role is enrolled too (L5; RequireRole asks before its own pass).
 */
export function enrolsAsCustomer(c: EnrolCase): boolean {
  // Every login reaching this holds a role and not the customer one, so a staff role: the switch decides.
  if (!(c.autoEnrolStaff ?? CUSTOMER_AUTO_ENROL_STAFF)) return false;
  if (c.readOnly === true || readOnlyDocument()) return false;
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
