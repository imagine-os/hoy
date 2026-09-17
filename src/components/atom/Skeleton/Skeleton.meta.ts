import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { Skeleton, SkeletonRows } from './Skeleton';

export default defineMeta({
  tier: 'atom', name: 'Skeleton',
  description: { es: 'Marcador de carga con brillo suave. SkeletonRows dibuja tres filas de clase (estado de carga de C-02).', en: 'Loading placeholder with a soft shimmer. SkeletonRows draws three class-shaped rows (the C-02 loading state).' },
  props: [
    { name: 'width / height', type: 'number | string', default: '100% / 16', description: { es: 'Tamaño CSS.', en: 'CSS size.' } },
    { name: 'shape', type: "'text' | 'circle' | 'rect'", default: 'text', description: { es: 'Radio de las esquinas.', en: 'Corner radius.' } },
    { name: 'lines', type: 'number', default: '1', description: { es: 'Líneas apiladas; la última es más corta.', en: 'Stacked lines; the last is shorter.' } },
  ],
  states: ['loading'],
  usages: [
    { title: { es: 'Texto, círculo, tarjeta', en: 'Text, circle, card' }, render: () => h('div', { className: 'row wrap' }, h(Skeleton, { width: 160 }), h(Skeleton, { shape: 'circle', width: 40, height: 40 }), h(Skeleton, { shape: 'rect', width: 120, height: 64 })) },
    { title: { es: 'Filas de clase (C-02)', en: 'Class rows (C-02)' }, render: () => h(SkeletonRows, { count: 3 }) },
  ],
  a11y: [{ es: 'aria-hidden: no anuncia nada; la región padre lleva aria-busy.', en: 'aria-hidden: announces nothing; the parent region carries aria-busy.' }],
  usedBy: ['C-02', 'C-03', 'C-11', 'C-19', 'C-24'],
});
