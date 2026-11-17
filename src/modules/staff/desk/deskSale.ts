import type { TrialAssessment } from '../../../data/trialEligibility';

/**
 * S-04 in the production build: what the desk sale offers. Display only; the server stays the authority (it refuses a
 * second trial with `trial_used`, and a closed staff admission window with `occurrence_not_open`).
 */

/** The same rule as `assessLiveTrial`: a product is the trial when its kind (Company OS `product.kind`) or key is `trial`. */
const isTrial = (p: { kind?: unknown; slug?: string | null }) => p.kind === 'trial' || p.slug === 'trial';

/**
 * PRO-04 (desk part): why a product is greyed out for this person, or null. The trial is greyed out once the person
 * has used it (`assessLiveTrial`: a trial lot, or a pending or approved trial payment). With no assessment (a walk-in,
 * or the read failed) nothing is greyed out.
 */
export function deskTrialBlock(product: { kind?: unknown; slug?: string | null }, assessment: TrialAssessment | null): 'trial_used' | null {
  return isTrial(product) && assessment?.status === 'trial_used' ? 'trial_used' : null;
}

/** HOY staff-only walk-in display hint. Server authorization and capacity remain authoritative.
 * New walk-ins are offered through start + 15 minutes (inclusive), never after the class ends.
 * This does not change customer booking or existing reservation check-in policy.
 */
export function staffWalkInOpen(session: { starts_at: string; ends_at?: string; status?: string }, now: number): boolean {
  const start = Date.parse(session.starts_at);
  const end = session.ends_at === undefined ? Infinity : Date.parse(session.ends_at);
  return (!session.status || session.status === 'scheduled') && Number.isFinite(start)
    && !Number.isNaN(end) && now <= start + 15 * 60_000 && now <= end;
}

export function walkInSessions<T extends { session: { starts_at: string; ends_at?: string; status?: string } }>(list: T[], now: number): T[] {
  return list.filter((x) => staffWalkInOpen(x.session, now));
}

/**
 * The class chosen for check-in, if it is still offered: one whose admission window closes while the form is open drops out of the
 * list, and then nothing is sent for it (the server would refuse it `occurrence_not_open` with nothing on screen to fix).
 */
export function chosenSession(list: readonly { session: { id: string } }[], sessionId: string): string {
  return sessionId && list.some((x) => x.session.id === sessionId) ? sessionId : '';
}

/**
 * Review r1: the chosen check-in class is outside the staff admission window (it is one of today's classes but no longer offered), so it dropped
 * out of the list. The page says so instead of silently showing "no check-in". A class of another day, or none, is not.
 */
export function startedChoice(all: readonly { session: { id: string } }[], offered: readonly { session: { id: string } }[], sessionId: string): boolean {
  return !!sessionId && all.some((x) => x.session.id === sessionId) && !offered.some((x) => x.session.id === sessionId);
}

/**
 * F1b (owner 2026-11-11): Company OS (bookings 1.8.0 `check_in_closes_at_end`) refuses `check_in_closed` once a class has
 * ended, for staff too; before the start and during the class check-in works. This only hides the "Llegó" button as a hint;
 * the server is the authority. An unreadable end keeps the button.
 */
export function checkInOpen(session: { ends_at: string }, now: number): boolean {
  const end = Date.parse(session.ends_at);
  return !Number.isFinite(end) || now <= end;
}
