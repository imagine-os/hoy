import { useEffect, useMemo, useState } from 'react';
import { useData } from '../../data/DataContext';
import { useSession } from '../../auth/SessionProvider';
import { tenant } from '../../tenant/tenant';
import { emptyReceptionPeople, hasReceptionTenant, projectReceptionPeople, readReceptionPeople, receptionPeopleTables, type ReceptionPeopleRows } from './receptionSearch';

/** Reception-only confirmed reads. A refresh clears candidates until the whole scoped join succeeds. */
export function useReceptionPeople(tenantId: string | null | undefined = tenant.id) {
  const data = useData(), { user, role } = useSession();
  const allowed = ['super_admin', 'admin', 'coordinator', 'front_desk'].includes(role) && hasReceptionTenant(tenantId);
  const [revision, setRevision] = useState(0);
  const key = JSON.stringify([tenantId, user.id, role, revision]);
  const [fetched, setFetched] = useState<{ key: string; data: typeof data; status: 'loading' | 'ready' | 'error'; rows: ReceptionPeopleRows } | null>(null);
  useEffect(() => {
    if (!allowed) return;
    let alive = true, request = 0;
    const refresh = async () => {
      if (!alive) return;
      const id = ++request;
      setFetched({ key, data, status: 'loading', rows: emptyReceptionPeople() });
      try {
        const rows = await readReceptionPeople(data, tenantId);
        if (alive && id === request) setFetched({ key, data, status: 'ready', rows });
      } catch {
        if (alive && id === request) setFetched({ key, data, status: 'error', rows: emptyReceptionPeople() });
      }
    };
    void refresh();
    const off = receptionPeopleTables.map(table => data.subscribe(table, () => { void refresh(); }));
    return () => { alive = false; ++request; off.forEach(stop => stop()); };
  }, [data, key, allowed, tenantId]);
  const current = fetched?.key === key && fetched.data === data ? fetched : null;
  const status = allowed ? current?.status ?? 'loading' : 'disabled';
  const people = useMemo(() => status === 'ready' && current ? projectReceptionPeople(current.rows, tenantId) : [], [status, current, tenantId]);
  return { people, byId: new Map(people.map(person => [person.id, person])), status, loading: status === 'loading', retry: () => setRevision(n => n + 1) };
}
