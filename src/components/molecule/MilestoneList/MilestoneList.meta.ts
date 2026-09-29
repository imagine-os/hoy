import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { MilestoneList } from './MilestoneList';

const ES = { reached: 'Logros', next: 'Próximo', remaining: (n: number) => (n === 1 ? 'Falta 1' : `Faltan ${n}`), classes: (n: number) => (n === 1 ? '1 clase' : `${n} clases`) };
const EN = { reached: 'Reached', next: 'Next', remaining: (n: number) => `${n} to go`, classes: (n: number) => (n === 1 ? '1 class' : `${n} classes`) };

export default defineMeta({
  tier: 'molecule', name: 'MilestoneList',
  description: {
    es: 'Hitos alcanzados y el próximo: fila compacta de medallones tipo Chip (estrella rellena) y el siguiente punteado con bandera y una barra de progreso fina. No dibuja nada si no hay ninguno.',
    en: 'Reached and next milestones: a compact row of Chip-like medallions (filled star) and the next one dashed with a flag and a thin progress bar. Renders nothing when there are none.',
  },
  props: [
    { name: 'reached', type: 'number[]', required: true, description: { es: 'Hitos alcanzados (clases); se ordenan de menor a mayor.', en: 'Milestones reached (classes); sorted ascending.' } },
    { name: 'next', type: '{ at, remaining } | null', required: true, description: { es: 'El próximo hito y cuántas clases faltan; null si no queda.', en: 'Next milestone and classes left; null when none is left.' } },
    { name: 'labels', type: '{ reached, next, remaining(n), classes(n) }', required: true, description: { es: 'Textos ya traducidos (con plural).', en: 'Texts already translated (with plural).' } },
  ],
  states: ['first milestone pending (none reached)', 'reached + next', 'all reached (next null)', 'empty (renders null)'],
  usages: [
    { title: { es: 'Primer hito en camino', en: 'First milestone on the way' }, render: () => h(MilestoneList, { reached: [], next: { at: 10, remaining: 7 }, labels: ES }) },
    { title: { es: 'Alcanzados + próximo', en: 'Reached + next' }, render: () => h(MilestoneList, { reached: [25, 10, 50], next: { at: 100, remaining: 38 }, labels: ES }) },
    { title: { es: 'Todos alcanzados (EN)', en: 'All reached (EN)' }, render: () => h(MilestoneList, { reached: [10, 25, 50, 100, 200], next: null, labels: EN }) },
  ],
  a11y: [
    { es: 'Cada grupo es una <section> con aria-label; los alcanzados son una lista (<ul>). Los iconos son aria-hidden; el texto «25 clases» lleva el significado.', en: 'Each group is a <section> with an aria-label; reached ones are a list (<ul>). Icons are aria-hidden; the "25 classes" text carries the meaning.' },
    { es: 'La barra es role="progressbar" con aria-valuenow / max y aria-valuetext; «Faltan N» también está escrito. El próximo se distingue por borde punteado y bandera, no solo por color.', en: 'The bar is role="progressbar" with aria-valuenow / max and aria-valuetext; "N to go" is also written. The next one differs by a dashed border and a flag, not colour alone.' },
    { es: 'Solo lectura; la transición de la barra se apaga con prefers-reduced-motion.', en: 'Display only; the bar transition switches off with prefers-reduced-motion.' },
  ],
  usedBy: ['C-01', 'C-27'],
});
