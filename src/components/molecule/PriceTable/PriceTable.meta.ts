import { createElement as h } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { defineMeta } from '../../../design/meta';
import { PriceTable, itemsForFamilies } from './PriceTable';

function UnavailableExample() { const { t } = useI18n(); return h(PriceTable, { items: itemsForFamilies('bienvenida,paquetes').map(item => ({ ...item, price: null, description: { es: '', en: '' } })), grouped: true, familyLabels: { paquetes: t('site.faq.prices.packages') }, unavailable: { ids: itemsForFamilies('bienvenida,paquetes').map(item => item.id), label: t('site.faq.prices.unavailable') } }); }

export default defineMeta({
  tier: 'molecule', name: 'PriceTable',
  description: {
    es: 'La lista de precios como la imprimen los documentos del dueño: "Opción | Precio (COP)". Recibe filas de precios; la usan las preguntas frecuentes públicas (directiva {{pricing:…}}).',
    en: 'The price list as the owner’s documents print it: "Option | Price (COP)". Accepts price rows; used by the public FAQ ({{pricing:…}} directive).',
  },
  props: [
    { name: 'items', type: 'PriceItem[]', required: true, description: { es: 'Las filas, en orden.', en: 'The rows, in order.' } },
    { name: 'caption', type: 'string', description: { es: 'Encabezado de la primera columna.', en: 'Header of the first column.' } },
    { name: 'familyLabels', type: 'Partial<Record<PlanFamily, string>>', description: { es: 'Nombres de grupo que no afirman cantidades antiguas.', en: 'Group labels without stale quantity claims.' } },
    { name: 'unavailable', type: '{ids: readonly string[], label: string}', description: { es: 'Una ausencia de precio se muestra como no disponible, nunca como incluido.', en: 'Missing prices display as unavailable, never included.' } },
    { name: 'grouped', type: 'boolean', default: 'false', description: { es: 'Agrupa por familia.', en: 'Groups by family.' } },
  ],
  states: ['wrapping unavailable generated prices', 'flat', 'grouped by family', 'per-person add-on (+)'],
  usages: [
    { title: { es: 'Precios publicados no disponibles', en: 'Published prices unavailable' }, render: () => h(UnavailableExample) },
    { title: { es: 'Las opciones de lanzamiento', en: 'The launch options' }, render: () => h(PriceTable, { items: itemsForFamilies('bienvenida,paquetes,privadas'), grouped: true }) },
    { title: { es: 'Tarjetas de regalo', en: 'Gift cards' }, render: () => h(PriceTable, { items: itemsForFamilies('regalos'), caption: 'Tarjeta de regalo' }) },
  ],
  a11y: [{ es: 'Tabla real con encabezados de columna y de fila; los montos usan cifras tabulares.', en: 'A real table with column and row headers; amounts use tabular figures.' }],
  usedBy: ['W-10'],
});
