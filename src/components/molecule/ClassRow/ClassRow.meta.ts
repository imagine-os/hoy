import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { ClassRow } from './ClassRow';

const at = (hh: number) => { const d = new Date(); d.setHours(hh, 30, 0, 0); return d.toISOString(); };

export default defineMeta({
  tier: 'molecule', name: 'ClassRow',
  description: { es: 'Fila densa de clase: hora, título, profesor, punto de movimiento y cupos.', en: 'Dense class row: time, title, teacher, movement dot and capacity.' },
  props: [
    { name: 'title / teacher / startsAt / durationMin', type: 'string | number', required: true, description: { es: 'Datos de la sesión.', en: 'Session data.' } },
    { name: 'movement', type: 'Movement', required: true, description: { es: 'Color del punto.', en: 'Dot colour.' } },
    { name: 'booked / capacity', type: 'number', required: true, description: { es: 'Para CapacityMeter.', en: 'For CapacityMeter.' } },
    { name: 'status', type: "'scheduled' | 'cancelled' | 'completed'", default: 'scheduled', description: { es: 'Tachado en cancelada.', en: 'Struck through when cancelled.' } },
    { name: 'onClick', type: '() => void', description: { es: 'Convierte la fila en botón.', en: 'Makes the row a button.' } },
  ],
  states: ['default', 'hover', 'booked-by-me', 'cancelled', 'completed', 'full'],
  usages: [{ title: { es: 'Lista de hoy', en: 'Today list' }, render: () => h('div', null, h(ClassRow, { title: 'Morning Flow', teacher: 'Manuela Torres', startsAt: at(6), durationMin: 60, movement: 'fluye', booked: 9, capacity: 15, booked_by_me: true, onClick: () => {} }), h(ClassRow, { title: 'Pilates', teacher: 'Paula Mejía', startsAt: at(8), durationMin: 55, movement: 'enraiza', booked: 15, capacity: 15, onClick: () => {} }), h(ClassRow, { title: 'Hot Vinyasa', teacher: 'Andrés Quintero', startsAt: at(17), durationMin: 60, movement: 'arde', booked: 4, capacity: 15, status: 'cancelled' })) }],
  a11y: [{ es: 'Botón cuando hay onClick; el estado va en texto (badge), no solo en color.', en: 'Button when onClick; status is text (badge), not colour alone.' }],
  usedBy: ['C-01', 'C-02', 'S-02', 'S-03', 'P-SCHEDULE'],
});
