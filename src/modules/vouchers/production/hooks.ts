import { useEffect, useRef, useState } from 'react';
import { useData, useTable } from '../../../data/DataContext';
import type { BaseRow } from '../../../data/schema';
import { CODE_RE, giftProducts, listVouchers, refusalCode, refusalKey, PAYMENT_TABLE, PRODUCT_TABLE, VOUCHER_CHANGES, normalizeCode, writeMayHaveCommitted, type CosVoucher } from './model';

/**
 * Company OS vouchers, newest first, read with `/query` on mount and again whenever the provider reports a change to
 * vouchers or payments (its own writes, the approval batch, a 20-second poll while `useLiveUpdates` watches them).
 * `stale` is true from a change until its read lands: an approval creates the payment's gift voucher in the same batch,
 * so payments must never be joined with a voucher list older than them. A role that may not read vouchers, or a failed
 * read, shows an empty list instead of breaking the screen.
 */
export interface CosVoucherList { vouchers: CosVoucher[]; loading: boolean; stale: boolean; failed: boolean }
export function useCosVouchers(): CosVoucherList {
  const data = useData();
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<CosVoucherList>({ vouchers: [], loading: true, stale: true, failed: false });
  useEffect(() => {
    const changed = () => { setState((s) => ({ ...s, stale: true })); setRevision((n) => n + 1); };
    const offs = [VOUCHER_CHANGES, PAYMENT_TABLE].map((table) => data.subscribe(table, changed));
    return () => offs.forEach((off) => off());
  }, [data]);
  useEffect(() => {
    let alive = true;
    listVouchers(data).then(
      (vouchers) => { if (alive) setState({ vouchers, loading: false, stale: false, failed: false }); },
      () => { if (alive) setState((s) => ({ ...s, loading: false, stale: false, failed: true })); },
    );
    return () => { alive = false; };
  }, [data, revision]);
  return state;
}

export function useGiftProducts() {
  const { rows, loading } = useTable<BaseRow>(PRODUCT_TABLE);
  return { products: giftProducts(rows as unknown as Record<string, unknown>[]), loading };
}

/**
 * One write at a time with an Idempotency-Key: the key is kept for a retry after a lost answer (the write may have
 * committed), and renewed after any answer from the server (a refusal stores nothing), after a success (unless
 * `keepAfterSuccess`: a second submit of the same thing then replays instead of creating another), or (via `renew`)
 * when the user changes what they are sending.
 */
export function useKeyedSubmit({ keepAfterSuccess = false } = {}) {
  const key = useRef(crypto.randomUUID()), lock = useRef(false), kept = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ key: string; code: string | null } | null>(null);
  const renew = () => { key.current = crypto.randomUUID(); };
  async function run<T>(write: (idempotencyKey: string) => Promise<T>): Promise<T | null> {
    if (lock.current) return null;
    lock.current = true; setBusy(true); setError(null);
    try { const out = await write(key.current); kept.current = keepAfterSuccess; if (!keepAfterSuccess) renew(); return out; }
    catch (e) {
      kept.current = writeMayHaveCommitted(e);
      if (!kept.current) renew();
      setError({ key: refusalKey(e), code: refusalCode(e) });
      return null;
    } finally { lock.current = false; setBusy(false); }
  }
  /** Whether the last submit kept its key (a possibly committed write): its body must then go out again unchanged. */
  const keptKey = () => kept.current;
  return { run, busy, error, renew, keptKey, clearError: () => setError(null) };
}

export const codeFromLink = (raw: string | undefined) => { const c = normalizeCode(raw); return CODE_RE.test(c) ? c : ''; };
