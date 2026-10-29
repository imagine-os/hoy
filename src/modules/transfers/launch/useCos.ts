import { useCallback, useEffect, useRef, useState } from 'react';
import { useData } from '../../../data/DataContext';
import { cosOf, errorCode, newIdempotencyKey, outcomeUnknown, type CosPort } from './cos';

export function useCos(): CosPort | null { return cosOf(useData()); }

export type Load<T> = { status: 'loading' } | { status: 'error'; code: string } | { status: 'ready'; value: T };

/**
 * One read for a screen: loading / error with its code / ready, a reload, and optional polling (the pending list
 * polls every 20 s, the contract's stand-in for a change feed). A stale answer never overwrites a newer one.
 */
export function useLoad<T>(read: ((cos: CosPort) => Promise<T>) | null, deps: unknown[], pollMs = 0): { state: Load<T>; reload: () => void } {
  const cos = useCos();
  const [state, setState] = useState<Load<T>>({ status: 'loading' });
  const [tick, setTick] = useState(0);
  const seq = useRef(0);
  // New inputs (another date range, another payment) show loading, never the previous answer; a poll or reload keeps it.
  const inputs = JSON.stringify(deps);
  const lastInputs = useRef<string | null>(null);
  useEffect(() => {
    if (!cos) { setState({ status: 'error', code: 'disconnected' }); return; }
    if (lastInputs.current !== inputs) { lastInputs.current = inputs; setState({ status: 'loading' }); }
    if (!read) { seq.current++; return; }
    const id = ++seq.current;
    read(cos).then((value) => { if (id === seq.current) setState({ status: 'ready', value }); }, (e) => { if (id === seq.current) setState({ status: 'error', code: errorCode(e) }); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cos, tick, ...deps]);
  useEffect(() => {
    if (!pollMs) return;
    const t = setInterval(() => setTick((n) => n + 1), pollMs);
    return () => clearInterval(t);
  }, [pollMs]);
  useEffect(() => () => { seq.current++; }, []);
  return { state, reload: useCallback(() => setTick((n) => n + 1), []) };
}

/**
 * The idempotency key of one user action (PG-09). It lives until the action succeeds, so a double tap or a retry
 * replays the first answer. Changing the inputs starts a new action (a new key), except after an answer was lost:
 * then the first attempt may have been written, so the inputs stay locked and only a same-key retry is allowed.
 */
export class ActionKey {
  key = newIdempotencyKey();
  uncertain = false;
  succeeded() { this.key = newIdempotencyKey(); this.uncertain = false; }
  failed(e: unknown) { this.uncertain = outcomeUnknown(e); }
  /** Returns false (and keeps the key) when the last attempt's outcome is unknown. */
  renew(): boolean { if (this.uncertain) return false; this.key = newIdempotencyKey(); return true; }
}

export function useAction() {
  const action = useRef(new ActionKey());
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const run = useCallback(async <T,>(fn: (key: string) => Promise<T>): Promise<T | undefined> => {
    if (running.current) return undefined;
    running.current = true; setBusy(true); setError(null);
    try { const out = await fn(action.current.key); action.current.succeeded(); setUncertain(false); return out; }
    catch (e) { action.current.failed(e); setUncertain(action.current.uncertain); setError(errorCode(e)); return undefined; }
    finally { running.current = false; setBusy(false); }
  }, []);
  /** Call when the form's inputs change: a changed body under the old key would be refused `idempotency_conflict`. */
  const renew = useCallback(() => { if (!running.current) action.current.renew(); }, []);
  /** While true, forms lock their inputs and offer only "retry" (same key, same body). */
  return { run, busy, error, setError, renew, uncertain };
}
