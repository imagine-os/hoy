/**
 * Modelo de Valor v3 — the ONLY place a price is written. P-01, C-06, C-07, S-04 and the `plans`
 * seed all read from here. Amounts in COP (integers).
 */
import { tenant } from './tenant';
import { formatCOP } from '../i18n/format';

export type PlanFamily = 'bienvenida' | 'membresia' | 'pausas' | 'regalos' | 'espacio';

export interface PriceItem {
  id: string;
  family: PlanFamily;
  name: { es: string; en: string };
  description: { es: string; en: string };
  /** COP; null when the price reads "included". */
  price: number | null;
  period?: 'month' | 'year';
  credits?: number;
  validityDays?: number;
  from?: boolean;
  badge?: { es: string; en: string };
}

export const FAMILY_LABEL: Record<PlanFamily, { es: string; en: string }> = {
  bienvenida: { es: 'Bienvenida', en: 'Welcome' },
  membresia: { es: 'Membresía', en: 'Membership' },
  pausas: { es: 'Pausas', en: 'Pauses' },
  regalos: { es: 'Regalos', en: 'Gifts' },
  espacio: { es: 'Espacio', en: 'Space' },
};

export const pricing: PriceItem[] = [
  { id: 'trial', family: 'bienvenida', name: { es: 'Clase de Prueba', en: 'Trial Class' }, description: { es: 'una clase, sin costo de entrada', en: 'one class, no entry cost' }, price: 39000, credits: 1, validityDays: 30 },
  { id: 'single', family: 'bienvenida', name: { es: 'Pase Individual', en: 'Single Pass' }, description: { es: 'una visita, sin permanencia', en: 'one visit, no commitment' }, price: 58000, credits: 1, validityDays: 30 },
  { id: 'pack3', family: 'bienvenida', name: { es: 'Paquete de 3 Clases', en: '3-Class Pack' }, description: { es: 'para usar en un mes', en: 'use within a month' }, price: 110000, credits: 3, validityDays: 30 },
  { id: 'pack10', family: 'bienvenida', name: { es: 'Paquete de 10 Clases', en: '10-Class Pack' }, description: { es: 'para usar en 3 meses', en: 'use within 3 months' }, price: 490000, credits: 10, validityDays: 90 },
  { id: 'monthly', family: 'membresia', name: { es: 'Plan Mensual', en: 'Monthly Plan' }, description: { es: 'acceso completo, mes a mes', en: 'full access, month to month' }, price: 520000, period: 'month' },
  { id: 'annual', family: 'membresia', name: { es: 'Plan Anual', en: 'Annual Plan' }, description: { es: 'acceso completo, pago anual', en: 'full access, paid yearly' }, price: 4990000, period: 'year', badge: { es: 'Mejor valor', en: 'Best value' } },
  { id: 'pausa1', family: 'pausas', name: { es: 'Pausa Individual', en: 'Single Pause' }, description: { es: 'un ingreso', en: 'one entry' }, price: 24000 },
  { id: 'pausa10', family: 'pausas', name: { es: 'Paquete de 10 Pausas', en: '10-Pause Pack' }, description: { es: 'para usar en 3 meses', en: 'use within 3 months' }, price: 190000, validityDays: 90 },
  { id: 'pausaUnl', family: 'pausas', name: { es: 'Pausas Ilimitadas', en: 'Unlimited Pauses' }, description: { es: 'complemento mensual', en: 'monthly add-on' }, price: 95000, period: 'month' },
  { id: 'bono', family: 'regalos', name: { es: 'Bono de Regalo', en: 'Gift Voucher' }, description: { es: 'para regalar', en: 'to give away' }, price: 58000, from: true },
  { id: 'guest', family: 'regalos', name: { es: 'Invitado', en: 'Guest' }, description: { es: 'para socios de Membresía', en: 'for Membership members' }, price: null },
  { id: 'foto', family: 'espacio', name: { es: 'Foto & Video', en: 'Photo & Video' }, description: { es: 'medio día', en: 'half day' }, price: 700000, from: true },
  { id: 'taller', family: 'espacio', name: { es: 'Talleres', en: 'Workshops' }, description: { es: 'por sesión', en: 'per session' }, price: 350000, from: true },
  { id: 'privada', family: 'espacio', name: { es: 'Sesión Privada', en: 'Private Session' }, description: { es: 'por sesión', en: 'per session' }, price: 600000, from: true },
  { id: 'rodaje', family: 'espacio', name: { es: 'Rodajes', en: 'Shoots' }, description: { es: 'por día', en: 'per day' }, price: 1500000, from: true },
  { id: 'popup', family: 'espacio', name: { es: 'Pop-ups', en: 'Pop-ups' }, description: { es: 'por evento', en: 'per event' }, price: 2200000, from: true },
];

export const pricingByFamily = (family: PlanFamily) => pricing.filter((p) => p.family === family);
export const priceItem = (id: string) => pricing.find((p) => p.id === id);

/**
 * Why each family exists — the "Por qué existe" rationale from the Modelo de Valor deck, so the
 * public plans page can explain the model instead of only listing prices. Additive: prices,
 * `FAMILY_LABEL` and `pricing` above are unchanged.
 */
export const FAMILY_ROLE: Record<PlanFamily, { es: string; en: string }> = {
  bienvenida: { es: 'Adquisición', en: 'Acquisition' },
  membresia: { es: 'Ingreso recurrente', en: 'Recurring revenue' },
  pausas: { es: 'Frecuencia', en: 'Frequency' },
  regalos: { es: 'Referido y comunidad', en: 'Referral and community' },
  espacio: { es: 'Ingreso B2B', en: 'B2B revenue' },
};

export interface FamilyRationale {
  /** The commercial role, shown as the card eyebrow. */
  role: { es: string; en: string };
  /** One line under the family name. */
  subtitle: { es: string; en: string };
  /** The "Por qué existe" paragraph. */
  why: { es: string; en: string };
  /** Optional footnote (the annual plan's monthly equivalent, the referral cost). */
  note?: { es: string; en: string };
}

export const FAMILY_RATIONALE: Record<PlanFamily, FamilyRationale> = {
  bienvenida: {
    role: FAMILY_ROLE.bienvenida,
    subtitle: { es: 'Para quien llega — el primer paso, sin complicaciones.', en: 'For whoever arrives — the first step, no complications.' },
    why: {
      es: 'Puntos de entrada a precio bajo, pensados para bajar la barrera de la primera visita. No buscan rentabilidad inmediata: buscan que la persona pruebe una clase y decida seguir, alimentando el paso hacia la Membresía.',
      en: 'Low-priced entry points, designed to lower the barrier to a first visit. They are not built for immediate margin: they are built so a person tries one class and decides to keep going, feeding the step up into Membership.',
    },
  },
  membresia: {
    role: FAMILY_ROLE.membresia,
    subtitle: { es: 'Un solo nivel de acceso, dos formas simples de pagarlo.', en: 'One level of access, two simple ways to pay for it.' },
    why: {
      es: 'El núcleo económico del negocio, simplificado a dos opciones claras: mensual o anual. Mismo acceso completo a las clases en ambos casos — menos opciones, decisión más fácil, e ingreso recurrente (MRR/ARR) más predecible para el estudio.',
      en: 'The economic core of the business, simplified into two clear options: monthly or yearly. Full class access in both cases — fewer options, an easier decision, and recurring revenue (MRR/ARR) the studio can forecast.',
    },
    note: {
      es: `El Plan Anual equivale a cerca de ${formatCOP(Math.round((priceItem('annual')?.price ?? 0) / 12), 'es')} al mes: una forma simple de premiar el compromiso, sin necesidad de niveles intermedios.`,
      en: `The Annual Plan works out at roughly ${formatCOP(Math.round((priceItem('annual')?.price ?? 0) / 12), 'en')} a month: a simple way to reward commitment, with no need for tiers in between.`,
    },
  },
  pausas: {
    role: FAMILY_ROLE.pausas,
    subtitle: { es: 'Sesiones cortas de 15 a 30 minutos.', en: 'Short sessions of 15 to 30 minutes.' },
    why: {
      es: 'Micro-sesiones entre clases completas: elevan la frecuencia semanal por persona con costo marginal casi nulo para el estudio.',
      en: 'Micro-sessions between full classes: they raise weekly visits per person at almost no marginal cost to the studio.',
    },
  },
  regalos: {
    role: FAMILY_ROLE.regalos,
    subtitle: { es: 'Para compartir la experiencia.', en: 'To share the experience.' },
    why: {
      es: 'Regalar y compartir la experiencia son, en la práctica, el canal de referido de HOY: nuevas personas llegan a través de alguien que ya conoce el estudio.',
      en: 'Gifting and sharing the experience are, in practice, HOY’s referral channel: new people arrive through someone who already knows the studio.',
    },
    note: {
      es: 'Cada bono trae a alguien nuevo al estudio, a un costo de adquisición cercano a cero.',
      en: 'Every voucher brings someone new into the studio, at an acquisition cost close to zero.',
    },
  },
  espacio: {
    role: FAMILY_ROLE.espacio,
    subtitle: { es: 'Alquiler del estudio — el activo físico como línea de negocio.', en: 'Studio rental — the physical asset as a line of business.' },
    why: {
      es: 'El estudio genera ingreso más allá de las clases: producciones, marcas y comunidades alquilan el espacio fuera de las horas de mayor demanda. Es la línea de ingreso menos dependiente del ciclo de membresías y con mayor techo por transacción.',
      en: 'The studio earns beyond its classes: productions, brands and communities rent the space outside peak hours. It is the revenue line least tied to the membership cycle, and the one with the highest ceiling per transaction.',
    },
  },
};

/**
 * The discipline behind the model — four numbers and the paragraph that ties the five families
 * together. The numbers are read from src/tenant/tenant.ts (studio capacity) and from the number of
 * families here, so nothing is written twice.
 */
export const DISCIPLINE = {
  numbers: [
    { value: tenant.studio.mats, label: { es: 'tapetes por sesión', en: 'mats per session' } },
    { value: tenant.studio.classesPerDay, label: { es: 'clases al día (los 4 movimientos)', en: 'classes a day (the 4 movements)' } },
    { value: tenant.studio.perPersonPerDay, label: { es: 'clase diaria por persona en cualquier plan', en: 'class per person per day on any plan' } },
    { value: (Object.keys(FAMILY_LABEL) as PlanFamily[]).length, label: { es: 'líneas de ingreso', en: 'revenue lines' } },
  ],
  paragraph: {
    es: 'La Bienvenida capta y la Membresía retiene; Pausas y Regalos suben la frecuencia y el referido a costo marginal bajo; el Espacio abre ingreso B2B sin depender del ciclo de membresías. Cinco palancas, un mismo estudio — con un límite de capacidad claro que protege la experiencia.',
    en: 'Welcome brings people in and Membership keeps them; Pauses and Gifts raise frequency and referrals at low marginal cost; Space opens B2B revenue that does not depend on the membership cycle. Five levers, one studio — with a clear capacity limit that protects the experience.',
  },
  tagline: { es: 'La vida es HOY.', en: 'Life is HOY.' },
} as const;
