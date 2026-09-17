import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { TeacherCard } from './TeacherCard';

export default defineMeta({
  tier: 'organism', name: 'TeacherCard',
  description: { es: 'Tarjeta de profesor: avatar, nombre, valoración, bio bilingüe y chips de especialidad.', en: 'Teacher card: avatar, name, rating, bilingual bio and specialty chips.' },
  props: [
    { name: 'name / bio / photo / rating', type: 'string | Bi | number', description: { es: 'Datos del profesor.', en: 'Teacher data.' } },
    { name: 'specialties', type: '{ label, movement }[]', required: true, description: { es: 'Modalidades.', en: 'Modalities.' } },
    { name: 'onClick', type: '() => void', description: { es: 'Abre el perfil.', en: 'Opens the profile.' } },
  ],
  states: ['default', 'hover', 'no-photo', 'no-rating'],
  usages: [{ title: { es: 'Galería', en: 'Gallery' }, render: () => h('div', { className: 'grid grid-2' }, h(TeacherCard, { name: 'Paula Mejía', rating: 4.9, bio: { es: 'Pilates clásico y contemporáneo.', en: 'Classical and contemporary Pilates.' }, specialties: [{ label: 'Pilates', movement: 'enraiza' }, { label: 'Barre', movement: 'enraiza' }], onClick: () => {} }), h(TeacherCard, { name: 'Santiago Vélez', bio: { es: 'Yin y meditación.', en: 'Yin and meditation.' }, specialties: [{ label: 'Yin', movement: 'libera' }] })) }],
  a11y: [{ es: 'Avatar con aria-label; la tarjeta interactiva debería envolverse en enlace en la página.', en: 'Avatar has aria-label; the interactive card should be wrapped in a link on the page.' }],
  usedBy: ['C-18', 'P-TEACHERS'],
});
