import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { LangToggle } from './LangToggle';

export default defineMeta({
  tier: 'molecule', name: 'LangToggle',
  description: { es: 'Conmutador ES/EN segmentado. Cambia el idioma global y lo guarda.', en: 'Segmented ES/EN switch. Changes the global language and persists it.' },
  props: [{ name: 'size', type: "'sm' | 'md'", default: 'md', description: { es: 'Tamaño.', en: 'Size.' } }],
  states: ['es', 'en'],
  usages: [{ title: { es: 'Default', en: 'Default' }, render: () => h('div', { className: 'row' }, h(LangToggle), h(LangToggle, { size: 'sm' })) }],
  a11y: [{ es: 'role="group" con aria-label bilingüe; aria-pressed en cada botón.', en: 'role="group" with bilingual aria-label; aria-pressed on each button.' }],
  usedBy: ['HUB', 'TopBar', 'DesktopShell'],
});
