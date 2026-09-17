import { useCallback, useMemo } from 'react';
import type { PageSpec } from '../specs/types';
import { useData, useTable } from '../data/DataContext';
import type { PageLayoutRow } from '../data/schema';
import { useSession } from '../auth/SessionProvider';

/**
 * Section order for a page: the stored `page_layouts` row when present, else the spec's `layout`.
 * Pages render `sections` in order and skip anything in `hidden`. The layout editor writes here.
 *
 *   const { sections, isVisible } = useLayout(spec);
 *   {sections.map(name => SECTIONS[name] && <Fragment key={name}>{SECTIONS[name]()}</Fragment>)}
 */
export function useLayout(spec: PageSpec) {
  const data = useData();
  const { user } = useSession();
  const { rows } = useTable<PageLayoutRow>('page_layouts', { where: { page_code: spec.code } });
  const stored = rows[0];

  const sections = useMemo(() => {
    const def = spec.layout;
    if (!stored) return def;
    // keep stored order, append anything new the spec gained since, drop names the spec lost
    const kept = stored.sections.filter((s) => def.includes(s));
    return [...kept, ...def.filter((s) => !kept.includes(s))];
  }, [spec.layout, stored]);
  const hidden = useMemo(() => new Set(stored?.hidden ?? []), [stored]);

  const save = useCallback(async (next: string[], nextHidden?: string[]) => {
    const patch = { page_code: spec.code, sections: next, hidden: nextHidden ?? [...hidden], updated_by: user.id };
    if (stored) await data.update('page_layouts', stored.id, patch);
    else await data.insert('page_layouts', patch);
  }, [data, spec.code, stored, hidden, user.id]);

  const reset = useCallback(async () => { if (stored) await data.remove('page_layouts', stored.id); }, [data, stored]);

  return { sections, hidden, isVisible: (name: string) => !hidden.has(name), save, reset, isCustom: !!stored };
}
