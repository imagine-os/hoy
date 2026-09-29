import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { Heatmap, type HeatmapCell } from './Heatmap';

const DAYS = [['mon', 'lun'], ['tue', 'mar'], ['wed', 'mié'], ['thu', 'jue'], ['fri', 'vie'], ['sat', 'sáb'], ['sun', 'dom']].map(([key, label]) => ({ key, label }));
const HOURS = [6, 7, 8, 9, 10, 12, 17, 18, 19, 20].map((n) => ({ key: String(n), label: `${n}:00` }));

/** Deterministic demo occupancy: mornings and evenings busy, no classes Sunday evening or at noon on weekends. */
const CELLS: HeatmapCell[] = DAYS.flatMap((d, di) => HOURS.flatMap((c, ci) => {
  const hour = Number(c.key);
  if ((di === 6 && hour >= 12) || (di >= 5 && hour === 12) || (di === 5 && hour >= 19)) return [];
  const peak = hour <= 7 || (hour >= 18 && hour <= 19) ? 38 : 0;
  const value = Math.min(100, (di * 17 + ci * 29) % 55 + peak + (di === 3 ? 10 : 0));
  return [{ row: d.key, col: c.key, value, hint: `${d.label} ${c.label} · ${value}% de ocupación · ${Math.round(value * 0.15)} de 15 mats` }];
}));

export default defineMeta({
  tier: 'molecule', name: 'Heatmap',
  description: {
    es: 'Rejilla día × hora con relleno secuencial de 5 pasos del azul de marca (color-mix sobre la superficie). Una celda vacía rayada = sin clase. Se desplaza dentro de su tarjeta en pantallas estrechas con la columna de días fija.',
    en: 'Weekday × hour grid with a 5-step sequential fill of the brand blue (color-mix over the surface). A hatched empty cell = no class. Scrolls inside its card on narrow screens with the weekday column sticky.',
  },
  props: [
    { name: 'rows', type: '{ key, label }[]', required: true, description: { es: 'Días (encabezados de fila).', en: 'Weekdays (row headers).' } },
    { name: 'cols', type: '{ key, label }[]', required: true, description: { es: 'Horas (encabezados de columna).', en: 'Hours (column headers).' } },
    { name: 'cells', type: '{ row, col, value 0–100, hint? }[]', required: true, description: { es: 'Un par fila × columna ausente se dibuja como «sin clase».', en: 'A missing row × col pair draws as "no class".' } },
    { name: 'format', type: '(v) => string', default: '`${v}%`', description: { es: 'Formato del valor en el nombre de la celda.', en: 'Value format in the cell name.' } },
    { name: 'legend', type: '{ low, high }', description: { es: 'Extremos de la leyenda de 5 pasos (ya traducidos).', en: 'Ends of the 5-step legend (already translated).' } },
    { name: 'ariaLabel', type: 'string', required: true, description: { es: 'Nombre y caption de la tabla.', en: 'Table name and caption.' } },
    { name: 'showValues', type: 'boolean', default: 'false', description: { es: 'Escribe el valor en cada celda; solo para rejillas pequeñas.', en: 'Prints the value in each cell; small grids only.' } },
    { name: 'emptyLabel', type: 'string', description: { es: 'Nombre de la celda vacía; por defecto «Sin clase».', en: 'Empty cell name; defaults to "No class".' } },
  ],
  states: ['steps 1–5', 'empty (no class)', 'focus', 'hover', 'with values', 'horizontal scroll < 480 px'],
  usages: [
    { title: { es: 'Ocupación por franja (M-12)', en: 'Occupancy by slot (M-12)' }, render: () => h('div', { className: 'surf2', style: { padding: 'var(--sp-4)', minWidth: 0 } }, h(Heatmap, { rows: DAYS, cols: HOURS, cells: CELLS, ariaLabel: 'Ocupación por día y hora', legend: { low: 'Baja', high: 'Alta' } })) },
    {
      title: { es: 'Con valores, rejilla pequeña', en: 'With values, small grid' },
      render: () => h('div', { className: 'surf2', style: { padding: 'var(--sp-4)', minWidth: 0 } }, h(Heatmap, { rows: DAYS.slice(0, 3), cols: HOURS.slice(0, 4), cells: CELLS, showValues: true, ariaLabel: 'Ocupación mañana, lunes a miércoles', legend: { low: 'Baja', high: 'Alta' } })),
    },
  ],
  a11y: [
    { es: 'Tabla real con caption, <th scope> para días y horas. Cada celda es tabIndex=0 con title y aria-label (la pista o «día hora: valor»), así que el valor nunca depende solo del color.', en: 'A real table with a caption and <th scope> for days and hours. Every cell is tabIndex=0 with a title and aria-label (the hint or "day hour: value"), so the value never relies on colour alone.' },
    { es: 'Sin clase = celda rayada (patrón, no solo color). En oscuro la rampa usa el azul claro de texto para que los pasos se distingan sobre el azul noche.', en: 'No class = hatched cell (pattern, not colour alone). In dark the ramp uses the light accent blue so the steps stay distinct on navy.' },
    { es: 'Bajo 480 px la tabla se desplaza dentro de su contenedor (overflow-x) con la columna de días fija; enfocar una celda la trae a la vista.', en: 'Below 480 px the table scrolls inside its container (overflow-x) with the weekday column sticky; focusing a cell scrolls it into view.' },
  ],
  usedBy: ['M-12'],
});
