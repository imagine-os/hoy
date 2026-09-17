import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { TopBar } from './TopBar';
import { LangToggle } from '../../molecule/LangToggle/LangToggle';
import { NotificationBell } from '../../molecule/NotificationBell/NotificationBell';
import { GlobalSearch } from '../../molecule/GlobalSearch/GlobalSearch';
import { Avatar } from '../../atom/Avatar/Avatar';

const searchDemo = [{ id: 'd1', group: 'Páginas / Pages', label: 'Panel', hint: 'M-01', to: '/admin' }];

export default defineMeta({
  tier: 'organism', name: 'TopBar',
  description: { es: 'Barra superior: slot inicial (menú), logo o título con chip de código, slot central (búsqueda global) y acciones. Crema al 90 % con el capilar azul, pegajosa.', en: 'Top bar: leading slot (menu), wordmark or title with a code chip, a middle slot (global search) and actions. Cream at 90 % with the blue hairline, sticky.' },
  props: [
    { name: 'title', type: 'ReactNode', description: { es: 'Título (h1 solo, o nombre de página junto al logo).', en: 'Title (a lone h1, or the page name beside the wordmark).' } },
    { name: 'brand', type: 'boolean', description: { es: 'Muestra el wordmark.', en: 'Shows the wordmark.' } },
    { name: 'back', type: 'string', description: { es: 'Ruta del botón atrás.', en: 'Back button route.' } },
    { name: 'leading', type: 'ReactNode', description: { es: 'Antes del logo: el botón de colapsar/abrir el sidebar.', en: 'Before the wordmark: the sidebar collapse/open button.' } },
    { name: 'code', type: 'string', description: { es: 'Código de spec en un chip pequeño.', en: 'Spec code in a small chip.' } },
    { name: 'center', type: 'ReactNode', description: { es: 'Zona central (GlobalSearch).', en: 'Middle zone (GlobalSearch).' } },
    { name: 'actions', type: 'ReactNode', description: { es: 'Zona derecha.', en: 'Right side.' } },
  ],
  states: ['title', 'brand', 'with-back', 'admin (brand + page + code + search + actions)', '≤900 px (sin título ni código)', '≤640 px (sin búsqueda)'],
  usages: [
    { title: { es: 'Dos variantes', en: 'Two variants' }, render: () => (h('div', { className: 'stack-sm' }, h(TopBar, { brand: true, sticky: false, actions: h('div', { className: 'row' }, h(LangToggle, { size: 'sm' }), h(Avatar, { name: 'Juliana Ospina', size: 28 })) }), h(TopBar, { title: 'Horario', back: '/app', sticky: false }))) },
    { title: { es: 'Barra de admin', en: 'Admin bar' }, render: () => h(TopBar, { brand: true, sticky: false, title: 'Panel', code: 'M-01', leading: h('button', { type: 'button', className: 'topbar-lead', 'aria-label': 'Menu' }, '☰'), center: h(GlobalSearch, { items: searchDemo, shortcut: null }), actions: h('div', { className: 'row' }, h(LangToggle, { size: 'sm' }), h(NotificationBell, { count: 2 }), h(Avatar, { name: 'Justin', size: 28 })) }) },
  ],
  a11y: [
    { es: 'El título solo es h1; junto al logo es texto (la página mantiene su propio h1).', en: 'A lone title is an h1; beside the wordmark it is plain text (the page keeps its own h1).' },
    { es: 'El botón atrás y el de menú tienen aria-label.', en: 'The back and menu buttons have aria-labels.' },
  ],
  usedBy: ['PhoneShell', 'DesktopShell', 'P-*'],
});
