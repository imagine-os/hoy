import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { MessageComposer } from './MessageComposer';

export default defineMeta({
  tier: 'molecule', name: 'MessageComposer',
  description: { es: 'La caja de respuesta bajo una conversación: WhatsApp · Email · Nota en un segmentado, asunto cuando es email, texto y botón de enviar (Ctrl+Enter). WhatsApp se bloquea con aviso cuando el número no está verificado; en horario silencioso avisa que queda en cola; la pestaña Nota se pinta de amarillo porque la persona nunca la ve. El envío real lo hace quien la usa (useMessaging()).', en: 'The reply box under a conversation: WhatsApp · Email · Note in a segmented control, a subject when it is an email, the text and a send button (Ctrl+Enter). WhatsApp locks with a hint when the number is unverified; during quiet hours it warns the message is queued; the Note tab turns yellow because the member never sees it. The actual send is the caller’s (useMessaging()).' },
  props: [
    { name: 'onSend', type: '({ channel, subject?, text }) => Promise<unknown> | void', required: true, description: { es: 'Se limpia solo cuando la promesa resuelve.', en: 'Clears itself when the promise resolves.' } },
    { name: 'channels', type: "('whatsapp' | 'email' | 'note')[]", default: 'whatsapp, email, note', description: { es: 'Pestañas ofrecidas.', en: 'Tabs offered.' } },
    { name: 'whatsappBlocked', type: 'string', description: { es: 'Motivo por el que no se puede enviar WhatsApp (número sin verificar).', en: 'Why WhatsApp cannot be sent (unverified number).' } },
    { name: 'quietUntil', type: 'string', description: { es: 'Hora en que termina el horario silencioso; muestra el aviso de cola.', en: 'When quiet hours end; shows the queue hint.' } },
    { name: 'readOnly', type: 'boolean', default: 'false', description: { es: 'El rol lee pero no escribe.', en: 'The role reads but cannot write.' } },
    { name: 'author', type: 'string', description: { es: 'Quién firma, junto al botón.', en: 'Who signs, next to the button.' } },
  ],
  states: ['whatsapp', 'email (subject field)', 'note (yellow)', 'whatsapp blocked (unverified)', 'quiet hours hint', 'read-only', 'sending'],
  usages: [
    { title: { es: 'Recepción respondiendo', en: 'Front desk replying' }, render: () => h(MessageComposer, { onSend: () => new Promise<void>((r) => setTimeout(r, 400)), author: 'Camilo Duque · Recepción' }) },
    { title: { es: 'Número sin verificar + horario silencioso', en: 'Unverified number + quiet hours' }, render: () => h(MessageComposer, { onSend: () => {}, whatsappBlocked: 'Número sin verificar: podría no entregarse', quietUntil: '07:00' }) },
    { title: { es: 'Solo lectura', en: 'Read-only' }, render: () => h(MessageComposer, { onSend: () => {}, readOnly: true }) },
  ],
  a11y: [{ es: 'El segmentado es un tablist con aria-label; asunto y texto llevan aria-label; el botón se deshabilita hasta que haya texto (y asunto en email).', en: 'The segmented control is a labelled tablist; subject and text carry aria-labels; the button stays disabled until there is text (and a subject for email).' }],
  usedBy: ['M-06', 'S-06'],
});
