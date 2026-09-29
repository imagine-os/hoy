// One clear icon per part and per chapter of the operations manual (0031), as data: keyed by chapter NUMBER
// (the stable prefix of the slug), so a renamed or rewritten chapter keeps its icon without a front-matter change.
// Names go through the Icon atom (the single seam, lucide since 0030); the few the set lacked were added there in 0031.
import type { IconName } from '../../components/atom/Icon/Icon';

export const PART_ICON: Record<string, IconName> = {
  I: 'sparkle', II: 'calendar', III: 'users', IV: 'wallet', V: 'palette', VI: 'legal', VII: 'settings',
};

export const CHAPTER_ICON: Record<string, IconName> = {
  '00': 'manual',
  '01': 'sparkle', '02': 'classes', '03': 'coins',
  '04': 'checkin', '05': 'schedule', '06': 'user-check', '07': 'flame', '08': 'siren', '09': 'list-checks',
  '10': 'ticket', '11': 'gift', '12': 'studio', '13': 'whatsapp',
  '14': 'wallet', '15': 'receipt', '16': 'payroll',
  '17': 'layout-template', '18': 'globe', '19': 'image', '20': 'mic',
  '21': 'policies', '22': 'legal', '23': 'shield',
  '24': 'key-round', '25': 'database', '26': 'integrations', '27': 'book-a',
};

/** The icon of a chapter by number or slug; a chapter added later without an entry gets the book. */
export const chapterIcon = (numberOrSlug: string): IconName => CHAPTER_ICON[numberOrSlug.slice(0, 2)] ?? 'book';
export const partIcon = (key: string): IconName => PART_ICON[key] ?? 'manual';

/** The manual's own pages and the LMS dashboard tiles. */
export const MANUAL_ICON = {
  home: 'manual', decisions: 'circle-alert', requests: 'message', sources: 'files', progress: 'gauge',
  required: 'flag', recommended: 'star', training: 'graduation-cap', start: 'arrow-right', team: 'users', search: 'grid',
} as const satisfies Record<string, IconName>;
