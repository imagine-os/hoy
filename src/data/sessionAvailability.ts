import type { ClassSessionRow, ModalityRow } from './schema';

export interface SessionAvailabilityInput {
  session: Pick<ClassSessionRow, 'status' | 'starts_at' | 'ends_at'>;
  modality?: Pick<ModalityRow, 'active'>;
  templateActive?: boolean;
}
export type SessionUnavailableReason = 'cancelled' | 'completed' | 'ended' | 'started' | 'unpublished' | 'no_class_type' | 'unavailable';
/** Calendar availability only. Full future classes still open their existing waitlist flow. */
export function sessionUnavailableReason({ session, modality, templateActive }: SessionAvailabilityInput, now = Date.now()): SessionUnavailableReason | null {
  if (session.status === 'cancelled') return 'cancelled';
  if (session.status === 'completed') return 'completed';
  const start = Date.parse(session.starts_at), end = Date.parse(session.ends_at);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 'unavailable';
  if (end <= now) return 'ended';
  if (start <= now) return 'started';
  if (templateActive === false || modality?.active === false) return 'unpublished';
  // Lane Y1: a class without a class type (no colour, letter or description) is not open for booking, as admission says.
  if (!modality) return 'no_class_type';
  return null;
}
