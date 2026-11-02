import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { RouteErrorCard } from './RouteErrorBoundary';

export default defineMeta({
  tier: 'organism', name: 'RouteErrorBoundary',
  description: { es: 'Límite de error de cada página, dentro del shell: si la página falla muestra una tarjeta con Reintentar e Inicio, y el menú sigue funcionando. Una página que funciona sigue montada al cambiar de ruta (conserva su estado); tras un fallo, abrir otra página empieza de cero.', en: 'Each page\'s error boundary, inside the shell: when the page fails it shows a card with Retry and Home, and the menu keeps working. A working page stays mounted across path changes (it keeps its state); after a failure, opening another page starts clean.' },
  props: [
    { name: 'children', type: 'ReactNode', required: true, description: { es: 'La página.', en: 'The page.' } },
    { name: 'RouteBoundary.resetKey', type: 'string', required: true, description: { es: 'La ruta: al cambiar, solo un límite fallado vuelve a empezar (nunca es la key).', en: 'The path: when it changes, only a failed boundary starts again (never the key).' } },
    { name: 'RouteErrorCard.onRetry', type: '() => void', required: true, description: { es: 'Vuelve a mostrar la página.', en: 'Renders the page again.' } },
    { name: 'RouteErrorCard.homeTo', type: 'string', required: true, description: { es: 'Destino de Inicio (el inicio del rol).', en: 'Where Home goes (the role\'s home).' } },
    { name: 'RouteErrorCard.onHome', type: '(event) => void', description: { es: 'Al pulsar Inicio; en el propio inicio vuelve a mostrar la página en vez de navegar.', en: 'On Home; on the home itself it renders the page again instead of navigating.' } },
  ],
  states: ['page shown (no error)', 'path change (page stays mounted)', 'error card', 'path change after a failure (reset)', 'retry after a failed download (reload)', 'home on the home itself (remount)'],
  usages: [
    { title: { es: 'Tarjeta de error', en: 'Error card' }, render: () => h(RouteErrorCard, { onRetry: () => {}, homeTo: '/' }) },
  ],
  a11y: [{ es: 'La tarjeta usa role=alert (EmptyState en tono error); Reintentar es un botón y Inicio un enlace.', en: 'The card uses role=alert (EmptyState, error tone); Retry is a button and Home a link.' }],
  usedBy: ['every route (withShell)'],
});
