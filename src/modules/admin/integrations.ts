/** M-10 hooks over the `integrations` table. The definitions (fields, checklists) are in ./integrationDefs.ts. */
import { useCallback, useMemo } from 'react';
import { useData, useTable } from '../../data/DataContext';
import type { IntegrationKey, IntegrationRow, IntegrationStatus } from '../../data/schema';
export { INTEGRATIONS, INTEGRATION_STATUSES, filledCount, integrationDef, type IntegrationDef, type IntegrationField } from './integrationDefs';

/** The `integrations` rows, keyed, plus a save that merges config and returns the before/after pair for audit. */
export function useIntegrations() {
  const data = useData();
  const { rows, loading } = useTable<IntegrationRow>('integrations');
  const byKey = useMemo(() => new Map(rows.map((r) => [r.key, r])), [rows]);
  const save = useCallback(async (row: IntegrationRow, patch: Partial<Pick<IntegrationRow, 'status' | 'config' | 'notes'>>, by: string | null) => {
    const before = { status: row.status, config: row.config, notes: row.notes };
    const after = { status: patch.status ?? row.status, config: patch.config ?? row.config, notes: patch.notes === undefined ? row.notes : patch.notes };
    const updated = await data.update<IntegrationRow>('integrations', row.id, { ...after, updated_by: by });
    return { before, after, updated };
  }, [data]);
  return { rows, byKey, loading, save };
}

/** One integration's status, for the badges other screens print (M-09a's "simulado"). */
export function useIntegrationStatus(key: IntegrationKey): IntegrationStatus {
  const { byKey } = useIntegrations();
  return byKey.get(key)?.status ?? 'simulated';
}
