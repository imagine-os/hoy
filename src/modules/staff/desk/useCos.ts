import { useCallback, useEffect, useState } from 'react';
import { useData } from '../../../data/DataContext';
import { cosRequest, errorCode, type CosRequest } from './wire';

/** A Company OS row as `/query` returns it: id and stamps plus the entity's fields. */
export type CosRow = { id: string; created_at?: string; updated_at?: string } & Record<string, unknown>;
export interface QuerySpec { entity: string; filter?: unknown; sort?: { field: string; dir?: 'asc' | 'desc' }[]; limit?: number; offset?: number; aggregate?: unknown }

/** Every row of a query, 500 at a time (the API's page size). */
export async function queryAll(request: CosRequest, spec: QuerySpec, max = 5000): Promise<CosRow[]> {
  if (spec.aggregate) return (await request<{ data: CosRow[] }>('POST', '/query', spec)).data;
  const out: CosRow[] = [];
  for (let offset = 0; offset < max; offset += 500) {
    const page = (await request<{ data: CosRow[] }>('POST', '/query', { ...spec, limit: 500, offset })).data;
    out.push(...page);
    if (page.length < 500) break;
  }
  return out;
}

/**
 * Admin reads in Company OS entity terms (the production build): a set of named queries, re-run by `reload()` after
 * each own write. `request` is null outside production; the caller then shows the review screen instead.
 */
export function useCosQueries<K extends string>(specs: Record<K, QuerySpec>, deps: unknown[] = []) {
  const data = useData();
  const request = cosRequest(data);
  const [state, setState] = useState<{ rows: Record<K, CosRow[]> | null; loading: boolean; error: string | null }>({ rows: null, loading: !!request, error: null });
  const [version, setVersion] = useState(0);
  const key = JSON.stringify(specs);
  useEffect(() => {
    if (!request) return;
    let alive = true;
    setState(s => ({ ...s, loading: true, error: null }));
    const names = Object.keys(specs) as K[];
    Promise.all(names.map(n => queryAll(request, specs[n])))
      .then(results => { if (alive) setState({ rows: Object.fromEntries(names.map((n, i) => [n, results[i]])) as Record<K, CosRow[]>, loading: false, error: null }); })
      .catch(e => { if (alive) setState(s => ({ ...s, loading: false, error: errorCode(e) })); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, key, version, ...deps]);
  const reload = useCallback(() => setVersion(v => v + 1), []);
  return { ...state, request, reload };
}
