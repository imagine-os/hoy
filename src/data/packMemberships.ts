import type { ClassLedgerRow, MembershipRow } from './schema';
import { frozenOn, packageLots } from './packages';

/**
 * Hoy all-roles (decision R-05: memberships are class packs). The production build has no `memberships` table: the
 * screens that read one as "the person's active plan" (desk and CRM people join, practice and studio analytics) read
 * this instead, one plan row per person from their active pack in the credits ledger (`class_ledger`):
 * - active: the lot has classes left and today is not past its expiry (`ends_at`); the pack spent next wins (earliest
 *   expiry, an open-ended pack last);
 * - paused: the lot is frozen today (`frozenOn`, as booking sees it; `paused_until` = the last frozen day), dated from
 *   the freeze's start (`updated_at`, which the analytics read as the day a pause began);
 * - a lot with a product (a pack) wins over one without (a comp or gift class), so the plan name shows.
 * One row per tenant and person.
 * Pure; display only (the server decides every booking).
 */
export function packMemberships(ledger: ClassLedgerRow[], today: string): MembershipRow[] {
  const best = new Map<string, { row: MembershipRow; rank: string }>();
  for (const lot of packageLots(ledger)) {
    const p = lot.purchase;
    if (lot.left <= 0 || !p.user_id || (p.expires_at && p.expires_at < today)) continue;
    const frozen = frozenOn(p, today);
    const row: MembershipRow = {
      id: `pack_${p.id}`, tenant_id: p.tenant_id, created_at: p.created_at, updated_at: frozen ? `${p.frozen_from}T00:00:00.000Z` : p.updated_at, user_id: p.user_id,
      plan_id: p.plan_id ?? '', status: frozen ? 'paused' : 'active', starts_at: p.created_at.slice(0, 10), renews_at: null,
      ends_at: p.expires_at ?? null, paused_until: frozen ? p.frozen_until ?? null : null,
    };
    // A pack before a product-less lot, then the one spent next (earliest expiry; open-ended last).
    const rank = `${p.plan_id ? 0 : 1}|${p.expires_at ?? '9999-12-31'}`;
    const key = `${p.tenant_id}|${p.user_id}`;
    const had = best.get(key);
    if (!had || rank < had.rank) best.set(key, { row, rank });
  }
  return [...best.values()].map((b) => b.row);
}
