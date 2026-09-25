import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export type SiteEdition = 'sanctuary' | 'classic';
const KEY = 'hoy.site.edition';
export const SITE_RELEASE = '2.0';
export function useSiteEdition() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const rawQuery = new URLSearchParams(search).get('version');
  const query = rawQuery === 'classic' || rawQuery === 'sanctuary' ? rawQuery : null;
  useEffect(() => { if (query) { try { localStorage.setItem(KEY, query); } catch { /* unavailable */ } } }, [query]);
  let saved: string | null = null;
  try { saved = localStorage.getItem(KEY); } catch { /* private browsing */ }
  const edition: SiteEdition = (query ?? saved) === 'classic' ? 'classic' : 'sanctuary';
  const setEdition = (next: SiteEdition) => {
    try { localStorage.setItem(KEY, next); } catch { /* private browsing */ }
    const params = new URLSearchParams(search);
    params.set('version', next);
    navigate({ pathname, search: params.toString() });
  };
  return { edition, setEdition };
}
