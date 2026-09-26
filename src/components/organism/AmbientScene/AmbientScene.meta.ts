import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { AmbientScene } from './AmbientScene';
export default defineMeta({
  tier: 'organism', name: 'AmbientScene',
  description: { es: 'Escena fotográfica con desplazamiento suave y video opcional.', en: 'Photographic scene with gentle scroll depth and optional video.' },
  props: [
    { name: 'poster', type: 'string', required: true, description: { es: 'Imagen siempre disponible.', en: 'Always-available still image.' } },
    { name: 'video', type: 'string', description: { es: 'Bucle aprobado opcional.', en: 'Optional approved loop.' } },
    { name: 'motion', type: 'boolean', default: 'true', description: { es: 'Respeta pausa, ahorro de datos y movimiento reducido.', en: 'Honors pause, data saver and reduced motion.' } },
  ],
  states: ['poster only', 'loading poster', 'ready fade-in', 'playing when visible', 'paused', 'reduced motion', 'video error fallback'],
  usages: [{ title: { es: 'Santuario', en: 'Sanctuary' }, render: () => h('div', { style: { height: 300, position: 'relative' } }, h(AmbientScene, { poster: './images/sanctuary/arch.webp', alt: 'Architectural concept', className: 'library-ambient', motion: false })) }],
  a11y: [{ es: 'Texto alternativo, poster estático, sin audio ni movimiento obligatorio.', en: 'Alt text, static poster, no audio or required movement.' }],
  usedBy: ['W-01', 'W-02'],
});
