import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { Chip } from './Chip';
import { TONES } from '../../../design/tokens';

export default defineMeta({
  tier: 'atom', name: 'Chip',
  description: { es: 'Píldora seleccionable para filtros y etiquetas con el tono de la clase.', en: 'Selectable pill for filters and class-tone tags.' },
  props: [
    { name: 'selected', type: 'boolean', default: 'false', description: { es: 'Estado seleccionado (aria-pressed).', en: 'Selected state (aria-pressed).' } },
    { name: 'tone', type: "Tone ('moss' | 'river' | 'clay' | 'sun' | 'sage' | 'slate' | 'plum')", description: { es: 'Colorea con el tono de la clase (D-01 classTones).', en: 'Colours with the class tone (D-01 classTones).' } },
    { name: 'dot', type: 'boolean', default: 'false', description: { es: 'Punto de color a la izquierda.', en: 'Leading colour dot.' } },
  ],
  states: ['default', 'hover', 'selected', 'focus'],
  usages: [
    { title: { es: 'Filtros', en: 'Filters' }, render: () => h('div', { className: 'row wrap' }, h(Chip, { selected: true, onClick: () => {} }, 'Todas'), h(Chip, { onClick: () => {} }, 'Mañana'), h(Chip, { onClick: () => {} }, 'Tarde')) },
    { title: { es: 'Tonos', en: 'Tones' }, render: () => h('div', { className: 'row wrap' }, ...TONES.map((tone) => h(Chip, { key: tone, tone, dot: true }, tone))) },
    { title: { es: 'Clases', en: 'Classes' }, render: () => h('div', { className: 'row wrap' }, h(Chip, { tone: 'clay', dot: true, selected: true, onClick: () => {} }, 'Hot Vinyasa'), h(Chip, { tone: 'river', dot: true, onClick: () => {} }, 'Morning Flow'), h(Chip, { tone: 'moss', dot: true, onClick: () => {} }, 'Pilates'), h(Chip, { tone: 'sage', dot: true, onClick: () => {} }, 'Barre')) },
  ],
  a11y: [{ es: 'Botón con aria-pressed cuando es interactivo; span cuando es solo etiqueta.', en: 'Button with aria-pressed when interactive; span when label only.' }],
  usedBy: ['C-02', 'M-03', 'M-06', 'S-04', 'ConversationList'],
});
