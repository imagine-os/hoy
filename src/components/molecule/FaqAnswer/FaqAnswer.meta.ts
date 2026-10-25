import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { FaqAnswer } from './FaqAnswer';
import { PriceTable, itemsForFamilies } from '../PriceTable/PriceTable';
import { useI18n } from '../../../i18n/I18nProvider';

function PublishedAdapterExample() {
  const { t, lang } = useI18n();
  return h(FaqAnswer, { text: lang === 'es' ? 'Consulta los planes publicados.\n\n{{pricing:bienvenida,paquetes}}' : 'Check the published plans.\n\n{{pricing:bienvenida,paquetes}}', renderPricing: families => {
    const items = itemsForFamilies(families).map(item => ({ ...item, price: null, description: { es: '', en: '' } }));
    return h(PriceTable, { items, grouped: true, familyLabels: { paquetes: t('site.faq.prices.packages') }, unavailable: { ids: items.map(item => item.id), label: t('site.faq.prices.unavailable') } });
  } });
}

function DirectiveOnlyExample() {
  const { t } = useI18n();
  return h(FaqAnswer, { text: '{{pricing:paquetes}}', after: h('a', { href: '#/app/plans' }, t('customer.faq.plansLink') + ' →') });
}

export default defineMeta({
  tier: 'molecule', name: 'FaqAnswer',
  description: {
    es: 'Una respuesta de las preguntas frecuentes: párrafos, y una línea {{pricing:familias}} se vuelve una tabla de precios generada (PriceTable).',
    en: 'One FAQ answer: paragraphs, and a {{pricing:families}} line becomes a generated price table (PriceTable).',
  },
  props: [
    { name: 'text', type: 'string', required: true, description: { es: 'La respuesta en el idioma de quien lee.', en: 'The answer in the reader’s language.' } },
    { name: 'renderPricing', type: '(families: string) => ReactNode', description: { es: 'Adaptador de tablas generadas; el sitio usa cotizaciones publicadas confirmadas.', en: 'Generated table adapter; the website uses confirmed published quotes.' } },
    { name: 'after', type: 'ReactNode', description: { es: 'Se agrega al último párrafo, o después de las tablas si no hay párrafo.', en: 'Appended to the last paragraph, or after tables if there is no paragraph.' } },
  ],
  states: ['text only', 'with price table', 'with trailing link', 'directive only with trailing link', 'published pricing adapter'],
  usages: [
    { title: { es: 'Adaptador publicado: no disponible', en: 'Published adapter: unavailable' }, render: () => h(PublishedAdapterExample) },
    { title: { es: 'Solo tabla con enlace', en: 'Table only with trailing link' }, render: () => h(DirectiveOnlyExample) },
    { title: { es: 'Solo texto', en: 'Text only' }, render: () => h(FaqAnswer, { text: 'En recepción, cuando llegas.' }) },
    { title: { es: 'Con tabla de precios', en: 'With a price table' }, render: () => h(FaqAnswer, { text: 'Sí. Hay dos tarjetas de regalo, al mismo precio de las clases:\n\n{{pricing:regalos}}\n\nPuedes comprar varias clases individuales, o dos o más paquetes de 12 clases.' }) },
  ],
  a11y: [{ es: 'La tabla es una tabla real; los párrafos se leen en orden.', en: 'The table is a real table; paragraphs read in order.' }],
  usedBy: ['W-10', 'C-14', 'C-15'],
});
