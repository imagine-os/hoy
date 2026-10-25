/** AD-01 S-02 display inventory. This is not a room-publication or server authorization rule. */
export const CHECKIN_ROOM_CONTRACT = {
  featureIds: ['AD-01'],
  pages: ['S-02'],
  route: '/staff/checkin',
  table: 'rooms',
  tables: ['rooms'],
  identityField: 'id',
  tenantField: 'tenant_id',
  dataFields: ['id', 'tenant_id', 'name'],
  sessionFields: ['id', 'tenant_id', 'room_id'],
  roles: ['super_admin', 'admin', 'coordinator', 'front_desk'],
  states: ['idle', 'loading', 'ready', 'unavailable', 'error'],
  mode: 'retained-reference-label',
  view: 'selected-class-room-label',
  writes: false,
  subscription: 'local-events',
  backendMapping: 'pending',
} as const;
