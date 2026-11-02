import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { RouteErrorCard } from './RouteErrorBoundary';

export default defineMeta({
  tier: 'organism', name: 'RouteErrorBoundary',
  description: { es: 'Límite de error de cada página, dentro del shell: si la página falla muestra una tarjeta con Reintentar e Inicio, y el menú sigue funcionando. Al abrir otra página empieza de cero.', en: 'Each page\'s error boundary, inside the shell: when the page fails it shows a card with Retry and Home, and the menu keeps working. Opening another page starts clean.' },
  props: [
    { name: 'children', type: 'ReactNode', required: true, description: { es: 'La página.', en: 'The page.' } },
    { name: 'RouteErrorCard.onRetry', type: '() => void', required: true, description: { es: 'Vuelve a mostrar la página.', en: 'Renders the page again.' } },
    { name: 'RouteErrorCard.homeTo', type: 'string', required: true, description: { es: 'Destino de Inicio (el inicio del rol).', en: 'Where Home goes (the role\'s home).' } },
  ],
  states: ['page shown (no error)', 'error card'],
  usages: [
    { title: { es: 'Tarjeta de error', en: 'Error card' }, render: () => h(RouteErrorCard, { onRetry: () => {}, homeTo: '/' }) },
  ],
  a11y: [{ es: 'La tarjeta usa role=alert (EmptyState en tono error); Reintentar es un botón y Inicio un enlace.', en: 'The card uses role=alert (EmptyState, error tone); Retry is a button and Home a link.' }],
  usedBy: ['every route (withShell)'],
});
