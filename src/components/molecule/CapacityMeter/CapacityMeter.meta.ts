import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { CapacityMeter } from './CapacityMeter';

export default defineMeta({
  tier: 'molecule', name: 'CapacityMeter',
  description: { es: 'Barra de cupos: verde, ámbar (≤3) y rojo (lleno). Lee capacidad de la sesión, nunca la inventa.', en: 'Spots bar: green, amber (≤3) and red (full). Reads session capacity, never invents it.' },
  props: [
    { name: 'booked', type: 'number', required: true, description: { es: 'Reservas.', en: 'Bookings.' } },
    { name: 'capacity', type: 'number', required: true, description: { es: 'Mats.', en: 'Mats.' } },
    { name: 'compact', type: 'boolean', description: { es: 'Barra más corta.', en: 'Shorter bar.' } },
  ],
  states: ['ok', 'low', 'full'],
  usages: [{ title: { es: 'Tres estados', en: 'Three states' }, render: () => h('div', { className: 'stack-sm', style: { maxWidth: 240 } }, h(CapacityMeter, { booked: 6, capacity: 15 }), h(CapacityMeter, { booked: 13, capacity: 15 }), h(CapacityMeter, { booked: 15, capacity: 15 })) }],
  a11y: [{ es: 'role="meter" con aria-valuenow/max y etiqueta textual.', en: 'role="meter" with aria-valuenow/max and text label.' }],
  usedBy: ['C-02', 'C-03', 'S-02', 'P-SCHEDULE'],
});
