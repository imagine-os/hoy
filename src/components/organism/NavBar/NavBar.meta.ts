import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { NavBar } from './NavBar';

export default defineMeta({
  tier: 'organism', name: 'NavBar',
  description: { es: 'Navegación inferior para móvil con 3–5 destinos; resalta la ruta activa.', en: 'Mobile bottom navigation with 3–5 destinations; highlights the active route.' },
  props: [{ name: 'items', type: 'NavItem[] { to, label, icon, end? }', required: true, description: { es: 'Destinos.', en: 'Destinations.' } }],
  states: ['default', 'active'],
  usages: [{ title: { es: 'Cliente', en: 'Customer' }, render: () => (h('div', { style: { maxWidth: 390, border: '1px solid var(--color-border)', borderRadius: 'var(--r-md)', overflow: 'hidden' } }, h(NavBar, { items: [{ to: '/app', label: 'Inicio', icon: '⌂', end: true }, { to: '/app/schedule', label: 'Horario', icon: '▦' }, { to: '/app/plans', label: 'Planes', icon: '◇' }, { to: '/app/more', label: 'Más', icon: '⋯' }] }))) }],
  a11y: [{ es: '<nav aria-label>; NavLink aporta aria-current.', en: '<nav aria-label>; NavLink provides aria-current.' }],
  usedBy: ['PhoneShell'],
});
