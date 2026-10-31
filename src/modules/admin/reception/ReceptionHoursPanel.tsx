import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { useData } from '../../../data/DataContext';
import { formatDate } from '../../../i18n/format';
import { Card } from '../../../components/molecule/Card/Card';
import { Button } from '../../../components/atom/Button/Button';
import { Input } from '../../../components/atom/Input/Input';
import { Toggle } from '../../../components/atom/Toggle/Toggle';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { EmptyState } from '../../../components/molecule/EmptyState/EmptyState';
import { cosRequest, errorCode } from '../../staff/desk/wire';
import { queryAll } from '../../staff/desk/useCos';
import { deskErrorText } from '../../staff/desk/strings';
import { WEEK_ORDER, formatDates, formatWeek, parseDates, parseWeek, sundayNeedsNotice, weekProblems, type WeekWindows } from './reviewHours';
import { closedDatesOf } from '../../../data/companyos/closedDates';
import { today as studioToday } from '../../../data/companyos/dates';
import type { HoursOverrideRow } from '../../../data/schema';

interface BookingSettings { settings: { review_hours?: string; review_closed_dates?: string } }

/**
 * AD-05 / J1b / Q-15 in the production build: the weekly reception windows and closed days, in the bookings settings.
 * The closed days shown also include every closed holiday or special-hours day from today on (`hours_override`), so
 * saving here carries the ones a coordinator added (only the Super Admin writes module settings; review round 1, M5).
 * `closedDatesVersion` changes when an override changed the closed days: the dates are read again, the week edits stay.
 */
export function ReceptionHoursPanel({ closedDatesVersion = 0 }: { closedDatesVersion?: number }) {
  const { t, lang } = useI18n();
  const data = useData();
  const request = cosRequest(data);
  const [week, setWeek] = useState<WeekWindows | null>(null);
  const [dates, setDates] = useState<string[]>([]);
  const [newDate, setNewDate] = useState('');
  const [sundayClasses, setSundayClasses] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const tRef = useRef(t); tRef.current = t;
  // Loads once per provider: a re-render never re-fetches or overwrites unsaved edits.
  const loadedWeek = useRef(false);
  useEffect(() => {
    if (!request) return;
    const t = tRef.current;
    // The holidays are a nicety here: a role that may not read them still sees the bookings dates.
    const holidays = data.list<HoursOverrideRow>('hours_overrides').then(rows => closedDatesOf(rows, studioToday())).catch(() => [] as string[]);
    Promise.all([request<BookingSettings>('GET', '/modules/bookings/settings'), holidays])
      .then(([r, extra]) => {
        if (!loadedWeek.current) { loadedWeek.current = true; setWeek(parseWeek(r.settings.review_hours ?? '')); }
        setDates(parseDates(formatDates([...parseDates(r.settings.review_closed_dates ?? ''), ...extra])));
      })
      .catch(e => setMessage({ tone: 'error', text: errorCode(e) === 'forbidden' ? t('recHours.forbidden') : deskErrorText(errorCode(e), t) }));
    if (closedDatesVersion === 0) queryAll(request, { entity: 'schedule', filter: { and: [{ field: 'weekday', op: 'eq', value: 0 }, { field: 'active', op: 'eq', value: true }] } }).then(r => setSundayClasses(r.length)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request, closedDatesVersion]);
  if (!request) return null;
  const dayName = (d: number) => new Intl.DateTimeFormat(lang === 'en' ? 'en' : 'es-CO', { weekday: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 10, 1 + d)));
  const problems = week ? weekProblems(week) : [];
  // An empty `review_hours` means "always open" to the server, the opposite of every day switched off.
  const noDay = !!week && week.every(w => !w);
  const save = async () => {
    if (!week || problems.length || noDay || busy) return;
    setBusy(true); setMessage(null);
    try {
      await request('PATCH', '/modules/bookings/settings', { settings: { review_hours: formatWeek(week), review_closed_dates: formatDates(dates) } });
      setMessage({ tone: 'ok', text: t('recHours.saved') });
    } catch (e) { setMessage({ tone: 'error', text: errorCode(e) === 'forbidden' ? t('recHours.forbidden') : deskErrorText(errorCode(e), t) }); }
    finally { setBusy(false); }
  };
  return (
    <Card title={t('recHours.title')}>
      <div className="stack-sm">
        <p className="xs muted">{t('recHours.body')}</p>
        {message && <p className={`small ${message.tone === 'error' ? 'register-diff' : 'rooms-free'}`} role={message.tone === 'error' ? 'alert' : 'status'}>{message.text}</p>}
        {!week ? (!message && <EmptyState compact tone="loading" title={t('core.common.loading')} />) : <>
          {WEEK_ORDER.map(d => { const w = week[d]; return <div key={d} className="row wrap">
            <span className="small" style={{ minWidth: '7rem' }}>{dayName(d)}</span>
            <Toggle size="sm" checked={!!w} onChange={on => setWeek(week.map((x, i) => i === d ? (on ? { open: '08:00', close: '20:00' } : null) : x))} label={t('recHours.open')} />
            {w && <><Input type="time" aria-label={`${dayName(d)} ${t('recHours.from')}`} value={w.open} onChange={e => setWeek(week.map((x, i) => i === d ? { ...w, open: e.target.value } : x))} />
              <Input type="time" aria-label={`${dayName(d)} ${t('recHours.to')}`} value={w.close === '24:00' ? '23:59' : w.close} onChange={e => setWeek(week.map((x, i) => i === d ? { ...w, close: e.target.value } : x))} /></>}
          </div>; })}
          {problems.map(p => <p key={p.day} className="xs register-diff">{t(`recHours.problem.${p.problem}`, { day: dayName(p.day) })}</p>)}
          {sundayNeedsNotice(week, sundayClasses) && <Notice tone="warn">{t('recHours.sunday', { n: sundayClasses })}</Notice>}
          <div className="stack-sm">
            <span className="small">{t('recHours.closedDates')}</span>
            <div className="row wrap">{dates.map(d => <Button key={d} size="sm" variant="outline" icon="x" onClick={() => setDates(dates.filter(x => x !== d))}>{formatDate(d, lang)}</Button>)}</div>
            <div className="row wrap"><Input type="date" aria-label={t('recHours.addDate')} value={newDate} onChange={e => setNewDate(e.target.value)} /><Button size="sm" variant="secondary" disabled={!newDate} onClick={() => { setDates(parseDates(formatDates([...dates, newDate]))); setNewDate(''); }}>{t('recHours.addDate')}</Button></div>
          </div>
          {noDay && <p className="xs register-diff">{t('recHours.noDay')}</p>}
          <Button disabled={busy || problems.length > 0 || noDay} loading={busy} onClick={save}>{t('recHours.save')}</Button>
        </>}
      </div>
    </Card>
  );
}
