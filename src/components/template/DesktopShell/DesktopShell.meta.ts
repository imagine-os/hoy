import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';

export default defineMeta({
  tier: 'template', name: 'DesktopShell',
  description: { es: 'Chasis de escritorio (staff, admin, dev, docs): sidebar de 240px con grupos de navegación derivados de las rutas, sesión, ES/EN, tema y modo dev. Colapsa a menú en móvil.', en: 'Desktop shell (staff, admin, dev, docs): 240px sidebar with nav groups derived from routes, session, ES/EN, theme and dev mode. Collapses to a menu on mobile.' },
  props: [
    { name: 'surfaces', type: 'Surface[]', required: true, description: { es: 'Superficies cuyas rutas con nav se listan.', en: 'Surfaces whose nav routes are listed.' } },
    { name: 'routes', type: 'RouteDef[]', required: true, description: { es: 'Normalmente allRoutes.', en: 'Usually allRoutes.' } },
    { name: 'title', type: 'string', required: true, description: { es: 'Etiqueta bajo el logo.', en: 'Label under the wordmark.' } },
  ],
  states: ['desktop', 'mobile-collapsed', 'mobile-open', 'dev-mode (codes visible)'],
  usages: [{ title: { es: 'Ver en vivo', en: 'See it live' }, render: () => h('p', { className: 'muted small' }, 'Se usa en /#/staff, /#/admin, /#/dev y /#/docs.') }],
  a11y: [{ es: 'Sidebar es <aside>; nav con aria-label; botón menú con aria-expanded.', en: 'Sidebar is <aside>; nav has aria-label; menu button has aria-expanded.' }],
  usedBy: ['S-*', 'M-*', 'D-*', 'K-01', 'DOCS'],
});
