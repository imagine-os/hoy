import type { TrialAssessment } from '../../../data/trialEligibility';

/**
 * S-04 in the production build: what the desk sale offers. Display only; the server stays the authority (it refuses a
 * second trial with `trial_used`, and a class that has started with `occurrence_not_open`).
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

/**
 * REC-06: "Sell and check in" offers only today's classes that have not started yet (an unreadable start is not offered).
 * The grace after the start is 0 here. Open question (review r2): whether the desk may still sell and check in during the
 * check-in cut-off after the start (bookings `late_grace_minutes`). The booking policy this app reads
 * (`useBookingPolicy`: reschedule and hold minutes) doesn't carry it, so it is not used; the server's
 * `occurrence_not_open` stays the authority.
 */
export function notStarted<T extends { session: { starts_at: string } }>(list: T[], now: number): T[] {
  return list.filter((x) => { const at = Date.parse(x.session.starts_at); return Number.isFinite(at) && at > now; });
}

/**
 * The class chosen for check-in, if it is still offered: one that started while the form was open drops out of the
 * list, and then nothing is sent for it (the server would refuse it `occurrence_not_open` with nothing on screen to fix).
 */
export function chosenSession(list: readonly { session: { id: string } }[], sessionId: string): string {
  return sessionId && list.some((x) => x.session.id === sessionId) ? sessionId : '';
}

/**
 * Review r1: the chosen check-in class has started (it is one of today's classes but no longer offered), so it dropped
 * out of the list. The page says so instead of silently showing "no check-in". A class of another day, or none, is not.
 */
export function startedChoice(all: readonly { session: { id: string } }[], offered: readonly { session: { id: string } }[], sessionId: string): boolean {
  return !!sessionId && all.some((x) => x.session.id === sessionId) && !offered.some((x) => x.session.id === sessionId);
}
