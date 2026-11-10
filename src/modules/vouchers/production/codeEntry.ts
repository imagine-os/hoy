import type { DataProvider } from '../../../data/types';
import { isCode, normalizeCode, redeemVoucher, refusalCode, refusalKey, writeMayHaveCommitted, type RedeemedLot } from './model';

export type CodeEntryResult =
  | { ok: true; lot: RedeemedLot }
  | { ok: false; key: string; code: string | null; keepKey?: boolean };

/**
 * The checkout's "¿Tienes un código?" (Hoy 12 Nov, D5): one redemption (`redeemVoucher`), then the balance is reloaded
 * and the page told. A refusal is a copy key (`vouchers.cos.refusal.*`, title and body in es and en) and nothing is
 * reloaded or reported. `keepKey` says the write may have committed: send the retry with the same Idempotency-Key.
 */
export async function enterCode({ data, code, key, reloadBalance, onRedeemed }: {
  data: DataProvider; code: string; key: string; reloadBalance?: () => unknown | Promise<unknown>; onRedeemed?: (lot: RedeemedLot) => void;
}): Promise<CodeEntryResult> {
  if (!isCode(code)) return { ok: false, key: 'vouchers.cos.err.code', code: null };
  let lot: RedeemedLot;
  try { lot = await redeemVoucher(data, normalizeCode(code), key); }
  catch (e) { return { ok: false, key: refusalKey(e), code: refusalCode(e), keepKey: writeMayHaveCommitted(e) }; }
  // The classes are added: a balance that fails to reload must not look like a failed redemption.
  try { await reloadBalance?.(); } catch { /* the provider refetches after its own writes */ }
  onRedeemed?.(lot);
  return { ok: true, lot };
}
