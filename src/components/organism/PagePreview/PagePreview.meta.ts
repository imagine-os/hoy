import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { PagePreview, LivePreviewBudget } from './PagePreview';

export default defineMeta({
  tier: 'organism', name: 'PagePreview',
  description: {
    es: 'Cómo se ve una superficie, en tres capas: mosaico inactivo teñido por --hue (siempre), la captura real de docs/screenshots/<código>/thumb-* cuando existe, y la página en vivo dentro de un DeviceFrame cuando la tarjeta está en pantalla y el presupuesto de vistas en vivo le da un turno. El propio componente nunca arranca marcos si está enmarcado, con live=0 en la URL o bajo automatización: en esos casos se queda en la captura. Si la captura falta o falla, la capa se oculta sin imagen rota.',
    en: 'What a surface looks like, in three layers: a --hue-tinted idle tile (always), the real capture from docs/screenshots/<code>/thumb-* when one exists, and the live page in a DeviceFrame when the card is on screen and the live budget gives it a slot. The component itself never boots frames when it is framed, under live=0, or under automation — it stays on the capture. A missing or failed capture hides that layer instead of showing a broken image.',
  },
  props: [
    { name: 'code', type: 'string', required: true, description: { es: 'Código de página: nombra la carpeta de capturas y el turno en vivo.', en: 'Page code: names the capture folder and the live slot.' } },
    { name: 'route', type: 'string', required: true, description: { es: 'Ruta que carga la capa en vivo.', en: 'Route the live layer loads.' } },
    { name: 'shape', type: "'desktop' | 'phone'", default: 'desktop', description: { es: 'Proporción y captura: 16:10 o 390×844.', en: 'Ratio and capture: 16:10 or 390×844.' } },
    { name: 'live', type: 'boolean', default: 'false', description: { es: 'Pide subir a la página real. Se combina con liveFramesAllowed(): el componente nunca arranca marcos enmarcado, con live=0 o bajo automatización, aunque el llamador pase true.', en: 'Asks for the upgrade to the real page. ANDed with liveFramesAllowed(): the component never boots frames when framed, under live=0, or under automation, even if the caller passes true.' } },
    { name: 'order', type: 'number', default: '0', description: { es: 'Orden en el documento: el presupuesto reparte turnos de arriba abajo.', en: 'Document order: the budget hands slots out top to bottom.' } },
  ],
  states: ['sin captura (mosaico inactivo)', 'con captura', 'captura rota (vuelve al mosaico)', 'en vivo cargando', 'en vivo cargada'],
  usages: [
    { title: { es: 'Escritorio con captura', en: 'Desktop with capture' }, render: () => h('div', { style: { maxWidth: 320 } }, h(PagePreview, { code: 'W-01', route: '/site', name: 'Sitio web' })) },
    { title: { es: 'Teléfono', en: 'Phone' }, render: () => h('div', { style: { maxWidth: 160 } }, h(PagePreview, { code: 'C-01', route: '/app', name: 'App de clientes', shape: 'phone' })) },
    { title: { es: 'En vivo dentro del presupuesto', en: 'Live inside the budget' }, render: () => h(LivePreviewBudget, { max: 1 }, h('div', { style: { maxWidth: 320 } }, h(PagePreview, { code: 'S-02', route: '/staff/checkin', name: 'Recepción', as: 'front_desk', live: true }))) },
  ],
  a11y: [
    { es: 'La captura es decorativa (alt=""): el título de la tarjeta ya nombra la pantalla.', en: 'The capture is decorative (alt=""): the card title already names the screen.' },
    { es: 'El iframe en vivo lleva title “Vista previa de {página}”.', en: 'The live iframe carries the title “Preview of {page}”.' },
    { es: 'Ninguna capa es interactiva: entrar a la superficie es siempre el botón de la tarjeta.', en: 'No layer is interactive: entering a surface is always the card’s button.' },
  ],
  usedBy: ['HUB-01', 'D-05'],
});
