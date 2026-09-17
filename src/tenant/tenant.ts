/**
 * The ONLY place the studio's identity and physical facts are written.
 * Multi-tenant later: this becomes a row in `tenants` loaded at boot.
 */
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
  locales: ['es', 'en'] as const,
  defaultLocale: 'es' as const,
  /**
   * Every value here is a PLACEHOLDER until the owner confirms it — `pending` is true so any screen
   * can label it as such instead of presenting a fake phone number as fact.
   */
  contact: {
    whatsapp: '+57 300 000 0000',
    email: 'hola@example.com',
    address: 'Dirección del estudio (pendiente)',
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
  hours: {
    es: 'Lun–Vie 6:00–20:00 · Sáb 8:00–13:00 · Dom cerrado',
    en: 'Mon–Fri 6:00–20:00 · Sat 8:00–13:00 · Sun closed',
  },
  brand: {
    wordmark: { blue: './brand/hoy-blue.png', cream: './brand/hoy-cream.png', yellow: './brand/hoy-yellow.png' },
    lockup: { sand: './brand/p8-2.png', sandAlt: './brand/p8-3.png' },
  },
} as const;

export type Tenant = typeof tenant;
