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
   * 0036 — the phone and the street address come from the owner (Justin, Slack #hoy, 2026-09-29): the WhatsApp
   * number from the studio's own contact card, the address because the studio shares the Santa María Tenis Club
   * premises (the club's site, santamariatenisclub.com, checked 2026-09-29). The email and the Instagram handle are
   * still PLACEHOLDERS. `confirmed` says which fields are real; every screen labels the others as pending instead of
   * presenting a fake value as fact. M-08a can override each value and each flag.
   */
  contact: {
    /** Display form; `waLink()` strips it to digits for the wa.me link (E.164 +573127765000). */
    whatsapp: '+57 312 776 5000',
    email: 'hola@example.com',
    /** Colombian street format, as the club publishes it. */
    address: 'Cl. 7B Sur # 29C-100, El Poblado',
    instagram: '@hoy',
    confirmed: { whatsapp: true, address: true, email: false, instagram: false },
    pendingLabel: { es: 'pendiente', en: 'pending' },
  },
  /**
   * The studio's location for the map slot: Santa María Tenis Club, El Poblado. Coordinates from the club's
   * easycancha listing (6.19281, -75.56535), which matches the club's own map pin for the same address.
   */
  location: {
    lat: 6.19281,
    lng: -75.56535,
    label: { es: 'Cl. 7B Sur # 29C-100, El Poblado, Medellín', en: 'Cl. 7B Sur # 29C-100, El Poblado, Medellín' },
    /** Google Maps search for the street address (no share link from the owner yet). */
    link: 'https://www.google.com/maps/search/?api=1&query=Cl.+7B+Sur+%2329C-100%2C+El+Poblado%2C+Medell%C3%ADn%2C+Antioquia',
  },
  /** Public profiles. `null` = the account does not exist yet. */
  social: {
    instagram: '@hoy',
    instagramUrl: 'https://www.instagram.com/hoy',
    tiktok: null,
    youtube: null,
  },
  /** Studio capacity — the business rule waitlists, capacity meters and the checkout race cite. */
  studio: { mats: 16, matRows: 2, classesPerDay: 4, perPersonPerDay: 1, rooms: 1 },
  openingHours,
  /** The same hours as a sentence per language (derived, never typed twice). */
  hours: { es: hoursSentence(openingHours, 'es'), en: hoursSentence(openingHours, 'en') },
  brand: {
    wordmark: { blue: './brand/hoy-blue.png', cream: './brand/hoy-cream.png', yellow: './brand/hoy-yellow.png' },
    lockup: { sand: './brand/p8-2.png', sandAlt: './brand/p8-3.png' },
    /**
     * 0033 — the script mark as one vector (public/brand/hoy-wordmark.svg, `<symbol id="hoy">`, fill currentColor) for
     * the website's display headings. `ratio` = width / height of the symbol's viewBox; `baseline` = where the script's
     * baseline sits, as a fraction of the height from the top (the Wordmark atom drops the mark by 1 − baseline).
     */
    vector: { src: './brand/hoy-wordmark.svg#hoy', ratio: 4501 / 2267, baseline: 0.73 },
  },
} as const;

