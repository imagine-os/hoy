/**
 * Booking and payment policy for the customer app. Numbers the canvas cites (C-04, C-08, C-08b, C-20, C-22, E-02, E-04, C-21).
 *
 * Source of truth: M-08 Studio settings (`tenants.settings`, src/modules/admin/settings.ts) with the same defaults
 * as before. `policy.*` stays a plain read (no hook) so helpers such as cancelDeadline() keep working; the values
 * are refreshed from the data provider by <PolicySync/> (mounted once in src/app/App.tsx) whenever the tenant row
 * changes. Prices never live here — see src/tenant/pricing.ts.
 */
import { useEffect } from 'react';
import type { DataProvider } from '../../data/types';
import { useData } from '../../data/DataContext';
import { tenant } from '../../tenant/tenant';
import { DEFAULT_SETTINGS, mergeSettings, type StudioSettings, type TenantRow } from '../admin/settings';

export interface PolicyValues {
  /** Free cancellation until this many hours before start; inside, the credit is forfeited (late_cancel). */
  cancelWindowHours: number;
  /** A released spot is offered to the next waitlisted person for this long. */
  claimWindowMinutes: number;
  /** A declined payment keeps the spot held this long (E-02). */
  paymentHoldMinutes: number;
  /** IVA rate as a fraction. Prices in pricing.ts are IVA-inclusive by default; the tax is always computed, never typed. */
  ivaRate: number;
  /** Self-service membership pause cap (C-22). */
  pauseMaxDays: number;
  /** Days before a renewal charge the member is notified. */
  chargeNoticeDays: number;
  /** Sign-in lockout (A-02 / E-04). */
  lockoutAttempts: number;
  lockoutMinutes: number;
  /** WhatsApp OTP (C-21). */
  otpLength: number;
  otpResendSeconds: number;
  otpValidMinutes: number;
  /** Invites expire after this many days (C-16). */
  inviteValidityDays: number;
  /** Countdown switches to "check in" inside this window (C-08). */
  checkinOpensMinutes: number;
  /** Gift card message length (C-17). */
  giftMessageMax: number;
  /** Studio reply window shown on outbound contact rows (C-25). */
  replyWindow: { es: string; en: string };
}

/** Product constants the settings screen does not expose (yet). */
const FIXED = {
  otpLength: 6,
  otpResendSeconds: 45,
  otpValidMinutes: 10,
  inviteValidityDays: 30,
  checkinOpensMinutes: 60,
  giftMessageMax: 250,
  replyWindow: { es: 'Respondemos en horario del estudio', en: 'We reply during studio hours' },
} as const;

export function policyFromSettings(s: StudioSettings): PolicyValues {
  return {
    cancelWindowHours: s.policies.cancellationHours,
    claimWindowMinutes: s.policies.waitlistClaimMin,
    paymentHoldMinutes: s.policies.paymentHoldMin,
    ivaRate: s.tax.ivaPct / 100,
    pauseMaxDays: s.policies.pauseDaysPerYear,
    chargeNoticeDays: s.policies.chargeNoticeDays,
    lockoutAttempts: s.policies.lockoutAttempts,
    lockoutMinutes: s.policies.lockoutMinutes,
    ...FIXED,
  };
}

let current: PolicyValues = policyFromSettings(DEFAULT_SETTINGS);

/** Live view of the current policy. Property reads always return the latest synced value. */
export const policy: Readonly<PolicyValues> = new Proxy({} as PolicyValues, {
  get: (_t, k) => current[k as keyof PolicyValues],
  ownKeys: () => Object.keys(current),
  getOwnPropertyDescriptor: (_t, k) => ({ enumerable: true, configurable: true, value: current[k as keyof PolicyValues] }),
});

/** Snapshot (for tests and docs). */
export const currentPolicy = (): PolicyValues => ({ ...current });

/** Reads the tenant row now and follows every change; returns the unsubscribe. */
export function attachPolicy(data: DataProvider): () => void {
  const apply = (row: TenantRow | null | undefined) => { current = policyFromSettings(mergeSettings(row?.settings)); };
  const fetch = () => data.get<TenantRow>('tenants', tenant.id).then(apply).catch(() => undefined);
  const first = data.peek?.<TenantRow>('tenants', { where: { id: tenant.id } })?.[0];
  if (first) apply(first); else void fetch();
  return data.subscribe('tenants', () => { void fetch(); });
}

/** Mount once inside DataProviderRoot so M-08 edits reach the customer app (and A-02 lockout) live. */
export function PolicySync(): null {
  const data = useData();
  useEffect(() => attachPolicy(data), [data]);
  return null;
}

/** ms helpers */
export const HOUR = 3.6e6;
export const MINUTE = 6e4;

export function cancelDeadline(startsAt: string): Date {
  return new Date(new Date(startsAt).getTime() - policy.cancelWindowHours * HOUR);
}
export function insideCancelWindow(startsAt: string, now = Date.now()): boolean {
  return now > cancelDeadline(startsAt).getTime();
}
