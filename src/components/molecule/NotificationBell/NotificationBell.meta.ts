import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { NotificationBell } from './NotificationBell';

export default defineMeta({
  tier: 'molecule', name: 'NotificationBell',
  description: { es: 'Campana de la barra superior con el contador de mensajes entrantes sin leer (message_log, direction inbound y read_at nulo). Sin pendientes queda en gris, con pendientes toma el azul de marca. Es el disparador de InboxPopover.', en: 'Top-bar bell with the count of unread inbound messages (message_log, direction inbound with read_at null). Grey when empty, brand blue when there is something unread. It is the trigger of InboxPopover.' },
  props: [
    { name: 'count', type: 'number', required: true, description: { es: 'Mensajes sin leer; 0 oculta la insignia.', en: 'Unread messages; 0 hides the badge.' } },
    { name: 'to', type: 'string', description: { es: 'Ruta destino (el registro de mensajes).', en: 'Target route (the message log).' } },
    { name: 'onClick', type: '() => void', description: { es: 'Alternativa a `to`.', en: 'Alternative to `to`.' } },
    { name: 'max', type: 'number', default: '9', description: { es: 'Tope impreso: 9+', en: 'Printed cap: 9+' } },
    { name: 'expanded / controls', type: 'boolean · string', description: { es: 'Cuando abre un panel: aria-expanded y aria-controls.', en: 'When it toggles a panel: aria-expanded and aria-controls.' } },
  ],
  states: ['empty (0)', 'unread', 'overflow (9+)', 'hover'],
  usages: [{ title: { es: 'Vacía, con 3 y con tope', en: 'Empty, with 3 and capped' }, render: () => h('div', { className: 'row' }, h(NotificationBell, { count: 0 }), h(NotificationBell, { count: 3 }), h(NotificationBell, { count: 42 })) }],
  a11y: [{ es: 'aria-label dice el número en palabras; la insignia es decorativa (aria-hidden).', en: 'aria-label states the number in words; the badge itself is decorative (aria-hidden).' }],
  usedBy: ['InboxPopover', 'DesktopShell', 'M-*', 'S-*'],
});
