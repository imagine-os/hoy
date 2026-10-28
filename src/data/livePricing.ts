import { useMemo } from 'react';
import { useTable } from './DataContext';
import { localCatalogMode, quotePurchaseDate } from './operationalQuotes';
import { quotePublishedProduct } from './catalogPublication';
import type { CatalogPlan } from './productCatalog';
import { pricing, type PlanFamily, type PriceItem } from '../tenant/pricing';
import { tenant } from '../tenant/tenant';

/**
 * SW-02 — the price a visitor sees is the product master's current price, never a number typed in a page.
 * `src/tenant/pricing.ts` keeps the item shape (names, rules, family, order); the amount comes from the `plans`
 * table the product master edits (CompanyOSProvider fills the same table in production):
 * - once the master has a published catalog (M-17), the published revision's price for today's studio date;
 * - otherwise the `plans` row's `price`.
 * An item with no active row, or no price today, is left out rather than shown at a stale amount.
 */
export function livePrice(rows: CatalogPlan[], itemId: string, purchaseDate: string): number | null {
  const row = rows.find((p) => p.id === `plan_${itemId}` && p.tenant_id === tenant.id);
  if (!row) return null;
  if (localCatalogMode(rows)) {
    try { return quotePublishedProduct(row, purchaseDate).amount; } catch { return null; }
  }
  return row.active && Number.isInteger(row.price) && row.price >= 0 ? row.price : null;
}

/** The launch price list with every amount read from the product master; unpriced items are dropped. */
export function livePricing(rows: CatalogPlan[], purchaseDate: string): PriceItem[] {
  return pricing.flatMap((p) => {
    const price = livePrice(rows, p.id, purchaseDate);
    return price == null ? [] : [{ ...p, price }];
  });
}

export interface LivePricing {
  items: PriceItem[];
  item: (id: string) => PriceItem | undefined;
  byFamily: (family: PlanFamily) => PriceItem[];
  loading: boolean;
}

export function useLivePricing(): LivePricing {
  const { rows, loading } = useTable<CatalogPlan>('plans');
  const day = quotePurchaseDate();
  return useMemo(() => {
    const items = livePricing(rows, day);
    return { items, loading, item: (id) => items.find((p) => p.id === id), byFamily: (family) => items.filter((p) => p.family === family) };
  }, [rows, day, loading]);
}
