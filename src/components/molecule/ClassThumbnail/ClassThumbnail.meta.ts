import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import type { ModalityRow } from '../../../data/schema';
import { ClassThumbnail } from './ClassThumbnail';

const mod = (slug: string, name: string, tone: string) => ({ id: `mod_${slug}`, slug, name_es: name, name_en: name, tone } as unknown as ModalityRow);

export default defineMeta({
  tier: 'molecule', name: 'ClassThumbnail',
  description: { es: 'La imagen de una clase: la imagen propia de la clase (la sube Administración); si no, la foto del CMS (site.classes.<slug>) o la foto del método en Inicio; si no, una ficha en el tono de la clase con su inicial (0051).', en: 'A class’s picture: the class’s own image (uploaded by Administration); otherwise the CMS photo (site.classes.<slug>) or the method’s Home photo; otherwise a tile in the class’s tone with its initial (0051).' },
  props: [{ name: 'modality', type: 'ModalityRow', description: { es: 'La modalidad; su clase de marca da el tono y la ranura de foto.', en: 'The modality; its brand class gives the tone and the photo slot.' } }, { name: 'imageUrl', type: 'string | null', description: { es: 'La imagen de la clase (/media/<id>); una ocurrencia usa la de su horario. Sin ella, la foto del método.', en: 'The class’s image (/media/<id>); an occurrence uses its schedule’s. Without it, the method’s photo.' } }, { name: 'className', type: 'string', description: { es: 'Clase CSS extra.', en: 'Extra CSS class.' } }],
  states: ['class-image', 'cms-photo', 'method-photo', 'tone-tile (no photo yet)'],
  usages: [{ title: { es: 'Fichas de tono', en: 'Tone tiles' }, render: () => h('div', { className: 'row wrap' }, ...[['ligereza', 'Ligereza', 'river'], ['fuego', 'Fuego', 'clay'], ['centro', 'Centro', 'moss'], ['pulso', 'Pulso', 'sun']].map(([s, n, t]) => h('div', { key: s, style: { width: '5.5rem', aspectRatio: '4 / 3', borderRadius: 'var(--r-md)', overflow: 'hidden' } }, h(ClassThumbnail, { modality: mod(s, n, t) })))) }],
  a11y: [{ es: 'Decorativa (aria-hidden); el nombre de la clase va en la fila.', en: 'Decorative (aria-hidden); the class name is in the row.' }],
  usedBy: ['C-02', 'C-03', 'W-04'],
});
