import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { DeviceFrame, DEVICE_PRESETS } from './DeviceFrame';

export default defineMeta({
  tier: 'organism', name: 'DeviceFrame',
  description: {
    es: 'La página real dentro de un iframe del mismo origen, a un viewport de dispositivo (teléfono 390×844, tableta 768×1024, escritorio 1280×800, TV 3840×2160) y escalada con transform para caber en su columna. El hash lleva la sesión con la que corre el marco (?as=…&lang=…&theme=…&dev=0&live=0).',
    en: 'The real page inside a same-origin iframe at a device viewport (phone 390×844, tablet 768×1024, desktop 1280×800, TV 3840×2160), scaled with a transform to fit its column. The hash carries the session the frame runs under (?as=…&lang=…&theme=…&dev=0&live=0).',
  },
  props: [
    { name: 'route', type: 'string', required: true, description: { es: 'Ruta de la app a cargar.', en: 'App route to load.' } },
    { name: 'preset', type: "'phone' | 'tablet' | 'desktop' | 'tv'", default: 'desktop', description: { es: 'Viewport real del marco.', en: 'The frame’s real viewport.' } },
    { name: 'as', type: 'Role', description: { es: 'Rol (su usuario demo) con el que corre la página enmarcada.', en: 'Role (its demo user) the framed page runs as.' } },
    { name: 'maxScale', type: 'number', default: '1', description: { es: 'Tope de escala; > 1 deja crecer la vista en pantallas 4K (el hub pasa --ui).', en: 'Scale cap; > 1 lets the view grow on 4K screens (the hub passes --ui).' } },
    { name: 'lazy', type: 'boolean', default: 'true', description: { es: 'loading="lazy" en el iframe.', en: 'loading="lazy" on the iframe.' } },
    { name: 'chrome', type: 'boolean', default: 'false', description: { es: 'Dibuja el marco del dispositivo.', en: 'Draws the device chrome.' } },
  ],
  states: ['cargando (opacidad 0)', 'cargada', 'teléfono', 'tableta', 'escritorio', 'TV'],
  usages: [
    { title: { es: 'Escritorio', en: 'Desktop' }, render: () => h('div', { style: { maxWidth: 420 } }, h(DeviceFrame, { route: '/site', preset: 'desktop', title: 'Sitio web', chrome: true })) },
    { title: { es: 'Teléfono', en: 'Phone' }, render: () => h('div', { style: { maxWidth: 200 } }, h(DeviceFrame, { route: '/app', preset: 'phone', as: 'customer', title: 'App de clientes', chrome: true })) },
    { title: { es: 'Los cuatro tamaños', en: 'All four sizes' }, render: () => h('ul', { className: 'small muted' }, ...Object.entries(DEVICE_PRESETS).map(([k, p]) => h('li', { key: k }, `${k} · ${p.w}×${p.h}`))) },
  ],
  a11y: [
    { es: 'El iframe siempre lleva title con el nombre de la página.', en: 'The iframe always carries a title naming the page.' },
    { es: 'Dentro del marco el modo dev va apagado, así el chip de spec no aparece en una vista previa.', en: 'Inside the frame dev mode is off, so the spec chip never shows in a preview.' },
  ],
  usedBy: ['HUB-01', 'D-06'],
});
