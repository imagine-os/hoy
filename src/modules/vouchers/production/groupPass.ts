import type { BookingRow } from '../../../data/schema';
import type { DataProvider } from '../../../data/types';
import { CosError, myPerson, queryAll, type CosPort } from '../../transfers/launch/cos';
import { normalizeCode } from './model';

/**
 * C-43 / C-44 / S-02 · the group pass on Company OS (ADR 0045: payments 2.10.0, bookings 1.11.0, credits 1.5.0).
 * One approved purchase of a `group` product gives one code; the code books one class once, and up to `places` people
 * take a place in it, each with a booking of their own (`entitlement: pass` + `pass_code`). Company OS decides
 * everything: who may use the code, the class, the room for the group, the places left, the person limits, the party
 * stamps. These helpers only build the writes, read the results and give the share link.
 */
export interface GroupVoucher {
  id: string; code: string; places: number; joined: number; uses: number; occurrence: string | null;
  valid_until: string | null; buyer: string | null; product: string | null; voided_at: string | null; created_at: string;
}
/** A booking row as the provider reads it, with the party stamps (server-set). */
export type PassBookingRow = BookingRow & { party?: string | null; party_size?: number | null; party_lead?: boolean | null; pass_code?: string | null; source?: string | null };

type Loose = Record<string, unknown>;
const str = (v: unknown) => (typeof v === 'string' && v ? v : null);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const ref = (v: unknown) => (v && typeof v === 'object' && 'id' in (v as object) ? str((v as { id: unknown }).id) : str(v));

export const isGroupVoucher = (row: unknown): boolean => !!row && typeof row === 'object' && (row as { kind?: unknown }).kind === 'group';

/** A `voucher` record (`{ id, data }`) or a flat row as a group voucher; anything else is null. */
export function groupVoucher(rec: unknown): GroupVoucher | null {
  if (!rec || typeof rec !== 'object') return null;
  const r = rec as Loose;
  const d = (r.data && typeof r.data === 'object' ? r.data : r) as Loose;
  const code = str(d.code), places = num(d.places);
  if (d.kind !== 'group' || typeof r.id !== 'string' || !code || places == null) return null;
  return {
    id: r.id, code, places, joined: num(d.joined) ?? 0, uses: num(d.uses) ?? 0, occurrence: ref(d.occurrence), valid_until: str(d.valid_until),
    buyer: ref(d.buyer), product: ref(d.product), voided_at: str(d.voided_at), created_at: str(r.createdAt) ?? str(r.created_at) ?? '',
  };
}

/** Display only (the server refuses on its own). */
export type PassState = 'unused' | 'used' | 'expired' | 'voided';
export function passState(v: GroupVoucher, today: string): PassState {
  if (v.voided_at) return 'voided';
  if (v.uses > 0 || v.occurrence) return 'used';
  if (v.valid_until && v.valid_until < today) return 'expired';
  return 'unused';
}

/**
 * C-43: the member's own group passes, newest first. The recipe's policy lets a member read only vouchers of kind
 * `group` whose buyer is their person; the filter says the same, so the read never lists anyone else's.
 */
export async function myGroupPasses(cos: CosPort): Promise<GroupVoucher[]> {
  const person = await myPerson(cos);
  if (!person) return [];
  const recs = await queryAll<Loose>(cos, {
    entity: 'voucher',
    filter: { and: [{ field: 'kind', op: 'eq', value: 'group' }, { field: 'buyer', op: 'eq', value: person.id }] },
    sort: [{ field: 'code', dir: 'asc' }],
  });
  return recs.flatMap((r) => groupVoucher(r) ?? []).sort((a, b) => b.created_at.localeCompare(a.created_at) || a.code.localeCompare(b.code));
}

/** The join page: `/app/pass/<CODE>`, and once the class is booked `?c=<occurrence>` so friends land on that class. */
export const passPath = (code: string, occurrenceId?: string | null) => `/app/pass/${encodeURIComponent(normalizeCode(code))}${occurrenceId ? `?c=${encodeURIComponent(occurrenceId)}` : ''}`;
/** The full share link (hash router), on this site's own address. */
export function passLink(code: string, occurrenceId?: string | null, loc: Pick<Location, 'origin' | 'pathname'> = window.location): string {
  return `${loc.origin}${loc.pathname}#${passPath(code, occurrenceId)}`;
}

/** The booking row a pass place is: one person, one class, entitlement `pass` and the code (never stored). */
export function passBooking(i: { personId: string; occurrenceId: string; code: string; source: 'member' | 'desk' }): Partial<PassBookingRow> {
  return { user_id: i.personId, session_id: i.occurrenceId, paid_with: 'pass', pass_code: normalizeCode(i.code), source: i.source, status: 'booked' };
}

function atomic<T>(data: DataProvider, key: string, write: (tx: DataProvider) => Promise<T>): Promise<T> {
  if (!data.atomic) throw new CosError('disconnected');
  return data.atomic(write, { idempotencyKey: key });
}
/** One keyed pass booking, then the stored row (the server sets the party stamps); the sent row if the re-read fails. */
async function placeBooking(data: DataProvider, row: Partial<PassBookingRow>, key: string): Promise<PassBookingRow> {
  const sent = await atomic(data, key, (tx) => tx.insert<PassBookingRow>('bookings', row));
  return (await data.get<PassBookingRow>('bookings', sent.id).catch(() => null)) ?? sent;
}

/**
 * C-44: the signed-in member takes their place with the code: the first booking makes them the group's lead and books
 * the class for the whole group; a later one with `?c=` joins that class. One write, one key per submit.
 */
export function joinPass(data: DataProvider, i: { personId: string; occurrenceId: string; code: string }, key: string): Promise<PassBookingRow> {
  return placeBooking(data, passBooking({ ...i, source: 'member' }), key);
}

/** Classes a first use may pick: scheduled, not started, with room for the group when its size is known (display only). */
export function passClasses<T extends { session: { id: string; status: string; starts_at: string; capacity: number; booked_count: number } }>(list: readonly T[], places: number | null, now: number): T[] {
  return list.filter(({ session: s }) => s.status === 'scheduled' && Date.parse(s.starts_at) > now && (Number(s.capacity) || 0) - (Number(s.booked_count) || 0) >= Math.max(1, places ?? 1));
}

// ── S-02 · the desk ─────────────────────────────────────────────────────────────────────────────────────────────
const ACTIVE = ['booked', 'held', 'checked_in'];
export interface Party { party: string; size: number; named: number; lead: PassBookingRow | null; members: PassBookingRow[] }
/** The class's group passes: each party's active places, the lead first. */
export function parties(rows: readonly PassBookingRow[]): Party[] {
  const by = new Map<string, PassBookingRow[]>();
  for (const b of rows) if (b.party && ACTIVE.includes(String(b.status))) by.set(b.party, [...(by.get(b.party) ?? []), b]);
  return [...by.entries()].map(([party, list]) => {
    const members = [...list].sort((a, b) => Number(!!b.party_lead) - Number(!!a.party_lead) || (a.created_at ?? '').localeCompare(b.created_at ?? ''));
    const size = Math.max(...members.map((m) => Number(m.party_size) || 0), members.length);
    return { party, size, named: members.length, lead: members.find((m) => m.party_lead) ?? null, members };
  });
}

/** The code of a party: the desk reads vouchers; the voucher's id is the bookings' `party`. */
export async function partyCode(cos: CosPort, party: string): Promise<string> {
  const res = await cos.request<{ data: Loose[] }>('POST', '/query', { entity: 'voucher', filter: { field: 'id', op: 'eq', value: party }, limit: 1 });
  const v = groupVoucher(res.data[0]);
  if (!v) throw new CosError('voucher_invalid');
  return v.code;
}

/** The desk names a person in an unnamed place: a pass booking with the group's code (until check-in closes). */
export async function deskAddToParty(data: DataProvider, cos: CosPort, i: { party: string; personId: string; sessionId: string }, key: string): Promise<PassBookingRow> {
  const code = await partyCode(cos, i.party);
  return placeBooking(data, passBooking({ personId: i.personId, occurrenceId: i.sessionId, code, source: 'desk' }), key);
}

/** The desk swaps a named person (`person` on the booking; desk only, audited by Company OS). */
export function deskSwap(data: DataProvider, i: { bookingId: string; personId: string }, key: string): Promise<PassBookingRow> {
  return atomic(data, key, (tx) => tx.update<PassBookingRow>('bookings', i.bookingId, { user_id: i.personId }));
}

/** After a desk sale of a group product: the code its approval issued, if the desk may read it yet. */
export async function voucherForPayment(cos: CosPort, paymentId: string): Promise<GroupVoucher | null> {
  const res = await cos.request<{ data: Loose[] }>('POST', '/query', { entity: 'voucher', filter: { and: [{ field: 'kind', op: 'eq', value: 'group' }, { field: 'payment', op: 'eq', value: paymentId }] }, limit: 1 });
  return groupVoucher(res.data[0]);
}
