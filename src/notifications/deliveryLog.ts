/**
 * H-9 — the delivery status of the launch emails, as Company OS reports it (`comms_log`, comms 1.5.0). The app never
 * writes a status: an automation queues the email, the scheduler sends it, the provider's webhook marks it delivered
 * or bounced. Read through the provider's optional `request()` seam (the same one lane H-5 feature-detects); a
 * provider without it (the review build's mock) has no live status, and the page says so instead of inventing one.
 */
import type { DataProvider } from '../data/types';

/** comms 1.5.0 `comms_log.status` for an email. Anything else is shown as received, never mapped to "sent". */
export const DELIVERY_STATUSES = ['queued', 'scheduled', 'sent', 'delivered', 'failed', 'bounced', 'skipped'] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export interface DeliveryRow { id: string; at: string | null; template: string; address: string | null; status: string; error: string | null }

type CosRequest = (method: 'POST', path: string, body?: unknown) => Promise<unknown>;

export function cosRequest(data: DataProvider): CosRequest | null {
  const r = (data as DataProvider & { request?: unknown }).request;
  return typeof r === 'function' ? (r as CosRequest).bind(data) : null;
}

const str = (v: unknown) => (typeof v === 'string' && v ? v : null);

/** The newest 100 emails sent from the given templates, newest first (the API's default order). */
export async function readDeliveryLog(request: CosRequest, templates: string[]): Promise<DeliveryRow[]> {
  const res = await request('POST', '/query', {
    entity: 'comms_log',
    filter: { and: [{ field: 'channel', op: 'eq', value: 'email' }, { field: 'message_key', op: 'in', value: templates }] },
    limit: 100,
  }) as { data?: unknown };
  if (!res || !Array.isArray(res.data)) throw new Error('comms_log_unreadable');
  return res.data.map((raw) => {
    const r = raw as Record<string, unknown>, d = (r.data && typeof r.data === 'object' ? r.data : r) as Record<string, unknown>;
    return {
      id: String(r.id),
      at: str(d.sent_at) ?? str(r.created_at) ?? str(r.createdAt),
      template: str(d.message_key) ?? '',
      address: str(d.address),
      status: str(d.status) ?? 'unknown',
      error: str(d.error),
    };
  });
}
