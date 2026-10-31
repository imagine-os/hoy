/**
 * The demo user each hub role enters as (review build only), keyed by `HUB_ROLES` id; `public` has none.
 * Split from `./hubMap.data.ts` (Hoy all-roles, lane D) because the production Hub ships that file and
 * demo people must not (vite.config.ts REVIEW_ONLY_DATA keeps this one out). The generator joins them
 * into the published map's `roles[].demoUser` (unchanged contract); `checkHubMapData()` checks them
 * against `src/auth/demoUsers.ts`. Pure data, import-free.
 */
export const HUB_DEMO_USERS: Readonly<Record<string, { id: string; firstName: string }>> = {
  customer: { id: 'usr_cust', firstName: 'Juliana' },
  teacher: { id: 'usr_teach', firstName: 'Carolina' },
  front_desk: { id: 'usr_desk', firstName: 'Camilo' },
  coordinator: { id: 'usr_coord', firstName: 'Valentina' },
  finance: { id: 'usr_fin', firstName: 'Laura' },
  admin: { id: 'usr_admin', firstName: 'Mateo' },
  super_admin: { id: 'usr_super', firstName: 'Sofía' },
  maintenance: { id: 'usr_maint', firstName: 'Rosa' },
  marketing: { id: 'usr_mkt', firstName: 'Camila' },
  developer: { id: 'usr_dev', firstName: 'Julián' },
};
