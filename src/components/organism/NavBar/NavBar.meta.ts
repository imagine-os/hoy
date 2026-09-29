import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { NavBar } from './NavBar';

export default defineMeta({
  tier: 'organism', name: 'NavBar',
  description: { es: 'Navegación principal con 3–5 destinos: dock inferior en el teléfono (`dock`) o fila horizontal en la barra superior del AppShell desde 900 px (`top`); resalta la ruta activa.', en: 'Primary navigation with 3–5 destinations: bottom dock on phones (`dock`) or a horizontal row in the AppShell top bar from 900 px (`top`); highlights the active route.' },
  props: [
    { name: 'items', type: 'NavItem[] { to, label, icon: IconName, end? }', required: true, description: { es: 'Destinos. El icono es un nombre del set Icon; el activo lleva píldora teñida y trazo más grueso (0030).', en: 'Destinations. The icon is an Icon set name; the active one gets a tinted pill and a heavier stroke (0030).' } },
    { name: 'variant', type: "'dock' | 'top'", default: 'dock', description: { es: 'Dock inferior o fila superior.', en: 'Bottom dock or top row.' } },
  ],
  states: ['dock', 'top', 'active'],
  usages: [
    { title: { es: 'Dock (teléfono)', en: 'Dock (phone)' }, render: () => (h('div', { style: { maxWidth: 390, border: '1px solid var(--color-border)', borderRadius: 'var(--r-md)', overflow: 'hidden' } }, h(NavBar, { items: [{ to: '/app', label: 'Inicio', icon: 'home', end: true }, { to: '/app/schedule', label: 'Horario', icon: 'schedule' }, { to: '/app/plans', label: 'Planes', icon: 'ticket' }, { to: '/app/more', label: 'Más', icon: 'more' }] }))) },
    { title: { es: 'Fila superior (≥ 900 px)', en: 'Top row (≥ 900 px)' }, render: () => h(NavBar, { variant: 'top', items: [{ to: '/app', label: 'Inicio', icon: 'home', end: true }, { to: '/app/schedule', label: 'Horario', icon: 'schedule' }, { to: '/app/history', label: 'Historial', icon: 'history' }, { to: '/app/more', label: 'Más', icon: 'more' }] }) },
  ],
  a11y: [{ es: '<nav aria-label>; NavLink aporta aria-current.', en: '<nav aria-label>; NavLink provides aria-current.' }],
  usedBy: ['AppShell'],
});
