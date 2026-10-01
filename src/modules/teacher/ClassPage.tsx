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
import { Icon } from '../../components/atom/Icon/Icon';

/**
 * /teach/class/:id — the roster (read-only), reviews and class notes. 0051: check-in happens only at the front desk
 * (S-02), so the teacher sees who arrived but marks nobody; the old in-window attendance buttons are gone.
 */
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

  if (!session) return <div className="container page stack teach"><EmptyState tone={loading ? 'loading' : 'error'} title={loading ? t('core.common.loading') : t('teacher.class.notFound')} body={loading ? undefined : t('teacher.class.notFound.body')} action={<Link to="/teach"><Button size="sm" variant="secondary">{t('core.nav.back')}</Button></Link>} /></div>;

  const now = Date.now();
  const start = new Date(session.starts_at).getTime();
  const override = can('bookings.write_any');
  const isMine = !!me && me.id === session.teacher_id;
  const canComplete = (isMine || override) && session.status === 'scheduled' && now >= start;
  const active = bookings.filter((b) => b.status !== 'cancelled' && b.status !== 'late_cancel');
  const present = active.filter((b) => b.status === 'checked_in').length;
  const graceMs = settings.policies.lateGraceMin * MS.min;

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
      <Link to="/teach" className="small" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-xs)' }}><Icon name="arrow-left" size="sm" /> {t('core.nav.back')}</Link>
      <Card tone="primary" className="teach-head">
        <div className="row wrap"><Chip tone={modality?.tone ?? 'river'} dot>{session.title}</Chip>{session.status !== 'scheduled' && <Badge tone={session.status === 'completed' ? 'primary' : 'danger'}>{session.status}</Badge>}</div>
        <div className="teach-head-time">{formatDate(session.starts_at, lang, { weekday: 'long', day: 'numeric', month: 'long' })} · {formatTime(session.starts_at, lang)}–{formatTime(session.ends_at, lang)}</div>
        <div className="row wrap small"><span>{room?.name ?? '—'}</span><span>·</span><span>{t('teacher.class.present', { n: present, total: active.length })}</span></div>
        <CapacityMeter booked={session.booked_count} capacity={session.capacity} />
      </Card>

      <Card tone="muted" padding="sm" className="row-between wrap">
        <div className="small">
          <strong>{t('teacher.class.checkin.title')}</strong>
          <div className="xs muted">{t('teacher.class.checkin.body')}</div>
        </div>
        {canComplete && <Button size="sm" onClick={complete} icon="circle-check">{t('teacher.class.complete')}</Button>}
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
              return <RosterRow key={b.id} name={p?.name ?? b.user_id} initials={p?.initials} phone={isMine ? undefined : maskPhone(p?.phone)} plan={b.paid_with ? t(`customer.paidWith.${b.paid_with}`) : undefined} status={b.status as 'booked' | 'checked_in' | 'no_show'} late={late} flag={p?.notes ?? undefined} time={b.checked_in_at ? formatTime(b.checked_in_at, lang) : undefined} />;
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
            <div className="row-between wrap"><span className="xs muted">{t('teacher.class.notes.hint')}</span><Button size="sm" disabled={!note.trim()} onClick={addNote} icon="notes">{t('teacher.class.notes.add')}</Button></div>
            <Timeline items={notes.map((n) => ({ id: n.id, at: n.created_at, kind: 'note' as const, title: String(n.diff?.author ?? ''), body: String(n.diff?.note ?? '') }))} emptyText={t('teacher.class.notes.empty')} />
          </div>
        </Card>
      </section>
    </div>
  );
}
