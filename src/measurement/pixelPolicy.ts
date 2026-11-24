/** Advertising event allowlist. Never serialize a route, user, quote, booking, voucher or payment record. */
export const HOY_META_PIXEL_ID = '963759066544104';

export type ProductCategory = 'Trial class' | 'Single class' | 'Class package';
export type MeasurementEvent =
  | { name: 'PageView' }
  | { name: 'ViewContent'; params: { content_name: 'Studio class'; content_ids: ['studio-class']; content_type: 'product' } }
  | { name: 'CompleteRegistration' }
  | { name: 'InitiateCheckout'; params: { currency: 'COP'; value: number; content_name: ProductCategory } };

// Deny by default: never observe auth callback, account activity/history, private booking, code/QR,
// administrative or staff routes. React Router supplies pathname only; commit validation is in the bridge.
const pages = new Set([
  '/site', '/site/plans', '/site/schedule', '/site/classes', '/site/about',
  '/site/modalities', '/site/teachers', '/site/faq', '/site/contact', '/app', '/app/schedule', '/app/schedule/week', '/app/plans', '/app/passes',
]);

export function routeEligible(path: string): boolean {
  // Dynamic paths are allowed only for the independently confirmed, customer-facing route families.
  return pages.has(path) || /^\/site\/classes\/[a-z0-9-]{1,48}$/.test(path) || /^\/app\/(?:class|checkout)\/[A-Za-z0-9_-]{1,80}$/.test(path);
}

export function classifyProduct(kind: unknown): ProductCategory | null {
  if (kind === 'trial') return 'Trial class';
  if (kind === 'single') return 'Single class';
  if (kind === 'pack') return 'Class package';
  return null;
}

export function checkoutEvent(value: unknown, category: unknown): MeasurementEvent | null {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0 || value > 100_000_000) return null;
  if (category !== 'Trial class' && category !== 'Single class' && category !== 'Class package') return null;
  return { name: 'InitiateCheckout', params: { currency: 'COP', value, content_name: category } };
}

export function classView(): MeasurementEvent {
  return { name: 'ViewContent', params: { content_name: 'Studio class', content_ids: ['studio-class'], content_type: 'product' } };
}

export function registrationCreated(httpStatus: number): MeasurementEvent | null {
  return httpStatus === 201 ? { name: 'CompleteRegistration' } : null;
}

/** Last-mile revalidation. A sink never sees caller-provided fields or unknown events. */
export function allowedEvent(event: MeasurementEvent): MeasurementEvent | null {
  switch (event.name) {
    case 'PageView': return { name: 'PageView' };
    case 'CompleteRegistration': return { name: 'CompleteRegistration' };
    case 'ViewContent': return classView();
    case 'InitiateCheckout': return checkoutEvent(event.params?.value, event.params?.content_name);
    default: return null;
  }
}
