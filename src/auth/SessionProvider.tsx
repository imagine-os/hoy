import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ROLES, type Role } from './roles';
import { demoUserById, demoUserByRole, type DemoUser } from './demoUsers';
import { roleCan, type Permission } from './permissions';
import { useTable } from '../data/DataContext';
import type { BaseRow, ProfileRow, UserRow } from '../data/schema';

interface SessionState {
  userId: string;
  devMode: boolean;
  /** When set, the super admin sees the app as this role. */
  viewAs: Role | null;
}

/** The signed-in person: a demo user, or any `users` row (e.g. an account created through A-03). */
export type SessionUser = DemoUser;

interface SessionCtx {
  /** The real signed-in user. */
  user: SessionUser;
  /** The effective role (viewAs when active). Use this for UI decisions. */
  role: Role;
  isSuperAdmin: boolean;
  devMode: boolean;
  viewAs: Role | null;
  /** Accepts a demo user id, a role (its demo user) or any `users` row id from the data provider. */
  switchUser: (idOrRole: string | Role) => void;
  setDevMode: (on: boolean) => void;
  setViewAs: (role: Role | null) => void;
  can: (permission: Permission) => boolean;
  hasRole: (roles: Role[]) => boolean;
}

const Ctx = createContext<SessionCtx | null>(null);
const KEY = 'hoyos.session';
const DEFAULT: SessionState = { userId: 'usr_super', devMode: false, viewAs: null };
const isRole = (s: string): s is Role => (ROLES as readonly string[]).includes(s);

function read(): SessionState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const s = JSON.parse(raw); if (typeof s.userId === 'string' && s.userId) return { ...DEFAULT, ...s }; }
  } catch { /* ignore */ }
  return DEFAULT;
}

interface UserRoleRow extends BaseRow { user_id: string; role: string }

/** Must sit inside DataProviderRoot: non-demo users are resolved from users + profiles + user_roles. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(read);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ } }, [state]);

  const demo = demoUserById(state.userId);
  const lookupId = demo ? '__none__' : state.userId;
  const { rows: dbUsers } = useTable<UserRow>('users', { where: { id: lookupId } });
  const { rows: dbProfiles } = useTable<ProfileRow>('profiles', { where: { user_id: lookupId } });
  const { rows: dbRoles } = useTable<UserRoleRow>('user_roles', { where: { user_id: lookupId } });

  const user: SessionUser = useMemo(() => {
    if (demo) return demo;
    const u = dbUsers[0];
    // A created account disappears when the mock reseeds (new day) — fall back to the visitor, never to super admin.
    if (!u) return demoUserByRole('public');
    const p = dbProfiles[0];
    const r = dbRoles.map((x) => x.role).find(isRole) ?? 'customer';
    const name = p?.full_name ?? u.email;
    return { id: u.id, role: r, name, initials: p?.initials ?? name.slice(0, 2).toUpperCase(), email: u.email, blurb: { es: 'Cuenta creada en esta demo.', en: 'Account created in this demo.' } };
  }, [demo, dbUsers, dbProfiles, dbRoles]);

  const isSuperAdmin = user.role === 'super_admin';
  const role: Role = isSuperAdmin && state.viewAs ? state.viewAs : user.role;
  const devMode = isSuperAdmin && state.devMode;

  const switchUser = useCallback((idOrRole: string) => {
    const d = demoUserById(idOrRole) ?? (isRole(idOrRole) ? demoUserByRole(idOrRole) : undefined);
    const id = d?.id ?? idOrRole;
    setState((s) => ({ userId: id, viewAs: null, devMode: d?.role === 'super_admin' ? s.devMode : false }));
  }, []);
  const setDevMode = useCallback((on: boolean) => setState((s) => ({ ...s, devMode: on })), []);
  const setViewAs = useCallback((viewAs: Role | null) => setState((s) => ({ ...s, viewAs })), []);
  const can = useCallback((p: Permission) => roleCan(role, p), [role]);
  const hasRole = useCallback((roles: Role[]) => roles.includes('public') || roles.includes(role) || (isSuperAdmin && !state.viewAs), [role, isSuperAdmin, state.viewAs]);

  const value = useMemo<SessionCtx>(() => ({ user, role, isSuperAdmin, devMode, viewAs: state.viewAs, switchUser, setDevMode, setViewAs, can, hasRole }),
    [user, role, isSuperAdmin, devMode, state.viewAs, switchUser, setDevMode, setViewAs, can, hasRole]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSession outside SessionProvider');
  return v;
}
