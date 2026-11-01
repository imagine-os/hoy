/**
 * The card's meta line (lane Y1): `[teacher, room, level]` joined with " · ", only the parts it has, so an empty
 * teacher or room never leaves a stray dot. The level `all` is the default and is not shown.
 */
export function classCardMeta([teacher, room, level]: readonly (string | null | undefined)[]): string {
  const shownLevel = level && level.trim() !== 'all' ? level : '';
  return [teacher, room, shownLevel].map((p) => (p ?? '').trim()).filter(Boolean).join(' · ');
}
