import type { ReactNode } from 'react';
import type { Bi } from '../specs/types';

export type Tier = 'atom' | 'molecule' | 'organism' | 'template';

export interface PropDoc { name: string; type: string; required?: boolean; default?: string; description: Bi }
export interface UsageExample { title: Bi; render: () => ReactNode; code?: string }

/**
 * D-02 contract. One per component, next to it, named <Name>.meta.ts.
 * Rule: no component without a meta, no meta without at least one usage.
 */
export interface ComponentMeta {
  tier: Tier;
  name: string;
  description: Bi;
  props: PropDoc[];
  states: string[];
  usages: UsageExample[];
  a11y: Bi[];
  /** Page codes that use it (kept by hand; the library shows it). */
  usedBy?: string[];
}

export function defineMeta(meta: ComponentMeta): ComponentMeta { return meta; }
