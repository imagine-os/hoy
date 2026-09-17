import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { Button } from './Button';

export default defineMeta({
  tier: 'atom', name: 'Button',
  description: { es: 'Acción principal, secundaria, fantasma o destructiva. Pill, tres tamaños, estado de carga.', en: 'Primary, secondary, ghost or destructive action. Pill, three sizes, loading state.' },
  props: [
    { name: 'variant', type: "'primary' | 'secondary' | 'ghost' | 'danger'", default: 'primary', description: { es: 'Jerarquía visual.', en: 'Visual hierarchy.' } },
    { name: 'size', type: "'sm' | 'md' | 'lg'", default: 'md', description: { es: 'Altura 32 / 40 / 48.', en: 'Height 32 / 40 / 48.' } },
    { name: 'loading', type: 'boolean', default: 'false', description: { es: 'Muestra spinner y bloquea.', en: 'Shows spinner and blocks.' } },
    { name: 'block', type: 'boolean', default: 'false', description: { es: 'Ancho completo.', en: 'Full width.' } },
    { name: 'icon', type: 'ReactNode', description: { es: 'Icono a la izquierda.', en: 'Leading icon.' } },
  ],
  states: ['default', 'hover', 'active', 'focus', 'disabled', 'loading'],
  usages: [
    { title: { es: 'Variantes', en: 'Variants' }, render: () => h('div', { className: 'row wrap' }, h(Button, null, 'Reservar'), h(Button, { variant: 'secondary' }, 'Ver horario'), h(Button, { variant: 'ghost' }, 'Cancelar'), h(Button, { variant: 'danger' }, 'Eliminar')) },
    { title: { es: 'Tamaños y estados', en: 'Sizes and states' }, render: () => h('div', { className: 'row wrap' }, h(Button, { size: 'sm' }, 'Pequeño'), h(Button, { size: 'lg' }, 'Grande'), h(Button, { loading: true }, 'Guardando'), h(Button, { disabled: true }, 'Deshabilitado')) },
  ],
  a11y: [{ es: 'Usa <button>; aria-busy en carga; foco visible con anillo de 2px.', en: 'Native <button>; aria-busy while loading; 2px visible focus ring.' }],
  usedBy: ['C-01', 'P-01', 'M-03', 'HUB'],
});
