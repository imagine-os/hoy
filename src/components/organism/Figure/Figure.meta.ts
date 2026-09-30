import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { Figure } from './Figure';

const SHOT = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#e8e2d4"/><rect x="24" y="24" width="180" height="312" rx="12" fill="#cfc6b2"/><rect x="228" y="24" width="388" height="80" rx="12" fill="#cfc6b2"/><rect x="228" y="120" width="388" height="216" rx="12" fill="#dcd4c2"/></svg>',
);

export default defineMeta({
  tier: 'organism', name: 'Figure',
  description: {
    es: 'Una captura real dentro de un documento: marco, leyenda, chip con el código de pantalla y clic hacia la pantalla viva. Reemplaza la caja punteada `[screenshot: …]` cuando la captura ya existe. En markdown se escribe `![leyenda](../../screenshots/S-02/es-1280.jpg "S-02 · /staff/desk")`.',
    en: 'A real capture inside a document: frame, caption, page-code chip and a click through to the live screen. Replaces the dashed `[screenshot: …]` box once the capture exists. In markdown it is written `![caption](../../screenshots/S-02/es-1280.jpg "S-02 · /staff/desk")`.',
  },
  props: [
    { name: 'url', type: 'string', required: true, description: { es: 'URL resuelta de la imagen.', en: 'Resolved image URL.' } },
    { name: 'caption', type: 'string', description: { es: 'Leyenda bajo el marco.', en: 'Caption under the frame.' } },
    { name: 'title', type: 'string', description: { es: '`CODE` o `CODE · /ruta`: el código es el chip, la ruta hace la figura clicable.', en: '`CODE` or `CODE · /route`: the code is the chip, the route makes the figure clickable.' } },
    { name: 'captured', type: 'string (YYYY-MM-DD)', description: { es: 'Día de la captura; se muestra bajo la leyenda. El manual lo lee de src/app/captureDates.ts (historial git).', en: 'Day of the capture; shown under the caption. The manual reads it from src/app/captureDates.ts (git history).' } },
    { name: 'stale', type: 'boolean', default: 'false', description: { es: 'La página cambió (changelog) después de la captura: muestra «puede estar desactualizada».', en: 'The page changed (changelog) after the capture: shows "may be out of date".' } },
    { name: 'device', type: "'mobile' | 'desktop'", description: { es: 'Ancho del marco; se deduce del nombre del archivo (`-390`, también con el hash del build = móvil) o, si no dice nada, de la proporción al cargar (ancho / alto < 0,7). Móvil = 360 px centrado, borde de 1 px y --r-lg.', en: 'Frame width; inferred from the file name (`-390`, also with the build hash = mobile) or, when it says nothing, from the loaded aspect ratio (width / height < 0.7). Mobile = 360 px centred, 1 px border and --r-lg.' } },
  ],
  states: ['desktop capture', 'mobile capture (360 px, centred)', 'mobile by aspect ratio (portrait on load)', 'in a FigurePair', 'with route link', 'without caption', 'with capture date', 'stale (may be out of date)'],
  usages: [
    { title: { es: 'Captura de escritorio con ruta', en: 'Desktop capture with a route' }, render: () => h(Figure, { url: SHOT, caption: 'Recepción · tira del día y acciones', title: 'S-02 · /staff/desk' }) },
    { title: { es: 'Captura móvil', en: 'Mobile capture' }, render: () => h(Figure, { url: SHOT, caption: 'Horario del socio', title: 'C-02 · /app/schedule', device: 'mobile' }) },
    { title: { es: 'Con fecha y desactualizada', en: 'Dated and stale' }, render: () => h(Figure, { url: SHOT, caption: 'Reservar una clase', title: 'C-04 · /app/class/sample', captured: '2026-09-18', stale: true }) },
    { title: { es: 'Sin código ni ruta', en: 'No code, no route' }, render: () => h(Figure, { url: SHOT, caption: 'Sólo una imagen con leyenda' }) },
  ],
  a11y: [
    { es: 'El `alt` de la imagen es la leyenda (o el código si no hay leyenda) y el enlace lleva `aria-label` con ambos, para que el destino se anuncie completo.', en: 'The image `alt` is the caption (or the code when there is none) and the link carries an `aria-label` with both, so the destination is announced in full.' },
    { es: 'El foco del enlace es visible con `outline` de 2 px en ambos temas.', en: 'Link focus is visible with a 2 px outline in both themes.' },
  ],
  usedBy: ['K-03'],
});
