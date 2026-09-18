import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { InboxPopover } from './InboxPopover';
import { MS } from '../../../i18n/format';

const d = (hrs: number) => new Date(Date.now() - hrs * MS.hour).toISOString();

export default defineMeta({
  tier: 'molecule', name: 'InboxPopover',
  description: { es: 'La campana de la barra superior con su panel: hasta cinco conversaciones sin leer (avatar, nombre, último mensaje, hora relativa, contador) que llevan a su hilo en la bandeja (S-06), y “Ver bandeja” al final. Se cierra con Escape, clic fuera o al navegar.', en: 'The top-bar bell with its panel: up to five unread conversations (avatar, name, last message, relative time, count) linking to their thread in the inbox (S-06), and “Open inbox” at the bottom. Closes on Escape, outside click or navigation.' },
  props: [
    { name: 'count', type: 'number', required: true, description: { es: 'Mensajes entrantes sin leer (insignia de la campana).', en: 'Unread inbound messages (bell badge).' } },
    { name: 'items', type: '{ key, name, initials?, snippet, lastAt, unread }[]', required: true, description: { es: 'Hilos con pendientes, del más reciente al más antiguo.', en: 'Threads with something pending, newest first.' } },
    { name: 'itemTo / inboxTo', type: '(key) => string · string', required: true, description: { es: 'Destinos: el hilo y la bandeja.', en: 'Targets: the thread and the inbox.' } },
    { name: 'max', type: 'number', default: '5', description: { es: 'Filas del panel.', en: 'Rows in the panel.' } },
  ],
  states: ['closed', 'open with items', 'open empty (all read)', 'overflow (+n más)'],
  usages: [{ title: { es: 'Tres pendientes (abre la campana)', en: 'Three pending (open the bell)' }, render: () => h('div', { style: { display: 'flex', justifyContent: 'flex-end', minHeight: 260 } }, h(InboxPopover, { count: 4, inboxTo: '#/staff/inbox', itemTo: (k: string) => `#/staff/inbox/${k}`, items: [
    { key: 'usr_cust', name: 'Juliana Ospina', initials: 'JO', snippet: '¿Me cambias la reserva de mañana a la de 5:30 p. m.?', lastAt: d(1.5), unread: 2 },
    { key: 'usr_c01', name: 'Camila García', initials: 'CG', snippet: '¿Me pueden mandar la factura electrónica al correo de la empresa?', lastAt: d(0.7), unread: 1 },
    { key: 'usr_c04', name: 'Tomás Vargas', initials: 'TV', snippet: 'Hoy salí feliz de Pilates…', lastAt: d(6), unread: 1 },
  ] })) }],
  a11y: [{ es: 'La campana es un botón con aria-expanded y aria-controls; el panel es role=dialog con aria-label; cada fila es un enlace; Escape cierra.', en: 'The bell is a button with aria-expanded and aria-controls; the panel is role=dialog with an aria-label; each row is a link; Escape closes.' }],
  usedBy: ['DesktopShell', 'S-*', 'M-*'],
});
