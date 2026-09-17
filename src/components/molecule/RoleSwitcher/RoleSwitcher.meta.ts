import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { RoleSwitcher } from './RoleSwitcher';

export default defineMeta({
  tier: 'molecule', name: 'RoleSwitcher',
  description: { es: 'Cambia de usuario demo; el super admin además puede “ver como” otro rol.', en: 'Switches demo user; a super admin can also “view as” another role.' },
  props: [{ name: 'compact', type: 'boolean', description: { es: 'Sin avatar, selects más estrechos.', en: 'No avatar, narrower selects.' } }],
  states: ['default', 'super-admin (view-as visible)', 'compact'],
  usages: [{ title: { es: 'Default', en: 'Default' }, render: () => h(RoleSwitcher) }],
  a11y: [{ es: 'Selects con aria-label; etiqueta oculta para lectores.', en: 'Selects with aria-label; visually hidden label.' }],
  usedBy: ['HUB', 'S-01', 'DesktopShell', 'PhoneShell'],
});
