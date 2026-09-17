import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { OrderSummary } from './OrderSummary';
import { priceItem } from '../../../tenant/pricing';

export default defineMeta({
  tier: 'molecule', name: 'OrderSummary',
  description: { es: 'Resumen de pedido: líneas, subtotal, IVA calculado (nunca escrito) y total. Los precios de HoyOS incluyen IVA; el componente lo desglosa.', en: 'Order summary: lines, subtotal, computed IVA (never typed) and total. HoyOS prices are IVA-inclusive; the component backs the tax out.' },
  props: [
    { name: 'lines', type: '{ label, amount, muted? }[]', required: true, description: { es: 'Conceptos en COP.', en: 'Line items in COP.' } },
    { name: 'taxRate', type: 'number', required: true, description: { es: 'Fracción (0.19). Viene de la política, no del componente.', en: 'Fraction (0.19). Comes from policy, not the component.' } },
    { name: 'taxIncluded', type: 'boolean', default: 'true', description: { es: 'Precios con IVA incluido.', en: 'IVA-inclusive prices.' } },
    { name: 'totalLabel / taxLabel / subtotalLabel', type: 'string', required: true, description: { es: 'Etiquetas traducidas por la página.', en: 'Labels translated by the page.' } },
  ],
  states: ['default', 'with note'],
  usages: [{ title: { es: 'Pase individual', en: 'Single pass' }, render: () => h(OrderSummary, { lines: [{ label: priceItem('single')!.name.es, amount: priceItem('single')!.price! }], taxRate: 0.19, subtotalLabel: 'Subtotal', taxLabel: 'IVA', totalLabel: 'Total', note: 'Recibo electrónico DIAN al aprobar el pago.' }) }],
  a11y: [{ es: 'role=table con filas; el total es la última fila con mayor peso.', en: 'role=table with rows; the total is the last, heaviest row.' }],
  usedBy: ['C-04', 'C-17', 'C-23', 'S-04'],
});
