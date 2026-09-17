/**
 * Modelo de Valor v3 — the ONLY place a price is written. P-01, C-06, C-07, S-04 and the `plans`
 * seed all read from here. Amounts in COP (integers).
 */
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
