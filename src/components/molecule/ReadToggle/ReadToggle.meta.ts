import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { ReadToggle } from './ReadToggle';

const LABELS = { mark: 'Marcar como leído', unmark: 'Marcar como no leído', newVersion: 'Hay una versión nueva' };
const noop = () => undefined;

export default defineMeta({
  tier: 'molecule', name: 'ReadToggle',
  description: {
    es: 'El estado de lectura de un capítulo como interruptor: sin leer, un botón principal «Marcar como leído»; leído, la fecha con un check y un botón outline «Marcar como no leído». Va en la cabecera del capítulo y en su pie (ChapterFoot).',
    en: 'A chapter’s read state as a toggle: unread, one primary "Mark as read"; read, the date with a check and an outline "Mark as unread". It sits in the chapter head and in its foot (ChapterFoot).',
  },
  props: [
    { name: 'state', type: "'unread' | 'read' | 'outdated'", required: true, description: { es: 'outdated = leído en una versión anterior: muestra «Hay una versión nueva» y ambos botones.', en: 'outdated = read in an earlier version: shows "There is a new version" and both buttons.' } },
    { name: 'readLabel', type: 'string', description: { es: 'La línea de leído ya formateada («Leído el 30 sep»).', en: 'The read line, already formatted ("Read on Sep 30").' } },
    { name: 'labels', type: '{ mark, unmark, newVersion }', required: true, description: { es: 'Textos de los botones y del aviso, desde useT().', en: 'Button and notice copy, from useT().' } },
    { name: 'onMark', type: '() => void', required: true, description: { es: 'Marca como leído (manual.markRead).', en: 'Marks as read (manual.markRead).' } },
    { name: 'onUnmark', type: '() => void', required: true, description: { es: 'Vuelve a sin leer (manual.markUnread).', en: 'Back to unread (manual.markUnread).' } },
    { name: 'busy', type: "'mark' | 'unmark'", description: { es: 'La escritura en curso: spinner en ese botón, el otro deshabilitado.', en: 'The write in flight: spinner on that button, the other disabled.' } },
  ],
  states: ['unread', 'read', 'outdated (new version)', 'hover', 'focus', 'loading (marking)', 'loading (unmarking)', 'disabled (other write running)'],
  usages: [
    { title: { es: 'Sin leer', en: 'Unread' }, render: () => h(ReadToggle, { state: 'unread', labels: LABELS, onMark: noop, onUnmark: noop }) },
    { title: { es: 'Leído', en: 'Read' }, render: () => h(ReadToggle, { state: 'read', readLabel: 'Leído el 30 sep', labels: LABELS, onMark: noop, onUnmark: noop }) },
    { title: { es: 'Versión nueva', en: 'New version' }, render: () => h(ReadToggle, { state: 'outdated', readLabel: 'Leído el 12 sep', labels: LABELS, onMark: noop, onUnmark: noop }) },
    { title: { es: 'Guardando', en: 'Saving' }, render: () => h('div', { className: 'stack-sm' }, h(ReadToggle, { state: 'unread', labels: LABELS, onMark: noop, onUnmark: noop, busy: 'mark' }), h(ReadToggle, { state: 'read', readLabel: 'Leído el 30 sep', labels: LABELS, onMark: noop, onUnmark: noop, busy: 'unmark' })) },
  ],
  a11y: [
    { es: 'Dos botones de 44 px con texto (no un switch sin nombre): el estado se lee en palabras y la acción contraria se nombra.', en: 'Two 44 px buttons with text (not an unnamed switch): the state reads in words and the opposite action is named.' },
    { es: 'La línea «Leído el …» es role="status", así el cambio se anuncia al marcar o desmarcar.', en: 'The "Read on …" line is role="status", so the change is announced when marking or unmarking.' },
  ],
  usedBy: ['K-03'],
});
