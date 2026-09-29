/**
 * 0039 — the customer side of practice analytics, shared by C-01 (home block) and C-27 (Tu práctica).
 * Numbers come from `usePracticeStats()` (src/data/useAnalytics.ts); this file only words them and wires the goal.
 */
import { useCallback, useMemo } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { toast } from '../../app/toast';
import type { ActionHandler } from '../../actions/types';
import type { PracticeStats } from '../../data/analytics';
import { usePracticeGoal } from '../../data/useAnalytics';
import { GoalPicker } from '../../components/molecule/GoalPicker/GoalPicker';
import { StreakBadge } from '../../components/molecule/StreakBadge/StreakBadge';

type T = (key: string, vars?: Record<string, string | number>) => string;

/** `base.one` when n is 1, `base.other` otherwise (both languages pluralise the same way for these labels). */
export const plural = (t: T, base: string, n: number, vars: Record<string, string | number> = {}) => t(`${base}.${n === 1 ? 'one' : 'other'}`, { n, ...vars });

/** WeekDots day initials, Monday first, in the current language (the molecule defaults to Spanish). */
export const weekInitials = (t: T) => t('customer.practice.week.initials').split(',');

/** The one line under the streak stamp. Never a bare red zero: a broken or empty run shows the best one instead. */
export function streakHint(t: T, s: PracticeStats): string {
  const { state, best } = s.streak;
  if (state === 'alive') return t('customer.home.stats.hint.alive', { target: s.target });
  if (state === 'at_risk') return plural(t, 'customer.home.stats.hint.atRisk', s.thisWeek.remaining);
  if (state === 'building' || best === 0) return t('customer.home.stats.hint.building');
  return plural(t, 'customer.home.stats.hint.best', best);
}

/** The StreakBadge with the page's words: unit singular/plural, best only when it beats the current run. */
export function PracticeStreak({ stats, hint }: { stats: PracticeStats; hint?: string }) {
  const { t } = useI18n();
  const { count, best, state } = stats.streak;
  const unit = (n: number) => t(`customer.home.stats.weeks.${n === 1 ? 'one' : 'other'}`);
  return (
    <StreakBadge count={count} unit={unit(count)} state={state}
      best={best > count ? best : undefined} bestLabel={t('customer.home.stats.best')}
      hint={hint ?? streakHint(t, stats)} />
  );
}

/** Saves a weekly goal (0 = "sin meta") and says so in a toast. `source` is 'suggested' when the member took the suggestion. */
export function useSaveGoal(suggested: number) {
  const { t } = useI18n();
  const { setGoal } = usePracticeGoal();
  return useCallback(async (target: number) => {
    const clean = Math.max(0, Math.min(7, Math.round(target)));
    await setGoal(clean, clean > 0 && clean === suggested ? 'suggested' : 'member');
    toast(clean > 0 ? t('customer.practice.goal.saved', { n: clean }) : t('customer.practice.goal.cleared'), 'success');
    return clean;
  }, [setGoal, suggested, t]);
}

/**
 * GoalPicker with the practice labels. `value` is the current target; pass `null` when the member was never asked,
 * so no option reads as chosen (NaN checks nothing in GoalPicker — "sin meta" is an answer, not a default).
 */
export function PracticeGoalPicker({ value, suggested, onPick }: { value: number | null; suggested: number; onPick: (target: number) => void }) {
  const { t } = useI18n();
  return (
    <GoalPicker value={value ?? Number.NaN} suggested={suggested} onChange={onPick} ariaLabel={t('customer.practice.goal.group')}
      labels={{ perWeek: t('customer.practice.goal.perWeek'), noGoal: t('customer.practice.goal.none'), suggested: t('customer.practice.goal.suggested') }}>
      {t('customer.home.goal.hint')}
    </GoalPicker>
  );
}

/** Handler for `app.setGoal` (declared on C-01 and C-27). `app.openPractice` lives in the nav set (actions.ts). */
export function usePracticeHandlers(suggested: number): Record<string, ActionHandler> {
  const save = useSaveGoal(suggested);
  return useMemo(() => ({
    'app.setGoal': async (p) => {
      const raw = p?.target?.toString().trim();
      const n = raw ? Number(raw) : Number.NaN;
      if (!Number.isInteger(n) || n < 0 || n > 7) throw new Error('target must be a whole number 0–7 (0 = no goal)');
      const saved = await save(n);
      return `goal ${saved}/week${saved === 0 ? ' (no goal)' : ''}`;
    },
  }), [save]);
}
