import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { StreakBadge } from './StreakBadge';

const tile = (child: ReturnType<typeof h>) => h('div', { className: 'surf2', style: { padding: 'var(--sp-4)', minWidth: 0 } }, child);

export default defineMeta({
  tier: 'molecule', name: 'StreakBadge',
  description: {
    es: 'La racha como un sello: medallón con llama, número grande y unidad; la mejor racha en una segunda línea. El tono cambia con el estado (activa cálida, en riesgo ámbar con anillo punteado, en construcción neutra, sin racha / interrumpida apagada), nunca solo rojo.',
    en: 'The streak as a stamp: flame medallion, big count and unit; the best run on a second line. Tone follows the state (alive warm, at risk amber with a dashed ring, building neutral, none / broken muted), never red-only.',
  },
  props: [
    { name: 'count', type: 'number', required: true, description: { es: 'Largo de la racha. No parte línea; mantenlo corto (≤ 3 cifras).', en: 'Streak length. Never wraps; keep it short (≤ 3 digits).' } },
    { name: 'unit', type: 'string', required: true, description: { es: 'Ya traducida: «semanas».', en: 'Already translated: "weeks".' } },
    { name: 'state', type: "'none' | 'building' | 'alive' | 'at_risk' | 'broken'", required: true, description: { es: 'Tono y forma del medallón.', en: 'Medallion tone and shape.' } },
    { name: 'best', type: 'number', description: { es: 'Mejor racha; segunda línea.', en: 'Best run; second line.' } },
    { name: 'bestLabel', type: 'string', description: { es: '«Mejor» (ya traducida).', en: '"Best" (already translated).' } },
    { name: 'hint', type: 'string', description: { es: 'Una línea bajo el sello: qué significa el estado.', en: 'One line under the stamp: what the state means.' } },
    { name: 'stateLabel', type: 'string', description: { es: 'Palabra del estado para lector de pantalla; por defecto bilingüe.', en: 'Screen-reader state word; bilingual default.' } },
  ],
  states: ['none', 'building', 'alive', 'at_risk', 'broken', 'with best', 'with hint'],
  usages: [
    {
      title: { es: 'Cinco estados', en: 'Five states' },
      render: () => h('div', { className: 'row wrap', style: { gap: 'var(--sp-6)' } },
        h(StreakBadge, { count: 0, unit: 'semanas', state: 'none' }),
        h(StreakBadge, { count: 1, unit: 'semana', state: 'building' }),
        h(StreakBadge, { count: 6, unit: 'semanas', state: 'alive', best: 9, bestLabel: 'Mejor' }),
        h(StreakBadge, { count: 6, unit: 'semanas', state: 'at_risk', best: 9, bestLabel: 'Mejor' }),
        h(StreakBadge, { count: 0, unit: 'semanas', state: 'broken', best: 6, bestLabel: 'Mejor' })),
    },
    {
      title: { es: 'En columna de StatTile (2 × 390 px)', en: 'In a StatTile column (2 × 390 px)' },
      render: () => h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 170px))', gap: 12 } },
        tile(h(StreakBadge, { count: 12, unit: 'semanas', state: 'alive', best: 12, bestLabel: 'Mejor', hint: '¡Tu mejor racha!' })),
        tile(h(StreakBadge, { count: 104, unit: 'weeks', state: 'at_risk', best: 104, bestLabel: 'Best', hint: 'Go once this week to keep it' }))),
    },
  ],
  a11y: [
    { es: 'Texto real: el número, la unidad y la mejor racha se leen en orden; el estado va en un texto sr-only antes del número. La llama es aria-hidden.', en: 'Real text: count, unit and best read in order; the state is an sr-only word before the count. The flame is aria-hidden.' },
    { es: 'El estado no depende del color: en riesgo lleva anillo punteado, sin racha / interrumpida van huecos, activa lleva trazo grueso.', en: 'State never relies on colour: at risk has a dashed ring, none / broken are hollow, alive has a heavier stroke.' },
    { es: 'Sin animación ni controles.', en: 'No animation, no controls.' },
  ],
  usedBy: ['C-01', 'C-27'],
});
