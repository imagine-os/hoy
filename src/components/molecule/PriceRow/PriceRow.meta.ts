import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { PriceRow } from './PriceRow';
import { pricing } from '../../../tenant/pricing';

export default defineMeta({
  tier: 'molecule', name: 'PriceRow',
  description: { es: 'Una línea de precio del Modelo de Valor: nombre, descripción, badge y monto COP con periodo.', en: 'One value-model price line: name, description, badge and COP amount with period.' },
  props: [
    { name: 'item', type: 'PriceItem', required: true, description: { es: 'De src/tenant/pricing.ts.', en: 'From src/tenant/pricing.ts.' } },
    { name: 'onSelect', type: '(item) => void', description: { es: 'Si existe, la fila es un botón.', en: 'When set, the row is a button.' } },
  ],
  states: ['static', 'clickable', 'badge', 'from-price', 'included'],
  usages: [{ title: { es: 'Membresía + regalo', en: 'Membership + gift' }, render: () => h('div', null, ...pricing.filter((p) => ['monthly', 'annual', 'bono', 'guest'].includes(p.id)).map((p) => h(PriceRow, { key: p.id, item: p }))) }],
  a11y: [{ es: 'Botón nativo cuando es seleccionable; el monto usa tabular-nums.', en: 'Native button when selectable; amount uses tabular-nums.' }],
  usedBy: ['P-01', 'C-06', 'C-07', 'S-04'],
});
