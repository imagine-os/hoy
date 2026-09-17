import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { Toc } from './Toc';

const ITEMS = [
  { id: 'apertura', text: '1. Apertura' },
  { id: 'saludo', text: '2. Saludo' },
  { id: 'check-in', text: '3. Check-in' },
  { id: 'walk-ins-y-pases', text: '4. Walk-ins y pases' },
];

export default defineMeta({
  tier: 'molecule', name: 'Toc',
  description: {
    es: 'Índice en página construido con los encabezados `##` de un documento. Sigue el desplazamiento con IntersectionObserver y marca la sección visible. Como la app va en HashRouter, el clic desplaza el encabezado en lugar de cambiar la ruta.',
    en: 'In-page table of contents built from a document’s `##` headings. Follows scrolling with IntersectionObserver and marks the visible section. Because the app runs on a HashRouter, a click scrolls the heading into view instead of changing the route.',
  },
  props: [
    { name: 'items', type: '{ id, text }[]', required: true, description: { es: 'Encabezados con su ancla.', en: 'Headings with their anchor.' } },
    { name: 'label', type: 'string', required: true, description: { es: 'Etiqueta del landmark y del eyebrow.', en: 'Landmark and eyebrow label.' } },
    { name: 'spy', type: 'boolean', default: 'true', description: { es: 'Sigue el desplazamiento; apagado deja el índice estático.', en: 'Follows scrolling; off leaves the list static.' } },
  ],
  states: ['default', 'active section', 'empty (renders nothing)', 'print (hidden)'],
  usages: [
    { title: { es: 'Índice de un capítulo', en: 'Chapter outline' }, render: () => h(Toc, { items: ITEMS, label: 'En esta página', spy: false }) },
    { title: { es: 'Vacío', en: 'Empty' }, render: () => h(Toc, { items: [], label: 'En esta página' }) },
  ],
  a11y: [
    { es: 'Es un `nav` con `aria-label`; el enlace activo lleva `aria-current`, no sólo color.', en: 'It is a `nav` with an `aria-label`; the active link carries `aria-current`, not just colour.' },
    { es: 'El desplazamiento usa `scrollIntoView`, así que el enlace sigue siendo un ancla real si el script no corre.', en: 'Scrolling uses `scrollIntoView`, so the link remains a real anchor if the script does not run.' },
  ],
  usedBy: ['K-03'],
});
