import { PRODUCTION_BUILD } from './launch';

/**
 * The app's address without the hash, for links the app builds itself (sign-out return, Google return, share links).
 * Production serves real site paths (`/planes`), so the base is always the origin plus `/`; the review build lives under
 * a path on GitHub Pages and keeps `origin + pathname`.
 */
export function appBaseFor(location: Pick<Location, 'origin' | 'pathname'>, production: boolean): string {
  return production ? `${location.origin}/` : `${location.origin}${location.pathname}`;
}

export const appBase = (location: Pick<Location, 'origin' | 'pathname'> = window.location): string => appBaseFor(location, PRODUCTION_BUILD);
