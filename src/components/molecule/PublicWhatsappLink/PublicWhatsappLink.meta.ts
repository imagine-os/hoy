import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { PublicWhatsappLink } from './PublicWhatsappLink';
export default defineMeta({
  tier: 'molecule', name: 'PublicWhatsappLink',
  description: { es: 'Enlace directo público con alternativa a recepción; sin número válido, muestra opciones de contacto.', en: 'Public direct link with reception fallback; without a valid number, shows contact options.' },
  props: [
    { name: 'target', type: 'PublicWhatsappTarget', required: true, description: { es: 'URL validada o null; indica si se usa recepción.', en: 'Validated URL or null; indicates reception fallback.' } },
    { name: 'children', type: 'ReactNode', description: { es: 'Etiqueta o botón de la acción válida.', en: 'Label or button for a valid action.' } },
    { name: 'className / testId', type: 'string', description: { es: 'Estilo del enlace e identificador de prueba.', en: 'Link style and test identifier.' } },
  ],
  states: ['valid direct handoff', 'invalid topic → reception', 'no valid number → contact options', 'keyboard focus'],
  usages: [
    { title: { es: 'Número ficticio válido', en: 'Valid fictional number' }, render: () => h(PublicWhatsappLink, { target: { href: 'https://wa.me/12025550101', fallback: false } }, 'WhatsApp') },
    { title: { es: 'Alternativa a recepción', en: 'Reception fallback' }, render: () => h(PublicWhatsappLink, { target: { href: 'https://wa.me/12025550101', fallback: true } }, 'WhatsApp') },
    { title: { es: 'Sin número válido', en: 'No valid number' }, render: () => h(PublicWhatsappLink, { target: { href: null, fallback: false } }) },
  ],
  a11y: [{ es: 'Sin URL válida no se renderiza enlace WhatsApp ni botón habilitado; la alternativa permanece accesible por teclado.', en: 'Without a valid URL, no WhatsApp link or enabled button renders; the alternative remains keyboard accessible.' }],
  usedBy: ['W-01', 'W-06', 'W-10', 'P-01'],
});
