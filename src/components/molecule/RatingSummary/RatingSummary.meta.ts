import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { RatingSummary } from './RatingSummary';

const LABELS: Record<string, string> = { music: 'Música', pace: 'Ritmo', clarity: 'Claridad', crowded: 'Sala llena' };

export default defineMeta({
  tier: 'molecule', name: 'RatingSummary',
  description: { es: 'Resumen de reseñas de solo lectura: promedio en estrellas, número de reseñas y etiquetas más elegidas.', en: 'Read-only review roll-up: average as stars, review count and the most-picked tags.' },
  props: [
    { name: 'average', type: 'number | null', required: true, description: { es: 'Promedio; null si nadie ha calificado.', en: 'Average; null when nothing is rated.' } },
    { name: 'count', type: 'number', required: true, description: { es: 'Número de reseñas.', en: 'Number of reviews.' } },
    { name: 'tags', type: '{ tag, n }[]', description: { es: 'Etiquetas ya ordenadas por frecuencia.', en: 'Tags already sorted by frequency.' } },
    { name: 'tagLabel', type: '(tag) => string', description: { es: 'Traduce la clave de etiqueta; el i18n vive fuera del componente.', en: 'Translates the tag key; i18n stays outside the component.' } },
    { name: 'caption', type: 'string', description: { es: 'Línea bajo el promedio.', en: 'Line under the average.' } },
    { name: 'emptyText', type: 'string', description: { es: 'Texto cuando count = 0.', en: 'Text when count = 0.' } },
    { name: 'size', type: "'sm' | 'md'", default: 'md', description: { es: 'Compacto para filas, medio para tarjetas.', en: 'Compact for rows, medium for cards.' } },
  ],
  states: ['empty', 'with average', 'with tags', 'small'],
  usages: [
    { title: { es: 'Con reseñas y etiquetas', en: 'With reviews and tags' }, render: () => h(RatingSummary, { average: 4.6, count: 9, caption: '9 reseñas', tags: [{ tag: 'music', n: 5 }, { tag: 'pace', n: 3 }, { tag: 'clarity', n: 2 }], tagLabel: (k: string) => LABELS[k] ?? k }) },
    { title: { es: 'Sin reseñas', en: 'No reviews yet' }, render: () => h(RatingSummary, { average: null, count: 0, emptyText: 'Sin reseñas todavía' }) },
  ],
  a11y: [{ es: 'La escala se renderiza en modo solo lectura (sin radiogroup interactivo) y el promedio se lee como número.', en: 'The scale renders read-only (no interactive radiogroup) and the average is read as a number.' }],
  usedBy: ['S-03', 'C-18'],
});
