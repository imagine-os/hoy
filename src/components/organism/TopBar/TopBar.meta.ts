import { createElement as h } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { defineMeta } from '../../../design/meta';
import { TopBar } from './TopBar';
import { LangToggle } from '../../molecule/LangToggle/LangToggle';
import { Avatar } from '../../atom/Avatar/Avatar';

export default defineMeta({
  tier: 'organism', name: 'TopBar',
  description: { es: 'Barra superior con título o logo, botón atrás y acciones. Fondo translúcido y pegajoso.', en: 'Top bar with title or wordmark, back button and actions. Translucent, sticky.' },
  props: [
    { name: 'title', type: 'ReactNode', description: { es: 'Título (h1).', en: 'Title (h1).' } },
    { name: 'brand', type: 'boolean', description: { es: 'Muestra el wordmark en vez del título.', en: 'Shows the wordmark instead of the title.' } },
    { name: 'back', type: 'string', description: { es: 'Ruta del botón atrás.', en: 'Back button route.' } },
    { name: 'actions', type: 'ReactNode', description: { es: 'Zona derecha.', en: 'Right side.' } },
  ],
  states: ['title', 'brand', 'with-back'],
  usages: [{ title: { es: 'Dos variantes', en: 'Two variants' }, render: () => h(MemoryRouter, null, h('div', { className: 'stack-sm' }, h(TopBar, { brand: true, sticky: false, actions: h('div', { className: 'row' }, h(LangToggle, { size: 'sm' }), h(Avatar, { name: 'Juliana Ospina', size: 28 })) }), h(TopBar, { title: 'Horario', back: '/app', sticky: false }))) }],
  a11y: [{ es: 'Título en h1; el botón atrás tiene aria-label.', en: 'Title is an h1; back button has aria-label.' }],
  usedBy: ['PhoneShell', 'DesktopShell', 'P-*'],
});
