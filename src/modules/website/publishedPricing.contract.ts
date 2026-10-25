/** Shared browser-local published plan inventory; backend mapping remains pending. */
export const PUBLISHED_PRICING_CONTRACT = {
  table: 'plans',
  tables: ['plans'],
  tenantField: 'tenant_id',
  snapshotField: 'frontend_publication',
  dataFields: ['id', 'tenant_id', 'frontend_catalog', 'frontend_publication'],
  subscription: 'local-events',
  refresh: { clock: 'studio-date', events: ['midnight', 'focus', 'visibilitychange'], cleanup: true },
  backendMapping: 'pending',
} as const;
