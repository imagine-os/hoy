import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { addDaysKey } from '../../../i18n/format';
import { WeekDots, type WeekDay } from './WeekDots';

/** A fixed demo week (Mon 28 Sep 2026) so the library renders the same every day. `a` attended, `b` booked, `.` nothing. */
const week = (pattern: string, todayIdx: number): WeekDay[] =>
  [...pattern].map((c, i) => ({ date: addDaysKey('2026-09-28', i), attended: c === 'a', booked: c === 'a' || c === 'b', isToday: i === todayIdx, isFuture: i > todayIdx }));
const count = (p: string) => [...p].filter((c) => c === 'a').length;
const demo = (pattern: string, today: number, target: number, caption: string, size: 'sm' | 'md' = 'md') =>
  h(WeekDots, { days: week(pattern, today), target, attended: count(pattern), size }, caption);

export default defineMeta({
  tier: 'molecule', name: 'WeekDots',
  description: {
    es: 'La semana actual del miembro en siete celdas, lunes → domingo: punto lleno (asistió), anillo (reservada), hueco (nada). Solo lectura. Al cumplir la meta la fila toma el tono de éxito y expone data-met.',
    en: "The member's current week as seven cells, Monday → Sunday: filled dot (attended), ring (booked), hollow (nothing). Display only. When the goal is met the row takes the success tint and exposes data-met.",
  },
  props: [
    { name: 'days', type: '{ date, attended, booked, isToday, isFuture }[]', required: true, description: { es: 'Siete días, lunes primero. date = YYYY-MM-DD.', en: 'Seven days, Monday first. date = YYYY-MM-DD.' } },
    { name: 'target', type: 'number', required: true, description: { es: 'Meta semanal; 0 = sin meta (nunca «cumplida»).', en: 'Weekly goal; 0 = no goal (never "met").' } },
    { name: 'attended', type: 'number', required: true, description: { es: 'Clases asistidas esta semana (la página cuenta).', en: 'Classes attended this week (the page counts).' } },
    { name: 'labels', type: 'string[]', default: "['L','M','X','J','V','S','D']", description: { es: 'Iniciales de los días; la página pasa las del idioma.', en: 'Weekday initials; the page passes the language’s set.' } },
    { name: 'stateLabels', type: 'Partial<Record<attended|booked|none, string>>', description: { es: 'Palabras del title por estado; por defecto bilingües.', en: 'Per-state title words; bilingual defaults.' } },
    { name: 'size', type: "'sm' | 'md'", default: "'md'", description: { es: 'Punto de 1,25 / 1,75 rem.', en: '1.25 / 1.75 rem dot.' } },
    { name: 'ariaLabel', type: 'string', description: { es: 'Nombre de la fila; por defecto «Semana: N de M clases».', en: 'Row name; defaults to "Week: N of M classes".' } },
    { name: 'children', type: 'ReactNode', description: { es: 'Leyenda bajo la fila.', en: 'Caption under the row.' } },
  ],
  states: ['empty week', 'partial', 'met (data-met, success tint)', 'over target (data-over)', 'today marker', 'future dimmed', 'sm'],
  usages: [
    { title: { es: 'Semana vacía (hoy miércoles)', en: 'Empty week (today Wednesday)' }, render: () => demo('.......', 2, 3, '0 de 3 esta semana') },
    { title: { es: 'Parcial, con reservas', en: 'Partial, with bookings' }, render: () => demo('a.a.b..', 3, 3, '2 de 3 · 1 reservada') },
    { title: { es: 'Meta cumplida', en: 'Goal met' }, render: () => demo('a.a.a..', 5, 3, '¡3 de 3! Meta cumplida') },
    { title: { es: 'Sobre la meta · sm', en: 'Over target · sm' }, render: () => demo('aa.aa.b', 6, 2, '4 de 2 esta semana', 'sm') },
  ],
  a11y: [
    { es: 'Lista ordenada: cada día es un <li> con title y aria-label «lunes, 28 de septiembre: Asististe»; las iniciales y los puntos son aria-hidden.', en: 'Ordered list: each day is an <li> with title and aria-label "Monday, September 28: Attended"; initials and dots are aria-hidden.' },
    { es: 'Nunca solo color: asistido lleva un check, reservado un anillo con centro, vacío un borde punteado, hoy una barra bajo el punto.', en: 'Never colour alone: attended carries a check, booked a ring with a centre point, empty a dashed border, today a bar under the dot.' },
    { es: 'Sin controles (solo lectura). La transición del relleno se apaga con prefers-reduced-motion.', en: 'No controls (display only). The fill transition switches off with prefers-reduced-motion.' },
  ],
  usedBy: ['C-01', 'C-27'],
});
