import { useMemo } from 'react';
import { useTable } from '../../data/DataContext';
import type { ClassSessionRow, ModalityRow, TeacherRow } from '../../data/schema';
import { isSameDay } from '../../i18n/format';

/** Sessions joined with modality and teacher — shared by site and customer pages. */
export function useSessionsJoined(filter?: (s: ClassSessionRow) => boolean) {
  const { rows: sessions } = useTable<ClassSessionRow>('class_sessions', { orderBy: { column: 'starts_at' } });
  const { rows: modalities } = useTable<ModalityRow>('modalities');
  const { rows: teachers } = useTable<TeacherRow>('teachers');
  return useMemo(() => {
    const mod = new Map(modalities.map((m) => [m.id, m]));
    const tea = new Map(teachers.map((t) => [t.id, t]));
    return sessions.filter((s) => !filter || filter(s)).map((s) => ({ session: s, modality: mod.get(s.modality_id), teacher: tea.get(s.teacher_id) }));
  }, [sessions, modalities, teachers, filter]);
}

export function useTodaySessions() {
  const today = new Date();
  return useSessionsJoined((s) => isSameDay(s.starts_at, today) && s.status === 'scheduled');
}

export function dayList(n = 7): Date[] {
  return Array.from({ length: n }, (_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i); return d; });
}
