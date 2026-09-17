import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { LiveBlock } from './LiveBlock';

export default defineMeta({
  tier: 'organism', name: 'LiveBlock',
  description: {
    es: 'Bloque de datos en vivo para el manual de operaciones. Un capítulo escribe una directiva `{{pricing:membresia}}` y el bloque la renderiza leyendo la fuente real: pricing.ts, tenant.ts, las políticas de M-08 (usePolicy), el registro de tablas, la lista de roles, el manifiesto de rutas y la capa de datos. Cada bloque lleva la leyenda «Datos en vivo del sistema · Live from the system» y una directiva desconocida se explica en lugar de romperse.',
    en: 'Live-data block for the operations manual. A chapter writes a `{{pricing:membresia}}` directive and the block renders it from the real source: pricing.ts, tenant.ts, the M-08 policies (usePolicy), the table registry, the role list, the route manifest and the data layer. Every block carries the bilingual "Live from the system" caption, and an unknown directive explains itself instead of breaking.',
  },
  props: [
    { name: 'kind', type: "'pricing' | 'tenant' | 'policy' | 'tables' | 'table' | 'roles' | 'routes' | 'stats' | 'kpi'", required: true, description: { es: 'Nombre de la directiva.', en: 'Directive name.' } },
    { name: 'arg', type: 'string', description: { es: 'Argumento tras los dos puntos: familia de precios, campo de política, tabla, superficie o KPI.', en: 'Argument after the colon: price family, policy field, table, surface or KPI.' } },
  ],
  states: ['pricing (all families)', 'pricing (one family)', 'tenant facts', 'policy (all)', 'policy (one field)', 'tables', 'one table', 'roles', 'routes', 'stats', 'kpi', 'unknown directive'],
  usages: [
    { title: { es: 'Precios de Membresía', en: 'Membership pricing' }, render: () => h(LiveBlock, { kind: 'pricing', arg: 'membresia' }) },
    { title: { es: 'Capacidad del estudio', en: 'Studio capacity' }, render: () => h(LiveBlock, { kind: 'tenant', arg: 'capacity' }) },
    { title: { es: 'Una política', en: 'One policy value' }, render: () => h(LiveBlock, { kind: 'policy', arg: 'cancellation_window_hours' }) },
    { title: { es: 'Una tabla', en: 'One table' }, render: () => h(LiveBlock, { kind: 'table', arg: 'bookings' }) },
    { title: { es: 'Directiva desconocida', en: 'Unknown directive' }, render: () => h(LiveBlock, { kind: 'pricing', arg: 'inexistente' }) },
  ],
  a11y: [
    { es: 'Cada bloque es un `section` con `aria-label` igual a su título, así que un lector de pantalla lo anuncia como región dentro del capítulo.', en: 'Each block is a `section` whose `aria-label` is its title, so a screen reader announces it as a region inside the chapter.' },
    { es: 'Las tablas usan `th` reales con encabezado de columna; los números se alinean con `tabular-nums` sin depender del color.', en: 'Tables use real column `th`s; numbers align with `tabular-nums` and never rely on colour alone.' },
  ],
  usedBy: ['K-03'],
});
