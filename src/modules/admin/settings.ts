import { useCallback, useMemo } from 'react';
import { useData, useTable } from '../../data/DataContext';
import type { BaseRow, ModalityRow } from '../../data/schema';
import { EMPTY_RATE_CARD, type PayrollCadence, type RateCard } from '../../data/payrollCalc';
import type { MapProvider } from '../../components/molecule/MapSlot/MapSlot';
import { tenant } from '../../tenant/tenant';
import { DEFAULT_IVA_PCT, splitIva } from '../../data/tax';
import { MS } from '../../i18n/format';

/**
 * M-08 — the operating parameters every other screen reads. Stored in `tenants.settings` (json)
 * through the data layer; defaults come from src/tenant/tenant.ts so nothing is hardcoded twice.
 */
export interface OpeningHours { open: string; close: string }
export interface StudioSettings {
  studio: { mats: number; classesPerDay: number; perPersonPerDay: number; rooms: number };
  /**
   * M-08a — the studio's contact identity (0018). Every field defaults to src/tenant/tenant.ts; `confirmed`
   * is the owner saying "these are real": until then every consumer (site footer, W-06, legal tokens,
   * email footers, the manual) labels the values as pending. `useContact()` is the one reader.
   */
  profile: { nit: string; address: string; city: string; whatsapp: string; email: string; instagram: string; instagramUrl: string; mapLat: number; mapLng: number; mapLabel: string; mapLink: string; confirmed: boolean };
  /** 0 = Sunday … 6 = Saturday; null = closed. */
  openingHours: Record<string, OpeningHours | null>;
  /** Read by the customer app through usePolicy() → src/modules/customer/policy.ts (cancel window, claim window, hold, pause cap, charge notice, lockout). */
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
  /**
   * M-08c — payroll (0018). `cadence` is programmed both ways: M-09a generates one run per month or two
   * (1–15, 16–end), S-03 and the finance range follow it. `rateCard` is read by src/data/payrollCalc.ts
   * `rateFor()`: teacher override → modality rate → teachers.rate_per_class. `signedBy` is who signs the
   * payment record (ROADMAP §E 27); `payoutMethod` is the default M-09a proposes.
   */
  payroll: { cadence: PayrollCadence; payoutMethod: 'wompi' | 'transfer' | 'cash'; signedBy: string; withholding: boolean; rateCard: RateCard };
  /**
   * M-08f — content decisions (0018). `publicNaming` decides whether the customer schedule leads with the
   * movement (Enraíza · Fluye · Arde · Libera) or the discipline (Hot Vinyasa, Pilates…); `breathworkOwnClass`
   * shows or hides the Respiración modality row (W-08 facts vs the “lives inside meditation” sentence);
   * `mapProvider` is what MapSlot embeds.
   */
  content: { publicNaming: 'disciplines' | 'movements'; breathworkOwnClass: boolean; mapProvider: MapProvider };
}

export const DEFAULT_SETTINGS: StudioSettings = {
  studio: { ...tenant.studio },
  profile: { nit: '', address: tenant.contact.address, city: tenant.city, whatsapp: tenant.contact.whatsapp, email: tenant.contact.email, instagram: tenant.social.instagram, instagramUrl: tenant.social.instagramUrl, mapLat: tenant.location.lat, mapLng: tenant.location.lng, mapLabel: '', mapLink: '', confirmed: false },
  openingHours: { ...tenant.openingHours },
  policies: { cancellationHours: 2, waitlistClaimMin: 30, lateGraceMin: 15, noShowFee: 0, pauseDaysPerYear: 30, maxPausesPerYear: 2, paymentHoldMin: 10, chargeNoticeDays: 3, lockoutAttempts: 5, lockoutMinutes: 15 },
  quietHours: { from: '21:00', to: '07:00' },
  tax: { ivaPct: DEFAULT_IVA_PCT, pricesIncludeIva: true, dianResolution: '', eInvoicing: false },
  integrations: { wompi: 'pending', whatsapp: 'pending', email: 'pending', calendar: 'pending' },
  features: { multipleLocations: false, noShowFee: false, holidayCalendar: true, walkInRegistration: true, autoCheckinOnSale: true },
  payments: { bankName: '', accountType: 'savings', accountNumber: '', accountHolder: tenant.legalName, wompiEnv: 'sandbox' },
  comms: { whatsappSender: tenant.name, emailSender: tenant.legalName, emailReplyTo: tenant.contact.email },
  branding: { displayName: '', wordmarkVariant: 'auto', defaultLang: tenant.defaultLocale },
  payroll: { cadence: 'monthly', payoutMethod: 'wompi', signedBy: '', withholding: false, rateCard: EMPTY_RATE_CARD },
  content: { publicNaming: 'disciplines', breathworkOwnClass: false, mapProvider: 'none' },
};

export interface TenantRow extends BaseRow { settings: Partial<StudioSettings> | null }

/** Stored partial → full settings with defaults. Exported so non-React code (customer policy) can read the same shape. */
function mergeSettings(stored: Partial<StudioSettings> | null | undefined): StudioSettings {
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
    payroll: { ...DEFAULT_SETTINGS.payroll, ...(s.payroll ?? {}), rateCard: { byModality: { ...(s.payroll?.rateCard?.byModality ?? {}) }, byTeacher: { ...(s.payroll?.rateCard?.byTeacher ?? {}) } } },
    content: { ...DEFAULT_SETTINGS.content, ...(s.content ?? {}) },
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
 * src/modules/customer/policy.ts feeds its `policy` snapshot from this hook (<PolicySync/>), so the customer
 * app and the admin read one source.
 */
export function usePolicy() {
  const { settings, loading, ready } = useSettings();
  return useMemo(() => ({
    ...settings.policies,
    quietHours: settings.quietHours,
    features: settings.features,
    tax: settings.tax,
    /** M-08c payroll switches (0018): cadence, default payout method, who signs. */
    payroll: settings.payroll,
    /** Free-cancellation deadline for a session start. */
    cancelDeadline: (startsAt: string) => new Date(new Date(startsAt).getTime() - settings.policies.cancellationHours * MS.hour),
    /** True while `at` is still inside the free-cancellation window. */
    canCancelFree: (startsAt: string, at: Date = new Date()) => at.getTime() <= new Date(startsAt).getTime() - settings.policies.cancellationHours * MS.hour,
    loading, ready,
  }), [settings, loading, ready]);
}

/** IVA split for a consumer price, following the tax settings. */
export const splitTax = (price: number, tax: StudioSettings['tax']) => splitIva(price, tax.ivaPct / 100, tax.pricesIncludeIva);

/** True when `at` falls inside quiet hours (which wrap past midnight). */
export function inQuietHours(at: Date, q: StudioSettings['quietHours']) {
  const mins = at.getHours() * 60 + at.getMinutes();
  const [fh, fm] = q.from.split(':').map(Number), [th, tm] = q.to.split(':').map(Number);
  const from = fh * 60 + fm, to = th * 60 + tm;
  return from > to ? mins >= from || mins < to : mins >= from && mins < to;
}

/* ------------------------------------------------------------------------------------------------
 * 0018 — decisions as settings. The readers every other surface uses so nothing reads tenant.ts alone.
 * ---------------------------------------------------------------------------------------------- */

export interface StudioContact {
  address: string; city: string; whatsapp: string; email: string; instagram: string; instagramUrl: string;
  location: { lat: number; lng: number; label: { es: string; en: string }; link: string | null };
  /** True until the owner ticks "confirmed" in M-08a — consumers label the values as pending. */
  pending: boolean;
  pendingLabel: { es: string; en: string };
}

/** Settings → contact facts, with src/tenant/tenant.ts as the fallback for every empty field. */
export function contactOf(settings: StudioSettings): StudioContact {
  const p = settings.profile;
  const instagram = p.instagram || tenant.social.instagram;
  const label = p.mapLabel ? { es: p.mapLabel, en: p.mapLabel } : tenant.location.label;
  return {
    address: p.address || tenant.contact.address,
    city: p.city || tenant.city,
    whatsapp: p.whatsapp || tenant.contact.whatsapp,
    email: p.email || tenant.contact.email,
    instagram,
    instagramUrl: p.instagramUrl || (instagram ? `https://www.instagram.com/${instagram.replace('@', '')}` : tenant.social.instagramUrl),
    location: { lat: p.mapLat || tenant.location.lat, lng: p.mapLng || tenant.location.lng, label, link: p.mapLink || null },
    pending: !p.confirmed,
    pendingLabel: tenant.contact.pendingLabel,
  };
}

/** The studio's contact identity, live: M-08a first, tenant.ts as the default. */
export function useContact(): StudioContact {
  const { settings } = useSettings();
  return useMemo(() => contactOf(settings), [settings]);
}

/** Slug of the modality that only exists as its own class when M-08f says so. */
const BREATHWORK_SLUG = 'respiracion';

/** Filters the modalities the public sees: Respiración is hidden while it "lives inside meditación". */
export function visibleModalities<T extends Pick<ModalityRow, 'slug'>>(rows: T[], content: StudioSettings['content']): T[] {
  return content.breathworkOwnClass ? rows : rows.filter((m) => m.slug !== BREATHWORK_SLUG);
}

/** Live version of `visibleModalities` for pages that list the catalogue. */
export function useVisibleModalities<T extends Pick<ModalityRow, 'slug'>>(rows: T[]): T[] {
  const { settings } = useSettings();
  return useMemo(() => visibleModalities(rows, settings.content), [rows, settings.content]);
}

/**
 * How a class is titled on a public schedule row (C-03, W-04, W-01): by discipline (the modality
 * name, the default) or by movement, with the discipline moved next to the teacher's name.
 */
export function classDisplay(naming: StudioSettings['content']['publicNaming'], input: { title: string; modalityName: string | null; movementLabel: string; teacher: string }): { title: string; teacher: string } {
  if (naming === 'movements') {
    const disc = input.modalityName ?? input.title;
    return { title: input.movementLabel, teacher: disc && input.teacher ? `${disc} · ${input.teacher}` : disc || input.teacher };
  }
  return { title: input.title, teacher: input.teacher };
}
