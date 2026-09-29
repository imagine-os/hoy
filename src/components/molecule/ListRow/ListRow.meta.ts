import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { ListGroup, ListRow } from './ListRow';
import { Badge } from '../../atom/Badge/Badge';

export default defineMeta({
  tier: 'molecule', name: 'ListRow',
  description: { es: 'Fila de ajustes: icono, título y subtítulo, valor o chevron a la derecha. ListGroup las agrupa en una tarjeta con divisores.', en: 'Settings row: icon, title and subtitle, trailing value or chevron. ListGroup stacks them in a card with dividers.' },
  props: [
    { name: 'title / subtitle', type: 'ReactNode', required: true, description: { es: 'Texto principal y secundario.', en: 'Primary and secondary text.' } },
    { name: 'icon', type: 'IconName | ReactNode', description: { es: 'Un nombre del set Icon (se dibuja en el cuadro teñido de --icon-tile) o cualquier nodo (Avatar).', en: 'An Icon set name (drawn in the tinted --icon-tile box) or any node (Avatar).' } },
    { name: 'trailing', type: 'ReactNode', description: { es: 'Valor, Badge o Toggle; si falta y la fila navega, aparece un chevron.', en: 'Value, Badge or Toggle; when absent and the row navigates, a chevron shows.' } },
    { name: 'to / href / onClick', type: 'string | () => void', description: { es: 'Enlace interno, externo o acción.', en: 'Internal link, external link or action.' } },
    { name: 'tone', type: "'default' | 'danger'", default: 'default', description: { es: 'Destructiva (cerrar sesión, cancelar).', en: 'Destructive (sign out, cancel).' } },
  ],
  states: ['default', 'hover', 'with trailing value', 'danger', 'disabled'],
  usages: [{ title: { es: 'Grupo de ajustes (C-19)', en: 'Settings group (C-19)' }, render: () => h(ListGroup, { title: 'Cuenta', children: [
    h(ListRow, { key: 'm', icon: 'ticket', title: 'Membresía', subtitle: 'Plan Mensual · renueva 12 oct', trailing: h(Badge, { tone: 'success' }, 'Activa'), onClick: () => {} }),
    h(ListRow, { key: 'p', icon: 'credit-card', title: 'Métodos de pago', subtitle: 'Visa •••• 4242', onClick: () => {} }),
    h(ListRow, { key: 'l', icon: 'languages', title: 'Idioma', trailing: 'Español' }),
    h(ListRow, { key: 'out', icon: 'log-out', title: 'Cerrar sesión', tone: 'danger', onClick: () => {} }),
  ] }) }],
  a11y: [{ es: 'Es <a> o <button> según destino; toda la fila (≥ --h-ctl 44 px, relleno --row-pad 12 × 16) es el objetivo táctil.', en: 'Renders <a> or <button> by destination; the whole row (≥ --h-ctl 44 px, --row-pad 12 × 16 padding) is the touch target.' }],
  usedBy: ['C-05', 'C-13', 'C-19', 'C-22', 'C-24', 'C-25', 'A-02'],
});
