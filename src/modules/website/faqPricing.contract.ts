import { PUBLISHED_PRICING_CONTRACT } from './publishedPricing.contract';
/** Generated W-10 prices only. Authored answers and customer FAQ rendering are separate. */
export const FAQ_PRICING_CONTRACT = {
  ...PUBLISHED_PRICING_CONTRACT,
  featureIds: ['SW-02'],
  pages: ['W-10'],
  tables: ['faq_entries', ...PUBLISHED_PRICING_CONTRACT.tables],
  families: ['bienvenida', 'paquetes', 'privadas', 'regalos'],
  views: ['generated-prices', 'search', 'json-ld'],
  inputs: {
    plans: [...PUBLISHED_PRICING_CONTRACT.dataFields, 'active'],
    faq_entries: ['id', 'tenant_id', 'published', 'question', 'answer', 'group_key', 'group_title', 'group_lead', 'page', 'sort'],
  },
} as const;
