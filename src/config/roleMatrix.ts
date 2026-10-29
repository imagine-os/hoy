import type { Role } from '../auth/roles';

/**
 * PL-05 — the approved launch permissions matrix (tracker "Role Matrix" tab, rule RN-03), for the four launch columns:
 * Administration, Front desk, Customer and Public. Q-13 (approved 22 Oct) wins over the tab's older Finance row:
 * reception gets a limited fixed/variable expense entry (S-11) and no income.
 *
 * The route guard (RequireRole) applies it on top of each route's own `roles`, and it can only take access away: a
 * route a role could not open before stays closed. Super admin follows Administration and is not restricted here; the
 * other team roles (teacher, finance, marketing, maintenance, developer) are not launch roles and keep their route roles.
 * Production (lane H-2) can replace `ROLE_MATRIX` with the capabilities `/me` returns (`configureRoleMatrix`).
 */
export type MatrixRole = 'admin' | 'front_desk' | 'customer' | 'public';
export type Access = 'full' | 'own' | 'read' | 'limited' | 'none';
export interface MatrixArea {
  id: string;
  /** Route prefixes; an `=` prefix matches that path only. The longest matching prefix decides. */
  paths: string[];
  access: Record<MatrixRole, Access>;
  note?: string;
}

const staffOnly = { admin: 'full', front_desk: 'full', customer: 'none', public: 'none' } as const;
const adminOnly = { admin: 'full', front_desk: 'none', customer: 'none', public: 'none' } as const;

export const LAUNCH_ROLE_MATRIX: MatrixArea[] = [
  { id: 'website', paths: ['/site'], access: { admin: 'full', front_desk: 'full', customer: 'full', public: 'full' } },
  { id: 'manual', paths: ['/manual', '/docs'], access: staffOnly, note: 'SW-06: public paths only when the owner lists them (launch.publicDocuments).' },
  { id: 'customer-app', paths: ['/app'], access: { admin: 'none', front_desk: 'none', customer: 'own', public: 'none' } },
  { id: 'front-desk', paths: ['/staff'], access: staffOnly, note: 'Front desk home, check-in, pending payments, register and charge, inbox, rooms.' },
  { id: 'expense-entry', paths: ['/staff/expense'], access: { admin: 'full', front_desk: 'limited', customer: 'none', public: 'none' }, note: 'Q-13: record only, no ledger, no income.' },
  { id: 'crm', paths: ['/admin/crm'], access: staffOnly },
  { id: 'content-schedule', paths: ['/admin/content', '/admin/class-schedule'], access: adminOnly },
  { id: 'vouchers', paths: ['/admin/vouchers'], access: adminOnly },
  { id: 'product-master', paths: ['/admin/products'], access: { admin: 'full', front_desk: 'read', customer: 'none', public: 'none' }, note: 'Front desk read-only view: new route in H-5; today the route itself is administration only.' },
  { id: 'settings', paths: ['/admin/settings'], access: adminOnly },
  { id: 'dashboard', paths: ['=/admin', '/admin/analytics'], access: adminOnly },
  { id: 'activity', paths: ['/admin/activity'], access: adminOnly },
  { id: 'messaging', paths: ['/admin/emails', '/admin/whatsapp'], access: adminOnly },
  { id: 'finance', paths: ['/admin/finance', '/admin/class-pay'], access: adminOnly, note: 'Includes the expense ledger; reception records expenses in S-11 instead (Q-13).' },
  { id: 'integrations', paths: ['/admin/integrations'], access: adminOnly },
  { id: 'dev', paths: ['/dev'], access: { admin: 'none', front_desk: 'none', customer: 'none', public: 'none' } },
];

let matrix = LAUNCH_ROLE_MATRIX;
/** H-2: production may pass the matrix derived from `/me` capabilities. */
export function configureRoleMatrix(next: MatrixArea[]) { matrix = next; }

const LAUNCH_ROLES: readonly Role[] = ['admin', 'front_desk', 'customer', 'public'];

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

/** What the matrix grants this role on this path; `null` when the role is not a launch role or no area covers it. */
export function matrixAccess(role: Role, path: string, areas: MatrixArea[] = matrix): Access | null {
  if (!LAUNCH_ROLES.includes(role)) return null;
  return matrixArea(path, areas)?.access[role as MatrixRole] ?? null;
}

/** False only when the matrix says `none` for a launch role. */
export const matrixAllows = (role: Role, path: string, areas: MatrixArea[] = matrix) => matrixAccess(role, path, areas) !== 'none';
