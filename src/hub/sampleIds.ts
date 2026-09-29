/**
 * Live picks for the hub map's sample routes (`HUB_SAMPLE_ROUTES` in `./hubMap.data.ts`). Pure: rows in,
 * ids out, no React, so the app resolver (`src/app/SampleRoute.tsx`) and the seed check
 * (`./hubMap.check.ts`) share one rule. The seed reseeds daily with date-based ids, which is why the
 * published map carries the `sample` segment and the app resolves it at load time.
 */
import type { BookingRow, ClassSessionRow, PayrollRunRow } from '../data/schema';
import { HUB_ROLES, HUB_SAMPLE_ROUTES, SAMPLE_TOKEN, type SamplePick } from './hubMap.data';

export interface SampleTables { class_sessions: ClassSessionRow[]; bookings: BookingRow[]; payroll_runs: PayrollRunRow[] }

/** The demo customer (Juliana): whose bookings the booking and rating samples open. */
export const SAMPLE_CUSTOMER_ID = HUB_ROLES.find((r) => r.id === 'customer')?.demoUser?.id ?? 'usr_cust';

const byStart = (a: ClassSessionRow, b: ClassSessionRow) => a.starts_at.localeCompare(b.starts_at);

/** One id per pick, or undefined when the tables hold nothing that fits. */
export function pickSampleIds(t: SampleTables, userId: string = SAMPLE_CUSTOMER_ID, now: number = Date.now()): Partial<Record<SamplePick, string>> {
  const session = new Map(t.class_sessions.map((s) => [s.id, s]));
  const mine = t.bookings.filter((b) => b.user_id === userId);
  const mineIn = new Set(mine.filter((b) => b.status === 'booked' || b.status === 'checked_in').map((b) => b.session_id));
  const upcoming = t.class_sessions.filter((s) => s.status === 'scheduled' && new Date(s.starts_at).getTime() > now && !mineIn.has(s.id)).sort(byStart);
  const open = upcoming.filter((s) => s.booked_count < s.capacity);
  const nextBooked = mine.filter((b) => b.status === 'booked' && session.has(b.session_id))
    .sort((a, b) => byStart(session.get(a.session_id)!, session.get(b.session_id)!))
    .find((b) => new Date(session.get(b.session_id)!.starts_at).getTime() > now);
  const attended = mine.filter((b) => b.status === 'checked_in' && session.has(b.session_id))
    .sort((a, b) => byStart(session.get(b.session_id)!, session.get(a.session_id)!));
  const runs = t.payroll_runs;
  return {
    session: (open.find((s) => s.booked_count >= 4) ?? open.find((s) => s.booked_count > 0) ?? open[0])?.id,
    fullSession: upcoming.find((s) => s.booked_count >= s.capacity)?.id,
    booking: (nextBooked ?? mine.find((b) => b.status === 'booked'))?.id,
    attendedSession: (attended.find((b) => !b.rated) ?? attended[0])?.session_id,
    payrollRun: (runs.find((r) => r.status === 'approved') ?? runs.find((r) => r.status === 'paid') ?? runs[0])?.id,
  };
}

/** The template and pick behind a sample route (`/app/class/sample`), or undefined for any other path. */
export function sampleOf(pathname: string): { pattern: string; pick: SamplePick } | undefined {
  if (!pathname.split('/').includes(SAMPLE_TOKEN)) return undefined;
  for (const [pattern, s] of Object.entries(HUB_SAMPLE_ROUTES)) if (s.pick && s.route === pathname) return { pattern, pick: s.pick };
  return undefined;
}

/** The concrete route a sample route opens today, or null when nothing fits. */
export function resolveSampleRoute(pathname: string, t: SampleTables, userId?: string, now?: number): string | null {
  const hit = sampleOf(pathname);
  const id = hit && pickSampleIds(t, userId, now)[hit.pick];
  return hit && id ? hit.pattern.replace(/:\w+/, id) : null;
}
