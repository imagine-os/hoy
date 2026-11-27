import { useState } from 'react';
import { Button } from '../../components/atom/Button/Button';
import { Input } from '../../components/atom/Input/Input';
import { Card } from '../../components/molecule/Card/Card';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { useTable } from '../../data/DataContext';
import type { BookingRow, ClassSessionRow } from '../../data/schema';
import { useI18n } from '../../i18n/I18nProvider';
import { addDaysKey, dateKey, formatDate, formatTime } from '../../i18n/format';
import { attendanceCsv, attendanceRange, attendanceReport, attendanceSessions, type AttendanceRange } from './attendanceHistory';

export function AttendanceHistory({ now }: { now: number }) {
  const { t } = useI18n();
  const today = dateKey(new Date(now));
  const yesterday = addDaysKey(today, -1);
  const [from, setFrom] = useState(yesterday);
  const [to, setTo] = useState(yesterday);
  const requested = attendanceRange(from, to, today);
  const [range, setRange] = useState<AttendanceRange>({ from: yesterday, to: yesterday });
  const sessions = useTable<ClassSessionRow>('class_sessions', { orderBy: { column: 'starts_at' } });
  const past = attendanceSessions(sessions.rows, range, now);

  return <Card padding="sm">
    <section className="stack-sm" aria-labelledby="attendance-history-title">
      <h2 id="attendance-history-title">{t('staff.history.title')}</h2>
      <p className="small muted">{t('staff.history.description')}</p>
      <form className="row wrap" onSubmit={e => { e.preventDefault(); if (requested) setRange(requested); }}>
        <label className="stack-sm"><span>{t('staff.history.from')}</span><Input type="date" value={from} max={yesterday} required onChange={e => setFrom(e.target.value)} /></label>
        <label className="stack-sm"><span>{t('staff.history.to')}</span><Input type="date" value={to} max={yesterday} required onChange={e => setTo(e.target.value)} /></label>
        <Button type="submit" variant="secondary" size="sm" disabled={!requested}>{t('staff.history.view')}</Button>
      </form>
      {!requested && <p className="small" role="status">{t('staff.history.rangeInvalid')}</p>}
      <p className="small muted" role="status">{t('staff.history.showing', range)}</p>
      {sessions.error ? <EmptyState compact tone="error" title={t('staff.history.unavailable')} /> :
        sessions.loading ? <EmptyState compact tone="loading" title={t('core.common.loading')} /> :
        past.length ? <AttendanceCounts sessions={past} range={range} /> : <EmptyState compact title={t('staff.history.empty')} />}
    </section>
  </Card>;
}

function AttendanceCounts({ sessions, range }: { sessions: ClassSessionRow[]; range: AttendanceRange }) {
  const { t, lang } = useI18n();
  const { rows, loading, error } = useTable<BookingRow>('bookings', { where: { session_id: sessions.map(s => s.id), status: 'checked_in' } });
  if (error) return <EmptyState compact tone="error" title={t('staff.history.unavailable')} />;
  if (loading) return <EmptyState compact tone="loading" title={t('core.common.loading')} />;

  const report = attendanceReport(sessions, rows);
  const headers = [t('staff.history.date'), t('staff.history.time'), t('staff.history.class'), t('staff.history.checkedIn')];
  const exportCsv = () => {
    const url = URL.createObjectURL(new Blob(['\uFEFF', attendanceCsv(report, headers, lang)], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `hoy-attendance-${range.from}-${range.to}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <div className="stack-sm">
    <div className="row wrap"><Button type="button" size="sm" variant="outline" onClick={exportCsv}>{t('staff.history.export')}</Button></div>
    <ul className="stack-sm" aria-label={t('staff.history.title')}>
      {report.map(({ session, checkedIn }) => <li key={session.id} className="row-between wrap checkin-teacher">
        <div><strong>{session.title}</strong><div className="small muted">{formatDate(session.starts_at, lang)} · {formatTime(session.starts_at, lang)}</div></div>
        <span>{t('staff.history.count', { n: checkedIn })}</span>
      </li>)}
    </ul>
  </div>;
}
