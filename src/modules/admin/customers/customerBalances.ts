/**
 * AD-07 · each customer's package, classes left, expiry and vouchers, from Company OS credits (production build).
 *
 * The balance is a query, not a stored number (credits 1.1.0): a lot's classes left are the sum of its entries'
 * `delta`; a lot is usable today when `valid_from ≤ today ≤ valid_until` (empty = open), it isn't frozen
 * (`frozen_from ≤ today < frozen_until`) and it has classes left. This mirrors that definition for display only;
 * the server decides every booking.
 */
export interface Lot { id: string; person: string; source: string; product: string | null; valid_from: string | null; valid_until: string | null; frozen_from: string | null; frozen_until: string | null; voucher: string | null }
export interface LotLeft { lot: string; left: number }
export interface Voucher { id: string; buyer: string | null; redeemed_by: string | null; uses: number; max_uses: number; valid_until: string | null }
export interface CustomerBalance {
  /** The product of the lot that will be spent next (the earliest to expire among usable ones), else the newest lot's. */
  product: string | null;
  remaining: number;
  /** The earliest last-valid day among usable lots with classes left. */
  expires: string | null;
  frozen: boolean;
  /** How many vouchers: redeemed gift or courtesy lots with classes left, plus vouchers they bought that are still open. */
  vouchers: number;
}

const usable = (l: Lot, today: string, left: number) =>
  left > 0 && (!l.valid_from || l.valid_from <= today) && (!l.valid_until || today <= l.valid_until) && !frozenToday(l, today);
const frozenToday = (l: Lot, today: string) => !!l.frozen_from && !!l.frozen_until && l.frozen_from <= today && today < l.frozen_until;

export function customerBalances(input: { lots: Lot[]; left: LotLeft[]; vouchers: Voucher[]; today: string }): Map<string, CustomerBalance> {
  const leftBy = new Map(input.left.map(r => [r.lot, r.left]));
  const byPerson = new Map<string, Lot[]>();
  for (const l of input.lots) byPerson.set(l.person, [...(byPerson.get(l.person) ?? []), l]);
  const out = new Map<string, CustomerBalance>();
  for (const [person, lots] of byPerson) {
    const live = lots.filter(l => usable(l, input.today, leftBy.get(l.id) ?? 0))
      .sort((a, b) => (a.valid_until ?? '9999-12-31').localeCompare(b.valid_until ?? '9999-12-31'));
    const newest = [...lots].sort((a, b) => (b.valid_from ?? '').localeCompare(a.valid_from ?? ''))[0];
    const fromVouchers = live.filter(l => l.voucher || l.source === 'gift' || l.source === 'courtesy').length;
    out.set(person, {
      product: (live[0] ?? newest)?.product ?? null,
      remaining: live.reduce((a, l) => a + (leftBy.get(l.id) ?? 0), 0),
      expires: live.find(l => l.valid_until)?.valid_until ?? null,
      frozen: lots.some(l => (leftBy.get(l.id) ?? 0) > 0 && frozenToday(l, input.today)),
      vouchers: fromVouchers,
    });
  }
  for (const v of input.vouchers) {
    if (!v.buyer || v.uses >= v.max_uses || (v.valid_until && v.valid_until < input.today)) continue;
    const b = out.get(v.buyer) ?? { product: null, remaining: 0, expires: null, frozen: false, vouchers: 0 };
    out.set(v.buyer, { ...b, vouchers: b.vouchers + 1 });
  }
  return out;
}

/** The two credits queries plus vouchers that feed `customerBalances` (integration guide, "Balance"). */
export const BALANCE_QUERIES = {
  lots: { entity: 'credit_lot' },
  left: { entity: 'credit_entry', aggregate: { groupBy: ['lot'], metrics: [{ op: 'sum', field: 'delta', alias: 'left' }] } },
  vouchers: { entity: 'voucher' },
} as const;
