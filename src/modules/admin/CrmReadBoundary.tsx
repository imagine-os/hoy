import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { DataProviderRoot, useData } from '../../data/DataContext';
import { applyQuery, type DataProvider } from '../../data/types';
import type { BaseRow } from '../../data/schema';
import { useI18n } from '../../i18n/I18nProvider';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { Button } from '../../components/atom/Button/Button';

const LIST = ['users', 'profiles', 'user_roles', 'memberships', 'plans', 'bookings', 'class_ledger', 'payments', 'vouchers'];
const DETAIL = [...LIST, 'message_log', 'consents', 'class_sessions', 'practice_goals', 'tenants'];
type Snapshot = Record<string, BaseRow[]>;

/** CRM-only read barrier: publish complete reads together; never turn a rejected balance into zero.
 * Mutations still use the original provider. No data is persisted or repaired here.
 */
export function CrmReadBoundary({ children, detail = false }: { children: ReactNode; detail?: boolean }) {
  const source = useData();
  const { t } = useI18n();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ source: DataProvider; detail: boolean; snapshot?: Snapshot; error?: boolean; loading: boolean }>();
  useEffect(() => {
    let alive = true, generation = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tables = detail ? DETAIL : LIST;
    const refresh = async () => {
      const request = ++generation;
      clearTimeout(timer);
      setState(previous => ({ source, detail, snapshot: previous?.source === source && previous.detail === detail ? previous.snapshot : undefined, loading: true }));
      timer = setTimeout(() => {
        if (alive && request === generation) {
          generation++;
          setState(previous => ({ ...previous!, source, detail, loading: false, error: true }));
        }
      }, 12000);
      try {
        const entries = await Promise.all(tables.map(async table => [table, await source.list(table)] as const));
        if (alive && request === generation) {
          clearTimeout(timer);
          setState({ source, detail, snapshot: Object.fromEntries(entries), loading: false });
        }
      } catch {
        if (alive && request === generation) {
          clearTimeout(timer);
          setState(previous => ({ ...previous!, source, detail, loading: false, error: true }));
        }
      }
    };
    const off = source.subscribe('*', event => { if (tables.includes(event.table) || event.table === '*') void refresh(); });
    void refresh();
    return () => { alive = false; generation++; clearTimeout(timer); off(); };
  }, [source, detail, attempt]);
  const snapshot = state?.source === source && state.detail === detail ? state.snapshot : undefined;
  // Existing shared joins can safely read this committed snapshot without uncaught read rejections.
  const reader = useMemo(() => snapshot ? new Proxy(source, {
    get(target, prop) {
      if (prop === 'list') return (table: string, query?: Parameters<DataProvider['list']>[1]) => table in snapshot ? Promise.resolve(applyQuery(snapshot[table], query)) : target.list(table, query);
      if (prop === 'peek') return (table: string, query?: Parameters<DataProvider['list']>[1]) => table in snapshot ? applyQuery(snapshot[table], query) : target.peek?.(table, query);
      const value = Reflect.get(target, prop);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }) : undefined, [source, snapshot]);
  const loading = !state || state.source !== source || state.detail !== detail || state.loading;
  const error = !loading && state?.error;
  return <>
    {(loading || error) && <EmptyState tone={error ? 'error' : 'loading'} title={t(error ? 'admin.crm.read.error' : 'core.common.loading')} body={t('admin.crm.read.body')} action={<Button variant="secondary" onClick={() => setAttempt(n => n + 1)}>{t('admin.crm.read.retry')}</Button>} />}
    {reader && <div hidden={!!(loading || error)}><DataProviderRoot provider={reader}>{children}</DataProviderRoot></div>}
  </>;
}
