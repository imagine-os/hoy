import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { Chip } from './Chip';

export default defineMeta({
  tier: 'atom', name: 'Chip',
  description: { es: 'Píldora seleccionable para filtros, intención del día y etiquetas de movimiento.', en: 'Selectable pill for filters, daily intention and movement tags.' },
  props: [
    { name: 'selected', type: 'boolean', default: 'false', description: { es: 'Estado seleccionado (aria-pressed).', en: 'Selected state (aria-pressed).' } },
    { name: 'movement', type: "'enraiza' | 'fluye' | 'arde' | 'libera'", description: { es: 'Colorea con la paleta del movimiento.', en: 'Colours with the movement palette.' } },
    { name: 'dot', type: 'boolean', default: 'false', description: { es: 'Punto de color a la izquierda.', en: 'Leading colour dot.' } },
  ],
  states: ['default', 'hover', 'selected', 'focus'],
  usages: [
    { title: { es: 'Filtros', en: 'Filters' }, render: () => h('div', { className: 'row wrap' }, h(Chip, { selected: true, onClick: () => {} }, 'Todas'), h(Chip, { onClick: () => {} }, 'Mañana'), h(Chip, { onClick: () => {} }, 'Tarde')) },
    { title: { es: 'Movimientos', en: 'Movements' }, render: () => h('div', { className: 'row wrap' }, h(Chip, { movement: 'enraiza', dot: true }, 'Enraíza'), h(Chip, { movement: 'fluye', dot: true }, 'Fluye'), h(Chip, { movement: 'arde', dot: true }, 'Arde'), h(Chip, { movement: 'libera', dot: true }, 'Libera')) },
  ],
  a11y: [{ es: 'Botón con aria-pressed cuando es interactivo; span cuando es solo etiqueta.', en: 'Button with aria-pressed when interactive; span when label only.' }],
  usedBy: ['C-01', 'C-02', 'A-05', 'M-03', 'M-06', 'ConversationList'],
});
