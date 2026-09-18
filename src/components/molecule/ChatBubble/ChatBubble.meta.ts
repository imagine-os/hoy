import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { ChatBubble } from './ChatBubble';
import { MS } from '../../../i18n/format';

const d = (h: number) => new Date(Date.now() - h * MS.hour).toISOString();

export default defineMeta({
  tier: 'molecule', name: 'ChatBubble',
  description: { es: 'Un mensaje de la conversación con una persona. WhatsApp y push son burbujas (la persona a la izquierda, el estudio a la derecha en amarillo; las automatizaciones en gris punteado); los emails son tarjetas con asunto e insignia de origen (Newsletter · Automático · Manual); las notas internas son la tarjeta amarilla punteada que la persona nunca ve. El estado sale de la fila (entregado, leído, en cola, fallido).', en: 'One message in a conversation with a person. WhatsApp and push are bubbles (member left, studio right in yellow; automations in dashed grey); emails are cards with a subject line and a source badge (Newsletter · Automated · Manual); internal notes are the dashed yellow card the member never sees. Status comes from the row (delivered, read, queued, failed).' },
  props: [
    { name: 'direction', type: "'inbound' | 'outbound' | 'internal'", required: true, description: { es: 'Lado de la burbuja; internal = nota.', en: 'Bubble side; internal = note.' } },
    { name: 'channel', type: "'whatsapp' | 'email' | 'push' | 'note'", required: true, description: { es: 'Glifo y forma (burbuja, tarjeta, nota).', en: 'Glyph and shape (bubble, card, note).' } },
    { name: 'text / subject', type: 'string | null', description: { es: 'Cuerpo y, en email, asunto.', en: 'Body and, for email, subject.' } },
    { name: 'status', type: "'received' | 'queued' | 'sent' | 'delivered' | 'read' | 'failed'", description: { es: 'Insignia de estado (sent y read no se repiten; queued y failed siempre).', en: 'Status badge (sent and read stay quiet; queued and failed always show).' } },
    { name: 'author', type: 'string', description: { es: '“Camilo Duque · Recepción”; sin autor, las automatizaciones muestran su origen.', en: '“Camilo Duque · Front desk”; without one, automations show their source.' } },
    { name: 'at', type: 'string (ISO)', required: true, description: { es: 'Hora en <time>.', en: 'Time in <time>.' } },
    { name: 'source', type: "'manual' | 'automation' | 'newsletter' | 'system'", default: 'manual', description: { es: 'Insignia en emails; gris punteado en burbujas.', en: 'Badge on emails; dashed grey on bubbles.' } },
    { name: 'unread', type: 'boolean', default: 'false', description: { es: 'Entrante sin leer por el equipo: anillo azul.', en: 'Inbound nobody on the team read yet: blue ring.' } },
  ],
  states: ['inbound (left)', 'outbound manual (right, yellow)', 'outbound automation (dashed)', 'email card + source badge', 'internal note', 'unread', 'queued', 'failed'],
  usages: [{ title: { es: 'Los cuatro tipos', en: 'The four kinds' }, render: () => h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
    h(ChatBubble, { direction: 'inbound', channel: 'whatsapp', text: 'Hola! ¿El sábado sí hay hot yoga temprano?', at: d(3), status: 'received', unread: true }),
    h(ChatBubble, { direction: 'outbound', channel: 'whatsapp', text: 'Sí: el sábado Hot Vinyasa es a las 6:30 a. m. con Isabela. ¿Te reservo?', at: d(2.9), status: 'delivered', author: 'Camilo Duque · Recepción' }),
    h(ChatBubble, { direction: 'outbound', channel: 'whatsapp', text: 'Hola Juliana, tu clase de Hot Vinyasa empieza a las 5:30 p. m.', at: d(2), status: 'read', source: 'automation' }),
    h(ChatBubble, { direction: 'outbound', channel: 'email', subject: 'Septiembre en HOY: horarios nuevos', text: 'Este mes abrimos Hot Vinyasa a las 6:30 a. m.…', at: d(30), status: 'read', source: 'newsletter' }),
    h(ChatBubble, { direction: 'internal', channel: 'note', text: 'Prefiere primera fila, cerca del ventilador.', at: d(1), author: 'Camilo Duque · Recepción' }),
    h(ChatBubble, { direction: 'outbound', channel: 'whatsapp', text: 'Te confirmo mañana temprano.', at: d(0.1), status: 'queued', author: 'Camilo Duque · Recepción' }),
  ) }],
  a11y: [{ es: 'Notas y emails son <article> con aria-label / encabezado; la hora es <time dateTime>; los glifos son decorativos.', en: 'Notes and emails are <article> with an aria-label / heading; time is <time dateTime>; glyphs are decorative.' }],
  usedBy: ['MessageThread', 'M-06', 'S-06'],
});
