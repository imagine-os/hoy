import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from '../../auth/SessionProvider';
import { useData, useTable } from '../../data/DataContext';
import type { BaseRow, BookingRow, ClassSessionRow, CreditRow, MembershipRow, ModalityRow, PaymentRow, PlanRow, ProfileRow, RoomRow, TeacherRow, UserRow } from '../../data/schema';
import { isSameDay } from '../../i18n/format';
import { tenant } from '../../tenant/tenant';
import { priceItem, type PriceItem } from '../../tenant/pricing';
import { insideCancelWindow, MINUTE, policy } from './policy';

export interface WaitlistRow extends BaseRow { user_id: string; session_id: string; position: number; status: 'waiting' | 'offered' | 'claimed' | 'expired' | 'left'; offered_at: string | null; claim_until: string | null }
export interface EmergencyContact { name: string; phone: string }
export interface ProfileFull extends ProfileRow { birthday: string | null; emergency_contact: EmergencyContact | null; notes: string | null }

export interface JoinedSession { session: ClassSessionRow; modality?: ModalityRow; teacher?: TeacherRow; room?: RoomRow }

/** One session joined with its modality, teacher and room. Live. */
export function useSessionJoined(id: string | undefined): { joined: JoinedSession | null; loading: boolean } {
  const { rows, loading } = useTable<ClassSessionRow>('class_sessions', id ? { where: { id } } : undefined);
  const { rows: modalities } = useTable<ModalityRow>('modalities');
  const { rows: teachers } = useTable<TeacherRow>('teachers');
  const { rows: rooms } = useTable<RoomRow>('rooms');
  return useMemo(() => {
    const s = id ? rows.find((r) => r.id === id) : undefined;
    if (!s) return { joined: null, loading };
    return { joined: { session: s, modality: modalities.find((m) => m.id === s.modality_id), teacher: teachers.find((t) => t.id === s.teacher_id), room: rooms.find((r) => r.id === s.room_id) }, loading };
  }, [id, rows, modalities, teachers, rooms, loading]);
}

/** All sessions joined (for lists). */
export function useAllSessionsJoined(): JoinedSession[] {
  const { rows: sessions } = useTable<ClassSessionRow>('class_sessions', { orderBy: { column: 'starts_at' } });
  const { rows: modalities } = useTable<ModalityRow>('modalities');
  const { rows: teachers } = useTable<TeacherRow>('teachers');
  const { rows: rooms } = useTable<RoomRow>('rooms');
  return useMemo(() => {
    const mod = new Map(modalities.map((m) => [m.id, m])), tea = new Map(teachers.map((t) => [t.id, t])), rm = new Map(rooms.map((r) => [r.id, r]));
    return sessions.map((s) => ({ session: s, modality: mod.get(s.modality_id), teacher: tea.get(s.teacher_id), room: rm.get(s.room_id) }));
  }, [sessions, modalities, teachers, rooms]);
}

export function useMyBookings() {
  const { user } = useSession();
  return useTable<BookingRow>('bookings', { where: { user_id: user.id } });
}

export function useMyProfile() {
  const { user } = useSession();
  const { rows: profiles } = useTable<ProfileFull>('profiles', { where: { user_id: user.id } });
  const { rows: users } = useTable<UserRow>('users', { where: { id: user.id } });
  return { profile: profiles[0] ?? null, account: users[0] ?? null };
}

export type EntitlementKind = 'credit' | 'membership' | 'trial' | 'single';

/** What the signed-in person can pay a class with, in the C-04 order: credits → membership → trial → single purchase. */
export function useEntitlements() {
  const { user } = useSession();
  const { rows: memberships } = useTable<MembershipRow>('memberships', { where: { user_id: user.id } });
  const { rows: credits } = useTable<CreditRow>('credits', { where: { user_id: user.id } });
  const { rows: payments } = useTable<PaymentRow>('payments', { where: { user_id: user.id } });
  const { rows: bookings } = useTable<BookingRow>('bookings', { where: { user_id: user.id } });
  const { rows: plans } = useTable<PlanRow>('plans');
  return useMemo(() => {
    const membership = memberships.find((m) => m.status === 'active') ?? memberships.find((m) => m.status === 'paused') ?? null;
    const plan = membership ? plans.find((p) => p.id === membership.plan_id) ?? null : null;
    const today = new Date().toISOString().slice(0, 10);
    const live = credits.filter((c) => !c.expires_at || c.expires_at >= today || c.delta < 0);
    const creditBalance = Math.max(0, live.reduce((a, c) => a + c.delta, 0));
    const nextExpiry = credits.filter((c) => c.delta > 0 && c.expires_at && c.expires_at >= today).map((c) => c.expires_at!).sort()[0] ?? null;
    const trialUsed = bookings.some((b) => b.paid_with === 'trial') || payments.some((p) => p.plan_id === 'plan_trial' && p.status === 'approved');
    const defaultKind: EntitlementKind = creditBalance > 0 ? 'credit' : membership?.status === 'active' ? 'membership' : !trialUsed ? 'trial' : 'single';
    return { membership, plan, credits, creditBalance, nextExpiry, trialUsed, payments, defaultKind, hasAnyEntitlement: creditBalance > 0 || membership?.status === 'active' };
  }, [memberships, credits, payments, bookings, plans]);
}

export function useWaitlistFor(sessionId: string | undefined) {
  const { user } = useSession();
  const { rows } = useTable<WaitlistRow>('waitlist', sessionId ? { where: { session_id: sessionId }, orderBy: { column: 'position' } } : undefined);
  const active = rows.filter((w) => w.status === 'waiting' || w.status === 'offered');
  const mine = active.find((w) => w.user_id === user.id) ?? rows.filter((w) => w.user_id === user.id).sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
  return { entries: rows, active, mine, position: mine ? active.filter((w) => w.status === 'waiting').findIndex((w) => w.id === mine.id) + 1 : 0 };
}

/** Ticks every `ms`; returns Date.now(). */
export function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(id); }, [ms]);
  return now;
}

/** The C-04 / C-08 / C-20 transactions, written the same way from every page. */
export function useBookingActions() {
  const data = useData();
  const { user } = useSession();

  /** Rule: one class per person per day. Returns the conflicting booking's session id when there is one. */
  const sameDayConflict = useCallback((myBookings: BookingRow[], sessions: ClassSessionRow[], target: ClassSessionRow): string | null => {
    if (tenant.studio.perPersonPerDay !== 1) return null;
    const active = myBookings.filter((b) => b.status === 'booked' && b.session_id !== target.id);
    const hit = active.find((b) => { const s = sessions.find((x) => x.id === b.session_id); return s && isSameDay(s.starts_at, target.starts_at); });
    return hit?.session_id ?? null;
  }, []);

  const book = useCallback(async (session: ClassSessionRow, paidWith: EntitlementKind, opts?: { creditPlanId?: string | null }) => {
    // Race guard: re-read the session so a spot that filled during checkout is caught (C-04 "Race" state).
    const fresh = await data.get<ClassSessionRow>('class_sessions', session.id);
    if (!fresh || fresh.status !== 'scheduled') throw new Error('session_unavailable');
    if (fresh.booked_count >= fresh.capacity) throw new Error('session_full');
    let creditId: string | null = null;
    if (paidWith === 'credit') {
      const c = await data.insert<CreditRow>('credits', { user_id: user.id, plan_id: opts?.creditPlanId ?? null, payment_id: null, delta: -1, reason: 'booking', expires_at: null } as Partial<CreditRow>);
      creditId = c.id;
    }
    const booking = await data.insert<BookingRow>('bookings', { user_id: user.id, session_id: fresh.id, status: 'booked', paid_with: paidWith, credit_id: creditId, checked_in_at: null, cancelled_at: null, rated: false });
    await data.update('class_sessions', fresh.id, { booked_count: fresh.booked_count + 1 });
    return booking;
  }, [data, user.id]);

  /** Offers the freed spot to the first waiting person (C-20: 30-minute claim window). */
  const promoteWaitlist = useCallback(async (sessionId: string) => {
    const waiting = (await data.list<WaitlistRow>('waitlist', { where: { session_id: sessionId, status: 'waiting' }, orderBy: { column: 'position' } }));
    const first = waiting[0];
    if (!first) return;
    const now = Date.now();
    await data.update('waitlist', first.id, { status: 'offered', offered_at: new Date(now).toISOString(), claim_until: new Date(now + policy.claimWindowMinutes * MINUTE).toISOString() });
  }, [data]);

  const cancel = useCallback(async (booking: BookingRow, session: ClassSessionRow, reason: 'customer' | 'studio' = 'customer') => {
    const late = reason === 'customer' && insideCancelWindow(session.starts_at);
    const status = late ? 'late_cancel' : 'cancelled';
    await data.update('bookings', booking.id, { status, cancelled_at: new Date().toISOString() });
    // Credit returns automatically outside the window, or always when the studio cancelled (E-03).
    if (booking.paid_with === 'credit' && !late) await data.insert('credits', { user_id: booking.user_id, plan_id: null, payment_id: null, delta: 1, reason: reason === 'studio' ? 'refund' : 'cancel_return', expires_at: null });
    if (session.status === 'scheduled') {
      await data.update('class_sessions', session.id, { booked_count: Math.max(0, session.booked_count - 1) });
      await promoteWaitlist(session.id);
    }
    return { late };
  }, [data, promoteWaitlist]);

  /** Reschedule = cancel + rebook in one transaction, same entitlement, no fee outside the window (C-08b). */
  const reschedule = useCallback(async (booking: BookingRow, from: ClassSessionRow, to: ClassSessionRow) => {
    const fresh = await data.get<ClassSessionRow>('class_sessions', to.id);
    if (!fresh || fresh.booked_count >= fresh.capacity || fresh.status !== 'scheduled') throw new Error('session_full');
    await data.update('bookings', booking.id, { status: 'cancelled', cancelled_at: new Date().toISOString() });
    await data.update('class_sessions', from.id, { booked_count: Math.max(0, from.booked_count - 1) });
    const next = await data.insert<BookingRow>('bookings', { user_id: booking.user_id, session_id: fresh.id, status: 'booked', paid_with: booking.paid_with, credit_id: booking.credit_id, checked_in_at: null, cancelled_at: null, rated: false });
    await data.update('class_sessions', fresh.id, { booked_count: fresh.booked_count + 1 });
    await promoteWaitlist(from.id);
    return next;
  }, [data, promoteWaitlist]);

  const joinWaitlist = useCallback(async (session: ClassSessionRow) => {
    const existing = await data.list<WaitlistRow>('waitlist', { where: { session_id: session.id } });
    const position = existing.filter((w) => w.status === 'waiting' || w.status === 'offered').length + 1;
    return data.insert<WaitlistRow>('waitlist', { user_id: user.id, session_id: session.id, position, status: 'waiting', offered_at: null, claim_until: null } as Partial<WaitlistRow>);
  }, [data, user.id]);

  const leaveWaitlist = useCallback(async (entry: WaitlistRow) => data.update('waitlist', entry.id, { status: 'left' }), [data]);

  const claimWaitlist = useCallback(async (entry: WaitlistRow, session: ClassSessionRow, paidWith: EntitlementKind) => {
    const booking = await book(session, paidWith);
    await data.update('waitlist', entry.id, { status: 'claimed' });
    return booking;
  }, [book, data]);

  return { book, cancel, reschedule, joinWaitlist, leaveWaitlist, claimWaitlist, sameDayConflict, promoteWaitlist };
}

/** Pricing helpers shared by C-04 / C-07 / C-17 — every figure comes from pricing.ts. */
export const priceOf = (id: string): PriceItem => { const p = priceItem(id); if (!p) throw new Error(`unknown price ${id}`); return p; };
export const PASS_IDS = ['trial', 'single', 'pack3', 'pack10'] as const;

/** Small localStorage-backed per-user preference (notification prefs, read receipts, invites) until their tables exist. */
export function useLocalPref<T>(key: string, initial: T): [T, (next: T | ((prev: T) => T)) => void] {
  const { user } = useSession();
  const k = `hoyos.pref.${user.id}.${key}`;
  const [v, setV] = useState<T>(() => { try { const raw = localStorage.getItem(k); return raw ? (JSON.parse(raw) as T) : initial; } catch { return initial; } });
  const set = useCallback((next: T | ((prev: T) => T)) => setV((prev) => { const val = typeof next === 'function' ? (next as (p: T) => T)(prev) : next; try { localStorage.setItem(k, JSON.stringify(val)); } catch { /* ignore */ } return val; }), [k]);
  return [v, set];
}
