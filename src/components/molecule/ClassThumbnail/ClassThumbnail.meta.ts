import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { ClassThumbnail } from './ClassThumbnail';
export default defineMeta({ tier: 'molecule', name: 'ClassThumbnail', description: { es: 'ClassThumbnail · Santuario', en: 'ClassThumbnail · Sanctuary' }, props: [], states: ['cms-photo', 'fallback', 'loading'], usages: [{ title: { es: 'Vista previa', en: 'Preview' }, render: () => h('div', { style: { width: 160, height: 100 } }, h(ClassThumbnail)) }], a11y: [{ es: 'Compatible con teclado y movimiento reducido.', en: 'Keyboard and reduced motion support.' }], usedBy: ['P-SCHEDULE', 'C-04'] });
