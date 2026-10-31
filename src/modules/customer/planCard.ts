import type { PackageState } from '../../data/packages';

/**
 * C-01 "your plan" card (Hoy all-roles, decision R-05: memberships are class packs). The active pack comes from the
 * credits ledger (`class_ledger` → Company OS `credit_entry` with its lot): classes left and the day they expire, or
 * until when it is frozen. The review build's recurring membership row still shows when there is one and no pack
 * (nothing removed); production has no `memberships` adapter, so there it is always a pack or the nudge to buy one.
 */
export type PlanCard =
  | { kind: 'pack'; left: number; expires: string | null; frozenUntil: string | null }
  | { kind: 'membership'; date: string }
  | { kind: 'none' };

export interface PlanCardInput {
  membership: { status: string; renews_at?: string | null; starts_at: string } | null;
  pkg: Pick<PackageState, 'left' | 'expiresAt' | 'frozen' | 'frozenUntil'>;
}

export function planCard({ membership, pkg }: PlanCardInput): PlanCard {
  const left = Number.isFinite(pkg.left) ? Math.floor(pkg.left) : 0;
  if (left > 0) return { kind: 'pack', left, expires: pkg.expiresAt ?? null, frozenUntil: pkg.frozen ? pkg.frozenUntil ?? null : null };
  if (membership?.status === 'active') return { kind: 'membership', date: membership.renews_at ?? membership.starts_at };
  return { kind: 'none' };
}
