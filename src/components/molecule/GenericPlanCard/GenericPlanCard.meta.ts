import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import type { GenericPlan } from '../../../data/livePricing';
import { GenericPlanCard } from './GenericPlanCard';

const plan: GenericPlan = { key: 'pack6', kind: 'pack', name: { es: 'Paquete de 6 clases', en: 'Paquete de 6 clases' }, description: { es: '', en: '' }, price: 300000, classes: 6, validityDays: 60, freezable: true };

export default defineMeta({
  tier: 'molecule', name: 'GenericPlanCard',
  description: { es: 'Un producto del maestro sin tarjeta propia: nombre, precio, clases, vigencia y compra.', en: 'A product of the master with no card of its own: name, price, classes, validity and purchase.' },
  props: [
    { name: 'plan', type: 'GenericPlan', required: true, description: { es: 'De genericPlans (src/data/livePricing.ts).', en: 'From genericPlans (src/data/livePricing.ts).' } },
    { name: 'onSelect', type: '(plan) => void', required: true, description: { es: 'Comprar o regalar.', en: 'Buy or give.' } },
    { name: 'disabled', type: 'boolean', description: { es: 'Mientras falta el consentimiento.', en: 'While consent is on hold.' } },
  ],
  states: ['default', 'disabled', 'gift', 'one class', 'no validity'],
  usages: [
    { title: { es: 'Paquete', en: 'Package' }, render: () => h(GenericPlanCard, { plan, onSelect: () => {} }) },
    { title: { es: 'Regalo', en: 'Gift' }, render: () => h(GenericPlanCard, { plan: { ...plan, key: 'gift2', kind: 'gift', classes: 2, freezable: false }, onSelect: () => {} }) },
    { title: { es: 'Deshabilitada (consentimiento pendiente)', en: 'Disabled (consent on hold)' }, render: () => h(GenericPlanCard, { plan: { ...plan, key: 'single2', kind: 'single', classes: 1, validityDays: null, freezable: false }, onSelect: () => {}, disabled: true }) },
  ],
  a11y: [{ es: 'Botón nativo; el texto del producto se muestra como texto.', en: 'Native button; the product text shows as plain text.' }],
  usedBy: ['P-01', 'C-06'],
});
