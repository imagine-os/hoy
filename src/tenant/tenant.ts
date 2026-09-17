/**
 * The ONLY place the studio's identity and physical facts are written.
 * Multi-tenant later: this becomes a row in `tenants` loaded at boot.
 */

export type DayHours = { open: string; close: string } | null;
/** Opening hours per weekday (0 = Sunday), `null` when closed. M-08a starts from this and may override it. */
export type OpeningHours = Record<'0' | '1' | '2' | '3' | '4' | '5' | '6', DayHours>;

const openingHours: OpeningHours = {
  '0': null,
  '1': { open: '06:00', close: '20:00' }, '2': { open: '06:00', close: '20:00' }, '3': { open: '06:00', close: '20:00' },
  '4': { open: '06:00', close: '20:00' }, '5': { open: '06:00', close: '20:00' },
  '6': { open: '08:00', close: '13:00' },
};

const DAY_ABBR = { es: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'], en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] };
const clock = (hhmm: string) => hhmm.replace(/^0/, '');

/**
 * The opening hours as one sentence — "Lun–Vie 6:00–20:00 · Sáb 8:00–13:00 · Dom cerrado" — grouping
 * consecutive days with the same hours, Monday first. Footers, the manual and M-08a all quote it.
 */
export function hoursSentence(hours: OpeningHours, lang: 'es' | 'en'): string {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const runs: { from: number; to: number; v: DayHours }[] = [];
  for (const d of order) {
    const v = hours[String(d) as keyof OpeningHours];
    const last = runs[runs.length - 1];
    if (last && JSON.stringify(last.v) === JSON.stringify(v)) last.to = d; else runs.push({ from: d, to: d, v });
  }
  const closed = lang === 'es' ? 'cerrado' : 'closed';
  return runs.map((r) => {
    const days = r.from === r.to ? DAY_ABBR[lang][r.from] : `${DAY_ABBR[lang][r.from]}–${DAY_ABBR[lang][r.to]}`;
    return `${days} ${r.v ? `${clock(r.v.open)}–${clock(r.v.close)}` : closed}`;
  }).join(' · ');
}

export const tenant = {
  id: 'ten_hoy',
  slug: 'hoy',
  name: 'HOY',
  legalName: 'HOY Wellness Center',
  tagline: { es: 'Human club', en: 'Human club' },
  /** The studio is in Medellín (the brand manual is headed "Medellín · 2026" and the copy names it). */
  city: 'Medellín',
  country: 'CO',
  timezone: 'America/Bogota',
  currency: 'COP',
  /** Country dialling code every phone field starts from. */
  dialCode: '+57',
  /** Prefix of the invoice numbers the studio issues (`HOY-1005`). */
  invoicePrefix: 'HOY',
  locales: ['es', 'en'] as const,
  defaultLocale: 'es' as const,
  /**
   * Every value here is a PLACEHOLDER until the owner confirms it — `pending` is true so any screen
   * can label it as such instead of presenting a fake phone number as fact.
   */
  contact: {
    whatsapp: '+57 300 000 0000',
    email: 'hola@example.com',
    /** Neighbourhood only until the owner confirms the street address; screens append the pending label themselves. */
    address: 'El Poblado',
    instagram: '@hoy',
    pending: true,
    pendingLabel: { es: 'pendiente', en: 'pending' },
  },
  /** Approximate studio location for the map slot. Exact address still to be confirmed. */
  location: {
    lat: 6.2088,
    lng: -75.5679,
    label: { es: 'El Poblado, Medellín (por confirmar)', en: 'El Poblado, Medellín (to be confirmed)' },
  },
  /** Public profiles. `null` = the account does not exist yet. */
  social: {
    instagram: '@hoy',
    instagramUrl: 'https://www.instagram.com/hoy',
    tiktok: null,
    youtube: null,
  },
  /** Studio capacity — the business rule waitlists, capacity meters and the checkout race cite. */
  studio: { mats: 15, classesPerDay: 4, perPersonPerDay: 1, rooms: 1 },
  openingHours,
  /** The same hours as a sentence per language (derived, never typed twice). */
  hours: { es: hoursSentence(openingHours, 'es'), en: hoursSentence(openingHours, 'en') },
  brand: {
    wordmark: { blue: './brand/hoy-blue.png', cream: './brand/hoy-cream.png', yellow: './brand/hoy-yellow.png' },
    lockup: { sand: './brand/p8-2.png', sandAlt: './brand/p8-3.png' },
  },
} as const;

