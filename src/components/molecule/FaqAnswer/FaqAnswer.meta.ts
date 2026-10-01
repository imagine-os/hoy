import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { FaqAnswer } from './FaqAnswer';

export default defineMeta({
  tier: 'molecule', name: 'FaqAnswer',
  description: {
    es: 'Una respuesta de las preguntas frecuentes: párrafos, y una línea {{pricing:familias}} se vuelve una tabla de precios en vivo (PriceTable).',
    en: 'One FAQ answer: paragraphs, and a {{pricing:families}} line becomes a live price table (PriceTable).',
  },
  props: [
    { name: 'text', type: 'string', required: true, description: { es: 'La respuesta en el idioma de quien lee.', en: 'The answer in the reader’s language.' } },
    { name: 'after', type: 'ReactNode', description: { es: 'Se agrega al final del último párrafo.', en: 'Appended to the last paragraph.' } },
  ],
  states: ['text only', 'with price table', 'with trailing link'],
  usages: [
    { title: { es: 'Solo texto', en: 'Text only' }, render: () => h(FaqAnswer, { text: 'En recepción, cuando llegas.' }) },
    { title: { es: 'Con tabla de precios', en: 'With a price table' }, render: () => h(FaqAnswer, { text: 'Sí. Hay dos tarjetas de regalo, al mismo precio de las clases:\n\n{{pricing:regalos}}\n\nPuedes comprar varias clases individuales, o dos o más paquetes de 12 clases.' }) },
  ],
  a11y: [{ es: 'La tabla es una tabla real; los párrafos se leen en orden.', en: 'The table is a real table; paragraphs read in order.' }],
  usedBy: ['W-10', 'C-14', 'C-15'],
});
