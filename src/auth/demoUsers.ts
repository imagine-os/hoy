import type { Role } from './roles';

/** Fictional people, one per role. No real data. Ids match `users` seed rows. */
export interface DemoUser {
  id: string;
  role: Role;
  name: string;
  initials: string;
  email: string;
  blurb: { es: string; en: string };
}

export const demoUsers: DemoUser[] = [
  { id: 'usr_super', role: 'super_admin', name: 'Sofía Arango', initials: 'SA', email: 'sofia@demo.hoyos.test', blurb: { es: 'Ve todo, incluido el modo dev.', en: 'Sees everything, including dev mode.' } },
  { id: 'usr_admin', role: 'admin', name: 'Mateo Restrepo', initials: 'MR', email: 'mateo@demo.hoyos.test', blurb: { es: 'Dueño del estudio.', en: 'Studio owner.' } },
  { id: 'usr_coord', role: 'coordinator', name: 'Valentina Ríos', initials: 'VR', email: 'valentina@demo.hoyos.test', blurb: { es: 'Coordina horario, profes y comunicaciones.', en: 'Runs schedule, teachers and comms.' } },
  { id: 'usr_desk', role: 'front_desk', name: 'Camilo Duque', initials: 'CD', email: 'camilo@demo.hoyos.test', blurb: { es: 'Recepción: check-in y cobros.', en: 'Front desk: check-in and payments.' } },
  { id: 'usr_fin', role: 'finance', name: 'Laura Betancur', initials: 'LB', email: 'laura@demo.hoyos.test', blurb: { es: 'Pagos, facturas y nómina.', en: 'Payments, invoices and payroll.' } },
  { id: 'usr_teach', role: 'teacher', name: 'Andrés Quintero', initials: 'AQ', email: 'andres@demo.hoyos.test', blurb: { es: 'Profesor de Hot Vinyasa.', en: 'Hot Vinyasa teacher.' } },
  { id: 'usr_maint', role: 'maintenance', name: 'Rosa Cárdenas', initials: 'RC', email: 'rosa@demo.hoyos.test', blurb: { es: 'Salas, incidencias e inventario.', en: 'Rooms, incidents and inventory.' } },
  { id: 'usr_cust', role: 'customer', name: 'Juliana Ospina', initials: 'JO', email: 'juliana@demo.hoyos.test', blurb: { es: 'Socia mensual, practica en la mañana.', en: 'Monthly member, morning practice.' } },
  { id: 'usr_public', role: 'public', name: 'Visitante', initials: '·', email: '', blurb: { es: 'Sin sesión.', en: 'Not signed in.' } },
];

export const demoUserByRole = (role: Role): DemoUser => demoUsers.find((u) => u.role === role) ?? demoUsers[demoUsers.length - 1];
export const demoUserById = (id: string): DemoUser | undefined => demoUsers.find((u) => u.id === id);
