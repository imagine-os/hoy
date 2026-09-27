import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { MatPicker } from './MatPicker';
export default defineMeta({ tier: 'organism', name: 'MatPicker', description: { es: 'MatPicker · Santuario', en: 'MatPicker · Sanctuary' }, props: [], states: ['available', 'selected', 'occupied', 'focus', 'full'], usages: [{ title: { es: 'Vista previa', en: 'Preview' }, render: () => h(MatPicker, { sessionId: 'library-preview', capacity: 16, value: 6, onChange: () => {} }) }], a11y: [{ es: 'Compatible con teclado y movimiento reducido.', en: 'Keyboard and reduced motion support.' }], usedBy: ['P-SCHEDULE', 'C-04'] });
