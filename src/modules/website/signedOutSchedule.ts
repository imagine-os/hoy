import { PRODUCTION_BUILD } from '../../config/launch';
import type { Role } from '../../auth/roles';

/**
 * Production: Company OS shares the timetable with signed-in people only, so a visitor would see an empty calendar.
 * The schedule and the home agenda show a sign-in prompt instead (owner decision, final review round 2); sign-in
 * returns to the app's live schedule. The review build keeps the public timetable.
 */
export const SCHEDULE_SIGN_IN = `/auth/sign-in?next=${encodeURIComponent('/app/schedule')}`;
export const hidesSchedule = (role: Role): boolean => PRODUCTION_BUILD && role === 'public';
