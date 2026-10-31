import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { ViewAsBanner } from './ViewAsBanner';

export default defineMeta({
  tier: 'molecule', name: 'ViewAsBanner',
  description: { es: 'Barra fija mientras un super admin ve el estudio como otro rol (producción): rol, persona de ejemplo, solo lectura y Salir.', en: 'Sticky bar while a super admin views the studio as another role (production): role, sample person, read-only and Exit.' },
  props: [
    { name: 'role', type: 'string', description: { es: 'Etiqueta del rol visto, ya traducida.', en: 'The viewed role’s label, already translated.' } },
    { name: 'person', type: 'string | null', description: { es: 'Nombre de la persona de ejemplo; null si el rol no tiene a nadie.', en: 'The sample person’s name; null when the role has no one.' } },
    { name: 'onExit', type: '() => void', description: { es: 'Sale de «Ver como» (vuelve al hub).', en: 'Exits “View as” (back to the hub).' } },
  ],
  states: ['with a sample person', 'no sample person', 'narrow (wraps)'],
  usages: [
    { title: { es: 'Viendo como cliente', en: 'Viewing as customer' }, render: () => h(ViewAsBanner, { role: 'Cliente', person: 'Persona de ejemplo (ficticia)', onExit: () => {} }) },
    { title: { es: 'Sin persona de ejemplo', en: 'No sample person' }, render: () => h(ViewAsBanner, { role: 'Marketing', person: null, onExit: () => {} }) },
  ],
  a11y: [{ es: 'role=status; el botón Salir tiene una etiqueta que dice a dónde lleva; el amarillo nunca es la única señal (texto «Solo lectura»).', en: 'role=status; the Exit button’s label says where it goes; the yellow is never the only signal (“Read-only” text).' }],
  usedBy: ['HUB-01'],
});
