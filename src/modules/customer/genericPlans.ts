import { GIFT_PURCHASE_PATH } from '../../config/launchRoutes';
import type { GenericPlan } from '../../data/livePricing';

/** The website's way in: through `/app/plans?plan=<key>`, which sign-in keeps (`customerReturn`), then `genericPlanTarget`. */
export const sitePlanPath = (key: string) => `/app/plans?plan=${encodeURIComponent(key)}`;

/**
 * Where a generic plan is bought. A gift first needs its recipient, on the gift page (the pay page refuses one opened
 * directly). Anything else is a transfer payment by product key, keeping the class being booked as the way back.
 */
export function genericPlanTarget(plan: Pick<GenericPlan, 'key' | 'kind'>, next: string | null = null): string {
  const key = encodeURIComponent(plan.key);
  if (plan.kind === 'gift') return `${GIFT_PURCHASE_PATH}?product=${key}`;
  return `/app/pay/product/${key}${next ? `?next=${encodeURIComponent(next)}` : ''}`;
}

/**
 * The cards a signed-in customer sees. A second trial product is still the one trial per person (Company OS checks every
 * trial product, `trial_used`), so it goes once the trial is used, like the fixed trial (`trialOffered`).
 */
export const plansForCustomer = (plans: GenericPlan[], { trialOffered }: { trialOffered: boolean }): GenericPlan[] =>
  plans.filter((p) => p.kind !== 'trial' || trialOffered);
