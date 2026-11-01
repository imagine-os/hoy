import { useEffect, useState } from 'react';
import { useSession } from '../../auth/SessionProvider';
import { cosJson } from '../../auth/cosRequest';
import type { ViewAsRead } from '../../auth/viewAs';
import { PRODUCTION_BUILD } from '../../config/launch';
import { loadHubPeople, type HubPeople } from './hubPeople';

/** A Company OS read for the people lookup: the parsed body, or a throw with the refusal's code (as ProductionSession). */
const cosRead: ViewAsRead = async (method, path, body) => {
  const res = await cosJson(path as `/${string}`, { method, body });
  if (res.status !== 200) {
    const code = (res.body as { error?: unknown } | null)?.error;
    throw Object.assign(new Error(`hub_people_${res.status}`), { code: typeof code === 'string' && /^[a-z][a-z0-9_]{0,63}$/.test(code) ? code : res.status === 401 || res.status === 403 ? 'forbidden' : 'view_as_unavailable' });
  }
  return res.body;
};

/** Production: the real person of every viewable role, once the super admin's session is ready (null while loading). */
function useRealHubPeople(): HubPeople | null {
  const { isSuperAdmin, status, user } = useSession();
  const [people, setPeople] = useState<{ viewer: string; people: HubPeople } | null>(null);
  useEffect(() => {
    if (!isSuperAdmin || status !== 'ready') return;
    let alive = true;
    loadHubPeople(cosRead, user.id).then((p) => { if (alive) setPeople({ viewer: user.id, people: p }); });
    return () => { alive = false; };
  }, [isSuperAdmin, status, user.id]);
  return people && people.viewer === user.id ? people.people : null;
}

/** The review build names its demo users instead (HubPage), so it reads nobody. */
const useNoPeople = (): HubPeople | null => null;

export const useHubPeople = PRODUCTION_BUILD ? useRealHubPeople : useNoPeople;
