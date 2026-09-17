import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { useData, useRow, useTable } from '../../data/DataContext';
import type { BookingRow, ClassSessionRow, ModalityRow, RoomRow } from '../../data/schema';
import { formatDate, formatTime, MS } from '../../i18n/format';
import { Card } from '../../components/molecule/Card/Card';
import { Button } from '../../components/atom/Button/Button';
import { Badge } from '../../components/atom/Badge/Badge';
import { Chip } from '../../components/atom/Chip/Chip';
import { CapacityMeter } from '../../components/molecule/CapacityMeter/CapacityMeter';
import { RosterRow } from '../../components/molecule/RosterRow/RosterRow';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { Timeline } from '../../components/organism/Timeline/Timeline';
import { RatingSummary } from '../../components/molecule/RatingSummary/RatingSummary';
import { useSessionReviews } from '../customer/hooks';
import { useAudit, type AuditRow } from '../staff/audit';
import { maskPhone, usePeople } from '../staff/people';
import { useSettings } from '../admin/settings';
import { useTeacherSelf } from './useTeacherSelf';
import './teacher.css';

const OPEN_BEFORE_MS = 15 * MS.min;
const OPEN_AFTER_MS = 2 * MS.hour;

/** /teach/class/:id — roster, attendance marks inside the window, class notes. */
export function TeacherClassPage() {
  const { id } = useParams();
  const { t, lang } = useI18n();
  const data = useData();
  const { can, user } = useSession();
  const audit = useAudit('teacher_app');
  const { me } = useTeacherSelf();
  const { settings } = useSettings();
  const session = useRow<ClassSessionRow>('class_sessions', id);
  const modality = useRow<ModalityRow>('modalities', session?.modality_id);
  const room = useRow<RoomRow>('rooms', session?.room_id);
  const { rows: bookings, loading } = useTable<BookingRow>('bookings', { where: { session_id: id ?? '__none__' } });
  const { rows: notes } = useTable<AuditRow>('audit_log', { where: { entity: 'class_sessions', entity_id: id ?? '__none__', action: 'session.note' }, orderBy: { column: 'created_at', dir: 'desc' } });
  const { byId } = usePeople();
  const reviews = useSessionReviews(id);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  if (!session) return <div className="container page stack teach"><EmptyState tone={loading ? 'loading' : 'error'} title={loading ? t('core.common.loading') : t('teacher.class.notFound')} body={loading ? undefined : t('teacher.class.notFound.body')} action={<Link to="/teach"><Button size="sm" variant="secondary">{t('core.nav.back')}</Button></Link>} /></div>;

  const now = Date.now();
  const start = new Date(session.starts_at).getTime(), end = new Date(session.ends_at).getTime();
  const inWindow = now >= start - OPEN_BEFORE_MS && now <= end + OPEN_AFTER_MS;
  const override = can('bookings.write_any');
  const isMine = !!me && me.id === session.teacher_id;
  const canMark = can('checkin.write') && (inWindow || override) && (isMine || override) && session.status !== 'cancelled';
  const lockReason = !inWindow ? (now < start ? t('teacher.class.locked.early') : t('teacher.class.locked.late')) : !isMine ? t('teacher.class.locked.notMine') : null;
  const active = bookings.filter((b) => b.status !== 'cancelled' && b.status !== 'late_cancel');
  const present = active.filter((b) => b.status === 'checked_in').length;
  const graceMs = settings.policies.lateGraceMin * MS.min;

  const mark = async (b: BookingRow, status: BookingRow['status']) => {
    if (!canMark) return;
    setBusy(b.id);
    try {
      await data.update('bookings', b.id, { status, checked_in_at: status === 'checked_in' ? new Date().toISOString() : null });
      await audit(status === 'checked_in' ? 'attendance.present' : status === 'no_show' ? 'attendance.absent' : 'attendance.reset', 'bookings', b.id, { before: b.status, after: status, session_id: session.id, override: !isMine || !inWindow });
    } finally { setBusy(null); }
  };
  const markAll = async () => { for (const b of active.filter((x) => x.status === 'booked')) await mark(b, 'checked_in'); };
  const complete = async () => {
    await data.update('class_sessions', session.id, { status: 'completed' });
    await audit('session.complete', 'class_sessions', session.id, { before: 'scheduled', after: 'completed', present, booked: session.booked_count });
  };
  const addNote = async () => {
    if (!note.trim()) return;
    await audit('session.note', 'class_sessions', session.id, { note: note.trim(), author: me?.display_name ?? user.name });
    setNote('');
  };

  return (
    <div className="container page stack teach">
      <Link to="/teach" className="small">← {t('core.nav.back')}</Link>
      <Card tone="primary" className="teach-head">
        <div className="row wrap"><Chip movement={modality?.movement ?? 'fluye'} dot>{session.title}</Chip>{session.status !== 'scheduled' && <Badge tone={session.status === 'completed' ? 'primary' : 'danger'}>{session.status}</Badge>}</div>
        <div className="teach-head-time">{formatDate(session.starts_at, lang, { weekday: 'long', day: 'numeric', month: 'long' })} · {formatTime(session.starts_at, lang)}–{formatTime(session.ends_at, lang)}</div>
        <div className="row wrap small"><span>{room?.name ?? '—'}</span><span>·</span><span>{t('teacher.class.present', { n: present, total: active.length })}</span></div>
        <CapacityMeter booked={session.booked_count} capacity={session.capacity} />
      </Card>

      <Card tone={canMark ? 'surface' : 'muted'} padding="sm" className="row-between wrap">
        <div className="small">
          <strong>{canMark ? t('teacher.class.window.open') : t('teacher.class.window.locked')}</strong>
          <div className="xs muted">{canMark && !inWindow ? t('teacher.class.window.override') : lockReason ?? t('teacher.class.window.rule')}</div>
        </div>
        <div className="row wrap">
          {canMark && active.some((b) => b.status === 'booked') && <Button size="sm" variant="secondary" onClick={markAll}>{t('teacher.class.markAll')}</Button>}
          {canMark && session.status === 'scheduled' && now >= start && <Button size="sm" onClick={complete}>{t('teacher.class.complete')}</Button>}
        </div>
      </Card>

      <section className="stack-sm">
        <div className="row-between"><div className="eyebrow">{t('teacher.class.roster')}</div><span className="xs muted mono">{active.length}</span></div>
        {loading && active.length === 0 && <EmptyState compact tone="loading" title={t('core.common.loading')} />}
        {!loading && active.length === 0 && <EmptyState compact title={t('teacher.class.emptyRoster')} />}
        {active.length > 0 && (
          <Card padding="none">
            {active.map((b) => {
              const p = byId.get(b.user_id);
              const late = !!b.checked_in_at && new Date(b.checked_in_at).getTime() > start + graceMs;
              return <RosterRow key={b.id} name={p?.name ?? b.user_id} initials={p?.initials} phone={isMine ? undefined : maskPhone(p?.phone)} plan={b.paid_with} status={b.status as 'booked' | 'checked_in' | 'no_show'} late={late} flag={p?.notes ?? undefined} time={b.checked_in_at ? formatTime(b.checked_in_at, lang) : undefined}
                actions={canMark && (b.status === 'booked'
                  ? <><Button size="sm" loading={busy === b.id} onClick={() => mark(b, 'checked_in')}>{t('teacher.class.present.mark')}</Button><Button size="sm" variant="ghost" onClick={() => mark(b, 'no_show')}>{t('teacher.class.absent.mark')}</Button></>
                  : <Button size="sm" variant="ghost" onClick={() => mark(b, 'booked')}>{t('staff.checkin.undo')}</Button>)} />;
            })}
          </Card>
        )}
      </section>

      {reviews.count > 0 && (
        <section className="stack-sm">
          <div className="eyebrow">{t('teacher.class.reviews')}</div>
          <Card>
            <RatingSummary average={reviews.average} count={reviews.count} tags={reviews.tags} tagLabel={(k) => t(`customer.rate.tag.${k}`)}
              caption={t('teacher.class.reviews.count', { n: reviews.count })} emptyText={t('teacher.class.reviews.none')} />
            <p className="xs muted">{t('teacher.class.reviews.note')}</p>
          </Card>
        </section>
      )}

      <section className="stack-sm">
        <div className="eyebrow">{t('teacher.class.notes')}</div>
        <Card>
          <div className="stack-sm">
            <textarea className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('teacher.class.notes.ph')} aria-label={t('teacher.class.notes')} />
            <div className="row-between wrap"><span className="xs muted">{t('teacher.class.notes.hint')}</span><Button size="sm" disabled={!note.trim()} onClick={addNote}>{t('teacher.class.notes.add')}</Button></div>
            <Timeline items={notes.map((n) => ({ id: n.id, at: n.created_at, kind: 'note' as const, title: String(n.diff?.author ?? ''), body: String(n.diff?.note ?? '') }))} emptyText={t('teacher.class.notes.empty')} />
          </div>
        </Card>
      </section>
    </div>
  );
}
