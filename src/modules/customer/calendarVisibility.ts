/** Browse-only projection. Cancellation records and existing booking history are never deleted or changed. */
export function customerCalendarSessions<T extends { status: string }>(sessions: readonly T[]): T[] {
  return sessions.filter(session => session.status !== 'cancelled');
}
