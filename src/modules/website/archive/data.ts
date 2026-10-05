import type { BaseRow, ModalityRow } from '../../../data/schema';
import { applyQuery, type DataProvider, type Query } from '../../../data/types';
import { teachers, modalities, rooms } from './catalog';

/** A frozen, read-only website projection. No archived values ever enter the operational store. */
export function archiveProvider(current: DataProvider): DataProvider {
  const rows: Record<string, BaseRow[]> = { teachers, modalities, rooms, media_assets: [], reviews: [], class_sessions: [], plans: [], page_layouts: [] };
  const peek = <T extends BaseRow>(table: string, query?: Query): T[] => table in rows ? applyQuery(rows[table] as T[], query) : current.peek?.<T>(table, query) ?? [];
  const denied = async (): Promise<never> => { throw new Error('Archived design previews are read-only'); };
  return {
    name: 'website-archive-46beed7', peek,
    list: async <T extends BaseRow>(table: string, query?: Query) => table in rows ? [...peek<T>(table, query)] : current.list<T>(table, query),
    get: async <T extends BaseRow>(table: string, id: string) => table in rows ? peek<T>(table, { where: { id } })[0] ?? null : current.get<T>(table, id),
    subscribe: (table, cb) => table in rows ? () => undefined : current.subscribe(table, cb),
    insert: denied, update: denied, remove: denied,
  };
}
export const useVisibleModalities = (rows: ModalityRow[]) => rows;
