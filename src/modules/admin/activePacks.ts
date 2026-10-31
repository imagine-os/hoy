import type { Lot, LotLeft } from './customers/customerBalances';
import type { QuerySpec } from '../staff/desk/useCos';

/**
 * M-01 members tile (Hoy all-roles, decision R-05: memberships are class packs): how many customers hold an active
 * pack today, from Company OS credits. A pack is active when its lot has classes left (the sum of its entries, a server
 * aggregate) and today is inside its validity (`valid_from ≤ today ≤ valid_until`, empty = open). A frozen pack still
 * counts: the customer still holds it. Each person counts once. Display only; the server decides every booking.
 */
export const ACTIVE_PACK_QUERIES: Record<'lots' | 'left', QuerySpec> = {
  lots: { entity: 'credit_lot' },
  left: { entity: 'credit_entry', aggregate: { groupBy: ['lot'], metrics: [{ op: 'sum', field: 'delta', alias: 'left' }] } },
};

export function activePackCustomers(input: { lots: Pick<Lot, 'id' | 'person' | 'valid_from' | 'valid_until'>[]; left: { lot: string; left: unknown }[]; today: string }): number {
  const leftBy = new Map<string, number>();
  for (const r of input.left as LotLeft[]) {
    const n = typeof r.left === 'number' ? r.left : Number.NaN;
    if (Number.isFinite(n)) leftBy.set(r.lot, n);
  }
  const people = new Set<string>();
  for (const l of input.lots) {
    if (!l.person || (leftBy.get(l.id) ?? 0) <= 0) continue;
    if (l.valid_from && l.valid_from > input.today) continue;
    if (l.valid_until && l.valid_until < input.today) continue;
    people.add(l.person);
  }
  return people.size;
}
