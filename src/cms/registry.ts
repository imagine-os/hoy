import type { CmsFeatureContract } from './contracts';

// Independent feature branches can carry only their own descriptor; integration discovers their union.
const found = import.meta.glob<{ default: CmsFeatureContract }>('./features/*.ts', { eager: true });
export const cmsFeatures: CmsFeatureContract[] = Object.entries(found)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, module]) => module.default);
