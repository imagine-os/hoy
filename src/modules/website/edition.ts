import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export type SiteEdition = 'sanctuary' | 'classic';
const KEY = 'hoy.site.edition';
export const SITE_RELEASE = '2.3';
export function useSiteEdition() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const rawQuery = new URLSearchParams(search).get('version');
  const query = rawQuery === 'classic' || rawQuery === 'sanctuary' ? rawQuery : null;
  useEffect(() => { if (query) { try { localStorage.setItem(KEY, query); } catch { /* unavailable */ } } }, [query]);
  let saved: string | null = null;
  try { saved = localStorage.getItem(KEY); } catch { /* private browsing */ }
  const edition: SiteEdition = (query ?? saved) === 'classic' ? 'classic' : 'sanctuary';
  const videoQuery = new URLSearchParams(search).get('video');
  const motionQuery = new URLSearchParams(search).get('motion');
  const read = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
  const videoEnabled = (videoQuery ?? read('hoy.site.video')) !== 'off';
  const motion = (motionQuery ?? read('hoy.site.motion')) !== 'off';
  useEffect(() => { try { if (videoQuery) localStorage.setItem('hoy.site.video', videoQuery); if (motionQuery) localStorage.setItem('hoy.site.motion', motionQuery); } catch { /* unavailable */ } }, [videoQuery, motionQuery]);
  const setMotion = (on: boolean) => {
    const params = new URLSearchParams(search); params.set('motion', on ? 'on' : 'off');
    navigate({ pathname, search: params.toString() }, { replace: true });
  };
  const setEdition = (next: SiteEdition, video?: boolean) => {
    try { localStorage.setItem(KEY, next); } catch { /* private browsing */ }
    const params = new URLSearchParams(search);
    params.set('version', next);
    if (video !== undefined) params.set('video', video ? 'on' : 'off');
    navigate({ pathname, search: params.toString() });
  };
  return { edition, setEdition, videoEnabled, motion, setMotion };
}
