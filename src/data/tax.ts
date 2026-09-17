/**
 * IVA arithmetic — the one place a consumer price is split into subtotal + tax.
 * Colombian prices are quoted IVA-inclusive (M-08c `pricesIncludeIva`), so the default backs the
 * tax out of the gross; with `included = false` it is added on top. Receipts, invoices, the S-04
 * order summary and the seed all call this, so no screen carries its own `/ 1.19`.
 */

/** Statutory IVA the settings start from (M-08c overrides it per tenant). */
export const DEFAULT_IVA_PCT = 19;

export interface TaxSplit { subtotal: number; tax: number; total: number }

/** `rate` is a fraction (0.19). Rounds to whole pesos the way the DIAN invoice does. */
export function splitIva(gross: number, rate: number, included = true): TaxSplit {
  if (included) {
    const subtotal = Math.round(gross / (1 + rate));
    return { subtotal, tax: gross - subtotal, total: gross };
  }
  const tax = Math.round(gross * rate);
  return { subtotal: gross, tax, total: gross + tax };
}
