/// <reference types="vite/client" />

/** Number of `<Name>.meta.ts` files in src/components — counted at build time in vite.config.ts. */
declare const __COMPONENT_COUNT__: number;
/** Number of operations manual chapters (docs/ops-manual/es/*.md), counted at build time (production, lane Y6). */
declare const __MANUAL_CHAPTER_COUNT__: number;
/** `production` or `review`, set in vite.config.ts from VITE_HOY_BUILD; undeclared when a script bundles the app without Vite. */
declare const __HOY_BUILD__: string;
