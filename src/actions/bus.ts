import { useEffect } from 'react';
import type { PageSpec } from '../specs/types';
import { getRoutes } from '../app/registry';
import type { ActionDef, ActionHandler, ActionResult } from './types';

/**
 * The actions registry — the WebMCP surface.
 *
 * Declared vs mounted: every `PageSpec.actions` entry is *declared* and is listed by
 * `listActions()` whether or not its page is open; a page that is open *mounts* handlers with
 * `useActions(spec, handlers)` and only then can `run(id)` do anything. That split is what lets
 * an agent read the whole vocabulary of the app from one page.
 */
const handlers = new Map<string, ActionHandler>();

/** Registers handlers for the ids a spec declares. Returns the unregister function. */
export function registerActions(spec: PageSpec, impl: Record<string, ActionHandler>): () => void {
  const declared = new Set((spec.actions ?? []).map((a) => a.id));
  const mine: string[] = [];
  for (const [id, fn] of Object.entries(impl)) {
    if (import.meta.env.DEV && !declared.has(id)) console.warn(`[actions] ${spec.code} handles ${id} but does not declare it in its spec`);
    handlers.set(id, fn);
    mine.push(id);
  }
  if (import.meta.env.DEV) for (const a of spec.actions ?? []) if (!(a.id in impl)) console.warn(`[actions] ${spec.code} declares ${a.id} with no handler`);
  return () => { for (const id of mine) if (handlers.get(id) === impl[id]) handlers.delete(id); };
}

/** Registers a page's actions while it is mounted. */
export function useActions(spec: PageSpec, impl: Record<string, ActionHandler>): void {
  // The effect is keyed on [spec, impl], so callers must memoize `impl` (a `useMemo` over the
  // handler object): a fresh object literal every render would re-register on every render.
  // Re-registering is only a Map.set, but the churn is avoidable and the warnings above would repeat.
  useEffect(() => registerActions(spec, impl), [spec, impl]);
}

export interface DeclaredAction extends ActionDef {
  /** Page code that declares it. */
  code: string;
  /** Route the page lives on. */
  route: string;
  /** True when a mounted page can run it right now. */
  mounted: boolean;
}

/** Every action declared by any routed page — the vocabulary, not only what is open. */
export function listActions(): DeclaredAction[] {
  const out = new Map<string, DeclaredAction>();
  for (const r of getRoutes()) {
    for (const a of r.spec.actions ?? []) {
      if (out.has(a.id)) continue;
      out.set(a.id, { ...a, code: r.spec.code, route: r.path, mounted: handlers.has(a.id) });
    }
  }
  return [...out.values()].sort((a, b) => a.id.localeCompare(b.id));
}

/** Runs a mounted action. Never throws: a failure comes back as `{ ok: false, message }`. */
export async function run(id: string, params?: Record<string, string>): Promise<ActionResult> {
  const fn = handlers.get(id);
  if (!fn) {
    const known = listActions().some((a) => a.id === id);
    return { ok: false, message: known ? `action "${id}" is declared but its page is not open` : `unknown action "${id}"` };
  }
  try {
    const message = await fn(params);
    return { ok: true, message: message ?? `ran ${id}` };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}
