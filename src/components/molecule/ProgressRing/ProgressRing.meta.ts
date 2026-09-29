import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { ProgressRing } from './ProgressRing';

export default defineMeta({
  tier: 'molecule', name: 'ProgressRing',
  description: {
    es: 'Anillo de progreso estático «N de M»: capítulos obligatorios leídos en el manual (K-03) y puntos de formación hechos. No es un temporizador (eso es CountdownRing). Se pone verde al completarse.',
    en: 'Static "N of M" progress ring: required manual chapters read (K-03) and training items done. Not a timer (that is CountdownRing). Turns green when complete.',
  },
  props: [
    { name: 'value', type: 'number', required: true, description: { es: 'Hecho hasta ahora.', en: 'Done so far.' } },
    { name: 'max', type: 'number', required: true, description: { es: 'Total; 0 dibuja el anillo vacío con «—».', en: 'Total; 0 draws the empty ring with "—".' } },
    { name: 'size', type: 'number', default: '112', description: { es: 'Diámetro en px.', en: 'Diameter in px.' } },
    { name: 'tone', type: "'primary' | 'success' | 'warn'", default: "'primary'", description: { es: 'Color mientras no está completo.', en: 'Colour while incomplete.' } },
    { name: 'label', type: 'ReactNode', description: { es: 'Línea bajo el anillo.', en: 'Line under the ring.' } },
    { name: 'ariaLabel', type: 'string', description: { es: 'Nombre accesible; por defecto «valor / máximo».', en: 'Accessible name; defaults to "value / max".' } },
  ],
  states: ['empty (0 of M)', 'in progress', 'complete (success tone)', 'no total (—)'],
  usages: [
    { title: { es: 'En progreso', en: 'In progress' }, render: () => h(ProgressRing, { value: 4, max: 11, label: 'obligatorios leídos' }) },
    { title: { es: 'Completo', en: 'Complete' }, render: () => h(ProgressRing, { value: 11, max: 11, label: 'required read' }) },
    { title: { es: 'Sin total', en: 'No total' }, render: () => h(ProgressRing, { value: 0, max: 0, size: 80 }) },
  ],
  a11y: [
    { es: 'role="progressbar" con aria-valuenow / aria-valuemax; el número también está escrito dentro del anillo, así que no depende del color.', en: 'role="progressbar" with aria-valuenow / aria-valuemax; the number is also written inside the ring, so it never relies on colour.' },
    { es: 'Respeta prefers-reduced-motion: sin transición del trazo.', en: 'Honours prefers-reduced-motion: no stroke transition.' },
  ],
  usedBy: ['K-03'],
});
