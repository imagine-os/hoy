import type { Query } from '../types';
import type { EntityAdapter, Filter } from './mapping';
import { toDay, toInstant } from './dates';

/** Company OS QuerySpec (integration guide §4). */
export interface QuerySpec {
  entity: string;
  filter: Filter;
  sort?: { field: string; dir: 'asc' | 'desc' }[];
  limit?: number;
  offset?: number;
  include?: { field: string; fields?: string[] }[];
}

export const PAGE = 500;

/**
 * A frontend Query → one server QuerySpec plus what the browser still has to do.
 * Every `where` becomes a server filter where the column maps to a field; the full `where` is then re-applied in the browser
 * on the mapped rows (exact, since some value maps are many-to-one). Paging goes to the server only when the server's
 * answer is already exact (plain columns, server sort); otherwise every page is read and the browser slices.
 */
export function planQuery(a: EntityAdapter, q: Query | undefined): { spec: QuerySpec; exact: boolean } {
  const and: Filter[] = [...(a.base ?? [])];
  let exact = true;
  for (const [col, raw] of Object.entries(q?.where ?? {})) {
    if (col === 'tenant_id') continue;
    const c = a.cols[col];
    const field = col === 'id' ? (a.idOf ? null : 'id') : c && !c.derive && !c.browserOnly && c.field ? c.field : null;
    if (!field) { exact = false; continue; }
    if (c?.to) exact = false;
    const map = (v: unknown): unknown[] => {
      let out = v;
      if (c?.kind === 'day') out = toDay(out);
      else if (c?.kind === 'instant') out = toInstant(out);
      if (c?.expand) return c.expand(out);
      return [c?.to ? c.to(out, {}) : out];
    };
    if (Array.isArray(raw) || c?.expand && raw != null) {
      const list = Array.isArray(raw) ? raw : [raw];
      const values = [...new Set(list.filter((v) => v != null).flatMap(map))];
      const withNull = list.some((v) => v == null);
      const inNode = { field, op: 'in', value: values };
      and.push(withNull ? { or: [inNode, { field, op: 'is_null' }] } : inNode);
    } else if (raw == null) and.push({ field, op: 'is_null' });
    else and.push({ field, op: 'eq', value: map(raw)[0] });
  }
  const spec: QuerySpec = { entity: a.entity, filter: and.length ? { and } : { all: true } };
  if (a.include) spec.include = a.include;
  if (q?.orderBy) {
    const c = a.cols[q.orderBy.column];
    const field = q.orderBy.column === 'created_at' || q.orderBy.column === 'id' ? null : c && !c.derive && !c.browserOnly && c.field && c.field !== 'id' && !c.to ? c.field : null;
    if (field) spec.sort = [{ field, dir: q.orderBy.dir ?? 'asc' }];
    else exact = false;
  }
  return { spec, exact };
}
