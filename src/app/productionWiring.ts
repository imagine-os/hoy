/**
 * Production-only wiring between lanes that must not import each other (Hoy launch, coordinator merge 2026-10-28):
 * - H-2 ↔ H-3: the Company OS connector asks the Clerk session for a fresh token per request and reports a 401 back.
 * - H-5 ↔ H-6: approving a gift's transfer creates its voucher in the same `/batch`.
 * Called once from `main.tsx` before the first render; the review build never calls it.
 */
import { setCompanyOSTokenSource, setCompanyOSUnauthorizedHandler } from '../data/companyos/transport';
import { getSessionToken, onUnauthorized } from '../auth/sessionToken';
import { registerApprovalOps } from '../modules/transfers/launch/payments';
import { giftVoucherOps } from '../modules/vouchers/production/model';

let wired = false;

export function wireProduction(): void {
  if (wired) return;
  wired = true;
  // The transport retries a 401 once with { refresh: true }; that forces a fresh Clerk token (skipCache).
  setCompanyOSTokenSource((options) => getSessionToken(options));
  setCompanyOSUnauthorizedHandler(onUnauthorized);
  // giftVoucherOps takes the raw `{ id, data }` records (tested in H-6) and returns plain voucher creates; [] when the
  // product isn't an active gift (a gift product deactivated after purchase is issued by the desk: tech debt).
  registerApprovalOps((payment, product) =>
    giftVoucherOps(payment as unknown as Record<string, unknown>, (product ?? {}) as unknown as Record<string, unknown>));
}
