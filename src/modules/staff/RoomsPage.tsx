import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { useData, useTable } from '../../data/DataContext';
import type { ClassSessionRow, ModalityRow, RoomRow, SpaceBookingKind, SpaceBookingRow, SpecialChargeRow, TeacherRow } from '../../data/schema';
import { formatCOP, formatDate, formatTime, isSameDay } from '../../i18n/format';
import { useLayout } from '../../layout/useLayout';
import { Card } from '../../components/molecule/Card/Card';
import { Button } from '../../components/atom/Button/Button';
import { Input, Select } from '../../components/atom/Input/Input';
import { Field } from '../../components/molecule/Field/Field';
import { Badge } from '../../components/atom/Badge/Badge';
import { Toggle } from '../../components/atom/Toggle/Toggle';
import { DateStrip } from '../../components/molecule/DateStrip/DateStrip';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { RoomDayGrid, type RoomBlock } from '../../components/organism/RoomDayGrid/RoomDayGrid';
import { useAudit } from './audit';
import { personMatches, usePeople } from './people';
import { BOOKING_KINDS, KIND_LABEL, STATUS_LABEL, dateInputValue, findConflicts, localIso } from './rooms';
import { S05 } from './specs';
import './staff.css';

const STATUS_TONE = { held: 'warn', confirmed: 'primary', cancelled: 'neutral', done: 'success' } as const;
const KIND_TONE: Record<SpaceBookingKind, RoomBlock['tone']> = { private_event: 'event', rental: 'rental', private_class: 'private', maintenance: 'maintenance', blocked: 'blocked' };

interface Form { kind: SpaceBookingKind; roomId: string; date: string; start: string; end: string; title: string; contact: string; customerId: string | null; customerQ: string; teacherId: string; note: string }
const emptyForm = (date: string, roomId: string): Form => ({ kind: 'private_event', roomId, date, start: '', end: '', title: '', contact: '', customerId: null, customerQ: '', teacherId: '', note: '' });

const addDays = (d: Date, n: number) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() + n); return x; };

/**
 * S-05 — the rooms, one day at a time: classes and space bookings side by side, a form that refuses
 * an overlapping window, and the three things the desk does with a booking (confirm, cancel, done).
 * Charging for a booking is S-04's job: "Cobrar" opens the register with the booking prefilled.
 */
export function RoomsPage() {
  const { t, lang, bi } = useI18n();
  const nav = useNavigate();
  const data = useData();
  const { user, can } = useSession();
  const audit = useAudit('front_desk');
  const [params] = useSearchParams();
  const { sections, isVisible } = useLayout(S05);
  const canWrite = can('bookings.write_any');

  const { rows: rooms } = useTable<RoomRow>('rooms', { orderBy: { column: 'created_at' } });
  const { rows: sessions } = useTable<ClassSessionRow>('class_sessions');
  const { rows: bookings, loading } = useTable<SpaceBookingRow>('space_bookings', { orderBy: { column: 'starts_at' } });
  const { rows: modalities } = useTable<ModalityRow>('modalities');
  const { rows: teachers } = useTable<TeacherRow>('teachers', { where: { active: true }, orderBy: { column: 'display_name' } });
  const { rows: specials } = useTable<SpecialChargeRow>('special_charges');
  const { people } = usePeople();

  const today = useMemo(() => addDays(new Date(), 0), []);
  const [date, setDate] = useState<string>(() => params.get('date') ?? dateInputValue(today));
  const [showCancelled, setShowCancelled] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(params.get('booking'));
  const [form, setForm] = useState<Form>(() => emptyForm(params.get('date') ?? dateInputValue(today), ''));
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);

  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(today, i)), [today]);
  const dayIndex = days.findIndex((d) => dateInputValue(d) === date);
  const day = useMemo(() => new Date(`${date}T12:00:00`), [date]);
  const modality = useMemo(() => new Map(modalities.map((m) => [m.id, m])), [modalities]);
  const teacher = useMemo(() => new Map(teachers.map((x) => [x.id, x])), [teachers]);
  const roomName = useMemo(() => new Map(rooms.map((r) => [r.id, r.name])), [rooms]);
  const specialOf = useMemo(() => new Map(specials.filter((s) => s.space_booking_id).map((s) => [s.space_booking_id as string, s])), [specials]);

  const daySessions = useMemo(() => sessions.filter((s) => s.status !== 'cancelled' && isSameDay(s.starts_at, day)), [sessions, day]);
  const dayBookings = useMemo(() => bookings.filter((b) => isSameDay(b.starts_at, day) && (showCancelled || b.status !== 'cancelled')), [bookings, day, showCancelled]);
  const counts = useMemo(() => days.map((d) => sessions.filter((s) => s.status !== 'cancelled' && isSameDay(s.starts_at, d)).length + bookings.filter((b) => b.status !== 'cancelled' && isSameDay(b.starts_at, d)).length), [days, sessions, bookings]);

  const blocks: RoomBlock[] = useMemo(() => [
    ...daySessions.map<RoomBlock>((s) => ({ id: s.id, roomId: s.room_id, startsAt: s.starts_at, endsAt: s.ends_at, title: s.title, sub: `${teacher.get(s.teacher_id)?.display_name ?? ''} · ${s.booked_count}/${s.capacity}`, tone: modality.get(s.modality_id)?.movement ?? 'fluye', status: 'class' })),
    ...dayBookings.map<RoomBlock>((b) => ({ id: b.id, roomId: b.room_id, startsAt: b.starts_at, endsAt: b.ends_at, title: b.title, sub: [b.teacher_id ? teacher.get(b.teacher_id)?.display_name : null, b.contact_name].filter(Boolean).join(' · ') || bi(KIND_LABEL[b.kind]), tone: KIND_TONE[b.kind], status: b.status })),
  ], [daySessions, dayBookings, teacher, modality, bi]);

  const selected = bookings.find((b) => b.id === selectedId);
  const selectedSession = daySessions.find((s) => s.id === selectedId);
  const upcoming = useMemo(() => bookings.filter((b) => b.status !== 'cancelled' && new Date(b.ends_at) >= new Date()).slice(0, 8), [bookings]);

  // ---- the form and its conflict check ----
  const startsAt = localIso(form.date, form.start);
  const endsAt = localIso(form.date, form.end);
  const conflicts = useMemo(() => findConflicts({ roomId: form.roomId, startsAt, endsAt }, sessions, bookings), [form.roomId, startsAt, endsAt, sessions, bookings]);
  const windowOk = !!startsAt && !!endsAt && startsAt < endsAt;
  const candidates = useMemo(() => (form.customerQ.trim().length < 2 ? [] : people.filter((p) => p.role === 'customer' && personMatches(p, form.customerQ)).slice(0, 5)), [people, form.customerQ]);
  const customer = form.customerId ? people.find((p) => p.id === form.customerId) : undefined;
  const needsWho = form.kind === 'private_event' || form.kind === 'rental' || form.kind === 'private_class';
  const valid = canWrite && !!form.roomId && windowOk && form.title.trim().length > 0 && conflicts.length === 0 && (!needsWho || !!customer || form.contact.trim().length > 0);

  const proposeSlot = (roomId: string, hour: number) => {
    const hh = String(hour).padStart(2, '0');
    setForm((f) => ({ ...f, roomId, date, start: `${hh}:00`, end: f.end && f.end > `${hh}:00` ? f.end : `${String(Math.min(23, hour + 1)).padStart(2, '0')}:00` }));
    setSelectedId(null);
  };

  const book = async (status: 'held' | 'confirmed') => {
    if (!valid) return;
    setBusy('book'); setNotice(null);
    try {
      const row = await data.insert<SpaceBookingRow>('space_bookings', {
        room_id: form.roomId, kind: form.kind, title: form.title.trim(), starts_at: startsAt, ends_at: endsAt,
        customer_id: customer?.id ?? null, contact_name: customer ? null : (form.contact.trim() || null), teacher_id: form.teacherId || null,
        special_charge_id: null, status, note: form.note.trim() || null, created_by: user.id,
      } as Partial<SpaceBookingRow>);
      await audit('space_booking.create', 'space_bookings', row.id, { after: { kind: form.kind, room_id: form.roomId, starts_at: startsAt, ends_at: endsAt, status, title: row.title } });
      setNotice({ tone: 'ok', text: t('staff.rooms.msg.booked', { title: row.title, status: bi(STATUS_LABEL[status]) }) });
      setSelectedId(row.id);
      setForm(emptyForm(form.date, form.roomId));
    } catch (e) { setNotice({ tone: 'bad', text: String(e) }); } finally { setBusy(null); }
  };

  const setStatus = async (b: SpaceBookingRow, status: SpaceBookingRow['status']) => {
    setBusy(status); setNotice(null);
    try {
      await data.update('space_bookings', b.id, { status });
      await audit(`space_booking.${status}`, 'space_bookings', b.id, { before: b.status, after: status, title: b.title });
      setNotice({ tone: 'ok', text: t('staff.rooms.msg.status', { title: b.title, status: bi(STATUS_LABEL[status]) }) });
    } finally { setBusy(null); }
  };

  const SECTIONS: Record<string, () => ReactNode> = {
    DateStrip: () => (
      <div className="rooms-datebar">
        <DateStrip days={days} value={dayIndex} onChange={(i) => setDate(dateInputValue(days[i]))} counts={counts} />
        <Input type="date" value={date} onChange={(e) => { if (e.target.value) { setDate(e.target.value); setForm((f) => ({ ...f, date: e.target.value })); } }} aria-label={t('staff.rooms.anyDate')} className="rooms-anydate" />
      </div>
    ),
    DayGrid: () => (
      <div className="stack-sm">
        <div className="row-between wrap">
          <div className="row wrap">
            <strong className="small rooms-daylabel">{formatDate(day.toISOString(), lang, { weekday: 'long', day: 'numeric', month: 'long' })}</strong>
            <span className="xs muted">{t('staff.rooms.dayCount', { classes: daySessions.length, bookings: dayBookings.filter((b) => b.status !== 'cancelled').length })}</span>
          </div>
          <div className="row wrap">
            <Toggle size="sm" checked={showCancelled} onChange={setShowCancelled} label={t('staff.rooms.showCancelled')} />
            <span className="xs muted">{t('staff.rooms.legend')}</span>
          </div>
        </div>
        {rooms.length === 0
          ? <EmptyState tone={loading ? 'loading' : 'empty'} title={t(loading ? 'core.common.loading' : 'staff.rooms.noRooms')} />
          : <RoomDayGrid rooms={rooms.map((r) => ({ id: r.id, name: r.name, capacity: r.capacity }))} blocks={blocks} hourHeight={64} selectedId={selectedId} onSelect={(b) => setSelectedId(b.id)} onSlot={canWrite ? proposeSlot : undefined} now={isSameDay(day, new Date()) ? new Date() : null} />}
      </div>
    ),
    BookingForm: () => (
      <Card title={t('staff.rooms.form.title')} eyebrow="S-05" raised>
        {!canWrite ? <p className="small muted">{t('staff.rooms.readonly')}</p> : (
          <div className="stack-sm">
            <p className="xs muted">{t('staff.rooms.form.hint')}</p>
            <div className="grid grid-2 rooms-form">
              <Field label={t('staff.rooms.f.kind')}>{(id) => <Select id={id} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as SpaceBookingKind })}>{BOOKING_KINDS.map((k) => <option key={k} value={k}>{bi(KIND_LABEL[k])}</option>)}</Select>}</Field>
              <Field label={t('staff.rooms.f.room')} required>{(id) => <Select id={id} value={form.roomId} onChange={(e) => setForm({ ...form, roomId: e.target.value })} invalid={!form.roomId}><option value="">—</option>{rooms.map((r) => <option key={r.id} value={r.id}>{r.name} · {t('core.common.capacity', { n: r.capacity })}</option>)}</Select>}</Field>
              <Field label={t('staff.rooms.f.date')} required>{(id) => <Input id={id} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />}</Field>
              <div className="row rooms-times">
                <Field label={t('staff.rooms.f.start')} required>{(id) => <Input id={id} type="time" step={900} value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />}</Field>
                <Field label={t('staff.rooms.f.end')} required>{(id) => <Input id={id} type="time" step={900} value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} invalid={!!form.start && !!form.end && !windowOk} />}</Field>
              </div>
              <div className="rooms-form-full"><Field label={t('staff.rooms.f.title')} required>{(id) => <Input id={id} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t('staff.rooms.f.title.ph')} />}</Field></div>
              {needsWho && (
                <>
                  <Field label={t('staff.rooms.f.customer')} hint={customer ? undefined : t('staff.rooms.f.customer.hint')}>
                    {(id) => customer
                      ? <div className="row-between rooms-picked"><span className="small">{customer.name}</span><Button size="sm" variant="ghost" onClick={() => setForm({ ...form, customerId: null, customerQ: '' })}>{t('core.common.edit')}</Button></div>
                      : <div className="stack-sm"><Input id={id} value={form.customerQ} onChange={(e) => setForm({ ...form, customerQ: e.target.value })} placeholder={t('staff.register.search.ph')} />{candidates.map((p) => <button key={p.id} type="button" className="register-candidate" onClick={() => setForm({ ...form, customerId: p.id, customerQ: '', contact: '' })}><span className="small grow">{p.name}</span><span className="xs muted">{p.email}</span></button>)}</div>}
                  </Field>
                  <Field label={t('staff.rooms.f.contact')} required={!customer} hint={t('staff.rooms.f.contact.hint')}>{(id) => <Input id={id} value={form.contact} disabled={!!customer} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder={t('staff.rooms.f.contact.ph')} />}</Field>
                </>
              )}
              <Field label={t('staff.rooms.f.teacher')} hint={t('staff.rooms.f.teacher.hint')}>{(id) => <Select id={id} value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })}><option value="">{t('staff.rooms.f.teacher.none')}</option>{teachers.map((x) => <option key={x.id} value={x.id}>{x.display_name}</option>)}</Select>}</Field>
              <Field label={t('staff.rooms.f.note')}>{(id) => <Input id={id} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder={t('staff.rooms.f.note.ph')} />}</Field>
            </div>
            {form.roomId && windowOk && (
              conflicts.length > 0
                ? <div className="staff-notice staff-notice-bad small rooms-conflict" role="alert">
                    <strong>{t('staff.rooms.conflict', { room: roomName.get(form.roomId) ?? '' })}</strong>
                    <ul className="xs">{conflicts.map((c) => <li key={c.id}>{formatTime(c.starts_at, lang)}–{formatTime(c.ends_at, lang)} · {c.title} · {t(c.kind === 'class' ? 'staff.rooms.conflict.class' : 'staff.rooms.conflict.booking')}</li>)}</ul>
                    <span className="xs">{t('staff.rooms.conflict.hint')}</span>
                  </div>
                : <p className="xs rooms-free">{t('staff.rooms.free', { room: roomName.get(form.roomId) ?? '' })}</p>
            )}
            {form.start && form.end && !windowOk && <p className="xs register-diff">{t('staff.rooms.badWindow')}</p>}
            <div className="row wrap">
              <Button disabled={!valid} loading={busy === 'book'} onClick={() => book('confirmed')}>{t('staff.rooms.cta.confirm')}</Button>
              <Button variant="secondary" disabled={!valid} loading={busy === 'book'} onClick={() => book('held')}>{t('staff.rooms.cta.hold')}</Button>
            </div>
            <p className="xs muted">{t('staff.rooms.form.charge')}</p>
          </div>
        )}
      </Card>
    ),
    Selected: () => {
      if (selectedSession) {
        return (
          <Card title={selectedSession.title} eyebrow={t('staff.rooms.selected.class')} padding="sm" actions={<Badge tone="primary">{formatTime(selectedSession.starts_at, lang)}–{formatTime(selectedSession.ends_at, lang)}</Badge>}>
            <p className="small">{teacher.get(selectedSession.teacher_id)?.display_name} · {roomName.get(selectedSession.room_id)} · {selectedSession.booked_count}/{selectedSession.capacity}</p>
            <div className="row wrap" style={{ marginTop: 8 }}><Link to={`/staff/checkin?session=${selectedSession.id}`}><Button size="sm" variant="ghost">{t('staff.home.openCheckin')}</Button></Link></div>
          </Card>
        );
      }
      if (!selected) return <Card tone="muted" padding="sm"><p className="small muted">{t('staff.rooms.selected.none')}</p></Card>;
      const sc = specialOf.get(selected.id);
      const canPay = can('payments.write') && !sc && selected.status !== 'cancelled' && selected.kind !== 'maintenance' && selected.kind !== 'blocked';
      return (
        <Card title={selected.title} eyebrow={bi(KIND_LABEL[selected.kind])} padding="sm" actions={<Badge tone={STATUS_TONE[selected.status]}>{bi(STATUS_LABEL[selected.status])}</Badge>}>
          <div className="stack-sm">
            <p className="small">{formatDate(selected.starts_at, lang, { weekday: 'long', day: 'numeric', month: 'long' })} · {formatTime(selected.starts_at, lang)}–{formatTime(selected.ends_at, lang)} · {roomName.get(selected.room_id)}</p>
            <p className="xs muted">
              {[selected.contact_name ?? (selected.customer_id ? people.find((p) => p.id === selected.customer_id)?.name : null), selected.teacher_id ? `${t('staff.rooms.f.teacher')}: ${teacher.get(selected.teacher_id)?.display_name ?? ''}` : null, selected.note].filter(Boolean).join(' · ') || '—'}
            </p>
            {sc
              ? <p className="xs"><Badge tone="success">{t('staff.rooms.paid', { amount: formatCOP(sc.amount, lang) })}</Badge>{sc.teacher_payout ? <span className="muted"> · {t('staff.rooms.payout', { amount: formatCOP(sc.teacher_payout, lang) })}</span> : null}</p>
              : selected.kind !== 'maintenance' && selected.kind !== 'blocked' && <p className="xs muted">{t('staff.rooms.unpaid')}</p>}
            {canWrite && (
              <div className="row wrap">
                {selected.status === 'held' && <Button size="sm" loading={busy === 'confirmed'} onClick={() => setStatus(selected, 'confirmed')}>{t('staff.rooms.action.confirm')}</Button>}
                {selected.status === 'confirmed' && <Button size="sm" variant="secondary" loading={busy === 'done'} onClick={() => setStatus(selected, 'done')}>{t('staff.rooms.action.done')}</Button>}
                {(selected.status === 'held' || selected.status === 'confirmed') && <Button size="sm" variant="ghost" loading={busy === 'cancelled'} onClick={() => setStatus(selected, 'cancelled')}>{t('staff.rooms.action.cancel')}</Button>}
                {canPay && <Button size="sm" variant="ghost" onClick={() => nav(`/staff/register?booking=${selected.id}`)}>{t('staff.rooms.action.charge')}</Button>}
              </div>
            )}
          </div>
        </Card>
      );
    },
    UpcomingList: () => (
      <Card title={t('staff.rooms.upcoming')} padding="sm">
        {upcoming.length === 0 && <p className="small muted" style={{ padding: 8 }}>{t('staff.rooms.upcoming.empty')}</p>}
        {upcoming.map((b) => (
          <button key={b.id} type="button" className={`rooms-upcoming ${selectedId === b.id ? 'is-selected' : ''}`} onClick={() => { setSelectedId(b.id); setDate(dateInputValue(new Date(b.starts_at))); }}>
            <span className="xs mono muted rooms-upcoming-when">{formatDate(b.starts_at, lang)} · {formatTime(b.starts_at, lang)}</span>
            <span className="grow small">{b.title}<span className="xs muted"> · {roomName.get(b.room_id)}</span></span>
            <Badge tone={STATUS_TONE[b.status]}>{bi(STATUS_LABEL[b.status])}</Badge>
          </button>
        ))}
      </Card>
    ),
  };

  const main = ['DateStrip', 'DayGrid'];
  return (
    <div className="stack">
      <div className="page-head">
        <div><h1>{t('staff.rooms.title')}</h1><p className="muted small">{t('staff.rooms.subtitle')}</p></div>
        <div className="row wrap">
          {can('payments.write') && <Link to="/staff/register"><Button size="sm" variant="ghost">{t('staff.home.openRegister')}</Button></Link>}
        </div>
      </div>
      {notice && <div className={`staff-notice ${notice.tone === 'bad' ? 'staff-notice-bad' : ''} small`}>{notice.text}</div>}
      <div className="rooms">
        <div className="stack rooms-main">
          {sections.filter((s) => main.includes(s)).filter(isVisible).map((name) => SECTIONS[name] ? <Fragment key={name}>{SECTIONS[name]()}</Fragment> : null)}
        </div>
        <aside className="stack rooms-rail">
          {sections.filter((s) => !main.includes(s)).filter(isVisible).map((name) => SECTIONS[name] ? <Fragment key={name}>{SECTIONS[name]()}</Fragment> : null)}
        </aside>
      </div>
      <p className="xs muted">{t('staff.rooms.footnote', { staff: user.name })}</p>
    </div>
  );
}
