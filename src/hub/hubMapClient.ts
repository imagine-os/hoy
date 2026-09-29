/**
 * The published hub map, read back by the app itself (the `hub.map` action and `window.__hoyos.hubMap`).
 * The file is `public/hub-map.json`, written by `scripts/gen-hub-map.mjs` before every build, so the
 * app and every other host read the same bytes. Loaded on demand: a visitor never pays for it.
 */
import { HOY_BASE_URL, HUB_MAP_FILE, HUB_MAP_SCHEMA } from './hubMap.data';
import type { HubMap } from './hubMap.types';

let cache: HubMap | null = null;
let pending: Promise<HubMap> | null = null;

/** Absolute URL of the map this deployment serves (the document's folder + hub-map.json). */
export function hubMapUrl(): string {
  if (typeof window === 'undefined') return `${HOY_BASE_URL}${HUB_MAP_FILE}`;
  return new URL(HUB_MAP_FILE, window.location.href.split('#')[0]).href;
}

/** The map once loaded, else null. */
export const hubMapData = (): HubMap | null => cache;

/** Fetches (once) and checks the schema id; a failed fetch can be retried. */
export function loadHubMap(): Promise<HubMap> {
  if (cache) return Promise.resolve(cache);
  pending ??= fetch(hubMapUrl(), { cache: 'no-cache' })
    .then((r) => { if (!r.ok) throw new Error(`hub map: HTTP ${r.status} at ${hubMapUrl()}`); return r.json() as Promise<HubMap>; })
    .then((m) => {
      if (m?.schema !== HUB_MAP_SCHEMA) throw new Error(`hub map: expected schema ${HUB_MAP_SCHEMA}, got ${String(m?.schema)}`);
      cache = m;
      return m;
    })
    .finally(() => { pending = null; });
  return pending;
}
