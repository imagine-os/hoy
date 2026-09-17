import type { ComponentMeta, Tier } from './meta';

// Collects every <Name>.meta.ts under src/components. Nobody edits a central list.
const modules = import.meta.glob<{ default?: ComponentMeta; meta?: ComponentMeta }>('../components/**/*.meta.ts', { eager: true });

export const componentLibrary: ComponentMeta[] = Object.entries(modules)
  .map(([, m]) => m.default ?? m.meta)
  .filter((m): m is ComponentMeta => !!m)
  .sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier) || a.name.localeCompare(b.name));

export const TIER_ORDER: Tier[] = ['atom', 'molecule', 'organism', 'template'];

export function byTier(tier: Tier): ComponentMeta[] { return componentLibrary.filter((m) => m.tier === tier); }
