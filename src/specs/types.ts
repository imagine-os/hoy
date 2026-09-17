import type { ReactNode } from 'react';
import type { Role } from '../auth/roles';

/** Bilingual text. Spanish is required; English falls back to Spanish. */
export type Bi = { es: string; en: string };

export type Surface = 'public' | 'customer' | 'teacher' | 'staff' | 'admin' | 'dev' | 'docs';
export type LayoutMode = 'mobile' | 'desktop' | 'auto';

/**
 * The inspector contract. Every routed page carries one of these.
 * `layout` is the ordered list of section/component names the page renders (the layout editor
 * reorders it); `data` are table names from src/data/schema.ts (the inspector links them to the
 * table manager); `logic` are the rules/calculations; `integrations` name external systems.
 */
export interface PageSpec {
  code: string;
  name: Bi;
  purpose: Bi;
  layout: string[];
  data: string[];
  roles: Role[];
  logic: string[];
  integrations: string[];
  states?: string[];
  toggles?: { label: string; on: boolean }[];
  notes?: string[];
  canvasRef?: string;
  /** User story from the canvas, when present. */
  story?: string;
  /** Endpoint sketches from the canvas, when present. */
  api?: string[];
  /** Full layer tree from the canvas (multi-line), when present. */
  layerTree?: string;
}

export interface RouteDef {
  path: string;
  element: ReactNode;
  spec: PageSpec;
  roles: Role[];
  surface: Surface;
  layout?: LayoutMode;
  /** When set, the surface's shell shows this route in its navigation (label is an i18n key). */
  nav?: { labelKey: string; icon: string; order: number; group?: string };
}

/** Marks a spec as complete enough for the specs index badge. */
export function specCompleteness(spec: PageSpec): { score: number; missing: string[] } {
  const checks: [string, boolean][] = [
    ['purpose', !!spec.purpose?.es],
    ['layout', spec.layout.length > 0],
    ['data', spec.data.length > 0],
    ['roles', spec.roles.length > 0],
    ['logic', spec.logic.length > 0],
    ['integrations', spec.integrations.length > 0],
    ['states', !!spec.states && spec.states.length > 0],
  ];
  const missing = checks.filter(([, ok]) => !ok).map(([k]) => k);
  return { score: Math.round(((checks.length - missing.length) / checks.length) * 100), missing };
}
