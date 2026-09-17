/**
 * M-10 — one row per external system, all `simulated`, with every non-secret field empty so the
 * owner can fill them in before the dev wires the connection. Keys never live here.
 */
import type { IntegrationRow } from '../schema';
import { INTEGRATIONS } from '../../modules/admin/integrationDefs';
import { base } from './catalog';

export function buildIntegrations(): IntegrationRow[] {
  return INTEGRATIONS.map((def, i) => ({
    ...base(`int_${def.key}`, 30 - i),
    key: def.key,
    status: 'simulated' as const,
    config: Object.fromEntries(def.fields.map((f) => [f.name, ''])),
    notes: null,
    updated_by: null,
  }));
}
