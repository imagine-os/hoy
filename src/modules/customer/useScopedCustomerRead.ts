import { useCallback, useEffect, useState } from 'react';
import { useData } from '../../data/DataContext';
import { useSession } from '../../auth/SessionProvider';
import type { BaseRow } from '../../data/schema';
import type { Query } from '../../data/types';
import { tenant } from '../../tenant/tenant';

/** Private customer reads never reuse rows from another provider, actor, role or tenant. */
export function useScopedCustomerRead<T extends BaseRow>(table: string, query?: Query, owned = false) {
  const data = useData(), { user, role } = useSession();
  const tenantId = tenant.id, actorId = user.id;
  const enabled = typeof tenantId === 'string' && tenantId.length > 0 && typeof actorId === 'string' && actorId.length > 0 && user.role !== 'public' && role !== 'public';
  const serialized = JSON.stringify(query ?? {});
  const key = JSON.stringify([tenantId, actorId, user.role, role, table, serialized, owned]);
  const [revision, setRevision] = useState(0);
  const retry = useCallback(() => setRevision(n => n + 1), []);
  const [state, setState] = useState<{ data: typeof data; key: string; rows: T[]; error: boolean } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true, generation = 0;
    const load = async () => {
      const request = ++generation;
      setState(null);
      try {
        const q = JSON.parse(serialized) as Query;
        const rows = await data.list<T>(table, { ...q, where: { ...q.where, tenant_id: tenantId, ...(owned ? { user_id: actorId } : {}) } });
        const scoped = rows.filter(row => row.tenant_id === tenantId && (!owned || row.user_id === actorId));
        if (alive && request === generation) setState({ data, key, rows: scoped, error: false });
      } catch { if (alive && request === generation) setState({ data, key, rows: [], error: true }); }
    };
    void load();
    const stop = data.subscribe(table, () => void load());
    return () => { alive = false; stop(); };
  }, [data, key, serialized, table, owned, tenantId, actorId, enabled, revision]);
  const current = enabled && state?.data === data && state.key === key ? state : null;
  return { rows: current?.rows ?? [], loading: enabled && !current, error: current?.error ?? false, retry };
}
