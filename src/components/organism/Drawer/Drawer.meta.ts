import { createElement as h, useState } from 'react';
import { defineMeta } from '../../../design/meta';
import { Drawer } from './Drawer';
import { Button } from '../../atom/Button/Button';
import { useI18n } from '../../../i18n/I18nProvider';

function Demo() {
  const [open, setOpen] = useState(false);
  return h('div', null, h(Button, { variant: 'secondary', onClick: () => setOpen(true) }, 'Abrir drawer'), h(Drawer, { open, onClose: () => setOpen(false), title: 'Detalle', footer: h(Button, { onClick: () => setOpen(false) }, 'Listo') }, h('p', null, 'Contenido del panel. Escape o el fondo lo cierran.')));
}

function DemoBottom() {
  const [open, setOpen] = useState(false);
  return h('div', null, h(Button, { variant: 'secondary', onClick: () => setOpen(true) }, 'Abrir hoja'), h(Drawer, { open, onClose: () => setOpen(false), side: 'bottom', title: 'Confirmar' }, h('p', null, 'Hoja inferior en el teléfono; diálogo centrado desde 900 px.')));
}

function DemoKeyboardRecovery() {
  const { bi } = useI18n();
  const [open, setOpen] = useState(false), [waiting, setWaiting] = useState(false);
  return h('div', null,
    h(Button, { variant: 'secondary', onClick: () => { setWaiting(false); setOpen(true); } }, bi({ es: 'Abrir prueba de teclado', en: 'Open keyboard test' })),
    h(Drawer, { open, onClose: () => setOpen(false), title: bi({ es: 'Recuperar el foco', en: 'Recover focus' }), side: 'bottom' },
      h('p', null, bi({ es: 'Activa la acción: se reemplaza por un control deshabilitado. Escape sigue cerrando; Tab recupera el foco dentro.', en: 'Activate the action: a disabled control replaces it. Escape still closes the drawer; Tab restores focus inside.' })),
      h(Button, { key: waiting ? 'waiting' : 'ready', disabled: waiting, onClick: () => setWaiting(true) }, waiting ? bi({ es: 'Esperando', en: 'Waiting' }) : bi({ es: 'Deshabilitar acción enfocada', en: 'Disable focused action' }))));
}

export default defineMeta({
  tier: 'organism', name: 'Drawer',
  description: { es: 'Panel deslizante (derecha, izquierda o abajo) en portal, con cabecera, cuerpo desplazable y pie.', en: 'Slide-over panel (right, left or bottom) in a portal, with header, scrollable body and footer.' },
  props: [
    { name: 'open / onClose', type: 'boolean / () => void', required: true, description: { es: 'Control.', en: 'Control.' } },
    { name: 'side', type: "'right' | 'left' | 'bottom'", default: 'right', description: { es: 'Lado de entrada.', en: 'Entry side.' } },
    { name: 'width', type: 'number', default: '420', description: { es: 'Ancho en px (lados).', en: 'Width in px (sides).' } },
    { name: 'title / footer', type: 'ReactNode', description: { es: 'Cabecera y pie.', en: 'Header and footer.' } },
    { name: 'desktop', type: "'dialog' | 'sheet'", default: 'dialog', description: { es: 'Cómo se ve una hoja inferior desde 900 px: diálogo centrado o hoja completa.', en: 'How a bottom sheet renders from 900 px: centred dialog or full-width sheet.' } },
  ],
  states: ['closed (no keyboard handler retained)', 'open', 'accessible title', 'mobile-fullwidth', 'bottom-sheet (< 900 px)', 'desktop-dialog (≥ 900 px)', 'focus-trapped (Tab cycles inside)', 'escaped focus after disabled/replaced control (Escape and Tab recover)', 'nested innermost-only keyboard and pointer layer (including initial nested open)', 'latest callback without refocus', 'nested unmount restores original opener and scroll state', 'scroll-locked (body does not scroll behind the overlay)'],
  usages: [{ title: { es: 'Interactivo', en: 'Interactive' }, render: () => h(Demo) }, { title: { es: 'Hoja / diálogo (side="bottom")', en: 'Sheet / dialog (side="bottom")' }, render: () => h(DemoBottom) }, { title: { es: 'Teclado tras perder el foco', en: 'Keyboard after focus escapes' }, render: () => h(DemoKeyboardRecovery) }],
  a11y: [{ es: 'role="dialog" aria-modal; el foco entra al abrir, queda atrapado (Tab / Shift+Tab recuperan el foco perdido) y vuelve al disparador al cerrar; Escape cierra solo el diálogo más interno aunque el foco llegue al documento. Se respetan teclas consumidas por los hijos; el documento no se desplaza detrás.', en: 'role="dialog" aria-modal; focus enters on open, Tab / Shift+Tab recover escaped focus and return it to the trigger on close; Escape closes only the innermost dialog even when focus reaches the document. Keys consumed by descendants are respected; the document does not scroll behind it.' }],
  usedBy: ['M-08a', 'M-09b', 'C-23', 'M-04', 'M-18', 'ProblemReport', 'S-09', 'M-14', 'M-03', 'InspectorPanel', 'C-02', 'C-04', 'C-06', 'C-08b', 'W-04', 'M-08g', 'D-07', 'W-11'],
});
