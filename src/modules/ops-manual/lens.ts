// The manual's lens (0031): whose manual you are reading. The signed-in role by default; `?as=<role>` (or
// `?as=all`) in the hash query switches it — the same key the hub map's embed pattern uses, so a framed
// manual opened with `?as=teacher` already reads as the teacher's.
import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSession } from '../../auth/SessionProvider';
import type { Role } from '../../auth/roles';
import { isLensRole } from './audience';

export type Lens = Role | 'all';

export function useLens(): { lens: Lens; explicit: boolean; setLens: (l: Lens) => void; link: (path: string) => string } {
  const { role } = useSession();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const asParam = useMemo(() => new URLSearchParams(search).get('as'), [search]);
  const explicit = asParam === 'all' || (!!asParam && isLensRole(asParam));
  const lens: Lens = explicit ? (asParam as Lens) : isLensRole(role) ? role : 'all';
  const setLens = useCallback((l: Lens) => {
    const q = new URLSearchParams(search);
    q.set('as', l);
    navigate({ pathname, search: `?${q.toString()}` }, { replace: true });
  }, [navigate, pathname, search]);
  /** A manual link that keeps an explicitly chosen lens. */
  const link = useCallback((path: string) => (explicit ? `${path}?as=${asParam}` : path), [explicit, asParam]);
  return { lens, explicit, setLens, link };
}
