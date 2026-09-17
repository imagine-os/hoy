/** Every role in HoyOS. Order matters for display. */
export const ROLES = [
  'super_admin',
  'admin',
  'coordinator',
  'front_desk',
  'finance',
  'teacher',
  'maintenance',
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
  customer: { es: 'Cliente', en: 'Customer' },
  public: { es: 'Público', en: 'Public' },
};

export const STAFF_ROLES: Role[] = ['super_admin', 'admin', 'coordinator', 'front_desk', 'finance', 'maintenance'];
export const ALL_SIGNED_IN: Role[] = ['super_admin', 'admin', 'coordinator', 'front_desk', 'finance', 'teacher', 'maintenance', 'customer'];
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
  customer: '/app',
  public: '/site',
};

/** Map canvas role labels (free text) to Role ids. */
export function roleFromCanvasLabel(label: string): Role[] {
  const l = label.toLowerCase();
  if (l.includes('all roles')) return [...ALL_SIGNED_IN];
  if (l.includes('public')) return ['public'];
  if (l.includes('super')) return ['super_admin'];
  if (l.includes('coordinator')) return ['coordinator'];
  if (l.includes('front desk') || l.includes('frontdesk')) return ['front_desk'];
  if (l.includes('finance')) return ['finance'];
  if (l.includes('teacher')) return ['teacher'];
  if (l.includes('student')) return ['customer'];
  if (l.includes('designer') || l.includes('developer')) return ['super_admin'];
  if (l.includes('studio owner') || l.includes('admin')) return ['admin'];
  if (l.includes('staff')) return ['coordinator', 'front_desk'];
  if (l.includes('maintenance')) return ['maintenance'];
  return [];
}
