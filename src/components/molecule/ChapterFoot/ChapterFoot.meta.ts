import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { ChapterFoot } from './ChapterFoot';
import { ReadToggle } from '../ReadToggle/ReadToggle';
import { Icon } from '../../atom/Icon/Icon';

const LABELS = { mark: 'Marcar como leído', unmark: 'Marcar como no leído', newVersion: 'Hay una versión nueva' };
const noop = () => undefined;
const NEXT = { to: '/manual/05-clases-y-horarios', label: 'Siguiente', title: '05 · Clases y horarios', icon: h(Icon, { name: 'calendar', size: 16 }) };

export default defineMeta({
  tier: 'molecule', name: 'ChapterFoot',
  description: {
    es: 'La tarjeta delgada al final del cuerpo de un capítulo del manual: «¿Terminaste este capítulo?», el ReadToggle y el enlace al siguiente capítulo de la lista del rol. Solo para roles del equipo.',
    en: 'The slim card at the end of a manual chapter body: "Done with this chapter?", the ReadToggle and a link to the next chapter of the role’s list. Team roles only.',
  },
  props: [
    { name: 'title', type: 'string', required: true, description: { es: 'La pregunta («¿Terminaste este capítulo?»).', en: 'The question ("Done with this chapter?").' } },
    { name: 'children', type: 'ReactNode', required: true, description: { es: 'El ReadToggle.', en: 'The ReadToggle.' } },
    { name: 'next', type: '{ to, label, title, icon? }', description: { es: 'El siguiente capítulo de la lista del lector; sin él no hay enlace.', en: 'The next chapter of the reader’s list; without it there is no link.' } },
  ],
  states: ['unread', 'read', 'no next chapter (last in the list)', 'link hover', 'link focus', 'narrow (stacked, link left-aligned)'],
  usages: [
    { title: { es: 'Sin leer, con siguiente', en: 'Unread, with next' }, render: () => h(ChapterFoot, { title: '¿Terminaste este capítulo?', next: NEXT }, h(ReadToggle, { state: 'unread', labels: LABELS, onMark: noop, onUnmark: noop })) },
    { title: { es: 'Leído', en: 'Read' }, render: () => h(ChapterFoot, { title: '¿Terminaste este capítulo?', next: NEXT }, h(ReadToggle, { state: 'read', readLabel: 'Leído el 30 sep', labels: LABELS, onMark: noop, onUnmark: noop })) },
    { title: { es: 'Último de la lista', en: 'Last in the list' }, render: () => h(ChapterFoot, { title: '¿Terminaste este capítulo?' }, h(ReadToggle, { state: 'unread', labels: LABELS, onMark: noop, onUnmark: noop })) },
  ],
  a11y: [
    { es: 'Es una región con nombre (la pregunta); el enlace al siguiente mide 44 px de alto y tiene foco visible.', en: 'A named region (the question); the next link is 44 px tall with a visible focus ring.' },
    { es: 'Orden de foco: marcar / desmarcar → siguiente capítulo → pedir un cambio.', en: 'Focus order: mark / unmark → next chapter → request a change.' },
  ],
  usedBy: ['K-03'],
});
