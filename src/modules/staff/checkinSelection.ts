/**
 * Review round 2 (L1): which class the check-in screen shows. With nothing chosen it follows the clock: the class that is
 * live (from 30 minutes before it starts to its end), else the next one, else the day's last. A class staff chose (they
 * tapped it, or the address carried `?session=`) stays however late it gets; once it has ended and a later class is live
 * or next today, `nextId` names it so the screen can offer "Go to the next class". Pure, so a test can drive the clock.
 */
export interface CheckinSessionLike { session: { id: string; starts_at: string; ends_at: string } }

const MIN = 60_000;

export function autoSession<T extends CheckinSessionLike>(today: T[], now: number): T | undefined {
  const live = today.find((x) => Date.parse(x.session.starts_at) - 30 * MIN <= now && Date.parse(x.session.ends_at) >= now);
  const next = today.find((x) => Date.parse(x.session.starts_at) > now);
  return live ?? next ?? today[today.length - 1];
}

export function checkinView<T extends CheckinSessionLike>({ today, all, wantedId, now }: { today: T[]; all: T[]; wantedId: string | null; now: number }): { selected: T | undefined; nextId: string | null } {
  const auto = autoSession(today, now);
  const chosen = wantedId ? all.find((x) => x.session.id === wantedId) : undefined;
  const selected = chosen ?? auto;
  const nextId = chosen && Date.parse(chosen.session.ends_at) < now && auto && auto.session.id !== chosen.session.id && Date.parse(auto.session.ends_at) >= now ? auto.session.id : null;
  return { selected, nextId };
}
