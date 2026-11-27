import { dateKey } from '../i18n/format';
import { sessionUnavailableReason, type SessionAvailabilityInput } from './sessionAvailability';

/** HOY online booking cutoff. Keep aligned with Company OS's HOY bookings setting; server is authoritative. */
export const PUBLIC_BOOKING_CLOSED_FROM = '2026-12-07';
export function publicBookingClosed(startsAt: string): boolean {
  const start = new Date(startsAt);
  return Boolean(PUBLIC_BOOKING_CLOSED_FROM) && Number.isFinite(start.getTime()) && dateKey(start) >= PUBLIC_BOOKING_CLOSED_FROM;
}

export function publicSessionUnavailableReason(input: SessionAvailabilityInput, now = Date.now()) {
  return sessionUnavailableReason(input, now) ?? (publicBookingClosed(input.session.starts_at) ? 'public_booking_closed' : null);
}
