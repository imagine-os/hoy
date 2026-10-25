import { PUBLISHED_PRICING_CONTRACT } from './publishedPricing.contract';
/** SW-02 Home inventory only; shared reader changes also require the Home regressions. */
export const PUBLIC_HOME_PRICING_CONTRACT = {
  ...PUBLISHED_PRICING_CONTRACT,
  featureIds: ['SW-02'],
  pages: ['W-01'],
  items: ['trial', 'pack12', 'private'],
  view: 'public-offers',
} as const;
