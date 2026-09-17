import { useCallback, useState } from 'react';
import { useSession } from '../../auth/SessionProvider';
import { useTable } from '../../data/DataContext';
import type { TeacherRow } from '../../data/schema';

const KEY = 'hoyos.teach.as';

/**
 * The teacher profile behind the signed-in user. Coordinators and admins reviewing the teacher app
 * are not linked to a `teachers` row, so they can pick one (kept per browser, demo only).
 */
export function useTeacherSelf() {
  const { user } = useSession();
  const { rows: teachers } = useTable<TeacherRow>('teachers', { orderBy: { column: 'display_name' } });
  const [pick, setPick] = useState<string | null>(() => { try { return localStorage.getItem(KEY); } catch { return null; } });
  const linked = teachers.find((t) => t.user_id === user.id);
  const me = linked ?? teachers.find((t) => t.id === pick);
  const choose = useCallback((id: string | null) => { setPick(id); try { if (id) localStorage.setItem(KEY, id); else localStorage.removeItem(KEY); } catch { /* ignore */ } }, []);
  return { me, linked: !!linked, teachers, choose };
}
