import type { DataProvider } from '../../../data/types';
import { dateKey } from '../../../i18n/format';
import { CosError, cosOf, queryAll } from '../../transfers/launch/cos';
import { redeemPath, type CosVoucher } from './model';

/**
 * Teacher codes (Hoy 12 Nov, D3-D6): a courtesy voucher that names a teacher (`coach`), is for people new to Hoy
 * (`first_time_only`, enforced by Company OS) and has no recipient, so nothing is emailed: Administration shares the
 * code or its link. The report counts, per teacher, who redeemed and who then bought (R2).
 */
export interface TeacherCodeForm { coach: string; classes: string; validUntil: string; maxUses: string }
const whole = (raw: string) => (/^\d+$/.test(raw.trim()) ? Number(raw.trim()) : NaN);

export function teacherCodeErrors(f: TeacherCodeForm, today: string): Partial<Record<keyof TeacherCodeForm, string>> {
  const e: Partial<Record<keyof TeacherCodeForm, string>> = {};
  const classes = whole(f.classes), uses = whole(f.maxUses);
  if (!f.coach.trim()) e.coach = 'vouchers.cos.err.coach';
  if (!Number.isSafeInteger(classes) || classes < 1 || classes > 100) e.classes = 'vouchers.cos.err.classes';
  if (!Number.isSafeInteger(uses) || uses < 1 || uses > 500) e.maxUses = 'vouchers.cos.err.maxUses';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.validUntil) || f.validUntil < today) e.validUntil = 'vouchers.cos.err.validUntil';
  return e;
}
/** Company OS fields only; no recipient (a courtesy without one is logged as skipped, so no email goes out). */
export const teacherCodeBody = (f: TeacherCodeForm) => ({
  kind: 'courtesy' as const, classes: whole(f.classes), valid_until: f.validUntil, max_uses: whole(f.maxUses),
  coach: f.coach.trim(), first_time_only: true,
});

/** The app link that opens the redeem page with the code filled in (hash routing, as the emailed link). */
export const teacherCodeLink = (base: string, code: string) => `${(base ?? '').replace(/\/+$/, '')}/#${redeemPath(code)}`;

// ── reads ───────────────────────────────────────────────────────────────────────────────────────────────────────
type Loose = Record<string, unknown>;
export interface VoucherLot { id: string; person: string; voucher: string; created_at: string; name?: string }
const str = (v: unknown) => (typeof v === 'string' ? v : null);
const idOf = (v: unknown) => (v && typeof v === 'object' ? str((v as Loose).id) : str(v));

/** `credit_lot` records (`{ id, data, createdAt }`, references as ids or `{ id, name }`) as flat rows; lots without a voucher are dropped. */
export function creditLotRows(recs: unknown[]): VoucherLot[] {
  return recs.flatMap((rec) => {
    const r = (rec ?? {}) as Loose, d = (r.data && typeof r.data === 'object' ? r.data : r) as Loose;
    const id = str(r.id), person = idOf(d.person), voucher = idOf(d.voucher);
    if (!id || !person || !voucher) return [];
    const name = d.person && typeof d.person === 'object' ? str((d.person as Loose).name) : null;
    return [{ id, person, voucher, created_at: str(r.createdAt) ?? str(r.created_at) ?? str(d.created_at) ?? '', ...(name ? { name } : {}) }];
  });
}
/** Every lot a voucher made, with the person's name where Company OS includes it. Administration reads credit lots. */
export async function listVoucherLots(data: DataProvider): Promise<VoucherLot[]> {
  const cos = cosOf(data);
  if (!cos) throw new CosError('not_in_launch');
  const recs = await queryAll<Loose>(cos, { entity: 'credit_lot', filter: { field: 'voucher', op: 'is_not_null' }, include: [{ field: 'person', fields: ['name'] }] }, 20_000);
  return creditLotRows(recs);
}

// ── the funnel (R2) ─────────────────────────────────────────────────────────────────────────────────────────────
export interface PaymentFact { person: string; at: string; day: string }
/** Approved payments only (pending, declined and voided are not a purchase), from a mapped row or a Company OS one. */
export function approvedPayments(rows: Loose[]): PaymentFact[] {
  return rows.flatMap((raw) => {
    const r = (raw.data && typeof raw.data === 'object' ? { ...(raw.data as Loose), id: raw.id } : raw) as Loose;
    const person = str(r.person) ?? str(r.user_id);
    if (!person || r.status !== 'approved') return [];
    const at = str(r.paid_at) ?? str(r.approved_at) ?? '';
    const day = str(r.date) ?? (at ? dateKey(new Date(at)) : '');
    return at || day ? [{ person, at, day }] : [];
  });
}
/** After the redemption: by the instant when the payment has one, else on a later studio day. */
const boughtAfter = (p: PaymentFact, redeemedAt: string) => {
  const redeemed = Date.parse(redeemedAt);
  if (p.at && !Number.isNaN(redeemed) && !Number.isNaN(Date.parse(p.at))) return Date.parse(p.at) > redeemed;
  return !!p.day && !Number.isNaN(redeemed) && p.day > dateKey(new Date(redeemed));
};

export interface FunnelPerson { person: string; name: string; redeemedAt: string; boughtLater: boolean }
export interface TeacherFunnel { coach: string; name: string; codes: CosVoucher[]; redeemed: number; bought: number; people: FunnelPerson[] }
export function teacherFunnel({ coaches, vouchers, lots, payments, names }: {
  coaches: { id: string; name: string }[]; vouchers: CosVoucher[]; lots: VoucherLot[]; payments: Loose[]; names: Map<string, string>;
}): TeacherFunnel[] {
  const paid = approvedPayments(payments);
  return coaches.map((coach) => {
    const codes = vouchers.filter((v) => v.coach === coach.id);
    const ids = new Set(codes.map((v) => v.id));
    // One person per teacher, whichever and however many of the teacher's codes they used; the first redemption counts.
    const first = new Map<string, VoucherLot>();
    for (const l of lots) if (ids.has(l.voucher) && (!first.has(l.person) || l.created_at < first.get(l.person)!.created_at)) first.set(l.person, l);
    const people = [...first.values()].map((l) => ({
      person: l.person, name: names.get(l.person) ?? l.name ?? l.person, redeemedAt: l.created_at,
      boughtLater: paid.some((p) => p.person === l.person && boughtAfter(p, l.created_at)),
    })).sort((a, b) => a.redeemedAt.localeCompare(b.redeemedAt));
    return { coach: coach.id, name: coach.name, codes, redeemed: people.length, bought: people.filter((p) => p.boughtLater).length, people };
  });
}
