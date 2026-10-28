import { useRef, useState } from 'react';
import { useTable } from '../../../data/DataContext';
import type { BaseRow } from '../../../data/schema';
import { CODE_RE, isCosVoucher, giftProducts, refusalCode, refusalKey, PRODUCT_TABLE, VOUCHER_TABLE, VOUCHER_REFUSALS, normalizeCode, type CosVoucher } from './model';

/** Company OS vouchers only (rows of another shape, e.g. the review build's demo rows, are skipped). Newest first. */
export function useCosVouchers(): CosVoucher[] {
  const { rows } = useTable<BaseRow>(VOUCHER_TABLE);
  return rows.filter(isCosVoucher).sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
}

export function useGiftProducts() {
  const { rows, loading } = useTable<BaseRow>(PRODUCT_TABLE);
  return { products: giftProducts(rows as unknown as Record<string, unknown>[]), loading };
}

/**
 * One write at a time with an Idempotency-Key: the key is kept for a retry after a lost answer, and renewed after a
 * server refusal, after a success (unless `keepAfterSuccess`: a second submit of the same thing then replays instead of
 * creating another), or (via `renew`) when the user changes what they are sending.
 */
export function useKeyedSubmit({ keepAfterSuccess = false } = {}) {
  const key = useRef(crypto.randomUUID()), lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ key: string; code: string | null } | null>(null);
  const renew = () => { key.current = crypto.randomUUID(); };
  async function run<T>(write: (idempotencyKey: string) => Promise<T>): Promise<T | null> {
    if (lock.current) return null;
    lock.current = true; setBusy(true); setError(null);
    try { const out = await write(key.current); if (!keepAfterSuccess) renew(); return out; }
    catch (e) {
      const code = refusalCode(e);
      if (code && (VOUCHER_REFUSALS as readonly string[]).includes(code)) renew();
      setError({ key: refusalKey(e), code });
      return null;
    } finally { lock.current = false; setBusy(false); }
  }
  return { run, busy, error, renew, clearError: () => setError(null) };
}

export const codeFromLink = (raw: string | undefined) => { const c = normalizeCode(raw); return CODE_RE.test(c) ? c : ''; };
