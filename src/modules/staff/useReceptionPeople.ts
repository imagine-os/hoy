import { useEffect, useMemo, useState } from 'react';
import { useData } from '../../data/DataContext';
import { useSession } from '../../auth/SessionProvider';
import { tenant } from '../../tenant/tenant';
import { emptyReceptionPeople, hasReceptionTenant, projectReceptionPeople, readReceptionPeople, receptionPeopleTables, type ReceptionPeopleRows } from './receptionSearch';

/** Reception-only read join. Do not change CRM/inbox/provider contracts through this seam. */
export function useReceptionPeople(tenantId: string | null | undefined = tenant.id) {
  const data = useData(), { user, role } = useSession();
  const allowed = ['super_admin', 'admin', 'coordinator', 'front_desk'].includes(role) && hasReceptionTenant(tenantId);
  const key = JSON.stringify([tenantId, user.id, role]);
  const [fetched, setFetched] = useState<{ key: string; data: typeof data; rows: ReceptionPeopleRows } | null>(null);
  const snapshot = useMemo(() => {
    if (!allowed || !data.peek) return emptyReceptionPeople();
    return Object.fromEntries(receptionPeopleTables.map(table => [table, data.peek!(table, { where: { tenant_id: tenantId } }) ?? []])) as ReceptionPeopleRows;
  }, [data, key, allowed, tenantId]);
  useEffect(() => {
    if (!allowed) return;
    let alive = true, request = 0;
    const refresh = async () => {
      const id = ++request;
      try {
        const rows = await readReceptionPeople(data, tenantId);
        if (alive && id === request) setFetched({ key, data, rows });
      } catch {
        // Failed reads never restore another scope's people or expose a partial join.
        if (alive && id === request) setFetched({ key, data, rows: emptyReceptionPeople() });
      }
    };
    void refresh();
    const off = receptionPeopleTables.map(table => data.subscribe(table, () => { void refresh(); }));
    return () => { alive = false; ++request; off.forEach(stop => stop()); };
  }, [data, key, allowed, tenantId]);
  const current = fetched?.key === key && fetched.data === data ? fetched.rows : snapshot;
  const people = useMemo(() => allowed ? projectReceptionPeople(current, tenantId) : [], [allowed, current, tenantId]);
  return { people, byId: new Map(people.map(person => [person.id, person])), loading: allowed && !data.peek && fetched?.key !== key };
}
