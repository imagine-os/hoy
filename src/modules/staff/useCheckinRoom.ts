import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Role } from '../../auth/roles';
import type { ClassSessionRow } from '../../data/schema';
import type { DataProvider } from '../../data/types';
import { canReadCheckinRoom, checkinRoomName } from './checkinRoom';

type RoomState = { status: 'idle' | 'loading' | 'unavailable' | 'error'; name?: never } | { status: 'ready'; name: string };
type Selection = Pick<ClassSessionRow, 'id' | 'tenant_id' | 'room_id'> | undefined;

/** A bounded S-02 reader; does not depend on the separately held shared useTable repair. */
export function useCheckinRoom(data: DataProvider, selected: Selection, actorId: string, role: Role, tenantId: string) {
  const sessionId = selected?.id, sessionTenant = selected?.tenant_id, roomId = selected?.room_id;
  const scope = useMemo(() => ({ data, sessionId, sessionTenant, roomId, actorId, role, tenantId }), [data, sessionId, sessionTenant, roomId, actorId, role, tenantId]);
  const current = useRef(scope);
  current.current = scope;
  const eligible = !!sessionId && !!roomId && sessionTenant === tenantId && canReadCheckinRoom(actorId, role, tenantId);
  const [result, setResult] = useState<{ scope: typeof scope; state: RoomState } | null>(null);
  const [revision, setRevision] = useState(0);
  const retry = useCallback(() => setRevision(n => n + 1), []);
  useEffect(() => {
    if (!eligible) return;
    let alive = true, generation = 0;
    const refresh = () => {
      const request = ++generation;
      if (!alive || current.current !== scope) return;
      setResult({ scope, state: { status: 'loading' } });
      Promise.resolve().then(() => {
        if (!alive || current.current !== scope || request !== generation) throw Error('checkin_room_obsolete');
        return data.list('rooms', { where: { id: roomId, tenant_id: tenantId } });
      }).then(rows => {
        const name = checkinRoomName(rows, roomId!, tenantId);
        if (alive && current.current === scope && request === generation) setResult({ scope, state: name === null ? { status: 'unavailable' } : { status: 'ready', name } });
      }).catch(() => {
        if (alive && current.current === scope && request === generation) setResult({ scope, state: { status: 'error' } });
      });
    };
    refresh();
    let off: (() => void) | undefined;
    try { off = data.subscribe('rooms', refresh); }
    catch { ++generation; setResult({ scope, state: { status: 'error' } }); }
    return () => { alive = false; ++generation; off?.(); };
  }, [data, scope, eligible, roomId, tenantId, revision]);
  // Mask a previous provider/selection/actor/role before the replacement effect runs.
  const state: RoomState = !eligible ? { status: 'idle' } : result?.scope === scope ? result.state : { status: 'loading' };
  return { ...state, retry };
}
