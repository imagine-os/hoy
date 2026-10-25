import { FAQ_PRICING_CONTRACT } from '../website/faqPricing.contract';
/** AD-01 customer FAQ projection; uses existing scoped reads and shared published pricing. */
export const CUSTOMER_FAQ_PRICING_CONTRACT = {
  ...FAQ_PRICING_CONTRACT,
  featureIds: ['AD-01'],
  pages: ['C-14', 'C-15'],
  views: ['generated-prices'],
  faqRead: {
    table: 'faq_entries',
    tenantField: 'tenant_id',
    publishedField: 'published',
    published: true,
    orderField: 'sort',
    pageField: 'page',
  },
} as const;
