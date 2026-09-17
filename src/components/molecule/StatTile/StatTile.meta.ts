import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { StatTile } from './StatTile';

export default defineMeta({
  tier: 'molecule', name: 'StatTile',
  description: { es: 'Métrica única: etiqueta, valor grande, pista y tendencia.', en: 'Single metric: label, big value, hint and trend.' },
  props: [
    { name: 'label', type: 'string', required: true, description: { es: 'Qué se mide.', en: 'What is measured.' } },
    { name: 'value', type: 'ReactNode', required: true, description: { es: 'El número.', en: 'The number.' } },
    { name: 'hint', type: 'string', description: { es: 'Contexto.', en: 'Context.' } },
    { name: 'trend', type: "'up' | 'down' | 'flat'", description: { es: 'Flecha coloreada.', en: 'Coloured arrow.' } },
  ],
  states: ['default', 'trend-up', 'trend-down'],
  usages: [{ title: { es: 'Fila de tres', en: 'Row of three' }, render: () => h('div', { className: 'grid grid-3' }, h(StatTile, { label: 'Clases este mes', value: 12, trend: 'up', hint: '+3 vs. agosto' }), h(StatTile, { label: 'Racha', value: '4 sem', trend: 'flat' }), h(StatTile, { label: 'Ocupación', value: '82%', trend: 'down', hint: 'promedio 7 días' })) }],
  a11y: [{ es: 'La tendencia es decorativa; el hint lleva el significado.', en: 'Trend arrow is decorative; the hint carries meaning.' }],
  usedBy: ['C-01', 'M-01', 'S-03'],
});
