import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { NotificationBell } from './NotificationBell';

export default defineMeta({
  tier: 'molecule', name: 'NotificationBell',
  description: { es: 'Campana de la barra superior con contador de mensajes sin leer (message_log del usuario actual). Sin pendientes queda en gris, con pendientes toma el azul de marca.', en: 'Top-bar bell with the unread count (the current user’s message_log rows). Grey when empty, brand blue when there is something unread.' },
  props: [
    { name: 'count', type: 'number', required: true, description: { es: 'Mensajes sin leer; 0 oculta la insignia.', en: 'Unread messages; 0 hides the badge.' } },
    { name: 'to', type: 'string', description: { es: 'Ruta destino (el registro de mensajes).', en: 'Target route (the message log).' } },
    { name: 'onClick', type: '() => void', description: { es: 'Alternativa a `to`.', en: 'Alternative to `to`.' } },
    { name: 'max', type: 'number', default: '9', description: { es: 'Tope impreso: 9+', en: 'Printed cap: 9+' } },
  ],
  states: ['empty (0)', 'unread', 'overflow (9+)', 'hover'],
  usages: [{ title: { es: 'Vacía, con 3 y con tope', en: 'Empty, with 3 and capped' }, render: () => h('div', { className: 'row' }, h(NotificationBell, { count: 0 }), h(NotificationBell, { count: 3 }), h(NotificationBell, { count: 42 })) }],
  a11y: [{ es: 'aria-label dice el número en palabras; la insignia es decorativa (aria-hidden).', en: 'aria-label states the number in words; the badge itself is decorative (aria-hidden).' }],
  usedBy: ['DesktopShell', 'M-*', 'S-*'],
});
