import { createElement as h, useState } from 'react';
import { defineMeta } from '../../../design/meta';
import { Drawer } from './Drawer';
import { Button } from '../../atom/Button/Button';

function Demo() {
  const [open, setOpen] = useState(false);
  return h('div', null, h(Button, { variant: 'secondary', onClick: () => setOpen(true) }, 'Abrir drawer'), h(Drawer, { open, onClose: () => setOpen(false), title: 'Detalle', footer: h(Button, { onClick: () => setOpen(false) }, 'Listo') }, h('p', null, 'Contenido del panel. Escape o el fondo lo cierran.')));
}

export default defineMeta({
  tier: 'organism', name: 'Drawer',
  description: { es: 'Panel deslizante (derecha, izquierda o abajo) en portal, con cabecera, cuerpo desplazable y pie.', en: 'Slide-over panel (right, left or bottom) in a portal, with header, scrollable body and footer.' },
  props: [
    { name: 'open / onClose', type: 'boolean / () => void', required: true, description: { es: 'Control.', en: 'Control.' } },
    { name: 'side', type: "'right' | 'left' | 'bottom'", default: 'right', description: { es: 'Lado de entrada.', en: 'Entry side.' } },
    { name: 'width', type: 'number', default: '420', description: { es: 'Ancho en px (lados).', en: 'Width in px (sides).' } },
    { name: 'title / footer', type: 'ReactNode', description: { es: 'Cabecera y pie.', en: 'Header and footer.' } },
  ],
  states: ['closed', 'open', 'mobile-fullwidth'],
  usages: [{ title: { es: 'Interactivo', en: 'Interactive' }, render: () => h(Demo) }],
  a11y: [{ es: 'role="dialog" aria-modal; foco entra al abrir y vuelve al cerrar; Escape cierra.', en: 'role="dialog" aria-modal; focus enters on open and returns on close; Escape closes.' }],
  usedBy: ['M-03', 'InspectorPanel', 'C-08b'],
});
