import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { BarList } from './BarList';

const cop = (v: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

export default defineMeta({
  tier: 'molecule', name: 'BarList',
  description: { es: 'Gráfico de magnitud de una sola serie como lista de barras: un tono, marcas finas, valor al final, legible como tabla.', en: 'Single-series magnitude chart as a labelled bar list: one hue, thin marks, value at the data end, table-readable.' },
  props: [
    { name: 'items', type: '{ id, label, value, hint? }[]', required: true, description: { es: 'Filas.', en: 'Rows.' } },
    { name: 'format', type: '(v) => string', description: { es: 'Formato del valor (COP, %).', en: 'Value format (COP, %).' } },
    { name: 'max', type: 'number', description: { es: 'Techo de la escala.', en: 'Scale ceiling.' } },
    { name: 'emphasizeId', type: 'string', description: { es: 'Fila en el tono acento (hoy).', en: 'Row in the accent hue (today).' } },
  ],
  states: ['default', 'hover', 'emphasized', 'empty'],
  usages: [
    { title: { es: 'Ingresos por producto', en: 'Revenue by product' }, render: () => h(BarList, { format: cop, items: [{ id: 'm', label: 'Plan Mensual', value: 4160000 }, { id: 'p10', label: 'Paquete de 10', value: 1470000 }, { id: 'a', label: 'Plan Anual', value: 4990000 }, { id: 's', label: 'Pase Individual', value: 348000 }] }) },
    { title: { es: 'Ocupación 7 días', en: '7-day occupancy' }, render: () => h(BarList, { max: 100, emphasizeId: 'jue', format: (v) => `${v}%`, items: [{ id: 'lun', label: 'lun', value: 72 }, { id: 'mar', label: 'mar', value: 81 }, { id: 'mie', label: 'mié', value: 64 }, { id: 'jue', label: 'jue', value: 88, hint: 'hoy' }, { id: 'vie', label: 'vie', value: 55 }, { id: 'sab', label: 'sáb', value: 93 }] }) },
  ],
  a11y: [{ es: 'role=table/row/cell: la etiqueta y el valor son texto; la barra es decorativa (aria-hidden) y el title lleva el tooltip.', en: 'role=table/row/cell: label and value are text; the bar is decorative (aria-hidden) and title carries the tooltip.' }],
  usedBy: ['M-01', 'M-09'],
});
