/**
 * Live counts the hub's stat strip prints.
 *
 * `componentCount` is a build-time `define` from vite.config.ts: a lazy `import.meta.glob` over the
 * `*.meta.ts` files would have created one chunk per component just to count them, and an eager one
 * would have pulled every component into the entry chunk. The manual count is a lazy `?raw` glob,
 * which shares its chunks with the docs module and pulls nothing in.
 */

import { PRODUCTION_BUILD } from '../config/launch';

/** Components registered in D-02 — one `<Name>.meta.ts` each. */
export const componentCount: number = __COMPONENT_COUNT__;

/**
 * Chapters of the operations manual (K-03); `es/` is the source, `en/` mirrors it. Production (lane Y6) bundles nothing
 * from docs/, so there the number is a build-time `define` (a count only, no text).
 */
export const manualChapterCount: number = PRODUCTION_BUILD ? __MANUAL_CHAPTER_COUNT__ : Object.keys(import.meta.glob('../../docs/ops-manual/es/*.md', { query: '?raw', import: 'default' })).length;
