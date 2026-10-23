import { quotePublishedProduct } from '../../data/catalogPublication';
import type { CatalogPlan } from '../../data/productCatalog';
import { localCatalogMode } from '../../data/operationalQuotes';
import { priceItem, type PriceItem } from '../../tenant/pricing';
import { tenant } from '../../tenant/tenant';

export interface PublicHomeOffer {
  item: PriceItem; price: number | null; available: boolean;
  published: boolean; name?: { es: string; en: string }; classes?: number; validityDays?: number;
}
/** Once local publication mode is active, never silently restore legacy amounts. */
export function publicHomeOffer(rows: CatalogPlan[], itemId: 'trial' | 'pack12' | 'private', date: string): PublicHomeOffer {
  const item = priceItem(itemId)!;
  if (!localCatalogMode(rows)) return { item, price: item.price ?? null, available: item.price != null, published: false };
  const unavailable = { item, price: null, available: false, published: true };
  const plan = rows.find(row => row.id === `plan_${itemId}` && row.tenant_id === tenant.id);
  if (!plan) return unavailable;
  try {
    if (plan.frontend_publication?.snapshot.definition.type !== item.family) return unavailable;
    const quote = quotePublishedProduct(plan, date);
    return { item, price: quote.amount, available: true, published: true, name: quote.name, classes: quote.classes, validityDays: quote.validityDays };
  } catch { return unavailable; }
}
