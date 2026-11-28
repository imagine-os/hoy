import type { Lot } from './customers/customerBalances';
import { CosError, queryAll, type CosPort } from '../transfers/launch/cos';

const MAX_RECORDS = 5000;
const LOT_BATCH = 100;
const byId = [{ field: 'id', dir: 'asc' as const }];

/** Classify by the purchased product row, not remaining quantity or display name. Historical products still count. */
export const ACTIVE_PACK_QUERIES = {
  lots: { entity: 'credit_lot', sort: byId },
  left: { entity: 'credit_entry', aggregate: { groupBy: ['lot'], metrics: [{ op: 'sum', field: 'delta', alias: 'left' }] } },
  products: { entity: 'product', sort: byId },
};

const str = (v: unknown) => typeof v === 'string' ? v : null;

/** The server caps unpaged group-by results. Group only a bounded set of eligible lot IDs per request. */
export async function readDashboardCreditCounts(cos: CosPort, today: string) {
  const [l, p] = await Promise.all([
    queryAll<Record<string, unknown>>(cos, ACTIVE_PACK_QUERIES.lots, MAX_RECORDS),
    queryAll<Record<string, unknown>>(cos, ACTIVE_PACK_QUERIES.products, MAX_RECORDS),
  ]);
  if (l.length >= MAX_RECORDS || p.length >= MAX_RECORDS) throw new CosError('dashboard_credits_incomplete');
  const products = p.map((r) => ({ id: r.id, kind: r.data.kind }));
  const eligible = new Set(products.filter(({ kind }) => kind === 'pack' || kind === 'single').map(({ id }) => id));
  const lots = l.flatMap((r) => {
    const d = r.data;
    const person = str(d.person), product = str(d.product), valid_from = str(d.valid_from), valid_until = str(d.valid_until);
    return typeof r.id === 'string' && person && product && eligible.has(product) && (!valid_from || valid_from <= today) && (!valid_until || valid_until >= today)
      ? [{ id: r.id, person, product, valid_from, valid_until }] : [];
  });
  const ids = Array.from(new Set(lots.map(({ id }) => id)));
  if (ids.length !== lots.length) throw new CosError('dashboard_credits_incomplete');
  const chunks = Array.from({ length: Math.ceil(ids.length / LOT_BATCH) }, (_, i) => ids.slice(i * LOT_BATCH, (i + 1) * LOT_BATCH));
  const left: { lot: string; left: number }[] = [];
  for (let i = 0; i < chunks.length; i += 4) {
    const wave = await Promise.all(chunks.slice(i, i + 4).map(async (chunk) => {
      const { data } = await cos.request<{ data: { lot?: unknown; left?: unknown }[] }>('POST', '/query', {
        ...ACTIVE_PACK_QUERIES.left, filter: { field: 'lot', op: 'in', value: chunk },
      });
      const expected = new Set(chunk);
      const rows = data.map((r) => {
        const n = typeof r.left === 'number' || (typeof r.left === 'string' && r.left.trim()) ? Number(r.left) : NaN;
        if (typeof r.lot !== 'string' || !expected.delete(r.lot) || !Number.isSafeInteger(n)) throw new CosError('dashboard_credits_incomplete');
        return { lot: r.lot, left: n };
      });
      if (expected.size) throw new CosError('dashboard_credits_incomplete');
      return rows;
    }));
    left.push(...wave.flat());
  }
  return dashboardCreditCounts({ lots, left, products, today });
}

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
