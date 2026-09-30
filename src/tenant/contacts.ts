/**
 * 0047 — WhatsApp contact routing by intent (D-0022). The product used to send every WhatsApp handoff to one
 * number, the front desk (`contact.whatsapp`), payroll questions and habeas-data complaints included. Now each
 * handoff names an *intent* and M-08a holds, per tenant, who receives it (`tenants.settings.contacts`): a name, a
 * WhatsApp number, a role and an hours rule. The front desk is the universal fallback: an intent with no number
 * resolves to it, and so does an intent whose contact is off duty while the studio is open.
 *
 * Pure functions, type imports only, so `scripts/test-contacts.mjs` can bundle this file with esbuild and prove
 * the rules without React. The React reader is `useWhatsappLink()` in src/modules/admin/settings.ts.
 */
import type { Role } from '../auth/roles';
import { waLink } from '../i18n/format';
import { addDaysToKey, effectiveHoursFor, minutesOf, nextOpening, relativeDayLabel, weekdayOf, zonedNow, type Lang, type OverrideLike, type WeeklyHours } from './hours';

/** Why someone is writing. Every handoff in the product names one; M-08a configures who answers it. */
export type ContactIntent = 'frontDesk' | 'sales' | 'specials' | 'support' | 'finance' | 'payroll' | 'legal' | 'coordinator' | 'owner';
export const CONTACT_INTENTS: readonly ContactIntent[] = ['frontDesk', 'sales', 'specials', 'support', 'finance', 'payroll', 'legal', 'coordinator', 'owner'];

/**
 * When a contact receives a message directly. `always`: any time. `studioHours`: while the studio is open (M-08a hours
 * + M-08g exceptions). `businessDays`: Monday to Friday, holidays excluded, any hour.
 */
export type ContactHours = 'always' | 'studioHours' | 'businessDays';
export const CONTACT_HOURS: readonly ContactHours[] = ['always', 'studioHours', 'businessDays'];

export interface ContactRoute {
  name?: string;
  /** Display form (+57 3xx xxx xxxx); `waLink()` strips it to digits. Empty = falls back to the front desk. */
  whatsapp?: string;
  role?: Role;
  hours: ContactHours;
}
export type ContactRoutes = Record<ContactIntent, ContactRoute>;

export const CONTACT_INTENT_LABEL: Record<ContactIntent, { es: string; en: string }> = {
  frontDesk: { es: 'Recepción', en: 'Front desk' },
  sales: { es: 'Ventas y clase de prueba', en: 'Sales and trial class' },
  specials: { es: 'Especiales y eventos', en: 'Specials and events' },
  support: { es: 'Soporte a socios', en: 'Member support' },
  finance: { es: 'Finanzas y pagos', en: 'Finance and payments' },
  payroll: { es: 'Nómina de maestros', en: 'Teacher payroll' },
  legal: { es: 'Datos personales y legal', en: 'Personal data and legal' },
  coordinator: { es: 'Coordinación', en: 'Coordination' },
  owner: { es: 'Dueño/a', en: 'Owner' },
};

/** Where each intent is used, so the admin sees what a row changes (page codes, no prose). */
export const CONTACT_INTENT_USES: Record<ContactIntent, string> = {
  frontDesk: 'W-01 · W-06 · C-05',
  sales: 'W-01 (classic)',
  specials: 'P-01 · W-06 · C-06',
  support: 'C-25 · C-15 · E-04',
  finance: 'C-05',
  payroll: 'S-03',
  legal: 'C-26',
  coordinator: '—',
  owner: '—',
};

export const CONTACT_HOURS_LABEL: Record<ContactHours, { es: string; en: string }> = {
  always: { es: 'Siempre', en: 'Always' },
  studioHours: { es: 'Horario del estudio', en: 'Studio hours' },
  businessDays: { es: 'Lunes a viernes (sin festivos)', en: 'Monday to Friday (no holidays)' },
};

/** The default routing table: no numbers, sensible roles and hours; every row falls back to the front desk. */
export const DEFAULT_CONTACT_ROUTES: ContactRoutes = {
  frontDesk: { role: 'front_desk', hours: 'studioHours' },
  sales: { role: 'front_desk', hours: 'studioHours' },
  specials: { role: 'coordinator', hours: 'studioHours' },
  support: { role: 'front_desk', hours: 'studioHours' },
  finance: { role: 'finance', hours: 'businessDays' },
  payroll: { role: 'finance', hours: 'businessDays' },
  legal: { role: 'admin', hours: 'businessDays' },
  coordinator: { role: 'coordinator', hours: 'studioHours' },
  owner: { role: 'super_admin', hours: 'businessDays' },
};

/** Stored (possibly partial) table → a full one, merged per intent, so a row saved with three intents still resolves the other six. */
export function mergeContacts(stored: Partial<ContactRoutes> | null | undefined): ContactRoutes {
  return Object.fromEntries(CONTACT_INTENTS.map((i) => [i, { ...DEFAULT_CONTACT_ROUTES[i], ...(stored?.[i] ?? {}) }])) as ContactRoutes;
}

/** What `resolveContact` needs from the settings: the routing table and the front desk number after its own fallbacks. */
export interface ContactSettings {
  contacts: ContactRoutes;
  /** `contactOf(settings).whatsapp` — M-08a profile first, tenant.ts as the default. */
  frontDeskWhatsapp: string;
}
/** What it needs from the hours: the weekly hours and the dated exceptions (`useOpeningHours()` has both). */
export interface ContactHoursInput { weekly: WeeklyHours; overrides: readonly OverrideLike[] }
export interface ResolveOptions {
  now?: Date;
  /** The studio's IANA time zone (tenant.timezone). */
  tz: string;
  /** Extra holiday date keys (YYYY-MM-DD) beyond the closed `holiday` overrides — the country's computed calendar. */
  holidays?: readonly string[];
}

export interface ResolvedContact {
  /** What the caller asked for. */
  intent: ContactIntent;
  /** Who actually receives it: the intent itself, or `frontDesk` after a fallback. */
  resolvedIntent: ContactIntent;
  whatsapp: string;
  name?: string;
  role?: Role;
  /** Present when the contact is off duty and the studio is closed: "we reply on the next open day (…)". */
  note?: { es: string; en: string };
}

/** True on a date the studio treats as a holiday: a closed `holiday` override or a date from the country's calendar. */
export function isHoliday(date: string, overrides: readonly OverrideLike[], holidays: readonly string[] = []): boolean {
  return holidays.includes(date) || overrides.some((o) => o.kind === 'holiday' && o.closed && o.start_date <= date && o.end_date >= date);
}

/** Monday to Friday and not a holiday. */
export function isBusinessDay(date: string, overrides: readonly OverrideLike[], holidays: readonly string[] = []): boolean {
  const wd = weekdayOf(date);
  return wd >= 1 && wd <= 5 && !isHoliday(date, overrides, holidays);
}

/** The next business day strictly after `date`, within `horizon` days. */
export function nextBusinessDay(date: string, overrides: readonly OverrideLike[], holidays: readonly string[] = [], horizon = 21): string | null {
  for (let i = 1; i <= horizon; i++) { const k = addDaysToKey(date, i); if (isBusinessDay(k, overrides, holidays)) return k; }
  return null;
}

/** "mañana" · "el lunes" · "el 12/10" — relative to `from`, for the reply note (shares `relativeDayLabel` with the hours line). */
export function dayLabel(date: string, from: string, lang: Lang): string {
  const offset = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
  return relativeDayLabel(date, offset, lang);
}

const replyNote = (date: string | null, from: string): { es: string; en: string } => ({
  es: date ? `Respondemos el próximo día hábil (${dayLabel(date, from, 'es')})` : 'Respondemos el próximo día hábil',
  en: date ? `We reply on the next open day (${dayLabel(date, from, 'en')})` : 'We reply on the next open day',
});

/**
 * Intent → who receives the WhatsApp right now.
 * - No number for the intent (or `frontDesk` itself) → the front desk.
 * - `always` → that number.
 * - `studioHours` → that number while the studio is open; otherwise the front desk if the studio is open (it never is
 *   in this branch, so:) otherwise that number with a "we reply on the next open day" note.
 * - `businessDays` → that number Monday to Friday excluding holidays; on other days the front desk while the studio is
 *   open, else that number with the note naming the next business day.
 */
export function resolveContact(settings: ContactSettings, hours: ContactHoursInput, intent: ContactIntent, opts: ResolveOptions): ResolvedContact {
  const frontDesk = settings.contacts.frontDesk;
  const asFrontDesk = (): ResolvedContact => ({ intent, resolvedIntent: 'frontDesk', whatsapp: frontDesk.whatsapp?.trim() || settings.frontDeskWhatsapp, name: frontDesk.name?.trim() || undefined, role: frontDesk.role });
  const route = settings.contacts[intent];
  const number = route?.whatsapp?.trim();
  if (intent === 'frontDesk' || !number) return asFrontDesk();
  const own = (note?: { es: string; en: string }): ResolvedContact => ({ intent, resolvedIntent: intent, whatsapp: number, name: route.name?.trim() || undefined, role: route.role, ...(note ? { note } : {}) });
  if (route.hours === 'always') return own();

  const { date, minutes } = zonedNow(opts.now ?? new Date(), opts.tz);
  const today = effectiveHoursFor(date, hours.weekly, hours.overrides).hours;
  const studioOpen = !!today && minutes >= minutesOf(today.open) && minutes < minutesOf(today.close);
  const holidays = opts.holidays ?? [];

  if (route.hours === 'studioHours') {
    if (studioOpen) return own();
    const next = nextOpening(date, minutes, hours.weekly, hours.overrides);
    return own(replyNote(next?.date ?? null, date));
  }
  // businessDays
  if (isBusinessDay(date, hours.overrides, holidays)) return own();
  if (studioOpen) return asFrontDesk();
  return own(replyNote(nextBusinessDay(date, hours.overrides, holidays), date));
}

/** The wa.me link for a resolved contact; `waLink()` (src/i18n/format.ts) stays the low-level builder. */
export const whatsappLink = (resolved: Pick<ResolvedContact, 'whatsapp'>, text?: string) => waLink(resolved.whatsapp, text);
