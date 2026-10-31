import { ROLES, type Role } from '../auth/roles';

/**
 * PL-05 — the approved launch permissions matrix (tracker "Role Matrix" tab, rule RN-03), now for all 11 roles.
 * Q-13 (approved 22 Oct) wins over the tab's older Finance row: reception gets a limited fixed/variable expense entry
 * (S-11) and no income.
 *
 * The route guard (RequireRole) applies it on top of each route's own `roles`, and it can only take access away: a
 * route a role could not open before stays closed.
 * - Administration, Front desk, Customer and Public: the four launch columns of the approved tab, unchanged.
 * - Super admin: everything (`full` on every area).
 * - Coordinator, Finance, Teacher, Maintenance, Marketing and Developer (Hoy all-roles, 2026-10-31): derived from their
 *   route roles and `docs/roles.md`, so the matrix takes nothing away from them yet; Jas confirms each role (decision
 *   A-02) and a confirmed restriction lands here as `none`. `read`/`limited`/`own` document the intent; only `none`
 *   closes a screen.
 * Production (lane H-2) can replace `ROLE_MATRIX` with the capabilities `/me` returns (`configureRoleMatrix`).
 */
export type MatrixRole = Role;
export type Access = 'full' | 'own' | 'read' | 'limited' | 'none';
export interface MatrixArea {
  id: string;
  /** Route prefixes; an `=` prefix matches that path only. The longest matching prefix decides. */
  paths: string[];
  access: Record<MatrixRole, Access>;
  note?: string;
}

type Launch4 = Record<'admin' | 'front_desk' | 'customer' | 'public', Access>;
type Others = Record<'coordinator' | 'finance' | 'teacher' | 'maintenance' | 'marketing' | 'developer', Access>;
const NONE: Others = { coordinator: 'none', finance: 'none', teacher: 'none', maintenance: 'none', marketing: 'none', developer: 'none' };
/** One area's access for all 11 roles: the launch columns, super admin `full`, the other roles `none` unless given. */
const area = (launch: Launch4, others: Partial<Others> = {}): Record<MatrixRole, Access> => ({ super_admin: 'full', ...launch, ...NONE, ...others });
const TEAM_ALL: Partial<Others> = { coordinator: 'full', finance: 'full', teacher: 'full', maintenance: 'full', marketing: 'full', developer: 'full' };

const staffOnly = { admin: 'full', front_desk: 'full', customer: 'none', public: 'none' } as const;
const adminOnly = { admin: 'full', front_desk: 'none', customer: 'none', public: 'none' } as const;
const noLaunch = { admin: 'none', front_desk: 'none', customer: 'none', public: 'none' } as const;

export const LAUNCH_ROLE_MATRIX: MatrixArea[] = [
  { id: 'website', paths: ['/site'], access: area({ admin: 'full', front_desk: 'full', customer: 'full', public: 'full' }, TEAM_ALL) },
  { id: 'manual', paths: ['/manual', '/docs'], access: area(staffOnly, TEAM_ALL), note: 'SW-06: public paths only when the owner lists them (launch.publicDocuments). Every team role has a reading path.' },
  { id: 'customer-app', paths: ['/app'], access: area({ admin: 'none', front_desk: 'none', customer: 'own', public: 'none' }, { teacher: 'own' }), note: 'A teacher also books classes as a person.' },
  { id: 'front-desk', paths: ['/staff'], access: area(staffOnly, { coordinator: 'full', maintenance: 'limited', finance: 'read', marketing: 'read', developer: 'read', teacher: 'read' }), note: 'Front desk home, check-in, pending payments, register and charge, inbox, rooms; maintenance works from the staff home (rooms, incidents). Each page keeps its route roles.' },
  { id: 'expense-entry', paths: ['/staff/expense'], access: area({ admin: 'full', front_desk: 'limited', customer: 'none', public: 'none' }), note: 'Q-13: record only, no ledger, no income.' },
  { id: 'crm', paths: ['/admin/crm'], access: area(staffOnly, { coordinator: 'full', finance: 'read', marketing: 'read' }) },
  { id: 'content-schedule', paths: ['/admin/content', '/admin/class-schedule'], access: area(adminOnly, { coordinator: 'full', marketing: 'full' }), note: 'Marketing: content only (the class schedule route is Administration).' },
  { id: 'vouchers', paths: ['/admin/vouchers'], access: area(adminOnly) },
  { id: 'product-master', paths: ['/admin/products'], access: area({ admin: 'full', front_desk: 'read', customer: 'none', public: 'none' }), note: 'Front desk read-only view: new route in H-5; today the route itself is administration only.' },
  { id: 'settings', paths: ['/admin/settings'], access: area(adminOnly, { coordinator: 'limited', finance: 'limited' }), note: 'Coordinator: hours, communications, content; finance: payments (route roles per page).' },
  { id: 'dashboard', paths: ['=/admin', '/admin/analytics'], access: area(adminOnly, { coordinator: 'read', finance: 'read' }) },
  { id: 'activity', paths: ['/admin/activity'], access: area(adminOnly, { coordinator: 'read', finance: 'read' }) },
  { id: 'messaging', paths: ['/admin/emails', '/admin/whatsapp'], access: area(adminOnly, { coordinator: 'full', marketing: 'full' }) },
  { id: 'finance', paths: ['/admin/finance', '/admin/class-pay'], access: area(adminOnly, { finance: 'full' }), note: 'Includes the expense ledger; reception records expenses in S-11 instead (Q-13).' },
  { id: 'integrations', paths: ['/admin/integrations'], access: area(adminOnly) },
  { id: 'teacher-app', paths: ['/teach'], access: area(adminOnly, { teacher: 'own', coordinator: 'full', finance: 'limited' }), note: 'A teacher sees their own classes; finance only the pay view.' },
  { id: 'dev', paths: ['/dev'], access: area(noLaunch, { developer: 'full' }), note: 'R-01: developer stays its own role; Administration has no dev tools.' },
];

let matrix = LAUNCH_ROLE_MATRIX;
/** H-2: production may pass the matrix derived from `/me` capabilities. */
export function configureRoleMatrix(next: MatrixArea[]) { matrix = next; }

export function matrixArea(path: string, areas: MatrixArea[] = matrix): MatrixArea | null {
  const clean = path.replace(/\/+$/, '') || '/';
  let best: { area: MatrixArea; len: number } | null = null;
  for (const area of areas) for (const p of area.paths) {
    const hit = p.startsWith('=') ? clean === p.slice(1) : clean === p || clean.startsWith(`${p}/`);
    const len = p.replace('=', '').length;
    if (hit && (!best || len > best.len)) best = { area, len };
  }
  return best?.area ?? null;
}

const isRole = (role: string): role is MatrixRole => (ROLES as readonly string[]).includes(role);

/** What the matrix grants this role on this path; `null` when no area covers the path, `none` for an unknown role. */
export function matrixAccess(role: Role, path: string, areas: MatrixArea[] = matrix): Access | null {
  const hit = matrixArea(path, areas);
  if (!hit) return null;
  return isRole(role) && Object.prototype.hasOwnProperty.call(hit.access, role) ? hit.access[role] : 'none';
}

/** False when the matrix says `none` for this role on this path. An unknown role is refused everywhere, also on paths
 * no area covers (fail closed), although `matrixAccess` answers `null` there. */
export const matrixAllows = (role: Role, path: string, areas: MatrixArea[] = matrix) => isRole(role) && matrixAccess(role, path, areas) !== 'none';
