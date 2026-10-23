import type { CatalogPlan } from '../../data/productCatalog';
import { quotePurchaseDate } from '../../data/operationalQuotes';
import { publicHomeOffer } from './publicHomePricing';
import { useEffect, useMemo, useState } from 'react';
import { useTable } from '../../data/DataContext';
import type { BaseRow, ClassSessionRow, FaqEntryRow, MediaAssetRow, ModalityRow, TeacherRow } from '../../data/schema';
import { isSameDay, addDays, startOfDay, studioDate, studioParts } from '../../i18n/format';

/** Sessions joined with modality and teacher — shared by site and customer pages. */
export function useSessionsJoined(filter?: (s: ClassSessionRow) => boolean) {
  const { rows: templates } = useTable<BaseRow & { active: boolean }>('class_templates');
  const { rows: sessions } = useTable<ClassSessionRow>('class_sessions', { orderBy: { column: 'starts_at' } });
  const { rows: modalities } = useTable<ModalityRow>('modalities');
  const { rows: teachers } = useTable<TeacherRow>('teachers');
  return useMemo(() => {
    const mod = new Map(modalities.map((m) => [m.id, m]));
    const tea = new Map(teachers.map((t) => [t.id, t]));
    return sessions.filter((s) => !filter || filter(s)).map((s) => ({ session: s, modality: mod.get(s.modality_id), teacher: tea.get(s.teacher_id), templateActive: templates.find(t => t.id === s.template_id)?.active }));
  }, [sessions, modalities, teachers, templates, filter]);
}

/** Today's classes still to come (`scheduled`); `all` also returns the ones already taught, for a day board. */
export function useTodaySessions(all = false) {
  const today = new Date();
  return useSessionsJoined((s) => isSameDay(s.starts_at, today) && (all ? s.status !== 'cancelled' : s.status === 'scheduled'));
}

export function dayList(n = 7): Date[] {
  return Array.from({ length: n }, (_, i) => { return addDays(startOfDay(new Date()), i); });
}

/** 0051 — every published FAQ entry, grouped by section in `sort` order (W-10 shows them all on one page). */
export function useFaqGroups() {
  const { rows, loading } = useTable<FaqEntryRow>('faq_entries', { where: { published: true }, orderBy: { column: 'sort' } });
  return useMemo(() => {
    const groups: { key: string; title: FaqEntryRow['group_title']; lead: FaqEntryRow['group_lead']; items: FaqEntryRow[] }[] = [];
    for (const r of rows) {
      const g = groups.find((x) => x.key === r.group_key);
      if (g) g.items.push(r);
      else groups.push({ key: r.group_key, title: r.group_title, lead: r.group_lead, items: [r] });
    }
    return { groups, loading };
  }, [rows, loading]);
}

/**
 * 0051 — the class photos the studio has uploaded (M-02d `site.classes.<slug>`, status ready), by class slug.
 * A class without one shows its tone arch (ClassArch); concept photos never stand in for a real class.
 */
export function useClassPhotos(): Map<string, string> {
  const { rows } = useTable<MediaAssetRow>('media_assets');
  return useMemo(() => new Map(rows.filter((a) => a.slot_key.startsWith('site.classes.') && a.status === 'ready' && a.kind === 'photo' && a.url).map((a) => [a.slot_key.slice('site.classes.'.length), a.url as string])), [rows]);
}

/** Current studio date, refreshed at midnight and when a suspended tab resumes. */
export function usePublicHomePricing() {
  const { rows } = useTable<CatalogPlan>('plans');
  const [date, setDate] = useState(() => quotePurchaseDate());
  useEffect(() => {
    let timer = 0;
    const refresh = () => setDate(quotePurchaseDate());
    const tick = () => {
      refresh();
      const now = new Date(), p = studioParts(now);
      const delay = Math.min(60000, Math.max(1, studioDate(p.year, p.month, p.day + 1).getTime() - now.getTime() + 1));
      timer = window.setTimeout(tick, delay);
    };
    tick();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.clearTimeout(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  return { trial: publicHomeOffer(rows, 'trial', date), pack: publicHomeOffer(rows, 'pack12', date), private: publicHomeOffer(rows, 'private', date) };
}
