import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { PrivateClassPhoto } from './PrivateClassPhoto';

export default defineMeta({
  tier: 'molecule', name: 'PrivateClassPhoto',
  description: { es: 'Fotografía de acroyoga suministrada para clases privadas; conserva la composición completa.', en: 'Supplied acroyoga photograph for private classes; preserves the complete composition.' },
  props: [{ name: 'src / alt', type: 'string', description: { es: 'Foto y texto alternativo del CMS; la fotografía suministrada es el respaldo.', en: 'CMS photograph and alternative text; the supplied photograph is the fallback.' } }, { name: 'sizes', type: 'string', description: { es: 'Ancho de la foto según el diseño adaptable.', en: 'Photo width for the responsive layout.' } }],
  states: ['supplied photo', 'published CMS override', 'responsive natural proportions'],
  usages: [
    { title: { es: 'Clases privadas', en: 'Private classes' }, render: () => h(PrivateClassPhoto) },
    { title: { es: 'Foto publicada en el CMS', en: 'Published CMS photo' }, render: () => h(PrivateClassPhoto, { src: './images/studio-2026/private-acroyoga-960.webp', alt: 'Acroyoga' }) },
  ],
  a11y: [{ es: 'Texto alternativo en ES/EN. La foto no contiene controles ni recorta a las personas.', en: 'ES/EN alternative text. The photo contains no controls and does not crop the people.' }],
  usedBy: ['W-01', 'P-01'],
});
