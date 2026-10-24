import { dailyAdmissionConflict, requireDailyAdmission } from '../../data/dailyAdmission';
import { useScopedCustomerRead } from './useScopedCustomerRead';
import { joinTenantSessions, ownBookingRows } from './scopedSessionRows';
import { requireSessionAdmission, assertAdmissionContext } from '../../data/sessionAdmission';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {useTrialAssessment} from './useTrialAssessment';
import { useSession } from '../../auth/SessionProvider';
import type { DataProvider } from '../../data/types';
import { useData, useTable } from '../../data/DataContext';
import type { BaseRow, BookingRow, ClassSessionRow, ContentArticleRow, ClassLedgerRow, EventRow, EventRsvpRow, FaqEntryRow, InviteRow, MembershipRow, ModalityRow, NotificationRow, PaymentMethodRow, PaymentRow, PlanRow, ProfileRow, ReviewRow, RoomRow, TeacherRow, UserRow } from '../../data/schema';
import { dateKey } from '../../i18n/format';
import { tenant } from '../../tenant/tenant';
import { priceItem, type PriceItem } from '../../tenant/pricing';
import { policy } from './policy';
import { guardStudioWaitlist, promoteStudioWaitlist } from './studioWaitlist';
import { rescheduleBooking } from './rescheduleCommand';
import { approvedPackageRows, freezePatch, packageState, resumePatch, selectPackagePurchase } from '../../data/packages';

export interface WaitlistRow extends BaseRow { user_id: string; session_id: string; position: number; status: 'waiting' | 'offered' | 'claimed' | 'expired' | 'left'; offered_at: string | null; claim_until: string | null }
export interface EmergencyContact { name: string; phone: string }
export interface ProfileFull extends ProfileRow { birthday: string | null; emergency_contact: EmergencyContact | null; notes: string | null }

export interface JoinedSession { session: ClassSessionRow; modality?: ModalityRow; teacher?: TeacherRow; room?: RoomRow; templateActive?: boolean }

/** One session joined with its modality, teacher and room. Live. */
export function useSessionJoined(id: string | undefined): { joined: JoinedSession | null; loading: boolean } {
  const sessions = useScopedCustomerRead<ClassSessionRow>('class_sessions', id ? { where: { id } } : undefined);
  const modalities = useScopedCustomerRead<ModalityRow>('modalities');
  const teachers = useScopedCustomerRead<TeacherRow>('teachers');
  const rooms = useScopedCustomerRead<RoomRow>('rooms');
  const templates = useScopedCustomerRead<BaseRow & { active: boolean }>('class_templates');
  const loading = [sessions, modalities, teachers, rooms, templates].some(read => read.loading);
  const failed = [sessions, modalities, teachers, rooms, templates].some(read => read.error);
  return useMemo(() => {
    if (loading || failed || !id) return { joined: null, loading };
    const joined = joinTenantSessions({ sessions: sessions.rows, modalities: modalities.rows, teachers: teachers.rows, rooms: rooms.rows, templates: templates.rows }, tenant.id).find(row => row.session.id === id) ?? null;
    return { joined, loading };
  }, [id, loading, failed, sessions.rows, modalities.rows, teachers.rows, rooms.rows, templates.rows]);
}

/** All sessions joined (for lists). */
export function useAllSessionsJoined(): JoinedSession[] {
  const templates=useScopedCustomerRead<BaseRow & { active: boolean }>('class_templates');
  const sessions=useScopedCustomerRead<ClassSessionRow>('class_sessions', { orderBy: { column: 'starts_at' } });
  const modalities=useScopedCustomerRead<ModalityRow>('modalities');
  const teachers=useScopedCustomerRead<TeacherRow>('teachers');
  const rooms=useScopedCustomerRead<RoomRow>('rooms');
  const ready=[templates,sessions,modalities,teachers,rooms].every(read=>!read.loading&&!read.error);
  return useMemo(() => ready?joinTenantSessions({sessions:sessions.rows,modalities:modalities.rows,teachers:teachers.rows,rooms:rooms.rows,templates:templates.rows},tenant.id):[],[ready,sessions.rows,modalities.rows,teachers.rows,rooms.rows,templates.rows]);
}

export function useMyBookings() {
  const { user } = useSession();
  const result=useScopedCustomerRead<BookingRow>('bookings', undefined, true);
  return {...result,rows:ownBookingRows(result.rows,tenant.id,user.role==='public'?null:user.id)};
}

export function useMyProfile() {
  const { user } = useSession();
  const { rows: profiles } = useScopedCustomerRead<ProfileFull>('profiles', undefined, true);
  const { rows: users } = useScopedCustomerRead<UserRow>('users', { where: { id: user.id } });
  return { profile: profiles.find(row => row.user_id === user.id) ?? null, account: users.find(row => row.id === user.id) ?? null };
}

export type EntitlementKind = 'package' | 'membership' | 'trial' | 'single';

/**
 * What the signed-in person can pay a class with, in the C-04 order: a class of their package → trial → single class.
 * 0051: HOY has no credits and no membership at launch; the balance is the package's classes (src/data/packages.ts).
 * `membership` stays readable for a future recurring plan but nothing sells one.
 */
export function useEntitlements() {
  const { user } = useSession();
  const trial=useTrialAssessment(user.id);
  const { rows: memberships } = useScopedCustomerRead<MembershipRow>('memberships', undefined, true);
  const { rows: ledger } = useScopedCustomerRead<ClassLedgerRow>('class_ledger', undefined, true);
  const { rows: payments } = useScopedCustomerRead<PaymentRow>('payments', undefined, true);
  const { rows: bookings } = useScopedCustomerRead<BookingRow>('bookings', undefined, true);
  const { rows: plans } = useScopedCustomerRead<PlanRow>('plans');
  return useMemo(() => {
    const membership = memberships.find((m) => m.status === 'active') ?? memberships.find((m) => m.status === 'paused') ?? null;
    const pkg = packageState(approvedPackageRows(ledger, payments));
    const plan = membership ? plans.find((p) => p.id === membership.plan_id) ?? null : pkg.purchase?.plan_id ? plans.find((p) => p.id === pkg.purchase!.plan_id) ?? null : null;
    const trialUsed = bookings.some((b) => b.paid_with === 'trial') || payments.some((p) => p.plan_id === 'plan_trial' && p.status === 'approved');
    const defaultKind: EntitlementKind = pkg.balance > 0 ? 'package' : membership?.status === 'active' ? 'membership' : trial.status==='eligible' ? 'trial' : 'single';
    return { membership, plan, ledger, pkg, classBalance: pkg.balance, nextExpiry: pkg.expiresAt, trialUsed, trial, payments, defaultKind, hasAnyEntitlement: pkg.balance > 0 || membership?.status === 'active' };
  }, [memberships, ledger, payments, bookings, plans, trial.status]);
}

/** C-07b: freeze the package (once, up to the M-08 freezeMaxDays) and end a freeze early. */
export function usePackageActions() {
  const data = useData();
  const freeze = useCallback(async (purchase: ClassLedgerRow, days: number) => {
    if (purchase.frozen_from) throw new Error('freeze_used');
    if (days < 1 || days > policy.freezeMaxDays) throw new Error('freeze_days');
    await data.update('class_ledger', purchase.id, freezePatch(purchase, days));
  }, [data]);
  const resume = useCallback(async (purchase: ClassLedgerRow) => { await data.update('class_ledger', purchase.id, resumePatch(purchase)); }, [data]);
  return { freeze, resume };
}

export function useWaitlistFor(sessionId: string | undefined) {
  const { user } = useSession();
  const { rows: scoped } = useScopedCustomerRead<WaitlistRow>('waitlist', sessionId ? { where: { session_id: sessionId }, orderBy: { column: 'position' } } : undefined);
  const rows = sessionId ? scoped.filter(row => row.session_id === sessionId) : [];
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
  const { user, role } = useSession();
  const { rows: dailyVouchers } = useTable('voucher_bookings', { where: { tenant_id: tenant.id } });
  const live = useRef({data,actorId:user.id,role,mounted:true});
  live.current = {data,actorId:user.id,role,mounted:true};
  useEffect(()=>{live.current.mounted=true;return()=>{live.current.mounted=false;};},[]);
  const isCurrent = useCallback(()=>live.current.mounted && live.current.data===data && live.current.actorId===user.id && live.current.role===role && ['customer','teacher','super_admin'].includes(role),[data,user.id,role]);

  /** Rule: one class per person per day. Returns the conflicting booking's session id when there is one. */
  const sameDayConflict = useCallback((myBookings: BookingRow[], sessions: ClassSessionRow[], target: ClassSessionRow): string | null => {
    return dailyAdmissionConflict({ bookings: myBookings.filter(row => row.session_id !== target.id), voucher_bookings: dailyVouchers, class_sessions: sessions }, target, user.id);
  }, [dailyVouchers, user.id]);

  const book = useCallback(async (session: ClassSessionRow, paidWith: EntitlementKind, opts?: { packagePlanId?: string | null; paymentId?: string; matNumber?: number | null; data?: DataProvider; isCurrent?: () => boolean; claimId?: string | null }) => {
    const control={isCurrent:()=>isCurrent() && (!opts?.isCurrent || opts.isCurrent())};
    assertAdmissionContext(control);
    const run = async (transaction: DataProvider) => {
    // Race guard: re-read the session so a spot that filled during checkout is caught (C-04 "Race" state).
    const fresh = await requireSessionAdmission(transaction,session.id,control);
    if (!fresh || fresh.status !== 'scheduled' || !Number.isFinite(Date.parse(fresh.starts_at)) || Date.parse(fresh.starts_at) <= Date.now()) throw new Error('session_unavailable');
    if (fresh.booked_count >= fresh.capacity) throw new Error('session_full');
    const existing = await transaction.list<BookingRow>('bookings', { where: { user_id: user.id, session_id: fresh.id } });
    if (existing.some(b => b.status === 'booked' || b.status === 'checked_in')) throw new Error('booking_exists');
    await requireDailyAdmission(transaction, fresh, user.id, control);
    if(opts?.claimId){
      const entry=await transaction.get<WaitlistRow>('waitlist',opts.claimId);
      assertAdmissionContext(control);
      if(!entry || entry.tenant_id!==tenant.id || entry.user_id!==user.id || entry.session_id!==fresh.id || entry.status!=='offered' || !entry.claim_until || Date.parse(entry.claim_until)<=Date.now() || !Number.isFinite(Date.parse(entry.claim_until)))throw new Error('session_unavailable');
    }
    let purchase: ClassLedgerRow | undefined;
    if (paidWith === 'package') {
      const ledger = await transaction.list<ClassLedgerRow>('class_ledger', { where: { user_id: user.id } });
      const payments = await transaction.list<PaymentRow>('payments', { where: { user_id: user.id } });
      const confirmed = approvedPackageRows(ledger, payments);
      const eligible = opts?.paymentId ? confirmed.filter(row => row.payment_id === opts.paymentId) : confirmed;
      purchase = selectPackagePurchase(eligible, dateKey(), dateKey(new Date(fresh.starts_at)));
      if (opts?.paymentId && purchase?.reason !== 'purchase') throw new Error('package_balance');
      if (!purchase) throw new Error('package_balance');
    }
    await requireSessionAdmission(transaction,session.id,control);
    const booking = await transaction.insert<BookingRow>('bookings', { user_id: user.id, session_id: fresh.id, status: 'booked', paid_with: paidWith, ledger_id: null, checked_in_at: null, cancelled_at: null, rated: false, mat_number: opts?.matNumber ?? null });
    if (paidWith === 'package') {
      const c = await transaction.insert<ClassLedgerRow>('class_ledger', { purchase_ledger_id: purchase?.id ?? null, user_id: user.id, plan_id: purchase?.plan_id ?? null, payment_id: purchase?.payment_id ?? null, delta: -1, reason: 'booking', expires_at: null } as Partial<ClassLedgerRow>);
      await transaction.update('bookings', booking.id, { ledger_id: c.id });
      booking.ledger_id = c.id;
    }
    await transaction.update('class_sessions', fresh.id, { booked_count: fresh.booked_count + 1 });
    await transaction.insert('audit_log', { actor_id: user.id, action: 'booking.create', entity: 'bookings', entity_id: booking.id, ip: null,
      diff: { role, source: 'app', session_id: fresh.id, paid_with: paidWith } });
    if(opts?.claimId)await transaction.update('waitlist',opts.claimId,{status:'claimed'});
    assertAdmissionContext(control);
    return booking;
    };
    if (opts?.data) return run(opts.data);
    if (!data.atomic) throw new Error('atomic_adapter_required');
    const result=await data.atomic(run);
    assertAdmissionContext(control);
    return result;
  }, [data, user.id, role, isCurrent]);

  /** Offers the freed spot to the first waiting person (C-20: 30-minute claim window). */
  const promoteWaitlist = useCallback(async (sessionId: string) => {
    await promoteStudioWaitlist(data, sessionId,{isCurrent});
  }, [data,isCurrent]);

  /** Legacy entry point: privileged studio reason stays rejected; customers must use the reviewed command. */
  const cancel = useCallback(async (_booking: BookingRow, _session: ClassSessionRow, reason: 'customer' | 'studio' = 'customer') => {
    if (reason === 'studio') throw new Error('studio_cancellation_admin_required');
    throw new Error('customer_cancel_review_required');
  }, [data, promoteWaitlist]);

  /** Reschedule keeps the same entitlement; RS-09 permits it only through the 12-hour deadline. */
  const reschedule = useCallback(async (booking: BookingRow, from: ClassSessionRow, to: ClassSessionRow) => {
    if (!data.atomic) throw new Error('atomic_adapter_required');
    assertAdmissionContext({isCurrent});
    const result=await data.atomic(tx => rescheduleBooking(tx, { userId: user.id, role, bookingId: booking.id, fromSessionId: from.id, toSessionId: to.id,control:{isCurrent} }), { idempotencyKey: `reschedule:${user.id}:${booking.id}:${from.id}:${to.id}` });
    assertAdmissionContext({isCurrent});
    return result;
  }, [data, user.id, role,isCurrent]);

  const joinWaitlist = useCallback(async (session: ClassSessionRow) => {
    const run = async (transaction: DataProvider) => {
      await guardStudioWaitlist(transaction, session.id,{isCurrent});
    const existing = await transaction.list<WaitlistRow>('waitlist', { where: { session_id: session.id } });
    const position = existing.filter((w) => w.status === 'waiting' || w.status === 'offered').length + 1;
    await guardStudioWaitlist(transaction,session.id,{isCurrent});
    const result=await transaction.insert<WaitlistRow>('waitlist', { user_id: user.id, session_id: session.id, position, status: 'waiting', offered_at: null, claim_until: null } as Partial<WaitlistRow>);
    assertAdmissionContext({isCurrent});
    return result;
    };
    assertAdmissionContext({isCurrent});
    if(!data.atomic)throw new Error('atomic_adapter_required');
    const result=await data.atomic(run);
    assertAdmissionContext({isCurrent});
    return result;
  }, [data, user.id,isCurrent]);

  const changeWaitlist = useCallback(async (entry: WaitlistRow, status:'left'|'expired') => {
    assertAdmissionContext({isCurrent});
    if(!data.atomic)throw new Error('atomic_adapter_required');
    await data.atomic(async tx=>{
      const fresh=await tx.get<WaitlistRow>('waitlist',entry.id);
      assertAdmissionContext({isCurrent});
      if(!fresh || fresh.tenant_id!==tenant.id || fresh.user_id!==user.id || fresh.session_id!==entry.session_id)throw new Error('session_unavailable');
      if(!['waiting','offered'].includes(fresh.status))return;
      if(status==='expired' && (fresh.status!=='offered' || !fresh.claim_until || !Number.isFinite(Date.parse(fresh.claim_until)) || Date.parse(fresh.claim_until)>Date.now()))return;
      await tx.update('waitlist',fresh.id,{status});
      if(status==='expired')await promoteStudioWaitlist(tx,fresh.session_id,{isCurrent},true);
      assertAdmissionContext({isCurrent});
    });
    assertAdmissionContext({isCurrent});
  },[data,user.id,isCurrent]);
  const leaveWaitlist=useCallback((entry:WaitlistRow)=>changeWaitlist(entry,'left'),[changeWaitlist]);
  const expireWaitlist=useCallback((entry:WaitlistRow)=>changeWaitlist(entry,'expired'),[changeWaitlist]);

  const claimWaitlist = useCallback(async (entry: WaitlistRow, session: ClassSessionRow, paidWith: EntitlementKind) => {
    return book(session,paidWith,{claimId:entry.id});
  }, [book, data]);

  return { book, cancel, reschedule, joinWaitlist, leaveWaitlist, claimWaitlist, sameDayConflict, promoteWaitlist,expireWaitlist };
}

/** Pricing helpers shared by C-04 / C-07 / C-17 — every figure comes from pricing.ts. */
export const priceOf = (id: string): PriceItem => { const p = priceItem(id); if (!p) throw new Error(`unknown price ${id}`); return p; };
/** Pay-per-class items (C-07): the trial class and the individual class. */
export const PASS_IDS = ['trial', 'single'] as const;
/** The packages a member can buy (C-06, C-04): the 12-class package and its Santa María Tennis Club price. */
export const PACKAGE_IDS = ['pack12', 'pack12_smtc'] as const;

/**
 * Small localStorage-backed per-viewer preference. Since 0008 the faked data (notification prefs,
 * invites, ratings, RSVPs) lives in real tables; what stays here is genuinely local — the C-13 read
 * receipts and the C-20 auto-claim switch — because no table claims to own it.
 */
export function useLocalPref<T>(key: string, initial: T): [T, (next: T | ((prev: T) => T)) => void] {
  const { user } = useSession();
  const k = `hoyos.pref.${user.id}.${key}`;
  const [v, setV] = useState<T>(() => { try { const raw = localStorage.getItem(k); return raw ? (JSON.parse(raw) as T) : initial; } catch { return initial; } });
  const set = useCallback((next: T | ((prev: T) => T)) => setV((prev) => { const val = typeof next === 'function' ? (next as (p: T) => T)(prev) : next; try { localStorage.setItem(k, JSON.stringify(val)); } catch { /* ignore */ } return val; }), [k]);
  return [v, set];
}

// ---------------------------------------------------------------------------------------------
// Tables added in 0008 (data depth): notifications, notification_prefs, reviews, invites,
// events + event_rsvps, payment_methods, content_articles, faq_entries. Every page reads them
// through useTable(); nothing here keeps state in localStorage any more.
// ---------------------------------------------------------------------------------------------

/** C-24 inbox: my notifications, newest first, with the unread count and read/mark-all writers. */
export function useMyNotifications() {
  const data = useData();
  const { rows, loading } = useScopedCustomerRead<NotificationRow>('notifications', { orderBy: { column: 'created_at', dir: 'desc' } }, true);
  const unread = rows.filter((n) => !n.read_at).length;
  const markRead = useCallback(async (n: NotificationRow) => { if (!n.read_at) await data.update('notifications', n.id, { read_at: new Date().toISOString() }); }, [data]);
  const markAllRead = useCallback(async () => { const at = new Date().toISOString(); for (const n of rows) if (!n.read_at) await data.update('notifications', n.id, { read_at: at }); }, [data, rows]);
  return { rows, loading, unread, markRead, markAllRead };
}

export { NOTIF_CHANNELS, NOTIF_CATEGORIES, type NotifChannel, type NotifCategory } from './notificationPrefs';
export { useAtomicNotificationPrefs as useNotificationPrefs } from './useNotificationPrefs';

/** C-10: the reviews this person wrote, and the writer that records one. */
export function useMyReviews() {
  const data = useData();
  const { user } = useSession();
  const { rows } = useScopedCustomerRead<ReviewRow>('reviews', undefined, true);
  const forSession = useCallback((sessionId: string | undefined) => (sessionId ? rows.find((r) => r.class_session_id === sessionId) ?? null : null), [rows]);
  const rate = useCallback(async (input: { session: ClassSessionRow; rating: number; tags: string[]; comment: string; anonymous: boolean; booking?: BookingRow | null }) => {
    const review = await data.insert<ReviewRow>('reviews', {
      user_id: user.id, class_session_id: input.session.id, teacher_id: input.session.teacher_id,
      rating: input.rating, tags: input.tags, comment: input.comment.trim() || null, visibility: input.anonymous ? 'anonymous' : 'named',
    } as Partial<ReviewRow>);
    if (input.booking) await data.update('bookings', input.booking.id, { rated: true });
    // teachers.rating_avg stays the studio-facing average of every review of that teacher.
    const all = await data.list<ReviewRow>('reviews', { where: { teacher_id: input.session.teacher_id } });
    if (all.length) await data.update('teachers', input.session.teacher_id, { rating_avg: Math.round((all.reduce((a, r) => a + r.rating, 0) / all.length) * 10) / 10 });
    return review;
  }, [data, user.id]);
  return { rows, forSession, rate };
}

/** Reviews of one class session (teacher app, read-only). */
export function useSessionReviews(sessionId: string | undefined) {
  const { rows } = useTable<ReviewRow>('reviews', { where: { class_session_id: sessionId ?? '__none__' } });
  return useMemo(() => {
    if (!sessionId || rows.length === 0) return { rows: [] as ReviewRow[], count: 0, average: null as number | null, tags: [] as { tag: string; n: number }[] };
    const counts = new Map<string, number>();
    for (const r of rows) for (const tag of r.tags ?? []) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    return {
      rows, count: rows.length,
      average: Math.round((rows.reduce((a, r) => a + r.rating, 0) / rows.length) * 10) / 10,
      tags: [...counts.entries()].map(([tag, n]) => ({ tag, n })).sort((a, b) => b.n - a.n),
    };
  }, [rows, sessionId]);
}

/** C-16: invites I sent, plus the writer that records a new one with my referral code. */
export function useMyInvites() {
  const data = useData();
  const { user } = useSession();
  const { rows: scoped } = useScopedCustomerRead<InviteRow>('invites', { where: { inviter_user_id: user.id }, orderBy: { column: 'created_at', dir: 'desc' } });
  const rows = scoped.filter(row => row.inviter_user_id === user.id);
  const code = `${tenant.invoicePrefix}-${user.id.slice(-4).toUpperCase()}`;
  const send = useCallback(async (input: { channel: InviteRow['channel']; target: string; sessionId?: string | null }) => {
    const email = input.target.includes('@');
    return data.insert<InviteRow>('invites', {
      inviter_user_id: user.id, invitee_phone: !email && /\d/.test(input.target) ? input.target : null, invitee_email: email ? input.target : null,
      invitee_user_id: null, channel: input.channel, code, session_id: input.sessionId ?? null, status: 'prepared', reward_ledger_id: null,
    } as Partial<InviteRow>);
  }, [code, data, user.id]);
  return { rows, code, send };
}

/** C-05: my saved payment methods, with add / remove / make-default. */
export function usePaymentMethods() {
  const data = useData();
  const { user } = useSession();
  const { rows } = useScopedCustomerRead<PaymentMethodRow>('payment_methods', { orderBy: { column: 'created_at', dir: 'desc' } }, true);
  const makeDefault = useCallback(async (row: PaymentMethodRow) => {
    for (const m of rows) if (m.is_default && m.id !== row.id) await data.update('payment_methods', m.id, { is_default: false });
    await data.update('payment_methods', row.id, { is_default: true });
  }, [data, rows]);
  /** INTEGRATION SEAM: `token_ref` is a placeholder. With Wompi live, the widget returns the real token and this insert stores only that reference. */
  const add = useCallback(async (input: { kind: PaymentMethodRow['kind']; brand: string; last4?: string | null; expires?: string | null; tokenRef: string }) => {
    const first = rows.length === 0;
    const created = await data.insert<PaymentMethodRow>('payment_methods', {
      user_id: user.id, provider: 'wompi', kind: input.kind, brand: input.brand, last4: input.last4 ?? null,
      token_ref: input.tokenRef, is_default: first, expires: input.expires ?? null,
    } as Partial<PaymentMethodRow>);
    return created;
  }, [data, rows.length, user.id]);
  const remove = useCallback(async (row: PaymentMethodRow) => {
    await data.remove('payment_methods', row.id);
    const rest = rows.filter((m) => m.id !== row.id);
    if (row.is_default && rest[0]) await data.update('payment_methods', rest[0].id, { is_default: true });
  }, [data, rows]);
  return { rows, add, remove, makeDefault };
}

/** C-23: published events, upcoming first, joined with my RSVP. */
export function useEvents() {
  const { user } = useSession();
  const { rows: events, loading } = useTable<EventRow>('events', { where: { status: 'published' }, orderBy: { column: 'starts_at' } });
  const { rows: rsvps } = useTable<EventRsvpRow>('event_rsvps');
  return useMemo(() => {
    const going = (id: string) => rsvps.filter((r) => r.event_id === id && (r.status === 'going' || r.status === 'attended'));
    return {
      loading,
      events: events.map((e) => ({ event: e, taken: going(e.id).reduce((a, r) => a + 1 + (r.guests ?? 0), 0), mine: rsvps.find((r) => r.event_id === e.id && r.user_id === user.id && r.status !== 'cancelled') ?? null })),
    };
  }, [events, rsvps, user.id, loading]);
}

/** C-23 RSVP writers (the payment itself goes through payments.ts, like every other charge). */
export function useEventRsvp() {
  const data = useData();
  const { user } = useSession();
  const going = useCallback(async (event: EventRow, paymentId: string | null) => data.insert<EventRsvpRow>('event_rsvps', { event_id: event.id, user_id: user.id, status: 'going', payment_id: paymentId, guests: 0 } as Partial<EventRsvpRow>), [data, user.id]);
  const cancel = useCallback(async (rsvp: EventRsvpRow) => data.update('event_rsvps', rsvp.id, { status: 'cancelled' }), [data]);
  return { going, cancel };
}

/** C-13 club rules and the "about HOY" article, from content_articles (M-02 edits them). */
export function useContentArticles(section: ContentArticleRow['section'] | 'all' = 'all') {
  const { rows, loading } = useTable<ContentArticleRow>('content_articles', { where: { published: true }, orderBy: { column: 'sort' } });
  return { articles: section === 'all' ? rows : rows.filter((a) => a.section === section), loading };
}

export interface FaqGroup { key: string; title: { es: string; en: string }; lead: { es: string; en: string }; items: FaqEntryRow[] }

/** C-14 / C-15 FAQ, grouped by section for one page. */
export function useFaq(page: number) {
  const { rows, loading } = useTable<FaqEntryRow>('faq_entries', { where: { published: true }, orderBy: { column: 'sort' } });
  return useMemo(() => {
    const pages = [...new Set(rows.map((r) => r.page))].sort((a, b) => a - b);
    const groups: FaqGroup[] = [];
    for (const r of rows.filter((x) => x.page === page)) {
      const g = groups.find((x) => x.key === r.group_key);
      if (g) g.items.push(r);
      else groups.push({ key: r.group_key, title: r.group_title, lead: r.group_lead, items: [r] });
    }
    return { groups, totalPages: Math.max(pages.length, 1), loading };
  }, [rows, page, loading]);
}
