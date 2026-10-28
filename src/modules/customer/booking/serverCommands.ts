import { useCallback, useRef } from 'react';
import type { BaseRow } from '../../../data/schema';
import type { DataProvider } from '../../../data/types';
import type { ReceiptImage } from '../../transfers/receipts';
import { refusalCode } from './refusals';
import type { ServerBookingRow } from './serverBooking';

/**
 * H-4 production writes. Each is one plain write inside `atomic` with an `Idempotency-Key` (ADR 0040); the server checks
 * availability, the daily limit, capacity, mats, holds and the move window and refuses with a code (`refusals.ts`).
 * Nothing here reads other people's bookings or re-checks a rule in the browser.
 */
export interface BookInput { userId: string; sessionId: string; paidWith: 'package' | 'single'; matNumber?: number | null; paymentMethod?: 'transfer' | 'desk' | null }

function run<T>(data: DataProvider, idempotencyKey: string, write: (tx: DataProvider) => Promise<T>): Promise<T> {
  if (!data.atomic) throw new Error('atomic_adapter_required');
  return data.atomic(write, { idempotencyKey });
}

/** RS-02 (a class from the balance, vouchers included) and RS-03 / PG-03 (a single class, held while it is paid). */
export function bookOnServer(data: DataProvider, input: BookInput, idempotencyKey: string): Promise<ServerBookingRow> {
  const row: Partial<ServerBookingRow> = { user_id: input.userId, session_id: input.sessionId, paid_with: input.paidWith, status: 'booked', mat_number: input.matNumber ?? null };
  // A single class must name how it is paid, or the server books it unpaid instead of holding it (bookings 1.2.0).
  if (input.paidWith === 'single') row.payment_method = input.paymentMethod ?? 'transfer';
  return run(data, idempotencyKey, (tx) => tx.insert<ServerBookingRow>('bookings', row));
}

/** RS-09 / J3b — `PATCH { occurrence }`; the old mat never carries over, so the new class's mat is sent (or none). */
export function moveOnServer(data: DataProvider, input: { bookingId: string; toSessionId: string; matNumber?: number | null }, idempotencyKey: string): Promise<ServerBookingRow> {
  return run(data, idempotencyKey, (tx) => tx.update<ServerBookingRow>('bookings', input.bookingId, { session_id: input.toSessionId, mat_number: input.matNumber ?? null }));
}

/** J3 — the customer's cancel. The server stores `late_cancel` (the class is lost) for a booking; a held spot is just released. */
export function cancelOnServer(data: DataProvider, input: { bookingId: string }, idempotencyKey: string): Promise<ServerBookingRow> {
  return run(data, idempotencyKey, (tx) => tx.update<ServerBookingRow>('bookings', input.bookingId, { status: 'cancelled' }));
}

/** The connector's file upload (H-3: `CompanyOSProvider.uploadFile`); absent on the review mock. */
interface FileUploader { uploadFile?(input: { ownerEntity: string; ownerId: string; kind: string; file: File }): Promise<unknown> }

/** A data URL back to a File for the upload route. */
function receiptFile(image: ReceiptImage): File {
  const [head, body] = image.dataUrl.split(',');
  const bytes = /;base64$/.test(head) ? Uint8Array.from(atob(body), (c) => c.charCodeAt(0)) : new TextEncoder().encode(decodeURIComponent(body));
  return new File([bytes], image.fileName, { type: image.mimeType });
}

/**
 * J1 / J1c — the transfer receipt for a held single class: a pending payment for the booking (while it is pending the hold
 * is frozen), then the image through the files route on that payment. The connector drops file data on a row, so the upload
 * is its own call after the write; a retry with the same key replays the payment and uploads again (H-3 note).
 */
export async function sendHoldReceipt(data: DataProvider, input: { bookingId: string; userId: string; planId: string | null; amount: number | null; image: ReceiptImage; paymentId?: string | null }, idempotencyKey: string): Promise<{ id: string }> {
  // A failed upload keeps its payment: the retry uploads to it instead of creating a second one.
  const payment = input.paymentId ? { id: input.paymentId } : await run(data, idempotencyKey, (tx) => tx.insert<BaseRow>('payments', {
    user_id: input.userId, plan_id: input.planId, amount: input.amount, method: 'transfer', status: 'pending',
    for_entity: 'booking', for_id: input.bookingId,
  } as Partial<BaseRow>));
  const uploader = data as DataProvider & FileUploader;
  try {
    if (uploader.uploadFile) await uploader.uploadFile({ ownerEntity: 'payment', ownerId: payment.id, kind: 'receipt', file: receiptFile(input.image) });
  } catch (error) { throw Object.assign(error instanceof Error ? error : new Error(String(error)), { paymentId: payment.id }); }
  return payment;
}

/**
 * Duplicate taps: one key per submit, reused when the answer never arrived (a retry replays it, `Idempotency-Replayed`),
 * replaced once the server answered (a refusal is final for that key; the next tap is a new request).
 */
export function useSubmitKey(scope: string) {
  const key = useRef<{ scope: string; value: string } | null>(null);
  const take = useCallback(() => {
    if (!key.current || key.current.scope !== scope) key.current = { scope, value: crypto.randomUUID() };
    return key.current.value;
  }, [scope]);
  const settle = useCallback((error?: unknown) => { if (!error || refusalCode(error)) key.current = null; }, []);
  return { take, settle };
}
