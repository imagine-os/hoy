import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';

export default defineMeta({
  tier: 'template', name: 'PhoneShell',
  description: { es: 'Chasis móvil (cliente, profesor): barra superior con logo, columna de contenido de máx. 560px y navegación inferior derivada de las rutas con `nav`.', en: 'Mobile shell (customer, teacher): brand top bar, 560px max content column and bottom nav derived from routes with `nav`.' },
  props: [
    { name: 'surface', type: 'Surface', required: true, description: { es: 'Filtra las rutas de la nav.', en: 'Filters nav routes.' } },
    { name: 'routes', type: 'RouteDef[]', required: true, description: { es: 'Normalmente getRoutes().', en: 'Usually getRoutes().' } },
    { name: 'homeTo', type: 'string', required: true, description: { es: 'Destino del logo.', en: 'Wordmark destination.' } },
    { name: 'bare', type: 'boolean', description: { es: 'Sin barra superior propia.', en: 'Without its own top bar.' } },
  ],
  states: ['mobile', 'desktop-column'],
  usages: [{ title: { es: 'Ver en vivo', en: 'See it live' }, render: () => h('p', { className: 'muted small' }, 'Se usa en /#/app y /#/teach. Abre la app de cliente para verlo con datos reales.') }],
  a11y: [{ es: '<main> para el contenido; la nav es <nav aria-label>.', en: '<main> for content; nav is <nav aria-label>.' }],
  usedBy: ['C-*', 'S-03'],
});
