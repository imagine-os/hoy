import { publicHomeOffer } from './publicHomePricing';
import { usePublishedPricingRows } from './usePublishedPricingRows';

/** W-01 keeps its public-offer view over the shared confirmed pricing read model. */
export function usePublicHomePricing() {
  const prices = usePublishedPricingRows();
  const published = prices.status !== 'ready' || prices.publicationObserved;
  return {
    trial: publicHomeOffer(prices.rows, 'trial', prices.date, published),
    pack: publicHomeOffer(prices.rows, 'pack12', prices.date, published),
    private: publicHomeOffer(prices.rows, 'private', prices.date, published),
  };
}
