import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { rateFor } from '../../data/payrollCalc';
import { useSettings } from '../admin/settings';
import { useData, useTable } from '../../data/DataContext';
import type { BookingRow, ClassSessionRow, RoomRow, SpaceBookingRow, SpecialChargeRow } from '../../data/schema';
import { formatCOP, formatDate, formatTime, isSameDay } from '../../i18n/format';
import { StatTile } from '../../components/molecule/StatTile/StatTile';
import { Card } from '../../components/molecule/Card/Card';
import { Button } from '../../components/atom/Button/Button';
import { Select } from '../../components/atom/Input/Input';
import { Field } from '../../components/molecule/Field/Field';
import { Badge } from '../../components/atom/Badge/Badge';
import { ClassRow } from '../../components/molecule/ClassRow/ClassRow';
import { ClassCard } from '../../components/organism/ClassCard/ClassCard';
import { Drawer } from '../../components/organism/Drawer/Drawer';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { useSessionsJoined } from '../website/hooks';
import { useAudit } from '../staff/audit';
import { KIND_LABEL, STATUS_LABEL } from '../staff/rooms';
import { useTeacherSelf } from './useTeacherSelf';
import './teacher.css';

/** S-03 Teacher home: next class, today's rosters, the week, substitution request and the payroll estimate. */
export function TeacherHomePage() {
  const { t, lang, bi } = useI18n();
  const { settings: homeSettings } = useSettings();
  const nav = useNavigate();
  const data = useData();
  const audit = useAudit('teacher_app');
  const { me, linked, teachers, choose } = useTeacherSelf();
  const now = new Date();
  const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7);
  const meId = me?.id;
  const mine = useSessionsJoined(useCallback((s: ClassSessionRow) => !!meId && s.teacher_id === meId && new Date(s.ends_at) >= new Date(Date.now() - 86400e3 * 7) && new Date(s.starts_at) <= weekEnd, [meId, weekEnd.getTime()]));
  const upcoming = mine.filter((x) => x.session.status === 'scheduled' && new Date(x.session.ends_at) >= now);
  const today = mine.filter((x) => isSameDay(x.session.starts_at, now) && x.session.status !== 'cancelled');
  const week = upcoming.filter((x) => !isSameDay(x.session.starts_at, now));
  const next = upcoming[0];
  const todayIds = useMemo(() => today.map((x) => x.session.id), [today]);
  const { rows: bookings } = useTable<BookingRow>('bookings', { where: { session_id: todayIds } });
  const arrived = (id: string) => bookings.filter((b) => b.session_id === id && b.status === 'checked_in').length;
  const monthTaught = mine.filter((x) => x.session.status === 'completed' && new Date(x.session.starts_at).getMonth() === now.getMonth()).length;
  // Especiales (0017): rooms booked with this teacher outside the timetable, last 7 days and ahead.
  const { rows: mySpace } = useTable<SpaceBookingRow>('space_bookings', meId ? { where: { teacher_id: meId }, orderBy: { column: 'starts_at' } } : { limit: 0 });
  const { rows: mySpecials } = useTable<SpecialChargeRow>('special_charges', meId ? { where: { teacher_id: meId } } : { limit: 0 });
  const { rows: rooms } = useTable<RoomRow>('rooms');
  const roomName = useMemo(() => new Map(rooms.map((r) => [r.id, r.name])), [rooms]);
  const payoutOf = useMemo(() => new Map(mySpecials.filter((s) => s.space_booking_id).map((s) => [s.space_booking_id as string, s.teacher_payout])), [mySpecials]);
  const specials = mySpace.filter((b) => b.status !== 'cancelled' && new Date(b.ends_at) >= new Date(Date.now() - 86400e3 * 7));
  const [sub, setSub] = useState<{ open: boolean; session: string; reason: string; sent?: boolean }>({ open: false, session: '', reason: '' });

  const requestSub = async () => {
    const s = upcoming.find((x) => x.session.id === sub.session)?.session;
    if (!s || !me) return;
    await audit('substitution.request', 'class_sessions', s.id, { teacher_id: me.id, teacher: me.display_name, reason: sub.reason, starts_at: s.starts_at, title: s.title });
    await data.insert('message_log', { user_id: null, channel: 'whatsapp', template_key: 'substitution_request', automation_id: null, status: 'queued', sent_at: null, payload: { to: 'coordinator', teacher: me.display_name, class: s.title, starts_at: s.starts_at, reason: sub.reason } });
    setSub({ ...sub, sent: true });
  };

  return (
    <div className="container page stack teach">
      <div className="row-between wrap">
        <h1 className="teach-h1">{t('teacher.home.title')}</h1>
        {me && <span className="small muted">{me.display_name}</span>}
      </div>
      {!linked && (
        <Card tone="muted">
          <p className="small muted" style={{ marginBottom: 8 }}>{t('teacher.home.notLinked')}</p>
          <Field label={t('teacher.home.viewAs')}>{(id) => <Select id={id} value={me?.id ?? ''} onChange={(e) => choose(e.target.value || null)}><option value="">—</option>{teachers.map((x) => <option key={x.id} value={x.id}>{x.display_name}</option>)}</Select>}</Field>
        </Card>
      )}
      {me && (
        <>
          <section className="stack-sm">
            <div className="eyebrow">{t('teacher.home.next')}</div>
            {next
              ? <ClassCard variant="next" title={next.session.title} teacher={`${next.session.booked_count}/${next.session.capacity} · ${t('teacher.home.arrived', { n: arrived(next.session.id) })}`} startsAt={next.session.starts_at} endsAt={next.session.ends_at} movement={next.modality?.movement ?? 'fluye'} booked={next.session.booked_count} capacity={next.session.capacity} cta={{ label: t('teacher.home.openRoster'), onClick: () => nav(`/teach/class/${next.session.id}`) }} />
              : <EmptyState compact title={t('teacher.home.noNext')} body={t('teacher.home.noNext.body')} />}
          </section>

          <div className="grid grid-3">
            <StatTile label={t('teacher.home.today')} value={today.length} />
            <StatTile label={t('teacher.home.taughtMonth')} value={monthTaught} />
            <StatTile label={t('teacher.home.payroll')} value={formatCOP(monthTaught * rateFor(me.id, (me.specialties as string[] | undefined)?.[0] ?? null, [me], homeSettings.payroll.rateCard), lang)} hint={t('teacher.home.payroll.hint')} />
          </div>

          <section className="stack-sm">
            <div className="row-between"><div className="eyebrow">{t('core.common.today')}</div><span className="xs muted">{formatDate(now.toISOString(), lang)}</span></div>
            <Card padding="sm">
              {today.length === 0 && <p className="muted small" style={{ padding: 12 }}>{t('teacher.home.emptyToday')}</p>}
              {today.map(({ session: s, modality: m }) => (
                <div key={s.id} className="teach-todayrow">
                  <ClassRow title={s.title} teacher={t('teacher.home.arrivedOf', { n: arrived(s.id), total: s.booked_count })} startsAt={s.starts_at} durationMin={m?.duration_min ?? 60} movement={m?.movement ?? 'fluye'} booked={s.booked_count} capacity={s.capacity} status={s.status} onClick={() => nav(`/teach/class/${s.id}`)} />
                </div>
              ))}
            </Card>
          </section>

          <section className="stack-sm">
            <div className="eyebrow">{t('teacher.home.specials')}</div>
            <Card padding="sm">
              {specials.length === 0 && <p className="muted small" style={{ padding: 12 }}>{t('teacher.home.specials.empty')}</p>}
              {specials.map((b) => {
                const payout = payoutOf.get(b.id);
                return (
                  <div key={b.id} className="teach-payline">
                    <span className="grow">
                      <span className="row wrap"><strong className="small">{b.title}</strong><Badge tone={b.status === 'done' ? 'success' : b.status === 'held' ? 'warn' : 'primary'}>{bi(STATUS_LABEL[b.status])}</Badge></span>
                      <span className="xs muted">{formatDate(b.starts_at, lang)} · {formatTime(b.starts_at, lang)}–{formatTime(b.ends_at, lang)} · {roomName.get(b.room_id)} · {bi(KIND_LABEL[b.kind])}</span>
                    </span>
                    <span className="xs mono">{payout ? t('teacher.home.specials.payout', { amount: formatCOP(payout, lang) }) : t('teacher.home.specials.unpaid')}</span>
                  </div>
                );
              })}
            </Card>
            <p className="xs muted">{t('teacher.home.specials.hint')}</p>
          </section>

          <section className="stack-sm">
            <div className="row-between"><div className="eyebrow">{t('teacher.home.week')}</div><Button size="sm" variant="ghost" onClick={() => setSub({ open: true, session: upcoming[0]?.session.id ?? '', reason: '' })}>{t('teacher.home.sub')}</Button></div>
            <Card padding="sm">
              {week.length === 0 && <p className="muted small" style={{ padding: 12 }}>{t('teacher.home.empty')}</p>}
              {week.map(({ session: s, modality: m }) => <ClassRow key={s.id} title={s.title} teacher={formatDate(s.starts_at, lang, { weekday: 'long', day: 'numeric' })} startsAt={s.starts_at} durationMin={m?.duration_min ?? 60} movement={m?.movement ?? 'fluye'} booked={s.booked_count} capacity={s.capacity} status={s.status} onClick={() => nav(`/teach/class/${s.id}`)} />)}
            </Card>
          </section>
        </>
      )}

      <Drawer open={sub.open} onClose={() => setSub({ ...sub, open: false })} side="bottom" title={t('teacher.home.sub')}>
        {sub.sent ? <EmptyState compact title={t('teacher.home.sub.sent')} body={t('teacher.home.sub.sent.body')} action={<Button size="sm" onClick={() => setSub({ open: false, session: '', reason: '' })}>{t('core.common.close')}</Button>} /> : (
          <div className="stack-sm">
            <p className="small muted">{t('teacher.home.sub.body')}</p>
            <Field label={t('teacher.home.sub.class')}>{(id) => <Select id={id} value={sub.session} onChange={(e) => setSub({ ...sub, session: e.target.value })}>{upcoming.map(({ session: s }) => <option key={s.id} value={s.id}>{formatDate(s.starts_at, lang)} {formatTime(s.starts_at, lang)} · {s.title}</option>)}</Select>}</Field>
            <Field label={t('teacher.home.sub.reason')}>{(id) => <textarea id={id} className="input" rows={3} value={sub.reason} onChange={(e) => setSub({ ...sub, reason: e.target.value })} />}</Field>
            <div className="row"><Badge tone="warn">{t('teacher.home.sub.rule')}</Badge></div>
            <Button block disabled={!sub.session || !sub.reason.trim()} onClick={requestSub}>{t('teacher.home.sub.send')}</Button>
          </div>
        )}
      </Drawer>
    </div>
  );
}
