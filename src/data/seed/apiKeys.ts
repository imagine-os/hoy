/**
 * 0039 — D-07 seed: two example developer keys. Only the display prefix and the SHA-256 hash are stored,
 * exactly as a real key would be; the raw values were throwaway strings generated once and never kept,
 * so nobody knows them — by design (D-0015). They cannot authenticate anything (there is no server yet).
 */
import type { ApiKeyRow } from '../schema';
import { MS } from '../../i18n/format';
import { NOW, base, iso } from './catalog';

export function buildApiKeys(): ApiKeyRow[] {
  return [
    {
      ...base('key_site_widget', 12), name: 'Widget de horario (sitio)', prefix: 'hoy_live_1CmC',
      key_hash: '71c5e5c2e84f8abcc0da7be533e9a3927e40aff386410fc54201a673aa0a7203',
      scopes: ['classes.read', 'hours.read'], environment: 'live', created_by: 'usr_dev',
      last_used_at: null, expires_at: null, revoked_at: null, replaces_id: null,
    },
    {
      ...base('key_sandbox', 4), name: 'Pruebas de integración', prefix: 'hoy_test_OqvV',
      key_hash: '527725ed56299a27b430b9d4e8b2560a7b810062d504361f0b6e3bee33b24f17',
      scopes: ['classes.read', 'bookings.read', 'bookings.write', 'webhooks.receive'], environment: 'test', created_by: 'usr_dev',
      last_used_at: null, expires_at: iso(new Date(NOW.getTime() + 60 * MS.day)), revoked_at: null, replaces_id: null,
    },
  ];
}
