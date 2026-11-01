import { createContext, useContext } from 'react';
import type { Role } from './roles';
import type { DemoUser } from './demoUsers';
import type { Permission } from './permissions';

/**
 * Where the session stands. The review build is always `ready`. The production build (Clerk + Company OS `/me`):
 * - `loading`: Clerk or `/me` has not answered yet; private routes wait, public ones render;
 * - `ready`: signed out (`signedIn: false`, the visitor) or a member with a launch role;
 * - `needs-signup`: a Clerk session that is not a member of the studio yet (finish sign-up, CU-01/CU-02);
 * - `unverified`: Company OS refused an unverified email; `no-role`: a member without a launch role;
 * - `error`: the configuration, Clerk or `/me` failed; `refresh()` retries.
 */
export type SessionStatus = 'loading' | 'ready' | 'needs-signup' | 'unverified' | 'no-role' | 'error';

/** The signed-in person: a demo user, a `users` row (review build), or the Company OS user (production). */
export type SessionUser = DemoUser;

export interface SessionCtx {
  status: SessionStatus;
  /** A real session exists (Clerk in production; any non-visitor persona in the review build). */
  signedIn: boolean;
  /** The real signed-in user. */
  user: SessionUser;
  /** The effective role (viewAs when active). Use this for UI decisions. */
  role: Role;
  /**
   * Every role the real login holds, primary first (test-hoy fixes, lane Y2; production from `/me`). While viewing as,
   * only the viewed role. Absent means `[role]` (the review build, previews): read it with `heldRoles`.
   */
  roles?: readonly Role[];
  isSuperAdmin: boolean;
  /** The signed-in user may turn dev mode on: super_admin and developer (0031). Only super_admin may "view as". */
  canDevMode: boolean;
  devMode: boolean;
  viewAs: Role | null;
  /**
   * The sample person whose data the viewed role sees while a super admin views as that role (production view-as,
   * read-only): the first active coach for teacher, the first member for customer, a seeded staff person otherwise.
   * `user` stays the real person; the data provider aliases the session user to this one. `null` when not viewing as
   * (and always in the review build, where view-as keeps the demo user).
   */
  viewAsPerson: SessionUser | null;
  /** Company OS capability strings from `/me` (production; empty in the review build). UI gates only. */
  caps: string[];
  /** Review build: a demo user id, a role (its demo user) or a `users` row id. Production: only `public` (signs out). */
  switchUser: (idOrRole: string | Role) => void;
  setDevMode: (on: boolean) => void;
  setViewAs: (role: Role | null) => void;
  /** Ends the session completely (production: the Clerk session is revoked, CU-04). */
  signOut: () => Promise<void>;
  /** Production: re-reads `/me` (after sign-up, or after an error). */
  refresh: () => void;
  can: (permission: Permission) => boolean;
  hasRole: (roles: Role[]) => boolean;
}

export const SessionContext = createContext<SessionCtx | null>(null);

export function useSession(): SessionCtx {
  const v = useContext(SessionContext);
  if (!v) throw new Error('useSession outside SessionProvider');
  return v;
}

/** The roles a session holds (`roles`, or its one effective role). */
export const heldRoles = (s: Pick<SessionCtx, 'role' | 'roles'>): readonly Role[] => s.roles ?? [s.role];
