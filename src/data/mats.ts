import type { BookingRow, ModalityRow } from './schema';
/** Keep this catalogue predicate aligned with the studio's yoga modalities. */
export const usesMats = (modality?: Pick<ModalityRow, 'slug'> | null) => !!modality && /yoga|vinyasa|flow|yin/.test(modality.slug);
export const occupiesMat = (b: Pick<BookingRow, 'status'>) => b.status === 'booked' || b.status === 'checked_in';
export function chooseMat(bookings: BookingRow[], capacity: number, requested?: number | null): number {
  const taken = new Set(bookings.filter(occupiesMat).map(b => b.mat_number));
  if (requested != null) {
    if (!Number.isInteger(requested) || requested < 1 || requested > capacity) throw new Error('mat_invalid');
    if (taken.has(requested)) throw new Error('mat_taken');
    return requested;
  }
  const free = Array.from({ length: capacity }, (_, i) => i + 1).find(n => !taken.has(n));
  if (!free) throw new Error('session_full');
  return free;
}

// Additive booking contract; production schema remains a separate integration draft.
declare module './schema' { interface BookingRow { mat_number?: number | null } }
