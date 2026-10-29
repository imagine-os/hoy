/**
 * AD-04 — the booking rules an admin edits on Company OS (bookings 1.4.0 settings, ADR 0038 route): hold minutes, the
 * move window and the late-cancel window. Reception hours and closed dates (`review_hours`, `review_closed_dates`) are
 * H-7's reception-hours panel on the same route; a PATCH changes only the keys it lists, so the two never collide.
 * The server validates again (`invalid_settings`) and, with `policy_as_of_booking`, copies the values onto each new
 * booking, so a change applies to future bookings only.
 */
export interface BookingPolicies {
  hold_minutes_transfer: number; hold_minutes_desk: number; reschedule_hours: number; late_cancel_hours: number;
  policy_as_of_booking?: boolean;
}
export const EDITABLE = ['hold_minutes_transfer', 'hold_minutes_desk', 'reschedule_hours', 'late_cancel_hours'] as const;

const whole = (v: number, min: number, max: number) => Number.isInteger(v) && v >= min && v <= max;
/** Returns an error suffix (`bookingPolicies.error.*`) or null. */
export function validatePolicies(p: BookingPolicies): string | null {
  if (!whole(p.hold_minutes_transfer, 1, 1440)) return 'transfer';
  if (!whole(p.hold_minutes_desk, 1, 1440)) return 'desk';
  if (!whole(p.reschedule_hours, 0, 168)) return 'reschedule';
  if (!whole(p.late_cancel_hours, 0, 168)) return 'lateCancel';
  return null;
}

/** Only what changed goes to the PATCH, so a save never rewrites a value someone else just changed. */
export function settingsPatch(before: BookingPolicies, after: BookingPolicies): Partial<BookingPolicies> {
  const patch: Partial<BookingPolicies> = {};
  for (const k of EDITABLE) if (before[k] !== after[k]) patch[k] = after[k];
  return patch;
}

export function fromSettings(s: Record<string, unknown>): BookingPolicies {
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  return {
    hold_minutes_transfer: n(s.hold_minutes_transfer), hold_minutes_desk: n(s.hold_minutes_desk), reschedule_hours: n(s.reschedule_hours), late_cancel_hours: n(s.late_cancel_hours),
    policy_as_of_booking: s.policy_as_of_booking === true,
  };
}
