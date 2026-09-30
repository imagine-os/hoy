import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { FigurePair } from './FigurePair';
import { Figure } from '../Figure/Figure';

const PHONE = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="390" height="844"><rect width="390" height="844" fill="#e8e2d4"/><rect x="20" y="24" width="350" height="64" rx="12" fill="#cfc6b2"/><rect x="20" y="108" width="350" height="220" rx="16" fill="#dcd4c2"/><rect x="20" y="348" width="350" height="120" rx="16" fill="#dcd4c2"/><rect x="20" y="760" width="350" height="60" rx="12" fill="#cfc6b2"/></svg>',
);

export default defineMeta({
  tier: 'organism', name: 'FigurePair',
  description: {
    es: 'Dos capturas de teléfono una al lado de la otra: en markdown, dos imágenes `-390` seguidas (en párrafos contiguos) se agrupan solas. Dos columnas desde 768 px, apiladas debajo; cada una conserva su tope de 360 px y su leyenda.',
    en: 'Two phone captures side by side: in markdown, two consecutive `-390` images (adjacent paragraphs) are grouped automatically. Two columns from 768 px, stacked below; each keeps its 360 px cap and caption.',
  },
  props: [
    { name: 'children', type: 'ReactNode', required: true, description: { es: 'Dos Figure de teléfono.', en: 'Two phone Figures.' } },
  ],
  states: ['two columns (≥ 768)', 'stacked (< 768)', 'uneven captions'],
  usages: [
    { title: { es: 'Pago y planes', en: 'Checkout and plans' }, render: () => h(FigurePair, null, h(Figure, { url: PHONE, caption: 'El pago en la app del socio', title: 'C-04 · /app/checkout/sample', device: 'mobile' }), h(Figure, { url: PHONE, caption: 'Los planes en la app', title: 'C-06 · /app/plans', device: 'mobile' })) },
  ],
  a11y: [
    { es: 'El orden de lectura y de foco sigue el markdown (izquierda, luego derecha; arriba, luego abajo al apilar).', en: 'Reading and focus order follow the markdown (left then right; top then bottom when stacked).' },
  ],
  usedBy: ['K-03'],
});
