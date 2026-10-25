/** SW-02 public Home inventory only. Local previews do not imply backend publication. */
export const PUBLIC_HOME_PRICING_CONTRACT = {
  featureIds: ['SW-02'],
  pages: ['W-01'],
  table: 'plans',
  tables: ['plans'],
  items: ['trial', 'pack12', 'private'],
  tenantField: 'tenant_id',
  snapshotField: 'frontend_publication',
  dataFields: ['id', 'tenant_id', 'frontend_catalog', 'frontend_publication'],
  view: 'public-offers',
  subscription: 'local-events',
  refresh: { clock: 'studio-date', events: ['midnight', 'focus', 'visibilitychange'], cleanup: true },
  backendMapping: 'pending',
} as const;
