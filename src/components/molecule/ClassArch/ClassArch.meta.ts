import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { ClassArch } from './ClassArch';
import { classOrder } from '../../../tenant/brand';

export default defineMeta({
  tier: 'molecule', name: 'ClassArch',
  description: {
    es: 'Una de las siete clases como arco en su tono, con el título y las palabras clave del dueño. Reemplaza las fotos de concepto de las clases (0051); una foto real del estudio puede llenar el arco.',
    en: 'One of the seven classes as an arch in its tone, with the title and the owner’s keywords. Replaces the class concept photos (0051); a real studio photo can fill the arch.',
  },
  props: [
    { name: 'slug', type: 'ClassSlug', required: true, description: { es: 'La clase (src/tenant/brand.ts).', en: 'The class (src/tenant/brand.ts).' } },
    { name: 'index', type: 'number', description: { es: 'Posición en el orden ("01").', en: 'Position in the order ("01").' } },
    { name: 'size', type: "'md' | 'lg'", default: "'md'", description: { es: 'md: fila de siete en el inicio; lg: página de clases y de clase.', en: 'md: the home row of seven; lg: the classes and class pages.' } },
    { name: 'to', type: 'string', description: { es: 'Si existe, el arco es un enlace.', en: 'When set, the arch is a link.' } },
    { name: 'photoUrl', type: 'string | null', description: { es: 'Foto real de la clase (M-02d) bajo un velo del tono.', en: 'The real class photo (M-02d) under a tone wash.' } },
    { name: 'tagline', type: 'boolean', description: { es: 'Muestra la frase de la clase (lg: sí por defecto).', en: 'Shows the class line (lg: on by default).' } },
  ],
  states: ['default', 'hover (lifts)', 'focus (ring)', 'lg with tagline', 'with photo', 'figure (no link)'],
  usages: [
    { title: { es: 'Fila de las siete (inicio)', en: 'Row of seven (home)' }, render: () => h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 'var(--grid-gap)' } }, ...classOrder.map((slug, i) => h(ClassArch, { key: slug, slug, index: i + 1, to: `/site/classes/${slug}` }))) },
    { title: { es: 'Grande, con frase', en: 'Large, with tagline' }, render: () => h(ClassArch, { slug: 'centro', index: 5, size: 'lg' }) },
  ],
  a11y: [
    { es: 'Como enlace, el nombre accesible es "Clase — palabras clave"; el número es decorativo. Texto crema sobre la base oscura del tono (≥ 4,5:1).', en: 'As a link the accessible name is "Class — keywords"; the number is decorative. Cream text on the tone’s deep base (≥ 4.5:1).' },
    { es: 'Foco visible con anillo; sin movimiento con prefers-reduced-motion.', en: 'Visible focus ring; no motion under prefers-reduced-motion.' },
  ],
  usedBy: ['W-01', 'W-07', 'W-08'],
});
