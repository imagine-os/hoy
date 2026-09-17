import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { GlobalSearch } from './GlobalSearch';

const demo = [
  { id: 'r1', group: 'Páginas / Pages', label: 'Panel', hint: 'M-01', to: '/admin' },
  { id: 'r2', group: 'Páginas / Pages', label: 'Ajustes · Funciones', hint: 'M-08b', to: '/admin/settings/features' },
  { id: 'p1', group: 'Personas / People', label: 'Juliana Ospina', hint: 'juliana@ejemplo.co', to: '/admin/crm' },
];

export default defineMeta({
  tier: 'molecule', name: 'GlobalSearch',
  description: { es: 'Campo de búsqueda global de la barra superior: busca rutas (nombre y código) y personas, se enfoca con “/”, se navega con ↑↓ y Enter.', en: 'Top-bar global search: searches routes (name and code) and people, focused with “/”, moved with ↑↓ and Enter.' },
  props: [
    { name: 'items', type: 'SearchItem[]', required: true, description: { es: '{ id, group, label, hint?, to } — el shell los arma con las rutas y profiles.', en: '{ id, group, label, hint?, to } — the shell builds them from routes and profiles.' } },
    { name: 'max', type: 'number', default: '8', description: { es: 'Máximo de resultados.', en: 'Maximum results shown.' } },
    { name: 'shortcut', type: "string | null", default: "'/'", description: { es: 'Tecla de foco; null lo desactiva.', en: 'Focus key; null disables it.' } },
  ],
  states: ['empty (placeholder + tecla /)', 'focus', 'typing con resultados', 'sin resultados', 'resultado activo (teclado o hover)'],
  usages: [{ title: { es: 'Escribe “aj” o “Juliana”', en: 'Type “set” or “Juliana”' }, render: () => h('div', { style: { maxWidth: 420 } }, h(GlobalSearch, { items: demo })) }],
  a11y: [
    { es: 'role="search" con label oculto; el panel es role="listbox" y cada fila role="option" con aria-selected.', en: 'role="search" with a hidden label; the panel is role="listbox" and each row is role="option" with aria-selected.' },
    { es: 'El atajo “/” se ignora cuando el foco está en un campo de texto.', en: 'The “/” shortcut is ignored while focus is in a text field.' },
  ],
  usedBy: ['DesktopShell', 'M-*', 'S-*', 'D-*'],
});
