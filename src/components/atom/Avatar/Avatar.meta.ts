import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { Avatar } from './Avatar';

export default defineMeta({
  tier: 'atom', name: 'Avatar',
  description: { es: 'Círculo con iniciales (tono derivado del nombre) o foto.', en: 'Circle with initials (hue derived from name) or photo.' },
  props: [
    { name: 'name', type: 'string', required: true, description: { es: 'Nombre completo (aria-label).', en: 'Full name (aria-label).' } },
    { name: 'initials', type: 'string', description: { es: 'Sobrescribe las iniciales calculadas.', en: 'Overrides computed initials.' } },
    { name: 'src', type: 'string | null', description: { es: 'Foto.', en: 'Photo.' } },
    { name: 'size', type: 'number', default: '36', description: { es: 'Píxeles.', en: 'Pixels.' } },
  ],
  states: ['initials', 'photo'],
  usages: [{ title: { es: 'Tamaños', en: 'Sizes' }, render: () => h('div', { className: 'row' }, h(Avatar, { name: 'Juliana Ospina', size: 28 }), h(Avatar, { name: 'Andrés Quintero' }), h(Avatar, { name: 'Sofía Arango', size: 56 })) }],
  a11y: [{ es: 'role="img" con aria-label = nombre.', en: 'role="img" with aria-label = name.' }],
  usedBy: ['C-01', 'S-01', 'HUB', 'TopBar'],
});
