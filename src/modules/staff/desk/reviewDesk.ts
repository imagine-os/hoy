import type { Role } from '../../../auth/roles';
import { assertAdmissionContext } from '../../../data/sessionAdmission';
import { bookWithPackage } from '../../../data/deskBooking';
import { setReceptionAttendance } from '../../../data/receptionAttendance';
import type { DataProvider } from '../../../data/types';
import { REASON_REQUIRED, type DeskCommands } from './deskCommands';

/** Review build: the fictional browser commands as they were (the browser copies of the rules stay here only). */
export function reviewDesk(data: DataProvider, actor: { id: string; role: Role }, isCurrent: () => boolean): DeskCommands {
  return {
    kind: 'review',
    async attendance({ booking: b, to, reason, key }) {
      if (to === 'booked' && !reason?.trim()) throw new Error(REASON_REQUIRED);
      await setReceptionAttendance(data, { actorId: actor.id, role: actor.role, bookingId: b.id, sessionId: b.session_id, userId: b.user_id, requestId: key, status: to, reason: reason?.trim() || undefined, before: { status: b.status, checked_in_at: b.checked_in_at, updated_at: b.updated_at } }, { isCurrent });
    },
    async book({ personId, sessionId, checkIn }) {
      if (!data.atomic) throw new Error('disconnected');
      const status = checkIn ? 'checked_in' : 'booked';
      const b = await data.atomic(async tx => {
        const row = await bookWithPackage(tx, { userId: personId, sessionId, status, control: { isCurrent } });
        await tx.insert('audit_log', { actor_id: actor.id, action: checkIn ? 'booking.walkin' : 'booking.create', entity: 'bookings', entity_id: row.id, ip: null, diff: { role: actor.role, source: 'front_desk', after: status, session_id: sessionId, user_id: personId } });
        assertAdmissionContext({ isCurrent });
        return row;
      });
      return { bookingId: b.id };
    },
  };
}
