import { defineSpec } from '../../specs/define';
import { EVERYONE } from '../../auth/roles';

export const hubSpec = defineSpec({
  code: 'HUB-01',
  name: { es: 'Hub de pruebas', en: 'Testing hub' },
  purpose: { es: 'Primera pantalla para el equipo de pruebas: elegir experiencia (web, cliente, profesor, staff por rol, manual, docs, dev) y controles globales (idioma, tema, modo dev).', en: 'First screen for testers: pick an experience (web, customer, teacher, staff by role, manual, docs, dev) and global controls (language, theme, dev mode).' },
  layout: ['HubHeader (wordmark, LangToggle, theme, dev toggle)', 'SessionStrip (RoleSwitcher)', 'ExperienceGrid (7 cards)', 'StaffRolePicker', 'DeveloperLinks', 'Footer'],
  data: ['users', 'user_roles', 'feature_flags'],
  roles: EVERYONE,
  logic: ['Picking a staff role calls switchUser(role) before navigating.', 'Dev toggle only renders for super_admin.', 'Cards link to each surface home; the customer card also resets viewAs.'],
  integrations: [],
  states: ['default', 'dev mode on', 'viewing as another role'],
  notes: ['Not part of the canvas; added for private testing. Replace with A-01 splash + real auth later.'],
});

export const noAccessSpec = defineSpec({
  code: 'E-05',
  name: { es: 'Sin acceso', en: 'No access' },
  purpose: { es: 'Página amable cuando el rol actual no puede entrar a una ruta; ofrece volver al hub para cambiar de usuario demo.', en: 'Friendly page when the current role cannot enter a route; offers the hub to switch demo user.' },
  layout: ['Illustration', 'Title', 'Body (role name)', 'CTA → hub'],
  data: ['user_roles'],
  roles: EVERYONE,
  logic: ['RequireRole redirects here with ?from=<path>.'],
  integrations: [],
  states: ['default'],
});
