import { FAQ_PRICING_CONTRACT } from './faqPricing.contract';
import { itemsForFamilies } from '../../components/molecule/PriceTable/PriceTable';
import { quotePublishedProduct } from '../../data/catalogPublication';
import type { CatalogPlan } from '../../data/productCatalog';
import { localCatalogMode } from '../../data/operationalQuotes';
import type { PriceItem } from '../../tenant/pricing';
import { tenant } from '../../tenant/tenant';

export interface FaqPrices { items: PriceItem[]; unavailable: string[] }
/** Generated directives only. Authored FAQ prose and historical/private documents are unchanged. */
export function faqPrices(rows: CatalogPlan[], families: string, date: string, publicationObserved = false): FaqPrices {
  const scoped = rows.filter(row => row.tenant_id === tenant.id);
  const supported = families.split(',').map(family => family.trim()).filter(family => FAQ_PRICING_CONTRACT.families.some(known => known === family));
  const items = itemsForFamilies(supported.join(','));
  const published = publicationObserved || localCatalogMode(scoped);
  const unavailable: string[] = [];
  return { items: items.map(item => {
    const plan = scoped.find(row => row.id === `plan_${item.id}`);
    try {
      if (!plan) throw Error('missing');
      if (!published) { if (!plan.active) throw Error('inactive'); return item; }
      if (!plan || plan.frontend_publication?.snapshot.definition.type !== item.family) throw Error('unpublished');
      const quote = quotePublishedProduct(plan, date);
      return { ...item, name: quote.name, price: quote.amount, perPerson: false, classes: quote.classes, validityDays: quote.validityDays,
        description: { es: `${quote.classes} clases · ${quote.validityDays} días`, en: `${quote.classes} classes · ${quote.validityDays} days` } };
    } catch {
      unavailable.push(item.id);
      return { ...item, price: null, description: { es: '', en: '' } };
    }
  }), unavailable };
}
