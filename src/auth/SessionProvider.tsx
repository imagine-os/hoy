import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Role } from './roles';
import { demoUserById, demoUserByRole, type DemoUser } from './demoUsers';
import { roleCan, type Permission } from './permissions';

interface SessionState {
  userId: string;
  devMode: boolean;
  /** When set, the super admin sees the app as this role. */
  viewAs: Role | null;
}

interface SessionCtx {
  /** The real signed-in demo user. */
  user: DemoUser;
  /** The effective role (viewAs when active). Use this for UI decisions. */
  role: Role;
  isSuperAdmin: boolean;
  devMode: boolean;
  viewAs: Role | null;
  switchUser: (idOrRole: string | Role) => void;
  setDevMode: (on: boolean) => void;
  setViewAs: (role: Role | null) => void;
  can: (permission: Permission) => boolean;
  hasRole: (roles: Role[]) => boolean;
}

const Ctx = createContext<SessionCtx | null>(null);
const KEY = 'hoyos.session';
const DEFAULT: SessionState = { userId: 'usr_super', devMode: false, viewAs: null };

function read(): SessionState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const s = JSON.parse(raw); if (demoUserById(s.userId)) return { ...DEFAULT, ...s }; }
  } catch { /* ignore */ }
  return DEFAULT;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(read);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ } }, [state]);

  const user = demoUserById(state.userId) ?? demoUserByRole('super_admin');
  const isSuperAdmin = user.role === 'super_admin';
  const role: Role = isSuperAdmin && state.viewAs ? state.viewAs : user.role;
  const devMode = isSuperAdmin && state.devMode;

  const switchUser = useCallback((idOrRole: string) => {
    const u = demoUserById(idOrRole) ?? demoUserByRole(idOrRole as Role);
    setState((s) => ({ userId: u.id, viewAs: null, devMode: u.role === 'super_admin' ? s.devMode : false }));
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
