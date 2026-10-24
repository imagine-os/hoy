import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useData } from '../../data/DataContext';
import type { DataProvider } from '../../data/types';
import type { FrozenSaleQuote } from '../../data/operationalQuotes';
import { readRetainedClassPurchase, retainClassPurchase, recoverRetainedClassPurchase, executeRetainedClassPurchase, acknowledgeRetainedClassPurchase, discardRetainedClassPurchase, type RetainedClassPurchase, type RetainedClassPurchaseResult } from '../../data/retainedClassPurchase';
import { useSession } from '../../auth/SessionProvider';
import { policy } from './policy';

interface State {
  data: DataProvider; userId: string; role: string; route: string; ready: boolean; busy: boolean;
  attempt: RetainedClassPurchase | null; result: RetainedClassPurchaseResult | null; error: string | null;
}
/** Keep uncertain payment identity across navigation; only an explicit acknowledgement clears a proved outcome. */
export function useRetainedClassPurchase() {
  const data = useData(), { user, role } = useSession();
  const location = useLocation(), route = `${location.pathname}${location.search}:${location.key}`;
  const live = useRef({ data, userId: user.id, role, route }); live.current = { data, userId: user.id, role, route };
  const mounted = useRef(true), epoch = useRef(0), activeJob = useRef<symbol | null>(null);
  const empty = useCallback((): State => ({ data, userId: user.id, role, route, ready: false, busy: false, attempt: null, result: null, error: null }), [data, user.id, role, route]);
  const [saved, setSaved] = useState<State>(empty);
  const sameIdentity = useCallback(() => mounted.current && live.current.data === data && live.current.userId === user.id && live.current.role === role && live.current.route === route, [data, user.id, role, route]);
  const capture = useCallback(() => {
    const generation = epoch.current;
    return () => sameIdentity() && epoch.current === generation && data.name === 'mock' && ['customer', 'teacher', 'super_admin'].includes(role);
  }, [sameIdentity, data, role]);
  const message = (error: unknown) => error instanceof Error ? error.message : 'retained_purchase_uncertain';
  const load = useCallback(async () => {
    epoch.current++; const current = capture();
    if (!current()) { if (sameIdentity()) setSaved({ ...empty(), ready: true, error: 'retained_purchase_context' }); return; }
    setSaved(empty());
    try {
      const attempt = readRetainedClassPurchase(user.id);
      const result = attempt ? await recoverRetainedClassPurchase(data, attempt, { isCurrent: current }) : null;
      if (current()) setSaved({ ...empty(), ready: true, attempt, result });
    } catch (error) {
      if (current()) {
        let attempt: RetainedClassPurchase | null = null;
        try { attempt = readRetainedClassPurchase(user.id); } catch { /* Preserve the storage error; never replace a corrupt marker. */ }
        setSaved({ ...empty(), ready: true, attempt, error: message(error) });
      }
    }
  }, [capture, sameIdentity, empty, data, user.id]);
  useLayoutEffect(() => { mounted.current = true; void load(); return () => { mounted.current = false; epoch.current++; }; }, [load]);
  const state = saved.data === data && saved.userId === user.id && saved.role === role && saved.route === route ? saved : empty();
  const pay = async (quote: FrozenSaleQuote): Promise<RetainedClassPurchaseResult | null> => {
    if (!state.ready || activeJob.current) return null;
    const current = capture(); if (!current()) return null;
    const job = Symbol('class-purchase'); activeJob.current = job;
    try {
      // A stale retry must never replace an attempt acknowledged or cancelled elsewhere.
      const attempt = state.attempt ?? retainClassPurchase(user.id, quote);
      if (!current()) return null;
      setSaved({ ...empty(), ready: true, busy: true, attempt });
      // A retained different quote must first be shown, never silently charged by a new-price click.
      if (JSON.stringify(attempt.quote) !== JSON.stringify(quote)) {
        setSaved({ ...empty(), ready: true, attempt, error: 'retained_purchase_review' }); return null;
      }
      const result = await executeRetainedClassPurchase(data, attempt, { isCurrent: current, ivaRate: policy.ivaRate });
      if (!current()) return null;
      setSaved({ ...empty(), ready: true, attempt: readRetainedClassPurchase(user.id) ?? attempt, result });
      return result;
    } catch (error) {
      if (current()) {
        let attempt = state.attempt;
        try { attempt = readRetainedClassPurchase(user.id); } catch { /* Keep uncertain storage blocked. */ }
        setSaved({ ...empty(), ready: true, attempt, error: message(error) });
      }
      return null;
    } finally {
      if (activeJob.current === job) {
        activeJob.current = null;
        if (mounted.current) setSaved(previous => ({ ...previous, busy: false }));
      }
    }
  };
  const finish = async (): Promise<boolean> => {
    if (activeJob.current) return false;
    if (!state.attempt) return !state.error;
    if (!state.result) return false;
    const current = capture(); if (!current()) return false;
    try {
      await acknowledgeRetainedClassPurchase(data, state.attempt, state.result, { isCurrent: current });
      if (!current()) return false;
      setSaved({ ...empty(), ready: true }); return true;
    } catch (error) { if (current()) setSaved(previous => ({ ...previous, error: message(error) })); return false; }
  };
  const discard = async (): Promise<boolean> => {
    if (activeJob.current || !state.attempt || state.result) return false;
    epoch.current++; const current = capture(); if (!current()) return false;
    try {
      await discardRetainedClassPurchase(data, state.attempt, { isCurrent: current });
      if (!current()) return false;
      setSaved({ ...empty(), ready: true }); return true;
    } catch { if (current()) await load(); return false; }
  };
  // Closing an uncertain sheet cancels the active generation and retains its marker for read-only recovery.
  const cancel = () => { epoch.current++; void load(); };
  return { ...state, busy: state.busy || activeJob.current !== null, pay, finish, discard, cancel, refresh: load };
}
