import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { PriceTable, itemsForFamilies } from './PriceTable';

export default defineMeta({
  tier: 'molecule', name: 'PriceTable',
  description: {
    es: 'La lista de precios como la imprimen los documentos del dueño: "Opción | Precio (COP)". Lee solo src/tenant/pricing.ts; la usan las preguntas frecuentes (directiva {{pricing:…}}) y la página de planes.',
    en: 'The price list as the owner’s documents print it: "Option | Price (COP)". Reads src/tenant/pricing.ts only; used by the FAQ ({{pricing:…}} directive) and the plans page.',
  },
  props: [
    { name: 'items', type: 'PriceItem[]', required: true, description: { es: 'Las filas, en orden.', en: 'The rows, in order.' } },
    { name: 'caption', type: 'string', description: { es: 'Encabezado de la primera columna.', en: 'Header of the first column.' } },
    { name: 'grouped', type: 'boolean', default: 'false', description: { es: 'Agrupa por familia.', en: 'Groups by family.' } },
  ],
  states: ['flat', 'grouped by family', 'per-person add-on (+)'],
  usages: [
    { title: { es: 'Las opciones de lanzamiento', en: 'The launch options' }, render: () => h(PriceTable, { items: itemsForFamilies('bienvenida,paquetes,privadas'), grouped: true }) },
    { title: { es: 'Tarjetas de regalo', en: 'Gift cards' }, render: () => h(PriceTable, { items: itemsForFamilies('regalos'), caption: 'Tarjeta de regalo' }) },
  ],
  a11y: [{ es: 'Tabla real con encabezados de columna y de fila; los montos usan cifras tabulares.', en: 'A real table with column and row headers; amounts use tabular figures.' }],
  usedBy: ['W-10', 'P-01', 'C-14'],
});
