import { useSyncExternalStore } from 'react';
import { PRODUCTION_BUILD } from '../../../config/launch';
import { RESCHEDULE_CUTOFF_HOURS } from '../reschedule';

/**
 * H-4 — who decides booking rules. In the production build (`VITE_HOY_BUILD=production`) Company OS decides availability,
 * the one-class-a-day limit, capacity, mats, holds and the move window; the screens send one plain write and show the
 * server's answer. The review build keeps the browser rules (MockProvider) unchanged.
 */
export const SERVER_RULES = PRODUCTION_BUILD;

/**
 * Display values for explainers and countdowns only — the server never reads them. A booking's own `policy_*` copies
 * (ADR 0039) win over these. The production boot (H-3) fills them from the bookings module settings with
 * `configureBookingPolicy(...)`; until then the screens use Hoy's agreed values (J1, J2, J3b).
 */
export interface BookingPolicy {
  /** `reschedule_hours`: a booking moves until this many hours before its class (0 = moving is off). */
  rescheduleHours: number;
  /** `hold_minutes_transfer`: a single class paid by transfer is held this long (J1). */
  holdMinutesTransfer: number;
  /** `hold_minutes_desk`: a single class paid at reception is held this long (J2). */
  holdMinutesDesk: number;
}

export const BOOKING_POLICY_DEFAULTS: BookingPolicy = { rescheduleHours: RESCHEDULE_CUTOFF_HOURS, holdMinutesTransfer: 15, holdMinutesDesk: 60 };

const listeners = new Set<() => void>();
let current: BookingPolicy = BOOKING_POLICY_DEFAULTS;

export const bookingPolicy = (): BookingPolicy => current;

/** Keeps only whole numbers ≥ 0, so a malformed setting falls back to the default instead of showing a wrong deadline. */
export function configureBookingPolicy(patch: Partial<Record<keyof BookingPolicy, unknown>>) {
  const next = { ...current };
  for (const key of Object.keys(BOOKING_POLICY_DEFAULTS) as (keyof BookingPolicy)[]) {
    const value = patch[key];
    if (typeof value === 'number' && Number.isInteger(value) && value >= 0) next[key] = value;
  }
  current = next;
  for (const l of listeners) l();
}

export function useBookingPolicy(): BookingPolicy {
  return useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, bookingPolicy, bookingPolicy);
}
