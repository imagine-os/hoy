import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { ConversationList } from './ConversationList';
import { MS } from '../../../i18n/format';

const d = (hrs: number) => new Date(Date.now() - hrs * MS.hour).toISOString();

export default defineMeta({
  tier: 'organism', name: 'ConversationList',
  description: { es: 'El panel izquierdo de la bandeja (S-06): buscador, filtros Todos · No leídos · WhatsApp · Email y una fila por persona con avatar, nombre, último mensaje, hora relativa, glifo del canal y contador de no leídos. Los hilos con pendientes van primero; la fila seleccionada se marca con la barra azul. Las filas son enlaces: la URL es la selección.', en: 'The inbox’s left pane (S-06): search, filters All · Unread · WhatsApp · Email and one row per person with avatar, name, last message, relative time, channel glyph and unread count. Threads with something pending come first; the selected row gets the blue bar. Rows are links: the URL is the selection.' },
  props: [
    { name: 'conversations', type: '{ key, name, initials?, snippet, lastAt, unread, channel, channels?, searchText? }[]', required: true, description: { es: 'Una por persona (useConversations()).', en: 'One per person (useConversations()).' } },
    { name: 'selectedKey', type: 'string', description: { es: 'Fila activa.', en: 'Active row.' } },
    { name: 'linkTo', type: '(key) => string', required: true, description: { es: 'Destino de cada fila (/staff/inbox/:id).', en: 'Target of each row (/staff/inbox/:id).' } },
    { name: 'compact', type: 'boolean', default: 'false', description: { es: 'Sin buscador ni filtros (tarjeta de S-01).', en: 'No search or filters (S-01 card).' } },
    { name: 'limit', type: 'number', description: { es: 'Máximo de filas.', en: 'Max rows.' } },
  ],
  states: ['default', 'selected', 'unread rows first', 'filtered (unread / whatsapp / email)', 'search no match', 'empty', 'compact'],
  usages: [{ title: { es: 'Bandeja con tres hilos', en: 'Inbox with three threads' }, render: () => h(ConversationList, { selectedKey: 'usr_c01', linkTo: (k: string) => `#/staff/inbox/${k}`, conversations: [
    { key: 'usr_cust', name: 'Juliana Ospina', initials: 'JO', snippet: '¿Me cambias la reserva de mañana a la de 5:30 p. m.?', lastAt: d(1.5), unread: 2, channel: 'whatsapp', channels: ['whatsapp', 'email', 'note'] },
    { key: 'usr_c01', name: 'Camila García', initials: 'CG', snippet: 'Claro: Nequi, tarjeta, PSE o efectivo. Te esperamos', lastAt: d(29), unread: 0, channel: 'whatsapp' },
    { key: 'usr_c09', name: 'Gabriela Rojas', initials: 'GR', snippet: 'Re: Factura de mi membresía', lastAt: d(58), unread: 0, channel: 'email', channels: ['email'] },
  ] }) }],
  a11y: [{ es: 'Lista <ul> con aria-label; cada fila es un <a> con aria-current en la seleccionada; el buscador lleva aria-label; los filtros son un tablist.', en: '<ul> with an aria-label; each row is an <a> with aria-current on the selected one; the search has an aria-label; filters form a tablist.' }],
  usedBy: ['S-06'],
});
