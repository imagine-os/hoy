import { useState } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { addDays, dateKey, formatDate, formatTime, fromDateKey, isSameDay } from '../../../i18n/format';
import type { ClassSessionRow, ModalityRow, TeacherRow } from '../../../data/schema';
import { classDisplay, useSettings } from '../../../modules/admin/settings';
import { movements } from '../../../design/tokens';
import { ClassRow } from '../../molecule/ClassRow/ClassRow';
import { ClassThumbnail } from '../../molecule/ClassThumbnail/ClassThumbnail';
import './SessionCalendar.css';
export type CalendarView = 'day' | 'week' | 'month';
export interface CalendarSession { session: ClassSessionRow; modality?: ModalityRow; teacher?: TeacherRow }
export interface SessionCalendarProps { sessions: CalendarSession[]; onPick: (s: ClassSessionRow) => void; mine?: Set<string>; initialView?: CalendarView }
export function SessionCalendar({ sessions, onPick, mine, initialView = 'week' }: SessionCalendarProps) {
  const { t, lang, bi } = useI18n();
  const { settings } = useSettings();
  const [view, setView] = useState<CalendarView>(initialView);
  const [date, setDate] = useState(() => { const next = sessions.find(x => x.session.status === 'scheduled' && new Date(x.session.starts_at).getTime() > Date.now()); return initialView === 'week' && next ? fromDateKey(dateKey(new Date(next.session.starts_at))) : fromDateKey(dateKey()); });
  const monday = addDays(date, -((date.getDay() + 6) % 7));
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1, 12);
  const gridStart = addDays(monthStart, -((monthStart.getDay() + 6) % 7));
  const days = Array.from({ length: view === 'month' ? 42 : view === 'week' ? 7 : 1 }, (_, i) => addDays(view === 'month' ? gridStart : view === 'week' ? monday : date, i));
  const onDay = (d: Date) => sessions.filter(x => isSameDay(x.session.starts_at, d));
  const move = (n: number) => setDate(view === 'month' ? new Date(date.getFullYear(), date.getMonth() + n, 1, 12) : addDays(date, n * (view === 'week' ? 7 : 1)));
  const name = (x: CalendarSession) => classDisplay(settings.content.publicNaming, { title: x.session.title, modalityName: x.modality ? bi({ es: x.modality.name_es, en: x.modality.name_en }) : null, movementLabel: movements[x.modality?.movement ?? 'fluye'].label, teacher: x.teacher?.display_name ?? '' });
  const openDay = (d: Date) => { setDate(d); setView('day'); };
  return <section className="session-calendar">
    <div className="calendar-toolbar">
      <div className="calendar-period"><div className="calendar-arrows"><button type="button" aria-label={t('site.calendar.prev')} onClick={() => move(-1)}>‹</button><button type="button" aria-label={t('site.calendar.next')} onClick={() => move(1)}>›</button></div><h2 aria-live="polite">{view === 'day' ? formatDate(date, lang, { day: 'numeric', month: 'long', year: 'numeric' }) : view === 'week' ? `${formatDate(days[0], lang, { day: 'numeric', month: 'short' })} — ${formatDate(days[6], lang, { day: 'numeric', month: 'short', year: 'numeric' })}` : formatDate(date, lang, { month: 'long', year: 'numeric' })}</h2></div>
      <div className="calendar-controls"><button className="calendar-today" type="button" onClick={() => setDate(fromDateKey(dateKey()))}>{t('core.common.today')}</button><div className="calendar-views" role="group" aria-label={t('site.calendar.view')}>{(['day','week','month'] as CalendarView[]).map(v => <button key={v} type="button" aria-pressed={v === view} onClick={() => setView(v)}>{t(`site.calendar.${v}`)}</button>)}</div><label className="calendar-date-label"><span className="sr-only">{t('site.calendar.date')}</span><input type="date" value={dateKey(date)} aria-label={t('site.calendar.date')} onChange={e => { if (e.target.value) setDate(fromDateKey(e.target.value)); }} /></label></div>
    </div>
    <div className={`calendar-window calendar-${view}`}>
      {view === 'day' ? <><div className="calendar-day-heading"><span className="eyebrow">{formatDate(date, lang, { weekday: 'long' })}</span><span className="small muted">{t('site.calendar.classes', { n: onDay(date).length })}</span></div>{onDay(date).length === 0 && <p className="calendar-empty">{t('site.calendar.empty')}</p>}{onDay(date).map(x => <ClassRow key={x.session.id} {...name(x)} thumbnail={<ClassThumbnail modality={x.modality}/>} startsAt={x.session.starts_at} durationMin={x.modality?.duration_min ?? 60} movement={x.modality?.movement ?? 'fluye'} booked={x.session.booked_count} capacity={x.session.capacity} status={x.session.status} booked_by_me={mine?.has(x.session.id)} onClick={() => onPick(x.session)} />)}</> : <>
        <div className="calendar-grid">{days.map(d => <div key={dateKey(d)} className={`calendar-column ${isSameDay(d, new Date()) ? 'is-today' : ''} ${view === 'month' && d.getMonth() !== date.getMonth() ? 'is-outside' : ''}`}>
          <button className="calendar-day-head" type="button" onClick={() => openDay(d)} aria-label={formatDate(d, lang, { weekday: 'long', day: 'numeric', month: 'long' })}><span>{formatDate(d, lang, { weekday: 'short' })}</span><strong>{d.getDate()}</strong><small>{t('site.calendar.classes', { n: onDay(d).length })}</small></button>
          {onDay(d).length === 0 && <p className="calendar-empty small">{t('site.calendar.noClasses')}</p>}
          {onDay(d).slice(0, view === 'month' ? 2 : undefined).map(x => <button key={x.session.id} type="button" className={`calendar-session ${x.session.status !== 'scheduled' ? 'is-off' : ''}`} data-movement={x.modality?.movement ?? 'fluye'} onClick={() => onPick(x.session)}>
            <ClassThumbnail modality={x.modality}/><span className="calendar-session-copy"><time>{formatTime(x.session.starts_at, lang)}</time><strong>{name(x).title}</strong>{view === 'week' && <span>{x.teacher?.display_name}</span>}<small>{x.session.status !== 'scheduled' ? t(x.session.status === 'completed' ? 'customer.schedule.done' : 'core.status.cancelled') : mine?.has(x.session.id) ? t('core.status.booked') : x.session.booked_count >= x.session.capacity ? t('core.common.full') : t('core.common.spots', { n: x.session.capacity - x.session.booked_count })}</small></span>
          </button>)}
          {view === 'month' && onDay(d).length > 2 && <button type="button" className="calendar-more" onClick={() => openDay(d)}>{t('site.calendar.more', { n: onDay(d).length - 2 })}</button>}
        </div>)}</div>
      </>}
    </div>
    <p className="calendar-footnote small muted">{t('site.calendar.note')}</p>
  </section>;
}
