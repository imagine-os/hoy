import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { Button } from '../../atom/Button/Button';
import { PartySummary } from './PartySummary';

export default defineMeta({
  tier: 'molecule', name: 'PartySummary',
  description: { es: 'Un pase grupal en la lista de una clase: cuántos lugares tienen nombre, las personas y, mientras quedan lugares, la acción para agregar a alguien.', en: 'A group pass in a class roster: how many places have a name, the people, and, while places are left, the action to add someone.' },
  props: [
    { name: 'title', type: 'string', required: true, description: { es: 'Pase grupal y quién lo reservó.', en: 'Group pass and who booked it.' } },
    { name: 'namedLabel', type: 'string', required: true, description: { es: '«N de X lugares con nombre».', en: '“N of X places named”.' } },
    { name: 'full', type: 'boolean', required: true, description: { es: 'Todos los lugares tienen nombre.', en: 'Every place has a name.' } },
    { name: 'children', type: 'ReactNode', description: { es: 'Las personas del grupo.', en: 'The people in the group.' } },
    { name: 'actions', type: 'ReactNode', description: { es: 'Agregar una persona.', en: 'Add a person.' } },
  ],
  states: ['places left', 'full', 'read only (no actions)'],
  usages: [
    { title: { es: 'Con lugares libres', en: 'With places left' }, render: () => h(PartySummary, { title: 'Pase grupal · Persona Ficticia', namedLabel: '2 de 4 lugares con nombre', full: false, actions: h(Button, { size: 'sm', variant: 'outline' }, 'Agregar persona') }, h('p', { className: 'small' }, 'Persona Ficticia · Amiga Ficticia')) },
    { title: { es: 'Completo', en: 'Full' }, render: () => h(PartySummary, { title: 'Group pass · Fictional Person', namedLabel: '4 of 4 places named', full: true }, h('p', { className: 'small' }, 'Four fictional people')) },
  ],
  a11y: [{ es: 'El estado se lee como texto («N de X»), no solo por el color de la insignia.', en: 'The state reads as text (“N of X”), not by the badge colour alone.' }],
  usedBy: ['S-02'],
});
