/**
 * Booking and payment policy for the customer app. Numbers the canvas cites (C-04, C-08, C-08b, C-20, C-22, E-02, E-04, C-21).
 *
 * SHARED-CHANGE REQUEST: these belong in `tenant.settings` (M-08 Studio settings) next to `studio.mats`.
 * They live here until that table/config exists so no page hardcodes them. Prices never live here — see src/tenant/pricing.ts.
 */
export const policy = {
  /** Free cancellation until this many hours before start; inside, the credit is forfeited (late_cancel). */
  cancelWindowHours: 2,
  /** A released spot is offered to the next waitlisted person for this long. */
  claimWindowMinutes: 30,
  /** A declined payment keeps the spot held this long (E-02). */
  paymentHoldMinutes: 10,
  /** Colombian IVA general rate. Prices in pricing.ts are IVA-inclusive; the tax is always computed, never typed. */
  ivaRate: 0.19,
  /** Self-service membership pause cap (C-22). */
  pauseMaxDays: 30,
  /** Days before a renewal charge the member is notified. */
  chargeNoticeDays: 3,
  /** Sign-in lockout (A-02 / E-04). */
  lockoutAttempts: 5,
  lockoutMinutes: 15,
  /** WhatsApp OTP (C-21). */
  otpLength: 6,
  otpResendSeconds: 45,
  otpValidMinutes: 10,
  /** Invites expire after this many days (C-16). */
  inviteValidityDays: 30,
  /** Countdown switches to "check in" inside this window (C-08). */
  checkinOpensMinutes: 60,
  /** Gift card message length (C-17). */
  giftMessageMax: 250,
  /** Studio reply window shown on outbound contact rows (C-25). */
  replyWindow: { es: 'Respondemos en horario del estudio', en: 'We reply during studio hours' },
} as const;

/** ms helpers */
export const HOUR = 3.6e6;
export const MINUTE = 6e4;

export function cancelDeadline(startsAt: string): Date {
  return new Date(new Date(startsAt).getTime() - policy.cancelWindowHours * HOUR);
}
export function insideCancelWindow(startsAt: string, now = Date.now()): boolean {
  return now > cancelDeadline(startsAt).getTime();
}
