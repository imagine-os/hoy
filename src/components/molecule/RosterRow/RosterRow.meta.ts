import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { RosterRow } from './RosterRow';
import { Button } from '../../atom/Button/Button';

export default defineMeta({
  tier: 'molecule', name: 'RosterRow',
  description: { es: 'Una persona en la lista de una clase: identidad, cómo pagó, estado de llegada y acciones de recepción.', en: 'One person on a class roster: identity, how they paid, arrival state and desk actions.' },
  props: [
    { name: 'name / initials / phone', type: 'string', required: true, description: { es: 'Identidad.', en: 'Identity.' } },
    { name: 'plan', type: 'string', description: { es: 'Plan o forma de pago del cupo.', en: 'Plan or how the spot was paid.' } },
    { name: 'status', type: "'booked' | 'checked_in' | 'no_show' | 'late_cancel' | 'cancelled' | 'waiting'", required: true, description: { es: 'Estado de la reserva.', en: 'Booking state.' } },
    { name: 'late', type: 'boolean', description: { es: 'Llegó después de la gracia.', en: 'Arrived after the grace window.' } },
    { name: 'flag', type: 'string', description: { es: 'Marcador discreto (salud, nota).', en: 'Discreet marker (health, note).' } },
    { name: 'actions', type: 'ReactNode', description: { es: 'Botones size="sm" a la derecha, dentro de RowActions (36 px, sin sombra): principal tonal, secundaria outline.', en: 'size="sm" buttons on the right, inside RowActions (36 px, no shadow): main tonal, secondary outline.' } },
    { name: 'showStatus', type: 'boolean', default: 'true', description: { es: 'Oculta el chip de estado cuando el encabezado de la sección ya lo dice.', en: 'Hides the status chip when the section header already says it.' } },
  ],
  states: ['expected', 'checked-in', 'late', 'no-show', 'waiting', 'selected', 'hover'],
  usages: [{ title: { es: 'Lista de una clase', en: 'Class roster' }, render: () => h('div', { className: 'card card-pad-none' },
    h(RosterRow, { name: 'Mariana Restrepo', phone: '+57 300 ··· 4412', plan: 'Plan Mensual', status: 'checked_in', time: '6:52', actions: h(Button, { size: 'sm', variant: 'outline', icon: 'undo' }, 'Deshacer') }),
    h(RosterRow, { name: 'Andrés Gómez', phone: '+57 310 ··· 2201', plan: 'Paquete de 10 · 3', status: 'booked', flag: 'Rodilla izquierda', actions: [h(Button, { key: 'in', size: 'sm', variant: 'tonal', icon: 'check' }, 'Check-in'), h(Button, { key: 'x', size: 'sm', variant: 'outline', icon: 'user-x' }, 'No vino')] }),
    h(RosterRow, { name: 'Valentina Ruiz', plan: 'Pase Individual', status: 'checked_in', late: true, time: '7:12' }),
    h(RosterRow, { name: 'Julián Mesa', plan: 'Paquete 12', status: 'no_show' }),
    h(RosterRow, { name: 'Camila Ossa', status: 'waiting', time: '#1', actions: h(Button, { size: 'sm', variant: 'tonal', icon: 'promote' }, 'Dar cupo') }),
  ) }, { title: { es: 'Sección que ya nombra el estado (sin chip)', en: 'Section that already names the state (no chip)' }, render: () => h('div', { className: 'card card-pad-none' },
    h(RosterRow, { name: 'Andrés Gómez', phone: '+57 310 ··· 2201', plan: 'Paquete de 10 · 3', status: 'booked', showStatus: false, actions: [h(Button, { key: 'in', size: 'sm', variant: 'tonal', icon: 'check' }, 'Check-in'), h(Button, { key: 'x', size: 'sm', variant: 'outline', icon: 'user-x' }, 'No vino')] }),
  ) }],
  a11y: [{ es: 'Es un botón cuando tiene onClick; las acciones detienen la propagación; el marcador tiene aria-label.', en: 'Renders a button when onClick is set; actions stop propagation; the flag has an aria-label.' }],
  usedBy: ['S-02', 'S-03'],
});
