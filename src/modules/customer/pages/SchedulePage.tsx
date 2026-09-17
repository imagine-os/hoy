import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useSession } from '../../../auth/SessionProvider';
import { useTable } from '../../../data/DataContext';
import type { ClassSessionRow, ModalityRow, TeacherRow } from '../../../data/schema';
import { formatDate, formatTime, isSameDay } from '../../../i18n/format';
import { useLayout } from '../../../layout/useLayout';
import { movements, type Movement } from '../../../design/tokens';
import { Card } from '../../../components/molecule/Card/Card';
import { Chip } from '../../../components/atom/Chip/Chip';
import { Button } from '../../../components/atom/Button/Button';
import { Badge } from '../../../components/atom/Badge/Badge';
import { Select } from '../../../components/atom/Input/Input';
import { Field } from '../../../components/molecule/Field/Field';
import { Drawer } from '../../../components/organism/Drawer/Drawer';
import { ClassRow } from '../../../components/molecule/ClassRow/ClassRow';
import { DateStrip } from '../../../components/molecule/DateStrip/DateStrip';
import { SegmentedControl } from '../../../components/molecule/SegmentedControl/SegmentedControl';
import { SkeletonRows } from '../../../components/atom/Skeleton/Skeleton';
import { EmptyState } from '../../../components/molecule/EmptyState/EmptyState';
import { dayList } from '../../website/hooks';
import { canvasSpecs } from '../specs';
import { useAllSessionsJoined, useMyBookings } from '../hooks';
import { PageHead } from '../ui';

const specDay = canvasSpecs['C-02'];
const specWeek = canvasSpecs['C-02b'];
type View = 'today' | 'week';
export interface SchedulePageProps { view?: View }
type TimeOfDay = 'all' | 'morning' | 'evening';
interface Filters { movement: Movement | 'all'; modality: string; teacher: string; time: TimeOfDay }
const DEFAULT: Filters = { movement: 'all', modality: 'all', teacher: 'all', time: 'all' };
const FKEY = 'hoyos.customer.scheduleFilters';

/** C-02 Class schedule; with `view="week"` it is C-02b at /app/schedule/week (`?view=week` redirects there). */
export function SchedulePage({ view: routeView }: SchedulePageProps) {
  const { t, bi, lang } = useI18n();
  const nav = useNavigate();
  const { user } = useSession();
  const [params] = useSearchParams();
  const view: View = routeView ?? 'today';
  const { sections, isVisible } = useLayout(view === 'week' ? specWeek : specDay);

  // Deep link from the website: /app/schedule?session=<id> → class detail.
  useEffect(() => { const s = params.get('session'); if (s) nav(`/app/class/${s}`, { replace: true }); else if (params.get('view') === 'week') nav('/app/schedule/week', { replace: true }); }, [params, nav]);

  const setView = (v: View) => nav(v === 'week' ? '/app/schedule/week' : '/app/schedule');
  const days = useMemo(() => dayList(7), []);
  const [day, setDay] = useState(0);
  const [sheet, setSheet] = useState(false);
  const [filters, setFilters] = useState<Filters>(() => { try { const raw = sessionStorage.getItem(FKEY); return raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT; } catch { return DEFAULT; } });
  useEffect(() => { try { sessionStorage.setItem(FKEY, JSON.stringify(filters)); } catch { /* ignore */ } }, [filters]);

  const all = useAllSessionsJoined();
  const { loading } = useTable<ClassSessionRow>('class_sessions');
  const { rows: modalities } = useTable<ModalityRow>('modalities', { where: { active: true } });
  const { rows: teachers } = useTable<TeacherRow>('teachers', { where: { active: true } });
  const { rows: myBookings } = useMyBookings();
  const mine = useMemo(() => new Set(myBookings.filter((b) => b.status === 'booked').map((b) => b.session_id)), [myBookings]);

  const matches = (x: (typeof all)[number]) => {
    const h = new Date(x.session.starts_at).getHours();
    return (filters.movement === 'all' || x.modality?.movement === filters.movement)
      && (filters.modality === 'all' || x.session.modality_id === filters.modality)
      && (filters.teacher === 'all' || x.session.teacher_id === filters.teacher)
      && (filters.time === 'all' || (filters.time === 'morning' ? h < 12 : h >= 12));
  };
  const activeFilters = Object.entries(filters).filter(([, v]) => v !== 'all').length;
  const filtered = useMemo(() => all.filter(matches), [all, filters]); // eslint-disable-line react-hooks/exhaustive-deps
  const counts = days.map((d) => filtered.filter((x) => isSameDay(x.session.starts_at, d) && x.session.status !== 'completed').length);
  const dayList_ = filtered.filter((x) => isSameDay(x.session.starts_at, days[day]));
  const isPast = (s: ClassSessionRow) => new Date(s.ends_at).getTime() < Date.now();

  const open = (s: ClassSessionRow) => nav(`/app/class/${s.id}`);

  const renderWeek = (): ReactNode => view !== 'week' ? null : (
      <div className="cust-week" role="table" aria-label={t('customer.schedule.view.week')}>
        {days.map((d, i) => {
          const list = filtered.filter((x) => isSameDay(x.session.starts_at, d));
          return (
            <div key={i} className={`cust-week-col ${i === 0 ? 'is-today' : ''}`} role="row">
              <div className="cust-week-head" role="columnheader"><span className="xs">{i === 0 ? t('core.common.today') : formatDate(d.toISOString(), lang, { weekday: 'short' })}</span><strong>{d.getDate()}</strong></div>
              {list.length === 0 && <div className="cust-week-empty xs muted">{d.getDay() === 0 ? t('customer.schedule.closedShort') : '—'}</div>}
              {list.map((x) => {
                const left = x.session.capacity - x.session.booked_count;
                const mv = x.modality?.movement ?? 'fluye';
                return (
                  <button key={x.session.id} type="button" className={`cust-week-cell cust-week-${mv} ${x.session.status !== 'scheduled' ? 'is-off' : ''} ${mine.has(x.session.id) ? 'is-mine' : ''}`} onClick={() => open(x.session)} role="cell">
                    <span className="cust-week-time">{formatTime(x.session.starts_at, lang)}</span>
                    <span className="cust-week-name">{x.modality ? bi({ es: x.modality.name_es, en: x.modality.name_en }) : x.session.title}</span>
                    <span className="cust-week-spots">{x.session.status === 'cancelled' ? t('customer.schedule.cancelled') : x.session.status === 'completed' ? t('customer.schedule.done') : left <= 0 ? t('core.common.full') : t('core.common.spots', { n: left })}</span>
                    {mine.has(x.session.id) && <Badge tone="primary">{t('customer.home.booked')}</Badge>}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    );

  const SECTIONS: Record<string, () => ReactNode> = {
    'ViewSwitch (Today / Week)': () => (
      <PageHead title={t('customer.schedule.title')} sub={t('customer.schedule.sub')} actions={<SegmentedControl size="sm" ariaLabel={t('customer.schedule.view')} value={view} onChange={setView} options={[{ value: 'today', label: t('customer.schedule.view.today') }, { value: 'week', label: t('customer.schedule.view.week') }]} />} />
    ),
    DateStrip: () => view === 'today' ? <DateStrip days={days} value={day} onChange={setDay} counts={counts} disabledIndex={(i) => days[i].getDay() === 0} /> : null,
    'FilterBar → FilterSheet': () => (
      <div className="cust-filters">
        <div className="cust-filters-scroll">
          <Chip selected={filters.movement === 'all'} onClick={() => setFilters((f) => ({ ...f, movement: 'all' }))}>{t('core.common.all')}</Chip>
          {(Object.keys(movements) as Movement[]).map((mv) => <Chip key={mv} movement={mv} dot selected={filters.movement === mv} onClick={() => setFilters((f) => ({ ...f, movement: f.movement === mv ? 'all' : mv }))}>{movements[mv].label}</Chip>)}
        </div>
        <Button size="sm" variant={activeFilters > 0 ? 'primary' : 'secondary'} onClick={() => setSheet(true)} icon="⚲">{t('core.common.filter')}{activeFilters > 0 ? ` · ${activeFilters}` : ''}</Button>
      </div>
    ),
    'ClassList → ClassRow': () => view !== 'today' ? null : (
      <Card padding="sm" aria-busy={loading || undefined}>
        {loading && <SkeletonRows />}
        {!loading && dayList_.length === 0 && (
          <EmptyState compact title={days[day].getDay() === 0 ? t('customer.schedule.closed') : t('customer.schedule.empty')} body={activeFilters > 0 ? t('customer.schedule.empty.filters') : t('customer.schedule.empty.body')}
            action={activeFilters > 0 ? <Button size="sm" variant="secondary" onClick={() => setFilters(DEFAULT)}>{t('customer.schedule.clearFilters')}</Button> : undefined} />
        )}
        {!loading && dayList_.map((x) => (
          <ClassRow key={x.session.id} title={x.session.title} teacher={x.teacher?.display_name ?? ''} startsAt={x.session.starts_at} durationMin={x.modality?.duration_min ?? 60} movement={x.modality?.movement ?? 'fluye'} booked={x.session.booked_count} capacity={x.session.capacity} status={x.session.status} booked_by_me={mine.has(x.session.id)} onClick={isPast(x.session) && !mine.has(x.session.id) ? undefined : () => open(x.session)} />
        ))}
        {!loading && dayList_.length > 0 && dayList_.every((x) => isPast(x.session)) && <p className="xs muted" style={{ padding: 8 }}>{t('customer.schedule.pastDay')}</p>}
      </Card>
    ),
    WeekGrid: renderWeek,
    'WeekGrid (Mon–Sat columns → DayChip)': renderWeek,
    Legend: () => (
      <div className="row wrap cust-legend">
        <span className="eyebrow">{t('customer.schedule.legend')}</span>
        {(Object.keys(movements) as Movement[]).map((mv) => <Chip key={mv} movement={mv} dot>{movements[mv].label}</Chip>)}
        <Link to="/app/intention" className="small">{t('customer.schedule.intentionLink')} →</Link>
      </div>
    ),
  };

  return (
    <div className="container page cust-page">
      {sections.filter(isVisible).map((name) => SECTIONS[name] ? <Fragment key={name}>{SECTIONS[name]()}</Fragment> : null)}
      {user.role === 'public' && null}
      <Drawer open={sheet} onClose={() => setSheet(false)} title={t('customer.schedule.filters')} side="bottom"
        footer={<><Button variant="ghost" onClick={() => setFilters(DEFAULT)}>{t('customer.schedule.clearFilters')}</Button><Button onClick={() => setSheet(false)}>{t('customer.schedule.apply')}</Button></>}>
        <div className="stack">
          <Field label={t('customer.schedule.filter.time')}>{(id) => (
            <div className="row wrap" id={id}>{(['all', 'morning', 'evening'] as TimeOfDay[]).map((k) => <Chip key={k} selected={filters.time === k} onClick={() => setFilters((f) => ({ ...f, time: k }))}>{t(`customer.schedule.filter.time.${k}`)}</Chip>)}</div>
          )}</Field>
          <Field label={t('customer.schedule.filter.modality')}>{(id) => (
            <Select id={id} value={filters.modality} onChange={(e) => setFilters((f) => ({ ...f, modality: e.target.value }))}>
              <option value="all">{t('core.common.all')}</option>
              {modalities.map((m) => <option key={m.id} value={m.id}>{bi({ es: m.name_es, en: m.name_en })}</option>)}
            </Select>
          )}</Field>
          <Field label={t('customer.schedule.filter.teacher')}>{(id) => (
            <Select id={id} value={filters.teacher} onChange={(e) => setFilters((f) => ({ ...f, teacher: e.target.value }))}>
              <option value="all">{t('core.common.all')}</option>
              {teachers.map((te) => <option key={te.id} value={te.id}>{te.display_name}</option>)}
            </Select>
          )}</Field>
          <Field label={t('customer.schedule.filter.intention')} hint={t('customer.schedule.filter.intention.hint')}>{(id) => (
            <div className="row wrap" id={id}>{(Object.keys(movements) as Movement[]).map((mv) => <Chip key={mv} movement={mv} dot selected={filters.movement === mv} onClick={() => setFilters((f) => ({ ...f, movement: f.movement === mv ? 'all' : mv }))}>{movements[mv].label}</Chip>)}</div>
          )}</Field>
        </div>
      </Drawer>
    </div>
  );
}
