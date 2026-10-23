/** SW-08: approved October 30 launch, at midnight in the studio's calendar. */
export const PUBLIC_LAUNCH_DATE = '2026-10-30';

export function publicSiteLaunched(now: Date, timezone: string): boolean {
  if (!Number.isFinite(now.getTime())) return false;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const value = (type: string) => parts.find(part => part.type === type)?.value;
  return `${value('year')}-${value('month')}-${value('day')}` >= PUBLIC_LAUNCH_DATE;
}
