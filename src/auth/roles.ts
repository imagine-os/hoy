/** Every role in HoyOS. Order matters for display. */
export const ROLES = [
  'super_admin',
  'admin',
  'coordinator',
  'front_desk',
  'finance',
  'teacher',
  'maintenance',
  'marketing',
  'developer',
  'customer',
  'public',
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, { es: string; en: string }> = {
  super_admin: { es: 'Super admin', en: 'Super admin' },
  admin: { es: 'Administración', en: 'Admin' },
  coordinator: { es: 'Coordinación', en: 'Coordinator' },
  front_desk: { es: 'Recepción', en: 'Front desk' },
  finance: { es: 'Finanzas', en: 'Finance' },
  teacher: { es: 'Profesor/a', en: 'Teacher' },
  maintenance: { es: 'Mantenimiento', en: 'Maintenance' },
  marketing: { es: 'Marketing', en: 'Marketing' },
  developer: { es: 'Desarrollo', en: 'Developer' },
  customer: { es: 'Cliente', en: 'Customer' },
  public: { es: 'Público', en: 'Public' },
};

export const STAFF_ROLES: Role[] = ['super_admin', 'admin', 'coordinator', 'front_desk', 'finance', 'maintenance', 'marketing', 'developer'];
/** Everyone who works at (or builds for) the studio — the roles the operations manual has a reading path for. */
export const TEAM_ROLES: Role[] = ['super_admin', 'admin', 'coordinator', 'front_desk', 'finance', 'teacher', 'maintenance', 'marketing', 'developer'];
export const ALL_SIGNED_IN: Role[] = ['super_admin', 'admin', 'coordinator', 'front_desk', 'finance', 'teacher', 'maintenance', 'marketing', 'developer', 'customer'];
/** Roles that may turn dev mode on (inspector, spec chips, layout editor). Only super_admin may also "view as". */
export const DEV_MODE_ROLES: Role[] = ['super_admin', 'developer'];
export const EVERYONE: Role[] = [...ALL_SIGNED_IN, 'public'];

/** Which home a role lands on after choosing it. */
export const ROLE_HOME: Record<Role, string> = {
  super_admin: '/admin',
  admin: '/admin',
  coordinator: '/staff',
  front_desk: '/staff',
  finance: '/admin',
  teacher: '/teach',
  maintenance: '/staff',
  marketing: '/admin/content',
  developer: '/dev',
  customer: '/app',
  public: '/site',
};

