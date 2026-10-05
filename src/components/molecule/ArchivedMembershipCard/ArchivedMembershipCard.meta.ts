import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { MembershipCard } from '../../../modules/website/archive/MembershipCard';
import { pricing } from '../../../modules/website/archive/pricing';
export default defineMeta({
  tier: 'molecule', name: 'ArchivedMembershipCard',
  description: { es: 'Tarjeta histórica de membresía; solo en la vista previa archivada, nunca en la venta actual.', en: 'Historical membership card; archived design preview only, never a current offer.' },
  props: [], states: ['historical monthly', 'historical annual', 'view current plans'],
  usages: [{ title: { es: 'Muestra histórica', en: 'Historical sample' }, render: () => h('div', { className: 'site', 'data-site-version': 'archive' }, h(MembershipCard, { item: pricing.find(p => p.id === 'monthly')!, onSelect: () => undefined })) }],
  a11y: [{ es: 'Acción de teclado abre los planes actuales.', en: 'Keyboard action opens current plans.' }],
  usedBy: ['P-01'],
});
