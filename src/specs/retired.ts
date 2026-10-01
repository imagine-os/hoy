/**
 * Page codes retired from the product (0030). The code stays in canvasSpecs (frozen canvas reference) and in the
 * docs, but nothing routes to it, the seed creates no feature flags for it, and the hub map does not list it.
 */
export const RETIRED_PAGES: Record<string, { version: string; note: string }> = {
  'A-05': { version: '0.12.0', note: 'Daily intention (“¿Cómo quieres sentirte hoy?”) erased from the customer experience; /app/intention redirects to /app.' },
  'C-22': { version: '0.22.0', note: 'Manage membership: the launch price list (0051) has no membership; /app/membership redirects to C-07b “Mis clases”, where the 12-class package is frozen once for up to 30 days.' },
};
export const isRetired = (code: string) => Object.prototype.hasOwnProperty.call(RETIRED_PAGES, code);
