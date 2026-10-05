import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { ComingSoonLanding } from './ComingSoonLanding';
export default defineMeta({
  tier: 'template', name: 'ComingSoonLanding',
  description: { es: 'Preapertura independiente: marca, arte vivo de concepto, idioma y enlace al Instagram del estudio.', en: 'Standalone pre-launch surface with the wordmark, living concept art, language control and the studio Instagram link.' },
  props: [],
  states: ['Spanish', 'English', 'playing', 'paused', 'reduced motion / save data', 'video unavailable: poster'],
  usages: [{ title: { es: 'Página de preapertura', en: 'Pre-launch page' }, render: () => h(ComingSoonLanding) }],
  a11y: [{ es: 'Título semántico, controles de 44 px, pausa visible, foco de alto contraste y arte estático cuando se reduce el movimiento.', en: 'Semantic heading, 44 px controls, visible pause, high-contrast focus and a static image under reduced motion.' }],
  usedBy: ['W-11'],
});
