import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { LotList } from './LotList';

export default defineMeta({
  tier: 'molecule', name: 'LotList',
  description: { es: 'Los lotes de clases vivos del cliente, uno por línea: de dónde vienen (paquete comprado, prueba, regalo, cortesía) y cuántas clases quedan hasta cuándo, o "sin vencimiento" (PRO-06).', en: 'The customer\'s live class lots, one per line: where they come from (bought pack, trial, gift, courtesy) and how many classes are left until when, or "no expiry" (PRO-06).' },
  props: [
    { name: 'lots', type: '{ id, title, detail, source? }[]', required: true, description: { es: 'Ya traducidos y con fechas formateadas. Lista vacía: no se muestra nada.', en: 'Already translated, dates formatted. Empty list: nothing renders.' } },
    { name: 'label', type: 'string', description: { es: 'Nombre accesible de la lista.', en: 'Accessible name of the list.' } },
  ],
  states: ['default', 'one lot', 'no expiry', 'long name', 'empty'],
  usages: [
    { title: { es: 'Varios lotes', en: 'Several lots' }, render: () => h(LotList, { label: 'Tus clases', lots: [
      { id: 'a', source: 'trial', title: 'Clase de prueba', detail: '1 clase · vence el 20 nov' },
      { id: 'b', source: 'purchase', title: 'Paquete comprado', detail: '11 clases · vence el 31 dic' },
      { id: 'c', source: 'courtesy', title: 'Cortesía', detail: '2 clases · sin vencimiento' },
    ] }) },
    { title: { es: 'Un lote, nombre largo', en: 'One lot, long name' }, render: () => h('div', { style: { maxWidth: 280 } }, h(LotList, { lots: [{ id: 'x', source: 'gift', title: 'Regalo de una persona con un nombre muy largo', detail: '4 clases · vence el 15 ene 2027' }] })) },
  ],
  a11y: [{ es: 'Lista nativa (ul/li) con nombre accesible; el texto es texto real.', en: 'Native list (ul/li) with an accessible name; the text is real text.' }],
  usedBy: ['C-01', 'C-07b'],
});
