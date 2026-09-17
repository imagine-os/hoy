import type { Role } from './roles';

export type Permission =
  | 'bookings.read' | 'bookings.write' | 'bookings.write_any'
  | 'classes.read' | 'classes.write'
  | 'checkin.write'
  | 'payments.read' | 'payments.write' | 'payments.refund'
  | 'members.read' | 'members.write'
  | 'content.write'
  | 'tables.read' | 'tables.write'
  | 'settings.write' | 'features.write'
  | 'payroll.read' | 'payroll.write'
  | 'maintenance.write'
  | 'dev.tools' | 'docs.read' | 'audit.read';

const ALL: Permission[] = [
  'bookings.read', 'bookings.write', 'bookings.write_any', 'classes.read', 'classes.write', 'checkin.write',
  'payments.read', 'payments.write', 'payments.refund', 'members.read', 'members.write', 'content.write',
  'tables.read', 'tables.write', 'settings.write', 'features.write', 'payroll.read', 'payroll.write',
  'maintenance.write', 'dev.tools', 'docs.read', 'audit.read',
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: ALL,
  admin: ALL.filter((p) => p !== 'dev.tools'),
  coordinator: ['bookings.read', 'bookings.write_any', 'classes.read', 'classes.write', 'checkin.write', 'payments.read', 'members.read', 'members.write', 'content.write', 'docs.read', 'audit.read'],
  front_desk: ['bookings.read', 'bookings.write_any', 'classes.read', 'checkin.write', 'payments.read', 'payments.write', 'members.read', 'members.write', 'docs.read'],
  finance: ['payments.read', 'payments.write', 'payments.refund', 'members.read', 'payroll.read', 'payroll.write', 'tables.read', 'docs.read', 'audit.read'],
  teacher: ['classes.read', 'bookings.read', 'checkin.write', 'payroll.read', 'docs.read'],
  maintenance: ['classes.read', 'maintenance.write', 'docs.read'],
  customer: ['bookings.read', 'bookings.write', 'classes.read', 'payments.read', 'docs.read'],
  public: ['classes.read', 'docs.read'],
};

export function roleCan(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
