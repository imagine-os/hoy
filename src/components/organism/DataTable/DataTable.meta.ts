import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { DataTable } from './DataTable';
import { Badge, toneForStatus } from '../../atom/Badge/Badge';

type Row = { id: string; name: string; plan: string; status: string; visits: number };
const rows: Row[] = [
  { id: '1', name: 'Juliana Ospina', plan: 'Plan Mensual', status: 'active', visits: 14 },
  { id: '2', name: 'Camila García', plan: 'Paquete de 10', status: 'paused', visits: 3 },
  { id: '3', name: 'Nicolás Torres', plan: 'Clase de Prueba', status: 'expired', visits: 1 },
];

export default defineMeta({
  tier: 'organism', name: 'DataTable',
  description: { es: 'Tabla limpia con orden por columna, búsqueda, paginación, fila seleccionada y cabecera fija.', en: 'Clean table with column sort, search, pagination, selected row and sticky header.' },
  props: [
    { name: 'columns', type: 'DataTableColumn<T>[]', required: true, description: { es: 'key, label, render?, sortable?, width?, align?, mono?', en: 'key, label, render?, sortable?, width?, align?, mono?' } },
    { name: 'rows / rowKey', type: 'T[] / (row) => string', required: true, description: { es: 'Datos.', en: 'Data.' } },
    { name: 'onRowClick / selectedKey', type: 'fn / string', description: { es: 'Interacción por fila.', en: 'Row interaction.' } },
    { name: 'search', type: 'string', description: { es: 'Filtro de texto en todas las columnas.', en: 'Text filter across columns.' } },
    { name: 'pageSize', type: 'number', default: '50', description: { es: 'Paginación.', en: 'Pagination.' } },
  ],
  states: ['default', 'sorted', 'row-hover', 'row-selected', 'empty', 'paginated'],
  usages: [{ title: { es: 'Miembros', en: 'Members' }, render: () => h(DataTable<Row>, { rows, rowKey: (r) => r.id, onRowClick: () => {}, selectedKey: '1', columns: [{ key: 'name', label: 'Nombre' }, { key: 'plan', label: 'Plan' }, { key: 'status', label: 'Estado', render: (r) => h(Badge, { tone: toneForStatus(r.status) }, r.status) }, { key: 'visits', label: 'Visitas', align: 'right' }] }) }],
  a11y: [{ es: 'aria-sort en cabeceras; filas clicables con tabIndex y Enter.', en: 'aria-sort on headers; clickable rows get tabIndex and Enter.' }],
  usedBy: ['M-03', 'M-06', 'M-07', 'S-02'],
});
