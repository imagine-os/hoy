import { useEffect, useRef, useState } from 'react';
import type { DataProvider } from '../../../data/types';
import { createCustomerRouteReader, customerRouteIds, type CustomerIdentityProvider, type CustomerRouteIds } from './customerRoute';
/** State is exposed only for its exact current provider and session context, including the first render after a switch. */
export function useCustomerRoute(provider: DataProvider, routeId: string, actorId: string, context: string, active: boolean) {
  const key = JSON.stringify([routeId,actorId,context,active]);
  const reader = useRef(createCustomerRouteReader());
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<{provider:DataProvider;key:string;ids:CustomerRouteIds|null;error:boolean}|null>(null);
  useEffect(() => {
    const current = reader.current;
    if (!active) return () => current.cancel();
    let alive = true;
    setState(null);
    current.read(provider as DataProvider & CustomerIdentityProvider,routeId,actorId).then(ids => {
      if (alive && ids) setState({provider,key,ids,error:false});
    }).catch(() => { if (alive) setState({provider,key,ids:null,error:true}); });
    return () => { alive = false; current.cancel(); };
  }, [provider,key,retry,active,routeId,actorId]);
  const matched = state?.provider === provider && state.key === key ? state : null;
  return {ids:active ? matched?.ids ?? null : customerRouteIds(routeId,null),loading:active&&!matched,error:active&&!!matched?.error,retry:()=>setRetry(n=>n+1)};
}
