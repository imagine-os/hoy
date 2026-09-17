import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { MediaSlot } from './MediaSlot';

export default defineMeta({
  tier: 'molecule', name: 'MediaSlot',
  description: {
    es: 'El único hueco de medios del sitio: reserva el espacio de una foto, un video o una ilustración con su proporción y su dirección de arte. Vacío se ve intencional (tinte de movimiento, grano, chip "arte pendiente"); con `src` renderiza la imagen o el video real.',
    en: 'The site’s single media slot: books the space for a photo, video or illustration with its ratio and art direction. Empty it looks intentional (movement tint, grain, an “art pending” chip); with `src` it renders the real image or video.',
  },
  props: [
    { name: 'ratio', type: "'16:9' | '4:3' | '4:5' | '1:1' | '21:9'", default: '16:9', description: { es: 'Proporción reservada; el hueco nunca colapsa.', en: 'Reserved aspect ratio; the slot never collapses.' } },
    { name: 'kind', type: "'photo' | 'video' | 'illustration'", default: 'photo', description: { es: 'Qué va aquí; decide el glifo y si `src` se monta como <img> o <video>.', en: 'What belongs here; picks the glyph and whether `src` mounts as <img> or <video>.' } },
    { name: 'label', type: '{ es, en } | string', required: true, description: { es: 'Nombre del hueco; también es el alt de la imagen.', en: 'Name of the slot; doubles as the image alt text.' } },
    { name: 'brief', type: 'string', description: { es: 'Dirección de arte en una línea: siempre el atributo title, visible dentro del hueco en modo dev.', en: 'One-line art direction: always the title attribute, printed inside the slot in dev mode.' } },
    { name: 'movement', type: "Movement", description: { es: 'Tiñe el estado vacío con el color del movimiento.', en: 'Tints the empty state with the movement colour.' } },
    { name: 'src', type: 'string', description: { es: 'Cuando llega el archivo real: renderiza <img> o <video> en vez del placeholder.', en: 'When the real asset lands: renders <img> or <video> instead of the placeholder.' } },
    { name: 'poster', type: 'string', description: { es: 'Fotograma de portada para un `src` de video.', en: 'Poster frame for a video `src`.' } },
    { name: 'caption', type: '{ es, en } | string', description: { es: 'Pie de foto bajo el hueco.', en: 'Caption under the slot.' } },
    { name: 'overlay', type: 'ReactNode', description: { es: 'Contenido encima del hueco (un chip, un título, un botón de play).', en: 'Content on top of the slot (a chip, a headline, a play button).' } },
  ],
  states: ['empty photo', 'empty video', 'with src', 'with caption'],
  usages: [
    { title: { es: 'Vacío · foto 4:3 con movimiento', en: 'Empty · 4:3 photo with movement' }, render: () => h(MediaSlot, { ratio: '4:3', kind: 'photo', movement: 'arde', label: { es: 'Interior del estudio', en: 'Studio interior' }, brief: 'hot room at golden hour, steam on the glass' }) },
    { title: { es: 'Vacío · video 21:9', en: 'Empty · 21:9 video' }, render: () => h(MediaSlot, { ratio: '21:9', kind: 'video', label: { es: 'Video de portada', en: 'Hero video' }, brief: 'studio at golden hour, slow dolly' }) },
    { title: { es: 'Con archivo real', en: 'With a real asset' }, render: () => h(MediaSlot, { ratio: '16:9', kind: 'photo', src: './brand/p8-2.png', label: { es: 'Tablero de marca', en: 'Brand board' } }) },
    { title: { es: 'Con pie de foto', en: 'With a caption' }, render: () => h(MediaSlot, { ratio: '1:1', kind: 'illustration', movement: 'libera', label: { es: 'Ilustración de respiración', en: 'Breath illustration' }, caption: { es: 'Pendiente de ilustrador.', en: 'Pending an illustrator.' } }) },
  ],
  a11y: [
    { es: 'Vacío el hueco es role="img" con aria-label = label, así un lector de pantalla anuncia qué falta en vez de leer un div vacío.', en: 'Empty, the slot is role="img" with aria-label = label, so a screen reader announces what is missing instead of reading an empty div.' },
    { es: 'Con `src`, el <img> lleva alt = label y el <video> usa controles nativos con preload="metadata".', en: 'With `src`, the <img> carries alt = label and the <video> uses native controls with preload="metadata".' },
    { es: 'El chip "arte pendiente" es texto real, no una imagen, y sube de contraste con el token de highlight.', en: 'The “art pending” chip is real text, not an image, and takes its contrast from the highlight token.' },
  ],
  usedBy: ['W-01', 'W-02', 'W-05', 'W-07', 'W-08'],
});
