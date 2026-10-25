/** AD-01 browser-only prospective room publication. No backend/schema migration promise. */
export const ROOM_PUBLICATION_CONTRACT = {
  featureIds: ['AD-01'],
  pages: ['M-02', 'M-14', 'S-05', 'S-04'],
  table: 'rooms',
  tables: ['rooms'],
  identityField: 'id',
  tenantField: 'tenant_id',
  publicationField: 'active',
  dataFields: ['id', 'tenant_id', 'name', 'capacity', 'heated', 'notes', 'active'],
  clientExtension: { field: 'active', type: 'optional-boolean', legacyUndefined: 'published', malformed: 'unavailable' },
  newDraftPublished: false,
  writeScope: 'prospective-only',
  views: ['catalog-publication', 'prospective-room-selection'],
  subscription: 'local-events',
  backendMapping: 'pending',
} as const;
