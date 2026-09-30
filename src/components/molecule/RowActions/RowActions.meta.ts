import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { RowActions } from './RowActions';
import { Button } from '../../atom/Button/Button';

export default defineMeta({
  tier: 'molecule', name: 'RowActions',
  description: { es: 'Las acciones de una fila densa (lista de recepción, asistencia): botones compactos de una sola altura, sin sombra.', en: 'The actions of a dense row (front-desk roster, attendance): compact buttons of one height, no shadow.' },
  props: [
    { name: 'children', type: 'ReactNode', required: true, description: { es: 'Botones size="sm": primero la acción principal (tonal), luego la secundaria (outline).', en: 'size="sm" buttons: the main action first (tonal), then the secondary one (outline).' } },
    { name: 'className', type: 'string', description: { es: 'Clase extra.', en: 'Extra class.' } },
  ],
  states: ['default', 'hover', 'focus', 'disabled', 'loading', 'empty'],
  usages: [
    { title: { es: 'Par de recepción', en: 'Front-desk pair' }, render: () => h(RowActions, null, h(Button, { size: 'sm', variant: 'tonal', icon: 'check' }, 'Check-in'), h(Button, { size: 'sm', variant: 'outline', icon: 'user-x' }, 'No vino')) },
    { title: { es: 'Una acción (deshacer, promover)', en: 'One action (undo, promote)' }, render: () => h('div', { className: 'row wrap' }, h(RowActions, null, h(Button, { size: 'sm', variant: 'outline', icon: 'undo' }, 'Deshacer')), h(RowActions, null, h(Button, { size: 'sm', variant: 'tonal', icon: 'promote' }, 'Dar cupo')), h(RowActions, null, h(Button, { size: 'sm', variant: 'tonal', icon: 'promote', disabled: true }, 'Dar cupo')), h(RowActions, null, h(Button, { size: 'sm', variant: 'tonal', icon: 'check', loading: true }, 'Check-in'))) },
  ],
  a11y: [
    { es: 'Botones de 36 px visibles con un área táctil de 44 px (::before transparente, ±4 px): la excepción "fila densa" de la regla 7.', en: '36 px visible buttons with a 44 px hit area (transparent ::before, ±4 px): the "dense row" exception to rule 7.' },
    { es: 'Orden de foco: nombre → acción principal → secundaria; el clic no se propaga a la fila.', en: 'Focus order: name → main action → secondary; clicks do not bubble to the row.' },
  ],
  usedBy: ['S-02', 'S-03'],
});
