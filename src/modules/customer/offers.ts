import type { ClassLedgerRow } from '../../data/schema';
import { frozenOn, packageLots } from '../../data/packages';
import { dateKey } from '../../i18n/format';

/**
 * What the customer app offers (hoy-jas-1nov, Jas's 1 Nov walkthrough). Display only: Company OS still refuses what the
 * screen would have hidden (`trial_used`, `audience_not_allowed`); nothing here is a rule of its own.
 */

/**
 * PRO-04: the trial is offered unless the person has used it: the live assessment (`assessLiveTrial`: a trial lot, or a
 * pending or approved trial payment) or the review build's own flag. Whether a package holder may take it is open
 * (R-14), so `trial_active_package` doesn't hide it here.
 */
export const trialOffered = (ent: { trialUsed: boolean; trial: { status: string } }): boolean =>
  !ent.trialUsed && ent.trial.status !== 'trial_used';

/**
 * PRO-05: the member facet (people `member.price_audience`, docs/integration-guide.md) marks a verified affiliate. Rows
 * are `/query` records; anything else is not an affiliate.
 */
export function affiliateFromMembers(rows: readonly unknown[]): boolean {
  return rows.some((r) => {
    const data = r && typeof r === 'object' ? (r as { data?: unknown }).data : null;
    return !!data && typeof data === 'object' && (data as { price_audience?: unknown }).price_audience === 'affiliate';
  });
}

/**
 * PRO-05: an affiliate-only price (the pricing item carries an `audience`) shows in the signed-in app only for an
 * affiliate; while the facet is unread, not at all. The review build (`live: false`) and the public site are unchanged.
 */
export const audienceVisible = (item: { audience?: unknown }, { live, affiliate }: { live: boolean; affiliate: boolean | null }): boolean =>
  !live || !item.audience || affiliate === true;

/** PRO-06: the lot sources the app names (Company OS credits `lot.source`); anything else reads as plain classes. */
export const LOT_SOURCES = ['purchase', 'trial', 'gift', 'courtesy', 'comp', 'voucher'] as const;
export type LotSource = typeof LOT_SOURCES[number] | 'other';
const isSource = (v: unknown): v is typeof LOT_SOURCES[number] => typeof v === 'string' && (LOT_SOURCES as readonly string[]).includes(v);

/** The copy key of a lot's source: the lot's own (`lot_source`, production), else the review build's ledger reason. */
export function lotSourceKey(row: { lot_source?: unknown; reason?: unknown }): LotSource {
  if (row.lot_source != null) return isSource(row.lot_source) ? row.lot_source : 'other';
  return isSource(row.reason) ? row.reason : 'other';
}

export interface LotLine { id: string; source: LotSource; left: number; expires: string | null; frozenUntil: string | null }

/**
 * PRO-06: every live lot (classes left, not expired) with its source and its expiry, or none: the soonest expiry first,
 * lots without one last. Rows are the confirmed ledger rows (`approvedPackageRows`).
 */
export function liveLots(rows: ClassLedgerRow[], today: string = dateKey()): LotLine[] {
  return packageLots(rows)
    .filter((l) => l.left > 0 && (!l.purchase.expires_at || l.purchase.expires_at >= today))
    .sort((a, b) => (a.purchase.expires_at ?? '9999').localeCompare(b.purchase.expires_at ?? '9999')
      || a.purchase.created_at.localeCompare(b.purchase.created_at) || a.purchase.id.localeCompare(b.purchase.id))
    .map((l) => ({
      id: l.purchase.id,
      source: lotSourceKey(l.purchase as ClassLedgerRow & { lot_source?: unknown }),
      left: l.left,
      expires: l.purchase.expires_at ?? null,
      frozenUntil: frozenOn(l.purchase, today) ? l.purchase.frozen_until ?? null : null,
    }));
}
