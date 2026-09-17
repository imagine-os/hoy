import { createElement as h, useState } from 'react';
import { defineMeta } from '../../../design/meta';
import { InspectorPanel } from './InspectorPanel';
import { canvasSpecs } from '../../../specs/canvasSpecs';
import { Button } from '../../atom/Button/Button';

function Demo() {
  const [open, setOpen] = useState(false);
  return h('div', null, h(Button, { variant: 'secondary', onClick: () => setOpen(true) }, 'Abrir inspector de C-01'), h(InspectorPanel, { spec: canvasSpecs['C-01'], open, onClose: () => setOpen(false), routePath: '/app' }));
}

export default defineMeta({
  tier: 'organism', name: 'InspectorPanel',
  description: { es: 'Panel de spec: propósito, layout, datos (enlazados al gestor de tablas), roles, lógica, integraciones, estados, toggles, notas y completitud.', en: 'Spec panel: purpose, layout, data (linked to the table manager), roles, logic, integrations, states, toggles, notes and completeness.' },
  props: [
    { name: 'spec', type: 'PageSpec | null', required: true, description: { es: 'La spec de la ruta actual.', en: 'Current route spec.' } },
    { name: 'open / onClose', type: 'boolean / fn', required: true, description: { es: 'Control.', en: 'Control.' } },
    { name: 'routePath', type: 'string', description: { es: 'Ruta mostrada.', en: 'Route shown.' } },
  ],
  states: ['closed', 'open', 'complete (100%)', 'incomplete (missing badges)'],
  usages: [{ title: { es: 'Interactivo', en: 'Interactive' }, render: () => h(Demo) }],
  a11y: [{ es: 'Hereda el diálogo modal del Drawer; secciones con encabezados h4.', en: 'Inherits Drawer modal dialog; sections use h4 headings.' }],
  usedBy: ['DEV (all routes)'],
});
