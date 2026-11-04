import { useMemo } from 'react';
import { useTable } from './DataContext';
import { localCatalogMode, quotePurchaseDate } from './operationalQuotes';
import { quotePublishedProduct } from './catalogPublication';
import type { CatalogPlan } from './productCatalog';
import { pricing, type PlanFamily, type PriceItem } from '../tenant/pricing';
import { tenant } from '../tenant/tenant';
import { PRODUCTION_BUILD } from '../config/launch';

/**
 * SW-02 — the price a visitor sees is the product master's current price, never a number typed in a page.
 * `src/tenant/pricing.ts` keeps the item shape (names, rules, family, order); the amount comes from the `plans`
 * table the product master edits (CompanyOSProvider fills the same table in production):
 * - once the master has a published catalog (M-17), the published revision's price for today's studio date;
 * - otherwise the `plans` row's `price`.
 * An item with no active row, or no price today, is left out rather than shown at a stale amount. A price of 0 means
 * the studio quotes it (J4: the private class has no public price), so it is left out too and the page shows only
 * its contact button.
 */
/**
 * Company OS (production): product rows have their own ids and the item is the product `key` (`slug` here); with
 * dated prices (payments 2.8.0) the key has one row per period, and today's active row is the one on sale.
 */
function rowOnSale(rows: CatalogPlan[], itemId: string, purchaseDate: string): CatalogPlan | undefined {
  const today = rows.filter((p) => (p.slug === itemId || p.id === `plan_${itemId}`) && p.tenant_id === tenant.id && p.active
    && (!p.valid_from || p.valid_from <= purchaseDate) && (!p.valid_until || purchaseDate <= p.valid_until));
  return today.sort((a, b) => String(b.valid_from ?? '').localeCompare(String(a.valid_from ?? '')))[0];
}

export function livePrice(rows: CatalogPlan[], itemId: string, purchaseDate: string): number | null {
  if (localCatalogMode(rows)) {
    const row = rows.find((p) => p.id === `plan_${itemId}` && p.tenant_id === tenant.id);
    if (!row) return null;
    try { return quotePublishedProduct(row, purchaseDate).amount; } catch { return null; }
  }
  const row = rowOnSale(rows, itemId, purchaseDate);
  return row && Number.isInteger(row.price) && row.price > 0 ? row.price : null;
}

/** The launch price list with every amount read from the product master; unpriced items are dropped. */
export function livePricing(rows: CatalogPlan[], purchaseDate: string): PriceItem[] {
  return pricing.flatMap((p) => {
    // J4: in production the private class never has a public price, even if a row carries one by mistake.
    if (PRODUCTION_BUILD && p.family === 'privadas') return [];
    const price = livePrice(rows, p.id, purchaseDate);
    return price == null ? [] : [{ ...p, price }];
  });
}

const GENERIC_KINDS = ['pack', 'trial', 'single', 'gift'] as const;
export type GenericPlanKind = typeof GENERIC_KINDS[number];
/** A product of the master outside the launch price list, with the master's own words. */
export interface GenericPlan {
  key: string;
  kind: GenericPlanKind;
  name: { es: string; en: string };
  description: { es: string; en: string };
  price: number;
  classes: number;
  validityDays: number | null;
  freezable: boolean;
}
type MasterRow = CatalogPlan & { kind?: unknown; classes?: unknown; validity_days?: unknown; freezable?: unknown; audience?: unknown; description?: { es?: string; en?: string } | null };
/** The master's key rule (`validateProduct`); the key goes into a link. */
const PRODUCT_KEY = /^[a-z0-9_]{2,40}$/;

/**
 * WEB-02b: every other product on sale today gets a generic card on the website and in the app: kinds trial, single, pack
 * and gift, for everyone (an audience-limited or private one stays out), each key once at today's price. It must give
 * classes: Company OS grants nothing for a product with no credits, so a `single` without them can't be sold on its own
 * (paying it would take the money and issue no class). The launch list's keys keep the cards they have.
 */
export function genericPlans(rows: CatalogPlan[], purchaseDate: string): GenericPlan[] {
  if (localCatalogMode(rows)) return [];
  const fixed = new Set(pricing.map((p) => p.id));
  const keys = [...new Set(rows.map((r) => r.slug))].filter((k): k is string => typeof k === 'string' && PRODUCT_KEY.test(k) && !fixed.has(k));
  const plans = keys.flatMap((key): GenericPlan[] => {
    const row = rowOnSale(rows, key, purchaseDate) as MasterRow | undefined;
    if (!row || !(GENERIC_KINDS as readonly unknown[]).includes(row.kind) || row.audience) return [];
    const classes = Number(row.classes);
    if (!Number.isInteger(row.price) || row.price <= 0 || !Number.isInteger(classes) || classes < 1) return [];
    const days = Number(row.validity_days);
    return [{
      key, kind: row.kind as GenericPlanKind, name: { es: row.name_es, en: row.name_en || row.name_es },
      description: { es: row.description?.es ?? '', en: row.description?.en ?? '' }, price: row.price, classes,
      validityDays: Number.isInteger(days) && days > 0 ? days : null, freezable: row.freezable === true,
    }];
  });
  return plans.sort((a, b) => GENERIC_KINDS.indexOf(a.kind) - GENERIC_KINDS.indexOf(b.kind) || a.price - b.price || a.key.localeCompare(b.key));
}

export interface LivePricing {
  items: PriceItem[];
  /** Production only: the master's other public products. The review build keeps its fixed list. */
  generic: GenericPlan[];
  item: (id: string) => PriceItem | undefined;
  byFamily: (family: PlanFamily) => PriceItem[];
  loading: boolean;
}

export function useLivePricing(): LivePricing {
  const { rows, loading } = useTable<CatalogPlan>('plans');
  const day = quotePurchaseDate();
  return useMemo(() => {
    const items = livePricing(rows, day);
    return { items, generic: PRODUCTION_BUILD ? genericPlans(rows, day) : [], loading, item: (id) => items.find((p) => p.id === id), byFamily: (family) => items.filter((p) => p.family === family) };
  }, [rows, day, loading]);
}
