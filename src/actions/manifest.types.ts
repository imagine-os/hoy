import type { Bi } from '../specs/types';

/**
 * The published actions vocabulary — `public/actions.json`, schema `hoy.actions/1`, written by
 * `scripts/gen-actions.mjs` before every build from the same `PageSpec.actions` that
 * `window.__hoyos.actions` lists (docs/reference/surfaces.md §4). Read-only: it says what can be
 * asked; running an action still needs the page (`window.__hoyos.run`).
 */
export interface ActionsManifest {
  schema: 'hoy.actions/1';
  product: { id: 'hoy'; name: Bi; version: string; baseUrl: string };
  /** Date of the latest changelog entry (deterministic, no clock). */
  generatedAt: string;
  run: { how: string; note: string };
  /** Only the permissions some action references, with the roles that hold each. */
  permissions: { id: string; roles: string[] }[];
  /** Sorted by id; one entry per id however many pages declare it. */
  actions: {
    id: string;
    label: Bi;
    intent: Bi;
    params?: Record<string, string>;
    permission?: string;
    /** Union of the declaring routes' roles. */
    roles: string[];
    /** Declaring pages, deduped, registry order. */
    pages: { code: string; route: string }[];
  }[];
}
