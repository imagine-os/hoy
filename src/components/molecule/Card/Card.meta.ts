import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { Card } from './Card';

export default defineMeta({
  tier: 'molecule', name: 'Card',
  description: { es: 'Superficie física base con sombra de tres capas y radio 16. Tonos: surface, primary, highlight, muted.', en: 'Base physical surface with three-layer shadow and 16 radius. Tones: surface, primary, highlight, muted.' },
  props: [
    { name: 'title / eyebrow / actions', type: 'ReactNode', description: { es: 'Cabecera opcional.', en: 'Optional header.' } },
    { name: 'padding', type: "'none' | 'sm' | 'md' | 'lg'", default: 'md', description: { es: 'Relleno.', en: 'Padding.' } },
    { name: 'tone', type: "'surface' | 'primary' | 'highlight' | 'muted'", default: 'surface', description: { es: 'Material.', en: 'Material.' } },
    { name: 'raised / interactive', type: 'boolean', description: { es: 'Elevación mayor / hover que levanta.', en: 'Higher elevation / lifting hover.' } },
  ],
  states: ['default', 'raised', 'interactive-hover'],
  usages: [{ title: { es: 'Tonos', en: 'Tones' }, render: () => h('div', { className: 'grid grid-2' }, h(Card, { eyebrow: 'Hoy', title: 'Hot Vinyasa · 6:30' }, 'Superficie.'), h(Card, { tone: 'primary', title: 'Próxima clase' }, 'Primario.'), h(Card, { tone: 'highlight', title: 'Mejor valor' }, 'Realce.'), h(Card, { tone: 'muted', interactive: true, title: 'Interactiva' }, 'Pasa el cursor.')) }],
  a11y: [{ es: 'Si es interactiva, el hijo debe tener el control accesible (botón o enlace).', en: 'When interactive, the child must hold the accessible control (button or link).' }],
  usedBy: ['C-01', 'HUB', 'P-01', 'M-03', 'D-01', 'D-02'],
});
