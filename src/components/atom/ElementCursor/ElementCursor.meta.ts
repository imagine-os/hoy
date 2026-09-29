import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { ElementCursor } from './ElementCursor';
export default defineMeta({
  tier: 'atom', name: 'ElementCursor',
  description: { es: 'Cursor del sitio: punto de tinta y anillo azul que se abre sobre enlaces y botones', en: 'Site cursor: ink dot and blue ring that opens on links and buttons' },
  props: [{ name: 'enabled', type: 'boolean', default: 'true', description: { es: 'SiteShell lo activa solo en la edición Santuario con el movimiento encendido.', en: 'SiteShell turns it on only for the Sanctuary edition with motion on.' } }],
  states: ['default', 'over interactive (ring 40 px)', 'pressed (ring 22 px)', 'over text (ring hidden)', 'tone hint', 'hidden: touch, reduced motion, text fields'],
  usages: [{ title: { es: 'Vista previa (mueve el ratón sobre la página)', en: 'Preview (move the mouse over the page)' }, render: () => h(ElementCursor, { enabled: true }) }],
  a11y: [
    { es: 'Decorativo (aria-hidden); el cursor nativo vuelve en campos de texto, con teclado (Tab), táctil y movimiento reducido.', en: 'Decorative (aria-hidden); the native cursor returns in text fields, on keyboard use (Tab), touch and reduced motion.' },
    { es: 'Solo tokens del tema: tinta y azul primario en claro y oscuro, con un filo del color de superficie para separarse del fondo.', en: 'Theme tokens only: ink and primary blue in light and dark, with a surface-coloured hairline to separate it from the background.' },
  ],
  usedBy: ['W-01', 'W-02', 'W-03', 'W-04', 'W-05', 'W-06', 'W-07', 'W-08', 'W-09', 'P-01', 'A-06'],
});
