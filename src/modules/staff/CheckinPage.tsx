import { assertAdmissionContext, sessionAdmissionAvailable } from '../../data/sessionAdmission';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { useData, useTable } from '../../data/DataContext';
import type { BaseRow, BookingRow, ClassLedgerRow, ClassSessionRow, PaymentRow, PlanRow } from '../../data/schema';
import { dateKey, formatCOP, formatDate, formatTime, isSameDay, MS } from '../../i18n/format';
import { useLayout } from '../../layout/useLayout';
import { Card } from '../../components/molecule/Card/Card';
import { Button } from '../../components/atom/Button/Button';
import { Input, Select } from '../../components/atom/Input/Input';
import { Badge } from '../../components/atom/Badge/Badge';
import { CapacityMeter } from '../../components/molecule/CapacityMeter/CapacityMeter';
import { RosterRow } from '../../components/molecule/RosterRow/RosterRow';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { useSessionsJoined } from '../website/hooks';
import { useSettings } from '../admin/settings';
import { receptionUndoEligible } from '../../data/receptionAttendance';
import { useActionKeys, useDeskCommands, useDeskFigures } from './desk/useDesk';
import { PRODUCTION_BUILD } from '../../config/launch';
import { sessionCounter } from './desk/deskFigures';
import { deskErrorText } from './desk/strings';
import { errorCode } from './desk/wire';
import type { AttendanceTo } from './desk/deskCommands';
import { maskPhone, personMatches, usePeople, type Person } from './people';
import { S02 } from './specs';
import { tenant } from '../../tenant/tenant';
import { approvedPackageRows, packageState } from '../../data/packages';
import { bookWithPackage } from '../../data/deskBooking';
import './staff.css';
import { type Lang } from '../../i18n/types';
import { useLiveUpdates } from '../../data/companyos/hooks';

interface WaitlistRow extends BaseRow { user_id: string; session_id: string; position: number; status: string }

const MAIN = new Set(['TodayStrip (now / next / later)', 'MemberSearch + CapacityMeter', 'RosterList (expected / checked in / waitlist)']);

/** S-02 — the door board: today's strip, one roster, one search box, one-tap check-in, walk-ins and waitlist promotion. */
export function CheckinPage() {
  // Contract §1: this screen polls Company OS every 20 s in the production build (no-op on the review build).
  useLiveUpdates(['bookings', 'class_sessions', 'payments', 'class_ledger']);
  const { t, lang } = useI18n();
  const data = useData();
  const { can, user, role } = useSession();
  const { settings } = useSettings();
  const { sections, isVisible } = useLayout(S02);
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const attendanceBusy = useRef(false);
  // The review build's commands stop if the provider, user or role changed mid-write ("view as"), as before.
  const desk = useDeskCommands(() => { const c = attendanceContext.current; return c.mounted && c.data === data && c.actorId === user.id && c.role === role; });
  // Production never falls back to the browser rules, even if the connector is missing (then nothing can be written).
  const server = PRODUCTION_BUILD || desk?.kind === 'server';
  const keys = useActionKeys();
  const [undo, setUndo] = useState<{ id: string; reason: string } | null>(null);
  const [held, setHeld] = useState<{ id: string; amount: string; reason: string } | null>(null);
  const attendanceContext = useRef({ data, actorId: user.id, role, mounted: true });
  attendanceContext.current = { data, actorId: user.id, role, mounted: true };
  useEffect(() => { attendanceContext.current.mounted = true; return () => { attendanceContext.current.mounted = false; }; }, []);
  const canWrite = can('checkin.write');
  const canBookAny = can('bookings.write_any');

  const allSessions = useSessionsJoined(useCallback((s: ClassSessionRow) => s.status !== 'cancelled', []));
  const todayAll = allSessions.filter(x => isSameDay(x.session.starts_at, new Date()));
  const futureSessions = allSessions.filter(x => x.session.status === 'scheduled' && Date.parse(x.session.starts_at) > Date.now());
  const { rows: ledger } = useTable<ClassLedgerRow>('class_ledger');
  const { rows: payments } = useTable<PaymentRow>('payments');
  const { rows: allBookings } = useTable<BookingRow>('bookings');
  const now = Date.now();
  const autoId = useMemo(() => {
    const live = todayAll.find((x) => new Date(x.session.starts_at).getTime() - 30 * MS.min <= now && new Date(x.session.ends_at).getTime() >= now);
    const next = todayAll.find((x) => new Date(x.session.starts_at).getTime() > now);
    return (live ?? next ?? todayAll[todayAll.length - 1])?.session.id;
  }, [todayAll, now]);
  const wanted = params.get('session');
  const selected = allSessions.find((x) => x.session.id === wanted) ?? todayAll.find((x) => x.session.id === autoId);
  const selectedId = selected?.session.id;

  const { rows: bookings, loading } = useTable<BookingRow>('bookings', { where: { session_id: selectedId ?? '__none__' } });
  const { rows: waitlist } = useTable<WaitlistRow>('waitlist', { where: { session_id: selectedId ?? '__none__', status: 'waiting' } });
  const { people, byId } = usePeople();

  const roster = useMemo(() => bookings.filter((b) => b.status !== 'cancelled').map((b) => ({ b, p: byId.get(b.user_id) })).filter((x) => !x.p || personMatches(x.p, q)), [bookings, byId, q]);
  const expected = roster.filter((x) => x.b.status === 'booked');
  const arrived = roster.filter((x) => x.b.status === 'checked_in');
  const missed = roster.filter((x) => x.b.status === 'no_show' || x.b.status === 'late_cancel');
  const heldRows = roster.filter((x) => (x.b.status as string) === 'held');
  const counter = sessionCounter(bookings);
  const figures = useDeskFigures();
  const { rows: plans } = useTable<PlanRow>('plans');
  /** The pending payment that pays for a held booking (payments `for_entity: booking`, `for_id`). */
  const paymentFor = (b: BookingRow) => payments.find(p => p.status === 'pending' && ((p as PaymentRow & { for_id?: string }).for_id === b.id || p.payment_id === b.id || b.payment_id === p.id));
  const onRoster = useMemo(() => new Set(bookings.filter((b) => b.status !== 'cancelled').map((b) => b.user_id)), [bookings]);
  const walkIns = useMemo(() => (q.trim().length < 2 ? [] : people.filter((p) => p.role === 'customer' && !onRoster.has(p.id) && personMatches(p, q)).slice(0, 6)), [people, onRoster, q]);
  const graceMs = settings.policies.lateGraceMin * MS.min;
  const isLate = (b: BookingRow) => !!selected && !!b.checked_in_at && new Date(b.checked_in_at).getTime() > new Date(selected.session.starts_at).getTime() + graceMs;

  const setStatus = async (b: BookingRow, status: AttendanceTo, reason?: string) => {
    if (!desk) { setError(deskErrorText('disconnected', t)); return; }
    if (!canWrite || attendanceBusy.current || busy) return;
    const actorId = user.id, effectiveRole = role, provider = data;
    const isCurrent = () => { const c = attendanceContext.current; return c.mounted && c.data === provider && c.actorId === actorId && c.role === effectiveRole; };
    const intent = [actorId, effectiveRole, b.id, b.status, b.checked_in_at, b.updated_at, status, reason ?? null];
    attendanceBusy.current = true;
    setBusy(b.id); setError(null);
    try {
      await desk.attendance({ booking: b, to: status, reason, key: keys.keyFor(intent) });
      keys.done(intent);
      if (isCurrent()) setUndo(null);
    } catch (e) {
      const code = errorCode(e);
      if (isCurrent()) setError(code === 'attendance_undo_policy_pending' ? t('staff.checkin.undoPolicy') : server || code === 'reason_required' ? deskErrorText(code, t) : t('staff.checkin.attendanceFailed'));
    } finally { attendanceBusy.current = false; if (isCurrent()) setBusy(null); }
  };
  /** J1c: the customer is at the door with a pending transfer — approve it (confirms the held spot), then check in, in one batch. */
  const approveAndCheckIn = async (b: BookingRow, payment: PaymentRow, price: number, amount: number, reason: string) => {
    if (!desk?.approveAndCheckIn || !canWrite || attendanceBusy.current || busy) return;
    const intent = ['j1c', b.id, payment.id, amount, reason];
    attendanceBusy.current = true; setBusy(b.id); setError(null);
    try { await desk.approveAndCheckIn({ paymentId: payment.id, bookingId: b.id, amountReceived: amount, price, reason, key: keys.keyFor(intent) }); keys.done(intent); setHeld(null); }
    catch (e) { setError(deskErrorText(errorCode(e), t)); }
    finally { attendanceBusy.current = false; setBusy(null); }
  };
  const commandError = (error: unknown) => {
    const code = errorCode(error);
    if (server) return deskErrorText(code, t);
    if (code === 'booking_contact_required') return t('customer.book.contactRequired');
    const known = ['session_full', 'session_unavailable', 'booking_exists', 'same_day_conflict', 'insufficient_classes', 'package_frozen', 'package_expired', 'disconnected'];
    return t(`staff.checkin.error.${known.includes(code) ? code : 'failed'}`);
  };
  const packageFor = (userId: string) => packageState(approvedPackageRows(ledger.filter(row => row.user_id === userId), payments));
  const unavailable = (userId: string) => {
    // Production: the server decides capacity, balance, expiry and one class a day; only the class choice is checked here.
    if (server) return !selected || selected.session.status !== 'scheduled' ? t('staff.checkin.package.unavailable') : null;
    if (selected && !sessionAdmissionAvailable(selected.session, selected.modality, selected.session.template_id ? { id: selected.session.template_id, active: selected.templateActive } : undefined)) return t('staff.checkin.error.session_unavailable');
    if (!selected || selected.session.status !== 'scheduled' || Date.parse(selected.session.starts_at) <= Date.now()) return t('staff.checkin.package.unavailable');
    if (selected.session.booked_count >= selected.session.capacity) return t('core.common.full');
    const state = packageFor(userId);
    if (state.frozen) return t('staff.checkin.package.frozen');
    if (state.balance < 1) return t('staff.checkin.package.empty');
    const atClass = packageState(approvedPackageRows(ledger.filter(row => row.user_id === userId), payments), dateKey(new Date(selected.session.starts_at)));
    if (atClass.balance < 1) return t('staff.checkin.package.expired');
    if (tenant.studio.perPersonPerDay === 1 && allBookings.some(b => b.user_id === userId && b.status !== 'cancelled' && b.status !== 'late_cancel' && allSessions.some(({ session: s }) => s.id === b.session_id && isSameDay(s.starts_at, selected.session.starts_at)))) return t('staff.checkin.error.same_day_conflict');
    return null;
  };
  const packageLabel = (userId: string) => {
    const state = packageFor(userId);
    return `${t('staff.checkin.package.balance', { n: state.balance })}${state.expiresAt ? ` · ${t('staff.checkin.package.expires', { date: formatDate(state.expiresAt, lang) })}` : ''}`;
  };
  const walkIn = async (p: Person, status: 'booked' | 'checked_in' = 'checked_in') => {
    if (!desk) { setError(deskErrorText('disconnected', t)); return; }
    if (!selected || (status === 'booked' ? !canBookAny : !canWrite) || attendanceBusy.current || busy || unavailable(p.id)) return;
    const provider=data,actorId=user.id,effectiveRole=role;
    const isCurrent=()=>attendanceContext.current.mounted && attendanceContext.current.data===provider && attendanceContext.current.actorId===actorId && attendanceContext.current.role===effectiveRole;
    const intent = ['book', actorId, p.id, selected.session.id, status];
    attendanceBusy.current = true; setBusy(p.id); setError(null);
    try {
      const r = await desk.book({ personId: p.id, sessionId: selected.session.id, checkIn: status === 'checked_in', key: keys.keyFor(intent) });
      keys.done(intent);
      // Booked but not marked arrived: the roster now lists them under Expected with the Arrived button.
      if (r.checkInError && isCurrent()) setError(commandError(Object.assign(new Error(r.checkInError), { code: r.checkInError })));
      if(isCurrent())setQ('');
    } catch (e) { setError(commandError(e)); } finally { attendanceBusy.current = false; setBusy(null); }
  };
  // Waitlist is not in the launch scope; the production build drops this browser command (and its rule copies).
  const promote = PRODUCTION_BUILD ? async (_w: WaitlistRow) => {} : async (w: WaitlistRow) => {
    if (server || !selected || !canBookAny || busy || unavailable(w.user_id)) return;
    const provider=data,actorId=user.id,effectiveRole=role;
    const isCurrent=()=>attendanceContext.current.mounted && attendanceContext.current.data===provider && attendanceContext.current.actorId===actorId && attendanceContext.current.role===effectiveRole;
    setBusy(w.id); setError(null);
    try {
      if (!data.atomic) throw new Error('disconnected');
      await data.atomic(async tx => {
        const b = await bookWithPackage(tx, { userId: w.user_id, sessionId: selected.session.id, status: 'booked',control:{isCurrent} });
        await tx.update('waitlist', w.id, { status: 'claimed' });
        await tx.insert('audit_log', { actor_id: user.id, action: 'waitlist.promote', entity: 'waitlist', entity_id: w.id, ip: null, diff: { role, source: 'front_desk', booking_id: b.id, session_id: selected.session.id, user_id: w.user_id } });
        assertAdmissionContext({isCurrent});
      });
    } catch (e) { setError(commandError(e)); } finally { setBusy(null); }
  };

  // keyboard: "/" focuses search; Enter checks in the first expected match (or the single walk-in candidate); Esc clears
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const onSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { setQ(''); return; }
    if (e.key !== 'Enter' || !q.trim()) return;
    if (expected[0]) setStatus(expected[0].b, 'checked_in');
    else if (walkIns.length === 1) walkIn(walkIns[0]);
  };

  const full = !!selected && selected.session.booked_count >= selected.session.capacity;
  const phase = (s: ClassSessionRow) => (new Date(s.ends_at).getTime() < now ? 'past' : new Date(s.starts_at).getTime() - 30 * MS.min <= now ? 'now' : 'next');

  // Production: whether an undo is allowed is the server's (`allow_undo_check_in`, a scheduled class); the review build keeps its own rule.
  const undoAllowed = !!selected && (server || receptionUndoEligible(selected.session));
  const undoForm = (b: BookingRow) => (
    <div className="row wrap checkin-undo">
      <Input autoFocus aria-label={t('desk.undo.reason')} placeholder={t('desk.undo.reason.ph')} value={undo?.reason ?? ''} onChange={e => setUndo({ id: b.id, reason: e.target.value })} onKeyDown={e => { if (e.key === 'Enter' && undo?.reason.trim()) setStatus(b, 'booked', undo.reason.trim()); if (e.key === 'Escape') setUndo(null); }} />
      <Button size="sm" disabled={!!busy || !undo?.reason.trim()} loading={busy === b.id} onClick={() => undo && setStatus(b, 'booked', undo.reason.trim())}>{t('desk.undo.confirm')}</Button>
      <Button size="sm" variant="ghost" onClick={() => setUndo(null)}>{t('core.common.cancel')}</Button>
    </div>
  );

  const SECTIONS: Record<string, () => ReactNode> = {
    'TodayStrip (now / next / later)': () => (
      <section className="stack-sm">
        <label className="stack-sm"><span className="small">{t('staff.checkin.future.label')}</span><Select aria-label={t('staff.checkin.future.label')} value={selectedId ?? ''} onChange={e => setParams({ session: e.target.value })}><option value="">{t('staff.checkin.future.choose')}</option>{futureSessions.map(({ session: s }) => <option key={s.id} value={s.id}>{formatDate(s.starts_at, lang)} · {formatTime(s.starts_at, lang)} · {s.title} ({s.booked_count}/{s.capacity})</option>)}</Select></label>
        <p className="xs muted">{t(server ? 'desk.server.rules' : 'staff.checkin.package.demo')}</p>
        <div className="row-between wrap"><div className="eyebrow">{t('staff.checkin.today')}</div><span className="xs muted">{t('staff.checkin.strip.hint')}</span></div>
        {can('payments.read') && figures.pendingPayments > 0 && <p className="xs" role="status"><Link to="/staff/transfers">{t('desk.figures.pending')}: {figures.pendingPayments}</Link></p>}
        {todayAll.length === 0 ? <EmptyState compact title={t('staff.checkin.noClasses')} body={t('staff.checkin.noClasses.body')} /> : (
          <div className="checkin-strip" role="tablist" aria-label={t('staff.checkin.today')}>
            {todayAll.map(({ session: s, teacher: te, modality: m }) => {
              const ph = phase(s);
              return (
                <button key={s.id} type="button" role="tab" aria-selected={s.id === selectedId} className={`checkin-strip-item is-${ph} ${s.id === selectedId ? 'is-selected' : ''}`} onClick={() => setParams({ session: s.id })}>
                  <div className="row-between"><strong className="mono">{formatTime(s.starts_at, lang)}</strong><Badge tone={ph === 'now' ? 'success' : ph === 'past' ? 'neutral' : 'primary'}>{t(`staff.checkin.phase.${ph}`)}</Badge></div>
                  <span className="row"><span className={`classrow-dot mv-${m?.tone ?? 'river'}`} aria-hidden /><span className="small">{s.title}</span></span>
                  <span className="xs muted">{te?.display_name} · {s.booked_count}/{s.capacity}</span>
                </button>
              );
            })}
          </div>
        )}
      </section>
    ),
    'MemberSearch + CapacityMeter': () => selected ? (
      <Card padding="sm" className="checkin-search">
        <div className="row-between wrap">
          <div>
            <div className="row wrap"><h2 className="checkin-title">{selected.session.title}</h2><span className="muted small">{formatTime(selected.session.starts_at, lang)} · {selected.teacher?.display_name}</span>{full && <Badge tone="danger">{t('core.common.full')}</Badge>}</div>
            <div className="xs muted">{t('staff.checkin.arrivals', { n: counter.arrived, total: counter.holding })} · {t('staff.checkin.grace', { n: settings.policies.lateGraceMin })}</div>
          </div>
          <div className="checkin-cap"><CapacityMeter booked={selected.session.booked_count} capacity={selected.session.capacity} /></div>
        </div>
        <div className="row wrap checkin-searchrow">
          <Input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onSearchKey} placeholder={t('staff.checkin.search.ph')} aria-label={t('core.common.search')} autoFocus />
          <kbd className="checkin-kbd" title={t('staff.checkin.kbd')}>/</kbd>
          {q && <Button size="sm" variant="ghost" onClick={() => setQ('')}>{t('core.common.cancel')}</Button>}
        </div>
        {!canWrite && <p className="xs muted">{t('staff.checkin.readonly')}</p>}
      </Card>
    ) : null,
    'RosterList (expected / checked in / waitlist)': () => selected ? (
      <div className="stack">
        {error && <EmptyState compact tone="error" title={t('core.common.error')} body={error} action={<Button size="sm" variant="secondary" onClick={() => setError(null)}>{t('core.common.retry')}</Button>} />}
        {loading && bookings.length === 0 && <EmptyState compact tone="loading" title={t('core.common.loading')} />}
        {!loading && roster.length === 0 && waitlist.length === 0 && <EmptyState compact title={q ? t('staff.checkin.noMatch') : t('staff.checkin.emptyRoster')} body={q ? t('staff.checkin.noMatch.body') : undefined} />}
        <Group title={t('staff.checkin.expected')} n={expected.length}>
          {expected.map(({ b, p }) => <RosterRow key={b.id} name={p?.name ?? b.user_id} initials={p?.initials} phone={maskPhone(p?.phone)} plan={planLabel(p, b, lang, t)} status="booked" showStatus={false} flag={p?.notes ?? undefined}
            actions={canWrite && <><Button size="sm" variant="tonal" disabled={!!busy} loading={busy === b.id} onClick={() => setStatus(b, 'checked_in')} icon="check">{t('staff.checkin.checkin')}</Button><Button size="sm" variant="outline" disabled={!!busy} onClick={() => setStatus(b, 'no_show')} icon="user-x">{t('staff.checkin.noShow')}</Button></>} />)}
        </Group>
        <Group title={t('staff.checkin.arrived')} n={arrived.length}>
          {canWrite && arrived.length > 0 && !undoAllowed && <p className="xs muted" role="status">{t('staff.checkin.undoPolicy')}</p>}
          {arrived.map(({ b, p }) => <Fragment key={b.id}><RosterRow name={p?.name ?? b.user_id} initials={p?.initials} phone={maskPhone(p?.phone)} plan={planLabel(p, b, lang, t)} status="checked_in" late={isLate(b)} time={b.checked_in_at ? formatTime(b.checked_in_at, lang) : undefined} flag={p?.notes ?? undefined}
            actions={canWrite && <Button size="sm" variant="outline" disabled={!!busy || !undoAllowed} title={!undoAllowed ? t('staff.checkin.undoPolicy') : undefined} onClick={() => setUndo({ id: b.id, reason: '' })} icon="undo">{t('staff.checkin.undo')}</Button>} />
            {undo?.id === b.id && undoForm(b)}</Fragment>)}
        </Group>
        {missed.length > 0 && <Group title={t('staff.checkin.missed')} n={missed.length}>
          {missed.map(({ b, p }) => <RosterRow key={b.id} name={p?.name ?? b.user_id} initials={p?.initials} plan={planLabel(p, b, lang, t)} status={b.status as 'no_show' | 'late_cancel'}
            actions={canWrite && b.status === 'no_show' && (server
              // The server has no No-show → Arrived move: undo the no-show (with a reason), then mark Arrived.
              ? <Button size="sm" variant="outline" disabled={!!busy} onClick={() => setUndo({ id: b.id, reason: '' })} icon="undo">{t('desk.noShow.backToBooked')}</Button>
              : <Button size="sm" variant="tonal" disabled={!!busy} loading={busy === b.id} onClick={() => setStatus(b, 'checked_in')} icon="check">{t('staff.checkin.checkin')}</Button>)} />)}
          {missed.map(({ b }) => undo?.id === b.id ? <Fragment key={`undo-${b.id}`}>{undoForm(b)}</Fragment> : null)}
        </Group>}
        {heldRows.length > 0 && <Group title={t('desk.held.title')} n={heldRows.length}>
          {heldRows.map(({ b, p }) => { const pay = paymentFor(b); const price = plans.find(pl => pl.id === pay?.plan_id)?.price ?? pay?.amount ?? 0; return <Fragment key={b.id}>
            <RosterRow name={p?.name ?? b.user_id} initials={p?.initials} phone={maskPhone(p?.phone)} plan={pay ? formatCOP(pay.amount, lang) : t('desk.held.noPayment')} status="booked" showStatus={false}
              actions={canWrite && pay && desk?.approveAndCheckIn && <Button size="sm" variant="tonal" disabled={!!busy} loading={busy === b.id} onClick={() => setHeld({ id: b.id, amount: String(pay.amount), reason: '' })} icon="check">{t('desk.held.approveCheckin')}</Button>} />
            {held?.id === b.id && pay && <div className="row wrap checkin-undo">
              <Input aria-label={t('desk.held.amount')} inputMode="numeric" value={held.amount} onChange={e => setHeld({ ...held, amount: e.target.value })} />
              {Number(held.amount.replace(/[^\d]/g, '')) !== price && <Input aria-label={t('desk.held.reason')} placeholder={t('desk.held.reason')} value={held.reason} onChange={e => setHeld({ ...held, reason: e.target.value })} />}
              <Button size="sm" disabled={!!busy || (Number(held.amount.replace(/[^\d]/g, '')) !== price && !held.reason.trim())} loading={busy === b.id} onClick={() => approveAndCheckIn(b, pay, price, Number(held.amount.replace(/[^\d]/g, '')), held.reason.trim())}>{t('desk.held.approveCheckin')}</Button>
              <Button size="sm" variant="ghost" onClick={() => setHeld(null)}>{t('core.common.cancel')}</Button>
            </div>}
          </Fragment>; })}
        </Group>}
        {!server && waitlist.length > 0 && <Group title={t('core.common.waitlist')} n={waitlist.length}>
          {waitlist.sort((a, b) => a.position - b.position).map((w) => { const p = byId.get(w.user_id); return <RosterRow key={w.id} name={p?.name ?? w.user_id} initials={p?.initials} phone={maskPhone(p?.phone)} plan={`${packageLabel(w.user_id)}${unavailable(w.user_id) ? ` · ${unavailable(w.user_id)}` : ''}`} status="waiting" showStatus={false} time={`#${w.position}`}
            actions={canBookAny && <Button size="sm" variant="tonal" disabled={!!unavailable(w.user_id) || !!busy} loading={busy === w.id} title={unavailable(w.user_id) ?? undefined} onClick={() => promote(w)} icon="promote">{t('staff.checkin.promote')}</Button>} />; })}
        </Group>}
      </div>
    ) : null,
    'TeachersInToday': () => (
      <Card title={t('staff.checkin.teachers')} padding="sm">
        {todayAll.length === 0 && <p className="small muted" style={{ padding: 'var(--sp-sm)' }}>—</p>}
        {[...new Map(todayAll.map((x) => [x.teacher?.id ?? x.session.teacher_id, x])).values()].map(({ session: s, teacher: te }) => (
          <div key={s.id} className="row-between checkin-teacher">
            <span className="small">{te?.display_name ?? s.teacher_id}</span>
            <span className="row"><span className="xs muted mono">{formatTime(s.starts_at, lang)}</span><Badge tone={new Date(s.starts_at).getTime() - 15 * MS.min <= now ? 'success' : 'neutral'}>{new Date(s.starts_at).getTime() - 15 * MS.min <= now ? t('staff.checkin.teacher.arrived') : t('staff.checkin.teacher.expected')}</Badge></span>
          </div>
        ))}
      </Card>
    ),
    'QuickSell (walk-in)': () => (
      <Card title={t('staff.checkin.walkin')} padding="sm">
        <div className="stack-sm" style={{ padding: 'var(--sp-xs)' }}>
          <p className="xs muted">{t('staff.checkin.walkin.body')}</p>
          {q.trim().length >= 2 && walkIns.length === 0 && <p className="small muted">{t('staff.checkin.walkin.none')}</p>}
          {walkIns.map((p) => <div key={p.id} className="stack-sm">
            <RosterRow name={p.name} initials={p.initials} phone={maskPhone(p.phone)} status="booked" showStatus={false} />
            <p className="xs muted">{packageLabel(p.id)}</p>
            {unavailable(p.id) && <p className="xs" role="status">{unavailable(p.id)}</p>}
            {selected && <div className="row wrap">{canBookAny && <Button variant="outline" disabled={!!unavailable(p.id) || !!busy} loading={busy === p.id} title={unavailable(p.id) ?? undefined} onClick={() => walkIn(p, 'booked')} icon="user-plus">{t('staff.checkin.package.book')}</Button>}{canWrite && <Button variant="tonal" disabled={!!unavailable(p.id) || !!busy} loading={busy === p.id} title={unavailable(p.id) ?? undefined} onClick={() => walkIn(p)} icon="check">{t('staff.checkin.walkin.add')}</Button>}</div>}
          </div>)}
          {can('payments.write') && <Link to={`/staff/register${selectedId ? `?session=${selectedId}` : ''}`}><Button block variant={walkIns.length ? 'ghost' : 'primary'} size="sm" icon="user-plus">{t('staff.checkin.walkin.register')}</Button></Link>}
        </div>
      </Card>
    ),
  };

  const visible = sections.filter(isVisible).filter((s) => SECTIONS[s]);
  return (
    <div className="stack">
      <div className="page-head"><div><h1>{t('staff.checkin.title')}</h1><p className="muted small">{t('staff.checkin.subtitle')}</p></div></div>
      <div className="checkin">
        <div className="checkin-main">{visible.filter((s) => MAIN.has(s)).map((s) => <Fragment key={s}>{SECTIONS[s]()}</Fragment>)}</div>
        <aside className="checkin-side">{visible.filter((s) => !MAIN.has(s)).map((s) => <Fragment key={s}>{SECTIONS[s]()}</Fragment>)}</aside>
      </div>
    </div>
  );
}

/** The roster's plan line: the person's package name, else how the booking was paid, translated (0051, was the raw value). */
function planLabel(p: Person | undefined, b: BookingRow, lang: Lang, t: (key: string) => string) {
  if (p?.plan) return lang === 'en' ? p.plan.name_en : p.plan.name_es;
  return b.paid_with ? t(`customer.paidWith.${b.paid_with}`) : '';
}

function Group({ title, n, children }: { title: string; n: number; children: ReactNode }) {
  if (n === 0) return null;
  return (
    <section className="checkin-group">
      <div className="row-between checkin-grouphead"><span className="eyebrow">{title}</span><span className="xs muted mono">{n}</span></div>
      <Card padding="none">{children}</Card>
    </section>
  );
}
