import { createElement as h, useState } from 'react';
import { defineMeta } from '../../../design/meta';
import { RatingScale } from './RatingScale';

function Demo() { const [v, setV] = useState<number | null>(4); return h('div', { className: 'row wrap' }, h(RatingScale, { value: v, onChange: setV, label: 'Calificación' }), h(RatingScale, { value: 5, size: 'md', readOnly: true, label: 'Promedio' })); }

export default defineMeta({
  tier: 'molecule', name: 'RatingScale',
  description: { es: 'Escala de 1 a 5 estrellas como radiogroup; cada estrella es un objetivo de 48px.', en: '1–5 star scale as a radiogroup; each star is a 48px target.' },
  props: [
    { name: 'value / onChange', type: 'number | null / (n) => void', required: true, description: { es: 'Controlado.', en: 'Controlled.' } },
    { name: 'max', type: 'number', default: '5', description: { es: 'Número de estrellas.', en: 'Star count.' } },
    { name: 'size', type: "'md' | 'lg'", default: 'lg', description: { es: '32 / 48 px.', en: '32 / 48 px.' } },
    { name: 'readOnly', type: 'boolean', default: 'false', description: { es: 'Solo muestra.', en: 'Display only.' } },
  ],
  states: ['empty', 'selected', 'hover', 'read-only'],
  usages: [{ title: { es: 'Interactiva y de solo lectura', en: 'Interactive and read-only' }, render: () => h(Demo) }],
  a11y: [{ es: 'role=radiogroup; cada estrella role=radio con aria-checked y aria-label "n / max".', en: 'role=radiogroup; each star role=radio with aria-checked and aria-label "n / max".' }],
  usedBy: ['C-10', 'C-18'],
});
