import { useCallback, useMemo } from 'react';
import { useData, useTable } from '../../data/DataContext';
import type { BaseRow } from '../../data/schema';
import { tenant } from '../../tenant/tenant';

/**
 * M-08 — the operating parameters every other screen reads. Stored in `tenants.settings` (json)
 * through the data layer; defaults come from src/tenant/tenant.ts so nothing is hardcoded twice.
 */
export interface OpeningHours { open: string; close: string }
export interface StudioSettings {
  studio: { mats: number; classesPerDay: number; perPersonPerDay: number; rooms: number };
  profile: { nit: string; address: string; whatsapp: string; email: string };
  /** 0 = Sunday … 6 = Saturday; null = closed. */
  openingHours: Record<string, OpeningHours | null>;
  /** Read by the customer app through src/modules/customer/policy.ts (cancel window, claim window, hold, pause cap, charge notice, lockout). */
  policies: { cancellationHours: number; waitlistClaimMin: number; lateGraceMin: number; noShowFee: number; pauseDaysPerYear: number; maxPausesPerYear: number; paymentHoldMin: number; chargeNoticeDays: number; lockoutAttempts: number; lockoutMinutes: number };
  quietHours: { from: string; to: string };
  tax: { ivaPct: number; pricesIncludeIva: boolean; dianResolution: string; eInvoicing: boolean };
  integrations: Record<'wompi' | 'whatsapp' | 'email' | 'calendar', 'pending' | 'connected' | 'error'>;
  features: { multipleLocations: boolean; noShowFee: boolean; holidayCalendar: boolean; walkInRegistration: boolean; autoCheckinOnSale: boolean };
  /** M-08c — payout account and the Wompi environment. Secrets are never stored here (see the page notice). */
  payments: { bankName: string; accountType: 'savings' | 'checking'; accountNumber: string; accountHolder: string; wompiEnv: 'sandbox' | 'production' };
  /** M-08d — sender identity for WhatsApp and email (quiet hours live in `quietHours`). */
  comms: { whatsappSender: string; emailSender: string; emailReplyTo: string };
  /** M-08e — tenant-facing identity. `displayName` empty falls back to src/tenant/tenant.ts. */
  branding: { displayName: string; wordmarkVariant: 'auto' | 'blue' | 'cream' | 'yellow'; defaultLang: 'es' | 'en' };
}

export const DEFAULT_SETTINGS: StudioSettings = {
  studio: { ...tenant.studio },
  profile: { nit: '', address: tenant.contact.address, whatsapp: tenant.contact.whatsapp, email: tenant.contact.email },
  openingHours: { '0': null, '1': { open: '06:00', close: '20:00' }, '2': { open: '06:00', close: '20:00' }, '3': { open: '06:00', close: '20:00' }, '4': { open: '06:00', close: '20:00' }, '5': { open: '06:00', close: '20:00' }, '6': { open: '08:00', close: '13:00' } },
  policies: { cancellationHours: 2, waitlistClaimMin: 30, lateGraceMin: 15, noShowFee: 0, pauseDaysPerYear: 30, maxPausesPerYear: 2, paymentHoldMin: 10, chargeNoticeDays: 3, lockoutAttempts: 5, lockoutMinutes: 15 },
  quietHours: { from: '21:00', to: '07:00' },
  tax: { ivaPct: 19, pricesIncludeIva: true, dianResolution: '', eInvoicing: false },
  integrations: { wompi: 'pending', whatsapp: 'pending', email: 'pending', calendar: 'pending' },
  features: { multipleLocations: false, noShowFee: false, holidayCalendar: true, walkInRegistration: true, autoCheckinOnSale: true },
  payments: { bankName: '', accountType: 'savings', accountNumber: '', accountHolder: tenant.legalName, wompiEnv: 'sandbox' },
  comms: { whatsappSender: tenant.name, emailSender: tenant.legalName, emailReplyTo: tenant.contact.email },
  branding: { displayName: '', wordmarkVariant: 'auto', defaultLang: tenant.defaultLocale },
};

export interface TenantRow extends BaseRow { settings: Partial<StudioSettings> | null }

/** Stored partial → full settings with defaults. Exported so non-React code (customer policy) can read the same shape. */
export function mergeSettings(stored: Partial<StudioSettings> | null | undefined): StudioSettings {
  const s = stored ?? {};
  return {
    studio: { ...DEFAULT_SETTINGS.studio, ...(s.studio ?? {}) },
    profile: { ...DEFAULT_SETTINGS.profile, ...(s.profile ?? {}) },
    openingHours: { ...DEFAULT_SETTINGS.openingHours, ...(s.openingHours ?? {}) },
    policies: { ...DEFAULT_SETTINGS.policies, ...(s.policies ?? {}) },
    quietHours: { ...DEFAULT_SETTINGS.quietHours, ...(s.quietHours ?? {}) },
    tax: { ...DEFAULT_SETTINGS.tax, ...(s.tax ?? {}) },
    integrations: { ...DEFAULT_SETTINGS.integrations, ...(s.integrations ?? {}) },
    features: { ...DEFAULT_SETTINGS.features, ...(s.features ?? {}) },
    payments: { ...DEFAULT_SETTINGS.payments, ...(s.payments ?? {}) },
    comms: { ...DEFAULT_SETTINGS.comms, ...(s.comms ?? {}) },
    branding: { ...DEFAULT_SETTINGS.branding, ...(s.branding ?? {}) },
  };
}

export type SettingsSection = keyof StudioSettings;

export function useSettings() {
  const data = useData();
  const { rows, loading } = useTable<TenantRow>('tenants', { where: { id: tenant.id } });
  const row = rows[0];
  const settings = useMemo(() => mergeSettings(row?.settings), [row]);
  /** Replaces one section; returns { before, after } for the audit log. */
  const save = useCallback(async <K extends SettingsSection>(section: K, value: StudioSettings[K]) => {
    const before = settings[section];
    const next = { ...(row?.settings ?? {}), [section]: value };
    if (row) await data.update('tenants', row.id, { settings: next });
    return { before, after: value };
  }, [data, row, settings]);
  return { settings, save, loading, ready: !!row };
}

/**
 * The policy numbers, live. Any component that calls this re-renders when M-08 is saved, because
 * useSettings() reads `tenants` through useTable() (which follows the provider's change events).
 * Customer code that today reads the snapshot in src/modules/customer/policy.ts can switch to this.
 */
export function usePolicy() {
  const { settings, loading, ready } = useSettings();
  return useMemo(() => ({
    ...settings.policies,
    quietHours: settings.quietHours,
    features: settings.features,
    tax: settings.tax,
    /** Free-cancellation deadline for a session start. */
    cancelDeadline: (startsAt: string) => new Date(new Date(startsAt).getTime() - settings.policies.cancellationHours * 3600e3),
    /** True while `at` is still inside the free-cancellation window. */
    canCancelFree: (startsAt: string, at: Date = new Date()) => at.getTime() <= new Date(startsAt).getTime() - settings.policies.cancellationHours * 3600e3,
    loading, ready,
  }), [settings, loading, ready]);
}

/** IVA split for a consumer price, following the tax settings. */
export function splitTax(price: number, tax: StudioSettings['tax']) {
  const rate = tax.ivaPct / 100;
  if (tax.pricesIncludeIva) { const subtotal = Math.round(price / (1 + rate)); return { subtotal, tax: price - subtotal, total: price }; }
  const t = Math.round(price * rate); return { subtotal: price, tax: t, total: price + t };
}

/** True when `at` falls inside quiet hours (which wrap past midnight). */
export function inQuietHours(at: Date, q: StudioSettings['quietHours']) {
  const mins = at.getHours() * 60 + at.getMinutes();
  const [fh, fm] = q.from.split(':').map(Number), [th, tm] = q.to.split(':').map(Number);
  const from = fh * 60 + fm, to = th * 60 + tm;
  return from > to ? mins >= from || mins < to : mins >= from && mins < to;
}
