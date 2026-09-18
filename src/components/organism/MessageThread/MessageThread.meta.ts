import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { MessageThread } from './MessageThread';
import type { MessageLogRow } from '../../../data/schema';
import { MS } from '../../../i18n/format';

const d = (hrs: number) => new Date(Date.now() - hrs * MS.hour).toISOString();
const msg = (id: string, hrs: number, p: Partial<MessageLogRow>): MessageLogRow => ({ id, tenant_id: 'ten_hoy', created_at: d(hrs), updated_at: d(hrs), user_id: 'usr_cust', channel: 'whatsapp', direction: 'inbound', source: 'manual', template_key: null, automation_id: null, subject: null, body: null, status: 'received', sent_at: d(hrs), sent_by: null, read_at: d(hrs - 0.1), read_by: 'usr_desk', external_id: null, payload: null, ...p });

export default defineMeta({
  tier: 'organism', name: 'MessageThread',
  description: { es: 'Una conversación completa, de la más antigua arriba a la más reciente abajo, con separadores por día (Hoy · Ayer · fecha) y los eventos del sistema (reserva, pago, check-in) como líneas centradas entre los mensajes. Cada mensaje es un ChatBubble; la caja de respuesta va debajo (MessageComposer). Baja solo al último mensaje cuando llega uno nuevo.', en: 'One whole conversation, oldest at the top and newest at the bottom, with day separators (Today · Yesterday · date) and system events (booking, payment, check-in) as centered lines between messages. Each message is a ChatBubble; the reply box goes underneath (MessageComposer). Scrolls to the newest message when one arrives.' },
  props: [
    { name: 'messages', type: 'MessageLogRow[]', required: true, description: { es: 'Filas de message_log de una persona.', en: 'One person’s message_log rows.' } },
    { name: 'events', type: '{ id, at, kind, title, meta? }[]', description: { es: 'Eventos del sistema intercalados por fecha.', en: 'System events merged by date.' } },
    { name: 'authorOf', type: '(userId) => string | undefined', description: { es: 'Nombre y rol de quien escribió una fila saliente.', en: 'Name and role of whoever wrote an outbound row.' } },
    { name: 'personName', type: 'string', description: { es: 'Autor de las filas entrantes.', en: 'Author of inbound rows.' } },
    { name: 'scroll', type: 'boolean', default: 'false', description: { es: 'Altura fija con scroll propio (bandeja) en vez de crecer con la página (CRM).', en: 'Fixed height with its own scroll (inbox) instead of growing with the page (CRM).' } },
  ],
  states: ['default', 'empty', 'with system events', 'scrolling pane', 'unread inbound'],
  usages: [{ title: { es: 'Hilo con nota, automatización y evento', en: 'Thread with a note, an automation and an event' }, render: () => h(MessageThread, {
    personName: 'Juliana Ospina', authorOf: () => 'Camilo Duque · Recepción', autoScroll: false,
    events: [{ id: 'e1', at: d(26), kind: 'booking', title: 'Check-in · Hot Vinyasa', meta: 'membership' }],
    messages: [
      msg('1', 27, { direction: 'outbound', source: 'automation', status: 'read', body: 'Hola Juliana, tu clase de Hot Vinyasa empieza a las 5:30 p. m.', template_key: 'class_reminder' }),
      msg('2', 3, { body: 'Hola! ¿El sábado sí hay hot yoga temprano?' }),
      msg('3', 2.9, { direction: 'outbound', status: 'read', sent_by: 'usr_desk', body: 'Sí: 6:30 a. m. con Isabela. ¿Te reservo?' }),
      msg('4', 2.8, { channel: 'note', direction: 'internal', status: 'sent', sent_by: 'usr_desk', body: 'Prefiere primera fila, cerca del ventilador.' }),
      msg('5', 0.5, { body: '¿Me cambias la de mañana a la de 5:30 p. m.?', read_at: null, read_by: null }),
    ],
  }) }],
  a11y: [{ es: 'role=log con aria-label; separadores y eventos son texto; la hora de cada evento es <time dateTime>.', en: 'role=log with an aria-label; separators and events are text; each event’s time is a <time dateTime>.' }],
  usedBy: ['M-06', 'S-06'],
});
