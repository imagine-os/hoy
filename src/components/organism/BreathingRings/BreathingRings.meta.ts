import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { BreathingRings } from './BreathingRings';
import { Wordmark } from '../../atom/Wordmark/Wordmark';

export default defineMeta({
  tier: 'organism', name: 'BreathingRings',
  description: { es: 'Tres anillos concéntricos que respiran en el ciclo de 7 s (--dur-breath) alrededor del logo. Es la pantalla de carga A-01.', en: 'Three concentric rings that breathe on the 7 s cycle (--dur-breath) around the wordmark. It is the A-01 loading screen.' },
  props: [
    { name: 'size', type: 'number', default: '300', description: { es: 'Diámetro del anillo exterior (300 / 220 / 150).', en: 'Outer ring diameter (300 / 220 / 150).' } },
    { name: 'animate', type: 'boolean', default: 'true', description: { es: 'Respiración; se apaga con prefers-reduced-motion.', en: 'Breathing; off under prefers-reduced-motion.' } },
    { name: 'children', type: 'ReactNode', description: { es: 'Contenido central (logo, tagline).', en: 'Centre content (logo, tagline).' } },
  ],
  states: ['breathing', 'static (reduced motion)'],
  usages: [{ title: { es: 'Con logo', en: 'With wordmark' }, render: () => h(BreathingRings, { size: 220 }, h(Wordmark, { height: 40 })) }],
  a11y: [{ es: 'Decorativo; respeta prefers-reduced-motion; el texto central sigue siendo texto.', en: 'Decorative; honours prefers-reduced-motion; centre text stays real text.' }],
  usedBy: ['A-01'],
});
