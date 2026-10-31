import type { ClassLedgerRow, MembershipRow } from './schema';
import { packageLots } from './packages';

/**
 * Hoy all-roles (decision R-05: memberships are class packs). The production build has no `memberships` table: the
 * screens that read one as "the person's active plan" (desk and CRM people join, practice and studio analytics) read
 * this instead, one plan row per person from their active pack in the credits ledger (`class_ledger`):
 * - active: the lot has classes left and today is not past its expiry (`ends_at`); the pack spent next wins (earliest
 *   expiry, an open-ended pack last);
 * - paused: the lot is frozen today (`paused_until` = the freeze's end), like a paused membership.
 * Pure; display only (the server decides every booking).
 */
export function packMemberships(ledger: ClassLedgerRow[], today: string): MembershipRow[] {
  const best = new Map<string, { row: MembershipRow; end: string }>();
  for (const lot of packageLots(ledger)) {
    const p = lot.purchase;
    if (lot.left <= 0 || !p.user_id || (p.expires_at && p.expires_at < today)) continue;
    const frozen = !!p.frozen_from && !!p.frozen_until && p.frozen_from <= today && today < p.frozen_until;
    const row: MembershipRow = {
      id: `pack_${p.id}`, tenant_id: p.tenant_id, created_at: p.created_at, updated_at: p.updated_at, user_id: p.user_id,
      plan_id: p.plan_id ?? '', status: frozen ? 'paused' : 'active', starts_at: p.created_at.slice(0, 10), renews_at: null,
      ends_at: p.expires_at ?? null, paused_until: frozen ? p.frozen_until ?? null : null,
    };
    const end = p.expires_at ?? '9999-12-31';
    const had = best.get(p.user_id);
    if (!had || end < had.end) best.set(p.user_id, { row, end });
  }
  return [...best.values()].map((b) => b.row);
}
