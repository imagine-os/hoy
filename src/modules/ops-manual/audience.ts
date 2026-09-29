// Who reads what (0031): the "Quién lee qué" matrix of docs/ops-manual/<lang>/00-index.md §4 as data, so the
// manual can be read as a per-role LMS. Keyed by chapter NUMBER ('04'), the stable prefix of the slug
// (04-recepcion-y-check-in), so a chapter renamed by a content pass keeps its audience.
// Columns: the table's "Owner" is the `admin` role (the studio owner); `super_admin` reads whatever the owner
// or the table's "Admin" column must read; `marketing` and `developer` (new in 0031) are a first judgment.
// `{{audience}}` renders this matrix as the table; `{{audience:<slug or number>}}` renders one chapter's chips.
import type { Lang } from '../../i18n/types';
import { TEAM_ROLES, type Role } from '../../auth/roles';
import { chaptersFor, type Chapter } from './manualIndex';

export type Level = 'required' | 'recommended';
export type Audience = Partial<Record<Role, Level>>;

/** Column order of the matrix as written in 00-index §4, then the two 0031 columns. */
export const AUDIENCE_COLUMNS: Role[] = ['admin', 'super_admin', 'coordinator', 'front_desk', 'finance', 'teacher', 'maintenance', 'marketing', 'developer'];

// ● = required · ○ = recommended · – = n/a. Order: Owner, Admin, Coord., Recepción, Finanzas, Maestros, Mantenimiento.
const TABLE: Record<string, string> = {
  '01': '●●●●●●●', '02': '●○●●–●○', '03': '●●●●●○–', '04': '○●●●○○–', '05': '○●●○–○–', '06': '○○●○–●–',
  '07': '○○●●–●●', '08': '●●●●●●●', '09': '●●●●●●●', '10': '○●●●●––', '11': '○●●●○––', '12': '●○●○○–○',
  '13': '○●●●○○–', '14': '●●○●●––', '15': '●●––●––', '16': '●●○–●○–', '17': '○●●○–○–', '18': '●○●○–––',
  '19': '○○●○–○–', '20': '●●●●●●●', '21': '●●●●●○–', '22': '●●○○●○–', '23': '●●●●●●●', '24': '●●●●●●●',
  '25': '○●○–○––', '26': '●●○–○––', '27': '●●●●●●●',
};
const MARKETING = { required: ['01', '02', '03', '17', '18', '19', '20', '21', '23', '27'], recommended: ['13', '24'] };
const DEVELOPER = { required: ['01', '20', '24', '25', '26', '27'], recommended: ['08', '21', '23'] };

const level = (c: string): Level | undefined => (c === '●' ? 'required' : c === '○' ? 'recommended' : undefined);
const max = (a?: Level, b?: Level): Level | undefined => (a === 'required' || b === 'required' ? 'required' : a ?? b);

export const AUDIENCE: Record<string, Audience> = Object.fromEntries(Object.entries(TABLE).map(([n, row]) => {
  const [owner, admin, coord, desk, fin, teach, maint] = [...row].map(level);
  const a: Audience = { admin: owner, super_admin: max(owner, admin), coordinator: coord, front_desk: desk, finance: fin, teacher: teach, maintenance: maint };
  if (MARKETING.required.includes(n)) a.marketing = 'required'; else if (MARKETING.recommended.includes(n)) a.marketing = 'recommended';
  if (DEVELOPER.required.includes(n)) a.developer = 'required'; else if (DEVELOPER.recommended.includes(n)) a.developer = 'recommended';
  for (const k of Object.keys(a) as Role[]) if (!a[k]) delete a[k];
  return [n, a];
}));

/** Chapter number from a slug ('04-recepcion…' → '04'), or the argument itself when it is already a number. */
export const chapterNumber = (slugOrNumber: string): string => slugOrNumber.match(/^(\d{2})/)?.[1] ?? slugOrNumber;

/** The lens roles the manual offers (everyone on the team; customers and visitors read the whole manual). */
export const LENS_ROLES: Role[] = TEAM_ROLES;
export const isLensRole = (r: string): r is Role => (LENS_ROLES as string[]).includes(r);

/** What one role must / should read: chapter number → level. */
export function audienceFor(role: Role): Record<string, Level> {
  const out: Record<string, Level> = {};
  for (const [n, a] of Object.entries(AUDIENCE)) { const l = a[role]; if (l) out[n] = l; }
  return out;
}

/** The level of one chapter for one role; the index (00) is required for everyone. */
export function levelFor(chapter: Pick<Chapter, 'number'>, role: Role): Level | undefined {
  if (chapter.number === '00') return 'required';
  return AUDIENCE[chapter.number]?.[role];
}

/** The chapters of `lang` a role reads: required first, then recommended, each in manual order. */
export function chaptersForRole(lang: Lang, role: Role): { required: Chapter[]; recommended: Chapter[] } {
  const list = chaptersFor(lang);
  return {
    required: list.filter((c) => levelFor(c, role) === 'required'),
    recommended: list.filter((c) => levelFor(c, role) === 'recommended'),
  };
}

/** Roles a chapter is required / recommended for, in column order. */
export function rolesFor(slugOrNumber: string): { required: Role[]; recommended: Role[] } {
  const a = AUDIENCE[chapterNumber(slugOrNumber)] ?? {};
  return {
    required: AUDIENCE_COLUMNS.filter((r) => a[r] === 'required'),
    recommended: AUDIENCE_COLUMNS.filter((r) => a[r] === 'recommended'),
  };
}

/** "Start here" per role: three chapter numbers to work the first day. */
export const START_PATHS: Partial<Record<Role, string[]>> = {
  front_desk: ['04', '10', '08'],
  teacher: ['06', '02', '07'],
  admin: ['24', '21', '25'],
  super_admin: ['24', '25', '26'],
  finance: ['14', '15', '16'],
  coordinator: ['05', '06', '13'],
  maintenance: ['07', '08', '09'],
  marketing: ['20', '17', '18'],
  developer: ['24', '25', '26'],
};
