import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { PriceRow } from './PriceRow';
import { PriceRow as ArchivedPriceRow } from '../../../modules/website/archive/PriceRow';
import { pricing as archivedPricing } from '../../../modules/website/archive/pricing';
import { pricing } from '../../../tenant/pricing';

export default defineMeta({
  tier: 'molecule', name: 'PriceRow',
  description: { es: 'Una línea de precio del Modelo de Valor: nombre, descripción, badge y monto COP con periodo.', en: 'One value-model price line: name, description, badge and COP amount with period.' },
  props: [
    { name: 'item', type: 'PriceItem', required: true, description: { es: 'De src/tenant/pricing.ts.', en: 'From src/tenant/pricing.ts.' } },
    { name: 'onSelect', type: '(item) => void', description: { es: 'Si existe, la fila es un botón.', en: 'When set, the row is a button.' } },
    { name: 'disabled', type: 'boolean', description: { es: 'Con onSelect: botón deshabilitado (aria-disabled) que no selecciona nada; p. ej. mientras falta el consentimiento.', en: 'With onSelect: a disabled button (aria-disabled) that selects nothing; e.g. while consent is on hold.' } },
  ],
  states: ['static', 'clickable', 'disabled', 'badge', 'from-price', 'per-person add-on', 'included'],
  usages: [
    { title: { es: 'Precio histórico (solo archivo)', en: 'Historical price (archive only)' }, render: () => h(ArchivedPriceRow, { item: archivedPricing[0] }) },
    { title: { es: 'Clases privadas', en: 'Private classes' }, render: () => h('div', null, ...pricing.filter((p) => p.family === 'privadas').map((p) => h(PriceRow, { key: p.id, item: p }))) },
    { title: { es: 'Tarjetas de regalo (seleccionable)', en: 'Gift cards (selectable)' }, render: () => h('div', null, ...pricing.filter((p) => p.family === 'regalos').map((p) => h(PriceRow, { key: p.id, item: p, onSelect: () => {} }))) },
    { title: { es: 'Deshabilitada (consentimiento pendiente)', en: 'Disabled (consent on hold)' }, render: () => h('div', null, ...pricing.filter((p) => p.family === 'regalos').slice(0, 1).map((p) => h(PriceRow, { key: p.id, item: p, onSelect: () => {}, disabled: true }))) },
  ],
  a11y: [{ es: 'Botón nativo cuando es seleccionable; el monto usa tabular-nums.', en: 'Native button when selectable; amount uses tabular-nums.' }],
  usedBy: ['P-01', 'C-06', 'C-17', 'S-04'],
});
