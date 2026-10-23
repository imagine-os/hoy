import { useEffect, useState } from 'react';
import { useData } from '../../data/DataContext';
import { useSession } from '../../auth/SessionProvider';
import { tenant } from '../../tenant/tenant';
import { emptyHome, homeTables, readHome, type HomeSnapshot } from './homeData';

export function useHomeData() {
  const data = useData(), { user, role, can } = useSession();
  const payments = can('payments.read'), members = can('members.read');
  const key = `${user.id}:${role}:${payments}:${members}`;
  const [revision, setRevision] = useState(0);
  const [now, setNow] = useState(() => new Date());
  const [state, setState] = useState<{ data: typeof data; key: string; status: 'loading' | 'error' | 'ready'; snapshot: HomeSnapshot } | null>(null);
  useEffect(() => {
    let alive = true, request = 0;
    const refresh = async () => {
      const id = ++request;
      setState({ data, key, status: 'loading', snapshot: emptyHome() });
      try {
        const snapshot = await readHome(data, tenant.id, payments, members);
        if (alive && id === request) setState({ data, key, status: 'ready', snapshot });
      } catch {
        if (alive && id === request) setState({ data, key, status: 'error', snapshot: emptyHome() });
      }
    };
    void refresh();
    const off = homeTables.map(table => data.subscribe(table, () => { void refresh(); }));
    // Refresh date-sensitive figures across class boundaries and studio midnight.
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => { alive = false; ++request; off.forEach(stop => stop()); window.clearInterval(timer); };
  }, [data, key, payments, members, revision]);
  const current = state?.data === data && state.key === key ? state : null;
  return { snapshot: current?.snapshot ?? emptyHome(), status: current?.status ?? 'loading', now, retry: () => setRevision(n => n + 1) };
}
