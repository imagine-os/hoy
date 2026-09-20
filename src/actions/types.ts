import type { Bi } from '../specs/types';

/**
 * One thing a page can be asked to do — by a person clicking, by the WebMCP surface
 * (`window.__hoyos.run`) or, later, by the voice controller whose vocabulary this is.
 *
 * `id` is `<page>.<verb>` and is stable; `intent` is the phrase a person would say, in both
 * languages; `params` maps a parameter name to a type hint (`'string'`, `'enum:es,en'`);
 * `permission` names the `Permission` the caller needs (see src/auth/permissions.ts).
 */
export interface ActionDef {
  id: string;
  label: Bi;
  intent: Bi;
  params?: Record<string, string>;
  permission?: string;
}

/** What `run()` answers. `ok: false` with a message when nothing is mounted to handle the id. */
export interface ActionResult { ok: boolean; message: string }

/** A mounted page's implementation of one action. */
export type ActionHandler = (params?: Record<string, string>) => void | string | Promise<void | string>;
