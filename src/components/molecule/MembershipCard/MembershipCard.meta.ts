import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { MembershipCard } from './MembershipCard';
import { pricing } from '../../../tenant/pricing';
export default defineMeta({ tier: 'molecule', name: 'MembershipCard', description: { es: 'Membresía física con precio, beneficios y selección.', en: 'Tactile membership with price, benefits and selection.' }, props: [{ name: 'item / onSelect / saving', type: 'PriceItem / callback / number', description: { es: 'Precio de la fuente única.', en: 'Price from the single source.' } }], states: ['monthly','annual','hover','focus'], usages: [{ title: { es: 'Mensual', en: 'Monthly' }, render: () => h(MembershipCard, { item: pricing.find(p => p.id === 'monthly')!, onSelect: () => {} }) }], a11y: [{ es: 'Precio y periodicidad en texto; arte decorativo.', en: 'Price and billing period in text; decorative artwork.' }], usedBy: ['P-PLANS'] });
