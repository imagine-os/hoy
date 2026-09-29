import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { Icon, ICON_GROUPS, ICON_NAMES } from './Icon';

const GROUP_LABEL = {
  nav: { es: 'Navegación (dock, barra superior, barra lateral)', en: 'Navigation (dock, top bar, sidebar)' },
  action: { es: 'Acciones (recepción, admin, cliente)', en: 'Actions (front desk, admin, customer)' },
  settings: { es: 'Ajustes (M-08)', en: 'Settings (M-08)' },
  thing: { es: 'Objetos y estados', en: 'Things and status' },
  tool: { es: 'Hub, canvas y simulador', en: 'Hub, canvas and simulator' },
} as const;

const tile = (n: (typeof ICON_NAMES)[number]) => h('span', { key: n, className: 'stack-sm', style: { alignItems: 'center', width: 88, textAlign: 'center' } }, h(Icon, { name: n, size: 'lg' }), h('code', { className: 'xs muted', style: { overflowWrap: 'anywhere' } }, n));

export default defineMeta({
  tier: 'atom', name: 'Icon',
  description: {
    es: `Set de iconos del producto (${ICON_NAMES.length} nombres): glifos lucide detrás de un solo componente, rejilla 24×24, currentColor, trazo --icon-stroke (1,75) y tamaños --icon-xs…xl de D-01 que crecen con --ui. Nadie importa lucide directamente: los slots icon de Button, ListRow, Card, EmptyState, Notice y NavBar aceptan el nombre.`,
    en: `Product icon set (${ICON_NAMES.length} names): lucide glyphs behind one component, 24×24 grid, currentColor, --icon-stroke (1.75) and the D-01 --icon-xs…xl sizes that grow with --ui. Nothing imports lucide directly: the icon slots of Button, ListRow, Card, EmptyState, Notice and NavBar take the name.`,
  },
  props: [
    { name: 'name', type: 'IconName', required: true, description: { es: 'Nombre del glifo (ver grupos abajo).', en: 'Glyph name (see groups below).' } },
    { name: 'size', type: "'xs' | 'sm' | 'md' | 'lg' | 'xl' | number", default: 'md', description: { es: 'Paso de D-01 (14 · 16 · 20 · 24 · 32 px, en rem) o px. El objetivo de 44 px lo da el control, no el glifo.', en: 'D-01 step (14 · 16 · 20 · 24 · 32 px, in rem) or px. The 44 px target comes from the control, not the glyph.' } },
    { name: 'strokeWidth', type: 'number', default: 'var(--icon-stroke)', description: { es: 'Sustituye el trazo del token; el ítem activo usa --icon-stroke-active.', en: 'Overrides the token stroke; the active item uses --icon-stroke-active.' } },
    { name: 'title', type: 'string', description: { es: 'Solo cuando el icono significa algo por sí solo; si no, queda aria-hidden.', en: 'Only when the icon means something on its own; otherwise it stays aria-hidden.' } },
  ],
  states: ['default', 'active (trazo 2,25)', 'con título (role=img)', 'decorativo (aria-hidden)', 'tema oscuro (currentColor)'],
  usages: [
    ...ICON_GROUPS.map((g) => ({ title: GROUP_LABEL[g.key], render: () => h('div', { className: 'row wrap', style: { gap: 12 } }, ...g.names.map(tile)) })),
    { title: { es: 'Tamaños y peso activo', en: 'Sizes and active weight' }, render: () => h('div', { className: 'row wrap', style: { alignItems: 'flex-end', gap: 16 } }, ...(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((s) => h('span', { key: s, className: 'stack-sm', style: { alignItems: 'center' } }, h(Icon, { name: 'schedule', size: s }), h('code', { className: 'xs muted' }, s))), h('span', { className: 'stack-sm', style: { alignItems: 'center' } }, h(Icon, { name: 'schedule', size: 'lg', className: 'is-strong' }), h('code', { className: 'xs muted' }, 'active'))) },
  ],
  a11y: [
    { es: 'Decorativo por defecto (aria-hidden, focusable="false"); con `title` pasa a role="img" con nombre accesible.', en: 'Decorative by default (aria-hidden, focusable="false"); with `title` it becomes role="img" with an accessible name.' },
    { es: 'Hereda color con currentColor, así que el contraste lo fija el contenedor en ambos temas. Un control solo con icono lleva aria-label y title.', en: 'Inherits colour through currentColor, so the container sets the contrast in both themes. An icon-only control carries aria-label and title.' },
    { es: 'El estado activo nunca es solo color: píldora + trazo más grueso + etiqueta en negrita.', en: 'The active state is never colour alone: pill + heavier stroke + bold label.' },
  ],
  usedBy: ['HUB-01', 'C-01', 'C-25', 'S-01', 'S-02', 'S-03', 'S-04', 'S-06', 'M-08', 'M-08a', 'M-08g', 'M-10a', 'D-05', 'D-06', 'D-07', 'K-03', 'K-04', 'K-05'],
});
