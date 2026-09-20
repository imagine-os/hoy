import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { Icon, ICON_NAMES } from './Icon';

export default defineMeta({
  tier: 'atom', name: 'Icon',
  description: {
    es: 'Set de iconos de trazo en línea (29 nombres, rejilla 24×24, currentColor). Sin dependencia ni fuente de iconos: reemplaza los glifos literales (◎ ✦ ▦) que se dibujan distinto en cada sistema.',
    en: 'Inline stroke icon set (29 names, 24×24 grid, currentColor). No dependency and no icon font: it replaces the literal glyphs (◎ ✦ ▦) that draw differently on every platform.',
  },
  props: [
    { name: 'name', type: 'IconName', required: true, description: { es: 'Nombre del glifo.', en: 'Glyph name.' } },
    { name: 'size', type: 'number', default: '20', description: { es: 'Lado en px. El objetivo de 44 px lo da el botón, no el glifo.', en: 'Side in px. The 44 px target comes from the button, not the glyph.' } },
    { name: 'strokeWidth', type: 'number', default: '1.6', description: { es: 'Grosor del trazo.', en: 'Stroke width.' } },
    { name: 'title', type: 'string', description: { es: 'Solo cuando el icono significa algo por sí solo; si no, queda aria-hidden.', en: 'Only when the icon means something on its own; otherwise it stays aria-hidden.' } },
  ],
  states: ['default', 'con título (role=img)', 'decorativo (aria-hidden)'],
  usages: [
    { title: { es: 'Todo el set', en: 'The whole set' }, render: () => h('div', { className: 'row wrap' }, ...ICON_NAMES.map((n) => h('span', { key: n, className: 'row', style: { gap: 4 } }, h(Icon, { name: n }), h('code', { className: 'xs muted' }, n)))) },
    { title: { es: 'Tamaños', en: 'Sizes' }, render: () => h('div', { className: 'row wrap' }, h(Icon, { name: 'sparkle', size: 16 }), h(Icon, { name: 'sparkle', size: 24 }), h(Icon, { name: 'sparkle', size: 40, strokeWidth: 1.2 })) },
  ],
  a11y: [
    { es: 'Decorativo por defecto (aria-hidden, focusable="false"); con `title` pasa a role="img" con nombre accesible.', en: 'Decorative by default (aria-hidden, focusable="false"); with `title` it becomes role="img" with an accessible name.' },
    { es: 'Hereda color con currentColor, así que el contraste lo fija el contenedor.', en: 'Inherits colour through currentColor, so the container sets the contrast.' },
  ],
  usedBy: ['HUB-01', 'D-05', 'D-06'],
});
