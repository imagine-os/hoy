import { useEffect, useMemo, useRef } from 'react';
import { useSession } from '../../../auth/SessionProvider';
import { useData, useTable } from '../../../data/DataContext';
import type { BookingRow, ClassSessionRow, PaymentRow } from '../../../data/schema';
import { dateKey, isSameDay } from '../../../i18n/format';
import { deskFigures, type DeskFigures } from './deskFigures';
import { serverDesk, type DeskCommands } from './deskCommands';
import { reviewDesk } from './reviewDesk';
import { PRODUCTION_BUILD } from '../../../config/launch';
import { backendFor, createActionKeys } from './wire';

/** RC-01 · today's desk numbers from the shared tables, the same on every screen that shows them. */
export function useDeskFigures(): DeskFigures {
  const { rows: sessions } = useTable<ClassSessionRow>('class_sessions');
  const now = Date.now(), day = dateKey(new Date(now));
  // Only today's classes' bookings are read (the same ids the figures count).
  const todayIds = useMemo(() => sessions.filter(x => isSameDay(x.starts_at, new Date(now))).map(x => x.id).sort(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessions, day]);
  const { rows: bookings } = useTable<BookingRow>('bookings', { where: { session_id: todayIds.length ? todayIds : ['__none__'] } });
  const { rows: payments } = useTable<PaymentRow>('payments', { where: { status: 'pending' } });
  return useMemo(() => deskFigures({ sessions, bookings, payments, now, isToday: iso => isSameDay(iso, new Date(now)) }),
    // `day` re-reads the figures when the date turns over; `now` alone would recompute every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessions, bookings, payments, day]);
}

/** The desk's write commands for the current user: the server's in production, the browser's in the review build. */
export function useDeskCommands(isCurrent?: () => boolean): DeskCommands | null {
  const data = useData();
  const { user, role } = useSession();
  const mounted = useRef(true);
  const current = useRef(isCurrent);
  current.current = isCurrent;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  return useMemo(() => {
    const backend = backendFor(data);
    if (backend.kind === 'server') return serverDesk(data, backend.request);
    // The constant check lets the production bundle drop the browser copies of the desk rules entirely.
    if (!PRODUCTION_BUILD && backend.kind === 'review') return reviewDesk(data, { id: user.id, role }, () => mounted.current && (current.current?.() ?? true));
    return null;
  }, [data, user.id, role]);
}

/** The action-key store for one screen (see `createActionKeys`). */
export function useActionKeys() {
  return useRef(createActionKeys()).current;
}
