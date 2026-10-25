import { Button } from '../../components/atom/Button/Button';
import { PriceTable } from '../../components/molecule/PriceTable/PriceTable';
import { faqPrices } from './faqPricing';
import type { useFaqPricing } from './useFaqPricing';

type PricingState = ReturnType<typeof useFaqPricing>;
type Translate = (key: string) => string;

/** Same confirmed generated-price state for website and customer FAQ consumers. */
export function faqPricingLabel(prices: PricingState, t: Translate) {
  return t(prices.status === 'loading' ? 'site.faq.prices.loading' : prices.status === 'error' ? 'site.faq.prices.error' : 'site.faq.prices.unavailable');
}

/** Presentation adapter for existing D-02 PriceTable/FaqAnswer states; no extra data reader. */
export function renderFaqPricing(families: string, prices: PricingState, t: Translate) {
  const projected = faqPrices(prices.rows, families, prices.date, prices.publicationObserved);
  const ready = prices.status === 'ready';
  return <div className="stack-sm">
    <PriceTable items={ready ? projected.items : projected.items.map(item => ({ ...item, description: { es: '', en: '' } }))}
      grouped={families.includes(',')} familyLabels={{ paquetes: t('site.faq.prices.packages') }}
      unavailable={{ ids: ready ? projected.unavailable : projected.items.map(item => item.id), label: faqPricingLabel(prices, t) }} />
    {prices.status === 'error' && <Button variant="secondary" onClick={prices.retry}>{t('core.common.retry')}</Button>}
  </div>;
}
