import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { ClassCard } from './ClassCard';
import { MS } from '../../../i18n/format';

const soon = new Date(Date.now() + 95 * MS.min).toISOString(); const soonEnd = new Date(Date.now() + 155 * MS.min).toISOString();
const tmr = new Date(Date.now() + 30 * MS.hour).toISOString(); const tmrEnd = new Date(Date.now() + 31 * MS.hour).toISOString();

export default defineMeta({
  tier: 'organism', name: 'ClassCard',
  description: { es: 'Tarjeta de clase con chip de movimiento, hora grande, profesor, cupos y CTA. La variante next añade cuenta regresiva (<24h) o día.', en: 'Class card with movement chip, big time, teacher, capacity and CTA. The next variant adds a countdown (<24h) or weekday.' },
  props: [
    { name: 'title / teacher / room / level', type: 'string', description: { es: 'Texto.', en: 'Text.' } },
    { name: 'startsAt / endsAt', type: 'ISO string', required: true, description: { es: 'Horario.', en: 'Times.' } },
    { name: 'movement', type: 'Movement', required: true, description: { es: 'Paleta.', en: 'Palette.' } },
    { name: 'booked / capacity', type: 'number', required: true, description: { es: 'Cupos.', en: 'Spots.' } },
    { name: 'variant', type: "'next' | 'default'", default: 'default', description: { es: 'Tono primario + countdown.', en: 'Primary tone + countdown.' } },
    { name: 'cta', type: '{ label, onClick, variant? }', description: { es: 'Botón.', en: 'Button.' } },
  ],
  states: ['default', 'next (countdown)', 'next (weekday)', 'hover', 'full'],
  usages: [{ title: { es: 'Próxima + normal', en: 'Next + default' }, render: () => h('div', { className: 'grid grid-2' }, h(ClassCard, { variant: 'next', title: 'Hot Vinyasa', teacher: 'Andrés Quintero', room: 'Sala principal', startsAt: soon, endsAt: soonEnd, movement: 'arde', booked: 12, capacity: 15, cta: { label: 'Ver clase', onClick: () => {} } }), h(ClassCard, { title: 'Yin', teacher: 'Santiago Vélez', startsAt: tmr, endsAt: tmrEnd, movement: 'libera', booked: 15, capacity: 15, cta: { label: 'Lista de espera', onClick: () => {} }, onClick: () => {} })) }],
  a11y: [{ es: 'El CTA detiene la propagación para no disparar el onClick de la tarjeta.', en: 'CTA stops propagation so it does not trigger the card onClick.' }],
  usedBy: ['C-01', 'C-02', 'C-03', 'S-03'],
});
