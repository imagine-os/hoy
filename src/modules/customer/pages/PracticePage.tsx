import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useTable } from '../../../data/DataContext';
import type { ModalityRow, TeacherRow } from '../../../data/schema';
import { usePracticeStats } from '../../../data/useAnalytics';
import { formatDate } from '../../../i18n/format';
import { useLayout } from '../../../layout/useLayout';
import { useActions } from '../../../actions';
import { Card } from '../../../components/molecule/Card/Card';
import { Button } from '../../../components/atom/Button/Button';
import { Chip } from '../../../components/atom/Chip/Chip';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { EmptyState } from '../../../components/molecule/EmptyState/EmptyState';
import { StatTile } from '../../../components/molecule/StatTile/StatTile';
import { ProgressRing } from '../../../components/molecule/ProgressRing/ProgressRing';
import { WeekDots } from '../../../components/molecule/WeekDots/WeekDots';
import { BarList } from '../../../components/molecule/BarList/BarList';
import { MilestoneList } from '../../../components/molecule/MilestoneList/MilestoneList';
import { ListGroup, ListRow } from '../../../components/molecule/ListRow/ListRow';
import { useAppNavHandlers } from '../actions';
import { canvasSpecs } from '../specs';
import { PageHead } from '../ui';
import { SplitSections } from '../split';
import { plural, weekInitials, PracticeGoalPicker, PracticeStreak, usePracticeHandlers, useSaveGoal } from '../practice';

const spec = canvasSpecs['C-27'];
const SHORT = { day: 'numeric', month: 'short' } as const;
/** The history never shows fewer weeks than this, even for a member whose first class was this week. */
const MIN_HISTORY_WEEKS = 4;
/** ≥ 900 px: this week, the run and the 12 weeks on the left; the month, milestones, favourites and the goal on the right. */
const SIDE = new Set(['MonthSummary', 'Milestones', 'Favourites', 'GoalSection']);

/**
 * C-27 `/app/practice` — Tu práctica. The member's own numbers, worded plainly: this week against the goal, weeks in a
 * row, the month, the last 12 weeks, milestones, favourites and the goal itself. Everything comes from
 * `usePracticeStats()`; the page computes nothing. Private — the notice says so and nothing compares people.
 */
export function PracticePage() {
  const { t, bi, lang } = useI18n();
  const { sections, isVisible } = useLayout(spec);
  const { stats, goal, loading } = usePracticeStats();
  const save = useSaveGoal(stats.suggestedTarget);
  const navHandlers = useAppNavHandlers();
  const practiceHandlers = usePracticeHandlers(stats.suggestedTarget);
  useActions(spec, useMemo(() => ({ ...navHandlers, ...practiceHandlers }), [navHandlers, practiceHandlers]));
  const { rows: modalities } = useTable<ModalityRow>('modalities');
  const { rows: teachers } = useTable<TeacherRow>('teachers');

  const favModality = modalities.find((m) => m.id === stats.favouriteModalityId);
  const favTeacher = teachers.find((x) => x.id === stats.favouriteTeacherId);
  const { thisWeek, streak, hasGoal, target } = stats;
  const classes = (n: number) => plural(t, 'customer.practice.classes', n);

  // History: no weeks from before the member's first class (a brand-new member still sees the last MIN_HISTORY_WEEKS).
  const shownWeeks = useMemo(() => {
    const floor = Math.max(0, stats.weeks.length - MIN_HISTORY_WEEKS);
    return stats.weeks.filter((w, i) => i >= floor || (stats.firstVisit != null && w.end >= stats.firstVisit));
  }, [stats.weeks, stats.firstVisit]);
  const history = useMemo(() => shownWeeks.map((w) => ({
    id: w.start,
    label: formatDate(w.start, lang, SHORT),
    value: w.attended,
    hint: [w.isCurrent ? t('customer.practice.history.now') : '', w.saved ? t('customer.practice.history.rest') : '', w.paused ? t('customer.practice.history.paused') : '', w.target > 0 ? t('customer.practice.history.goal', { n: w.target }) : ''].filter(Boolean).join(' · ') || undefined,
  })), [shownWeeks, lang, t]);
  const historyMax = Math.max(target, ...shownWeeks.map((w) => w.attended), 1);
  const current = shownWeeks.find((w) => w.isCurrent)?.start;

  const SECTIONS: Record<string, () => ReactNode> = {
    WeekHeader: () => (
      <Card eyebrow={t('customer.practice.week.title')} padding="md">
        <div className="cust-practice-weekhead">
          {hasGoal && <ProgressRing value={thisWeek.attended} max={target} size={104} ariaLabel={t('customer.practice.week.ring', { attended: thisWeek.attended, target })} />}
          <div className="grow stack-sm">
            <WeekDots days={thisWeek.days} target={target} attended={thisWeek.attended} labels={weekInitials(t)} size="md">
              {hasGoal
                ? `${t('customer.home.stats.week', { attended: thisWeek.attended, target })}${thisWeek.attended >= target ? ` · ${t('customer.practice.week.met')}` : ''}`
                : `${plural(t, 'customer.home.stats.weekNoGoal', thisWeek.attended)} · ${t('customer.practice.week.noGoal')}`}
            </WeekDots>
          </div>
        </div>
      </Card>
    ),
    StreakCard: () => (
      <Card eyebrow={t('customer.practice.streak.title')} padding="md" className="stack-sm">
        {hasGoal ? (
          <>
            <div className="row-between wrap">
              <PracticeStreak stats={stats} />
              {streak.graceAvailable && <Chip>{t('customer.practice.streak.grace')}</Chip>}
            </div>
            <p className="small">{t('customer.practice.streak.rule')} {t('customer.practice.streak.pause')}</p>
            {streak.savedWeeks.length > 0 && (
              <p className="small muted">{t('customer.practice.streak.saved', { date: streak.savedWeeks.map((w) => formatDate(w, lang, SHORT)).join(', ') })}</p>
            )}
          </>
        ) : <p className="small muted">{t('customer.practice.streak.noGoal')}</p>}
      </Card>
    ),
    MonthSummary: () => (
      <section className="stack-sm" aria-labelledby="c27-month">
        <h2 className="eyebrow" id="c27-month">{t('customer.practice.month.title', { month: formatDate(new Date(), lang, { month: 'long' }) })}</h2>
        <div className="grid cust-practice-tiles cust-practice-month">
          <StatTile label={t('customer.home.stats.classes')} value={stats.attendedThisMonth} />
          <StatTile label={t('customer.practice.month.upcoming')} value={stats.bookedUpcoming} />
          <StatTile label={t('customer.practice.month.minutes')} value={stats.minutesThisMonth} />
          {stats.noShowsThisMonth > 0 && <StatTile label={t('customer.practice.month.noShows')} value={stats.noShowsThisMonth} />}
          {stats.lateCancelsThisMonth > 0 && <StatTile label={t('customer.practice.month.lateCancels')} value={stats.lateCancelsThisMonth} />}
        </div>
      </section>
    ),
    History12Weeks: () => (
      <Card eyebrow={t('customer.practice.history.title', { n: shownWeeks.length })} padding="md">
        <BarList items={history} max={historyMax} emphasizeId={current} format={(v) => String(v)} />
      </Card>
    ),
    Milestones: () => (
      <Card eyebrow={t('customer.practice.milestones.title')} padding="md" className="stack-sm">
        <MilestoneList reached={stats.milestonesReached} next={stats.nextMilestone}
          labels={{ reached: t('customer.practice.milestones.reached'), next: t('customer.practice.milestones.next'), remaining: (n) => plural(t, 'customer.practice.milestones.remaining', n), classes }} />
        <p className="small muted">
          {stats.firstVisit && <>{t('customer.practice.milestones.first', { date: formatDate(stats.firstVisit, lang, { day: 'numeric', month: 'long', year: 'numeric' }) })} · </>}
          {plural(t, 'customer.practice.milestones.total', stats.attendedAllTime)}
        </p>
      </Card>
    ),
    Favourites: () => (
      <section className="stack-sm" aria-labelledby="c27-fav">
        <div className="row-between wrap">
          <h2 className="eyebrow" id="c27-fav">{t('customer.practice.fav.title')}</h2>
          <span className="xs muted">{t('customer.practice.fav.window')}</span>
        </div>
        <ListGroup>
          {favModality || favTeacher ? (
            <>
              {favModality && <ListRow icon="classes" title={bi({ es: favModality.name_es, en: favModality.name_en })} subtitle={t('customer.practice.fav.modality')} />}
              {favTeacher && <ListRow icon="user" title={favTeacher.display_name} subtitle={t('customer.practice.fav.teacher')} to={`/app/teachers/${favTeacher.id}`} />}
              <ListRow icon="sparkle" title={plural(t, 'customer.practice.fav.variety', stats.distinctModalities)} />
            </>
          ) : <ListRow icon="info" title={t('customer.practice.fav.empty')} />}
          <ListRow icon="schedule" title={t('customer.practice.fav.explore')} to="/app/schedule" />
        </ListGroup>
      </section>
    ),
    GoalSection: () => (
      <Card eyebrow={t('customer.practice.goal.title')} padding="md" className="stack-sm">
        <h2 className="cust-practice-q">{t('customer.home.goal.title')}</h2>
        <p className="small muted">
          {goal == null ? t('customer.practice.goal.suggestedLine', { n: stats.suggestedTarget }) : goal.target > 0 ? t('customer.practice.goal.current', { n: goal.target }) : t('customer.practice.goal.currentNone')}
        </p>
        <PracticeGoalPicker value={goal ? goal.target : null} suggested={stats.suggestedTarget} onPick={(n) => { void save(n); }} />
        <Notice tone="info">{t('customer.practice.privacy')}</Notice>
      </Card>
    ),
  };

  const empty = !loading && stats.attendedAllTime === 0 && stats.bookedUpcoming === 0;
  return (
    <div className="container page cust-page cust-practice-page">
      <PageHead back="/app" title={t('customer.practice.title')} sub={t('customer.practice.sub')} />
      {empty ? (
        <Card padding="sm">
          <EmptyState icon="flame" title={t('customer.practice.empty.title')} body={t('customer.practice.empty.body')}
            action={<Link to="/app/schedule"><Button size="lg">{t('customer.home.next.cta')}</Button></Link>} />
        </Card>
      ) : (
        <div className="cust-practice-sections">
          <SplitSections names={sections.filter(isVisible)} render={(n) => SECTIONS[n]?.() ?? null} side={(n) => SIDE.has(n)} narrowClassName="stack" />
        </div>
      )}
    </div>
  );
}
