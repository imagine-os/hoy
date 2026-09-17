import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { Wordmark } from './Wordmark';

export default defineMeta({
  tier: 'atom', name: 'Wordmark',
  description: { es: 'Logo “hoy” desde tenant.brand; elige azul en claro y crema en oscuro.', en: '“hoy” wordmark from tenant.brand; blue in light, cream in dark.' },
  props: [
    { name: 'height', type: 'number', default: '28', description: { es: 'Alto en px.', en: 'Height in px.' } },
    { name: 'variant', type: "'blue' | 'cream' | 'yellow' | 'auto'", default: 'auto', description: { es: 'Colorway.', en: 'Colourway.' } },
  ],
  states: ['light', 'dark'],
  usages: [{ title: { es: 'Colorways', en: 'Colourways' }, render: () => h('div', { className: 'row wrap', style: { background: 'var(--brand-deepBlue)', padding: 16, borderRadius: 'var(--r-md)' } }, h(Wordmark, { variant: 'cream', height: 40 }), h(Wordmark, { variant: 'yellow', height: 40 })) }],
  a11y: [{ es: 'alt = nombre del tenant.', en: 'alt = tenant name.' }],
  usedBy: ['HUB', 'P-HOME', 'TopBar'],
});
