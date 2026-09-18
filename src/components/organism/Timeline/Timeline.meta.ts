import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { Timeline } from './Timeline';
import { MS } from '../../../i18n/format';

const d = (h: number) => new Date(Date.now() - h * MS.hour).toISOString();

export default defineMeta({
  tier: 'organism', name: 'Timeline',
  description: { es: 'Flujo cronológico que mezcla todos los canales: WhatsApp, email, notas internas, pagos, reservas y eventos del sistema.', en: 'Chronological stream merging every channel: WhatsApp, email, staff notes, payments, bookings and system events.' },
  props: [
    { name: 'items', type: '{ id, at, kind, title, body?, meta? }[]', required: true, description: { es: 'Eventos; se ordenan del más reciente al más antiguo.', en: 'Events; sorted newest first.' } },
    { name: 'kind', type: "'whatsapp' | 'email' | 'note' | 'system' | 'payment' | 'booking'", description: { es: 'Icono y color del punto.', en: 'Dot icon and colour.' } },
    { name: 'limit', type: 'number', description: { es: 'Máximo de eventos.', en: 'Max events.' } },
  ],
  states: ['default', 'empty', 'limited'],
  usages: [{ title: { es: 'Ficha de miembro', en: 'Member record' }, render: () => h(Timeline, { items: [
    { id: '1', at: d(1), kind: 'whatsapp', title: 'Recordatorio de clase enviado', body: 'Hola Mariana, tu clase de Hot Vinyasa empieza a las 17:30.', meta: 'automatización · leído' },
    { id: '2', at: d(5), kind: 'email', title: 'Recibo de pago', meta: 'entregado' },
    { id: '3', at: d(30), kind: 'note', title: 'Nota de recepción', body: 'Preguntó por pase de invitado. Mencionó molestia en la rodilla.', meta: 'Camilo · recepción' },
    { id: '4', at: d(50), kind: 'payment', title: 'Pago aprobado · Plan Mensual', meta: 'Wompi · tarjeta' },
    { id: '5', at: d(72), kind: 'booking', title: 'Check-in · Pilates 8:00' },
  ] }) }],
  a11y: [{ es: 'Lista ordenada con <time dateTime>; los iconos son decorativos.', en: 'Ordered list with <time dateTime>; icons are decorative.' }],
  usedBy: ['M-01', 'S-01', 'S-03'],
});
