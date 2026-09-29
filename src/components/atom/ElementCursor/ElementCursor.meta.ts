import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { ElementCursor } from './ElementCursor';
export default defineMeta({ tier: 'atom', name: 'ElementCursor', description: { es: 'ElementCursor · Santuario', en: 'ElementCursor · Sanctuary' }, props: [], states: ['tone colour under the pointer (default sun)', 'moss halo', 'clay halo', 'river halo', 'hover', 'pressed', 'reduced-motion'], usages: [{ title: { es: 'Vista previa', en: 'Preview' }, render: () => h(ElementCursor, { enabled: true }) }], a11y: [{ es: 'Compatible con teclado y movimiento reducido.', en: 'Keyboard and reduced motion support.' }], usedBy: ['P-SCHEDULE', 'C-04'] });
