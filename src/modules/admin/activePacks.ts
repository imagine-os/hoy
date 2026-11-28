import type { Lot } from './customers/customerBalances';
import type { QuerySpec } from '../staff/desk/useCos';

const byId = [{ field: 'id', dir: 'asc' as const }];

/** Classify by the purchased product row, not remaining quantity or display name. Historical products still count. */
export const ACTIVE_PACK_QUERIES: Record<'lots' | 'left' | 'products', QuerySpec> = {
  lots: { entity: 'credit_lot', sort: byId },
  left: { entity: 'credit_entry', aggregate: { groupBy: ['lot'], metrics: [{ op: 'sum', field: 'delta', alias: 'left' }] } },
  products: { entity: 'product', sort: byId },
};

export function dashboardCreditCounts(input: {
  lots: Pick<Lot, 'id' | 'person' | 'product' | 'valid_from' | 'valid_until'>[];
  left: { lot: string; left: unknown }[];
  products: { id: string; kind: unknown }[];
  today: string;
}): { packCustomers: number; unusedSingleCredits: number } {
  const kinds = new Map(input.products.map(({ id, kind }) => [id, kind]));
  const leftBy = new Map(input.left.map(({ lot, left }) => [lot, left]));
  const people = new Set<string>();
  let unusedSingleCredits = 0;
  for (const l of input.lots) {
    const left = leftBy.get(l.id);
    if (!l.person || !l.product || typeof left !== 'number' || !Number.isInteger(left) || left <= 0) continue;
    if (l.valid_from && l.valid_from > input.today) continue;
    if (l.valid_until && l.valid_until < input.today) continue;
    const kind = kinds.get(l.product);
    if (kind === 'pack') people.add(l.person);
    if (kind === 'single') unusedSingleCredits += left;
  }
  return { packCustomers: people.size, unusedSingleCredits };
}
