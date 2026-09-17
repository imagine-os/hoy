// The operations manual: docs/ops-manual/<lang>/<NN-slug>.md, Spanish first, English mirror.
// The index (titles, parts, headings, decisions, counts) is computed at build time by
// scripts/lib/docmeta.mjs; a chapter's body is fetched only when its page opens (`useChapterBody`).
// Adding a chapter needs no code change.
import type { Lang } from '../../i18n/types';
import type { Bi } from '../../specs/types';
import { headingSlug } from '../../components/organism/MarkdownViewer/MarkdownViewer';
import { tenant } from '../../tenant/tenant';
import { docs, loadDocs, useDocSource, type DocMeta } from '../docs/docsIndex';

/** Parts of the manual. The key is what a chapter writes as `part:` in its front matter. */
export type PartKey = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'VII';

export const PARTS: { key: PartKey; label: Bi; lead: Bi }[] = [
  { key: 'I', label: { es: tenant.name, en: tenant.name }, lead: { es: 'Quiénes somos, cómo pensamos, qué vendemos.', en: 'Who we are, how we think, what we sell.' } },
  { key: 'II', label: { es: 'Operación diaria', en: 'Daily operations' }, lead: { es: 'La puerta, la sala, las clases y lo que se sale del guion.', en: 'The door, the room, the classes and whatever goes off-script.' } },
  { key: 'III', label: { es: 'Clientes y planes', en: 'Customers and plans' }, lead: { es: 'Vender, pausar, regalar, alquilar y conversar.', en: 'Selling, pausing, gifting, renting and talking.' } },
  { key: 'IV', label: { es: 'Dinero', en: 'Money' }, lead: { es: 'Caja, facturación y lo que se paga a los maestros.', en: 'Till, invoicing and what teachers get paid.' } },
  { key: 'V', label: { es: 'Contenido y marca', en: 'Content and brand' }, lead: { es: 'Lo que publicamos y cómo suena.', en: 'What we publish and how it sounds.' } },
  { key: 'VI', label: { es: 'Legal y políticas', en: 'Legal and policies' }, lead: { es: 'Las reglas vigentes y los documentos que las sostienen.', en: 'The live rules and the documents behind them.' } },
  { key: 'VII', label: { es: 'Sistema', en: 'System' }, lead: { es: 'Roles, datos, integraciones y el vocabulario.', en: 'Roles, data, integrations and the vocabulary.' } },
];

export const partOf = (key: string) => PARTS.find((p) => p.key === key);

export interface Chapter {
  lang: Lang;
  /** File name without extension, shared across languages: '04-recepcion-y-check-in'. */
  slug: string;
  /** Chapter number from the file name ('04'). */
  number: string;
  title: string;
  role: string;
  /** Part key from the front matter ('II'); '' when a chapter declares none. */
  part: string;
  /** One-line front-matter summary, shown on the chapter card and searched. */
  summary: string;
  version: string;
  updated: string;
  /** Repo path, e.g. 'docs/ops-manual/es/04-recepcion-y-check-in.md'. */
  path: string;
  /** Word count of the body (reading time and the chapter card read from it). */
  words: number;
  /** Real captures embedded in the chapter (markdown images under docs/screenshots). */
  figures: number;
  /** Build-time extract of the body: headings, pending decisions and capture placeholders. */
  info: DocMeta;
}

export interface Decision {
  chapter: Chapter;
  /** Nearest `##` heading above the flag. */
  section: string;
  text: string;
  /** 1-based position within the chapter. */
  index: number;
}

export interface Placeholder { chapter: Chapter; code: string; caption: string }

/** One `## heading` of a chapter, for the in-page table of contents. */
export interface Heading { id: string; text: string }

const CHAPTER_PATH = /^docs\/ops-manual\/(es|en)\/([^/]+)\.md$/;
const FRONT = /^---\n[\s\S]*?\n---\n?/;

function parse(path: string, info: DocMeta): Chapter {
  const [, lang, file] = path.match(CHAPTER_PATH)!;
  const meta = info.meta;
  return {
    lang: lang as Lang, slug: file, number: file.match(/^(\d+)/)?.[1] ?? '',
    title: info.title, role: meta.role ?? '', part: meta.part ?? '', summary: meta.summary ?? '',
    version: meta.version ?? '', updated: meta.updated ?? '', path,
    words: info.words, figures: info.figures, info,
  };
}

export const chapters: Chapter[] = docs
  .filter((d) => CHAPTER_PATH.test(d.path))
  .map((d) => parse(d.path, d.info))
  .sort((a, b) => a.slug.localeCompare(b.slug));

/** Markdown of a chapter without its front matter; `undefined` while it loads. */
export function useChapterBody(chapter: Chapter | undefined): string | undefined {
  const raw = useDocSource(chapter?.path);
  return raw === undefined ? undefined : raw.replace(FRONT, '');
}

const bodyCache = new Map<string, string>();
/** Bodies of every chapter in `lang` (search reads them); fetched once, then served from memory. */
export async function loadBodies(lang: Lang): Promise<Map<string, string>> {
  const list = chaptersFor(lang).filter((c) => !bodyCache.has(c.slug));
  if (list.length) {
    const raws = await loadDocs(list.map((c) => c.path));
    list.forEach((c, i) => bodyCache.set(`${lang}/${c.slug}`, raws[i].replace(FRONT, '')));
  }
  return bodyCache;
}

export function chaptersFor(lang: Lang): Chapter[] { return chapters.filter((c) => c.lang === lang); }

/** Chapters of `lang` grouped in part order; a chapter with no `part` lands in a trailing unnamed group. */
export function chaptersByPart(lang: Lang): { key: string; label?: Bi; lead?: Bi; chapters: Chapter[] }[] {
  const list = chaptersFor(lang);
  const groups = PARTS.map((p) => ({ key: p.key, label: p.label, lead: p.lead, chapters: list.filter((c) => c.part === p.key) }));
  const loose = list.filter((c) => !partOf(c.part));
  return [...groups, ...(loose.length ? [{ key: '', chapters: loose }] : [])].filter((g) => g.chapters.length);
}

/** Slugs retired by the 0.6.0 re-categorisation, so old links and tooling params keep resolving. */
export const LEGACY_SLUGS: Record<string, string> = {
  '01-filosofia-y-voz': '01-quienes-somos-y-filosofia',
  '02-roles-y-organigrama': '24-roles-y-permisos',
  '03-recepcion': '04-recepcion-y-check-in',
  '04-profesores': '06-maestros',
  '05-coordinacion': '05-clases-y-horarios',
  '06-administracion-y-finanzas': '14-pagos-y-caja',
  '07-mantenimiento-y-espacio': '07-sala-calor-y-mantenimiento',
  '08-comunicacion-whatsapp-y-email': '13-crm-y-whatsapp',
  '09-emergencias-y-seguridad': '08-incidencias-y-emergencias',
  '10-checklists-de-entrenamiento': '09-checklists-de-entrenamiento',
};

/** The chapter in `lang`, falling back to Spanish (the source language) when the mirror is missing. */
export function chapterFor(lang: Lang, slug: string): { chapter: Chapter; fallback: boolean } | undefined {
  const want = chapters.some((c) => c.slug === slug) ? slug : LEGACY_SLUGS[slug] ?? slug;
  const exact = chapters.find((c) => c.lang === lang && c.slug === want);
  if (exact) return { chapter: exact, fallback: false };
  const es = chapters.find((c) => c.lang === 'es' && c.slug === want);
  return es ? { chapter: es, fallback: true } : undefined;
}

/** `> DECISIÓN PENDIENTE:` flags of a chapter, in document order. */
export function decisionsIn(chapter: Chapter): Decision[] {
  return chapter.info.decisions.map((d, i) => ({ chapter, section: d.section, text: d.text, index: i + 1 }));
}

export function decisionsFor(lang: Lang): Decision[] { return chaptersFor(lang).flatMap(decisionsIn); }

/** `[screenshot: CODE — caption]` lines: captures a chapter still asks for. */
export function placeholdersIn(chapter: Chapter): Placeholder[] {
  return chapter.info.placeholders.map((caption) => ({ chapter, code: caption.match(/^([A-Z]+-\d{2}[a-z]?)/)?.[1] ?? '?', caption }));
}

export function placeholdersFor(lang: Lang): Placeholder[] { return chaptersFor(lang).flatMap(placeholdersIn); }

/** `##` headings of a chapter with the anchor MarkdownViewer puts on the rendered heading. */
export function headingsIn(chapter: Chapter): Heading[] {
  return chapter.info.headings.map((text) => ({ id: headingSlug(text), text }));
}

/** Minutes to read a chapter at 200 words per minute, never less than one. */
export const readingTime = (chapter: Chapter): number => Math.max(1, Math.round(chapter.words / 200));

/**
 * Chapters whose title, summary, role, headings or body match every word of the query.
 * `bodies` (from `loadBodies`) widens the search to the full text once it has arrived.
 */
export function searchChapters(lang: Lang, query: string, bodies?: Map<string, string>): Chapter[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const terms = words.map(norm);
  return chaptersFor(lang).filter((c) => {
    const hay = norm(`${c.number} ${c.title} ${c.summary} ${c.role} ${c.info.headings.join(' ')} ${bodies?.get(`${lang}/${c.slug}`) ?? ''}`);
    return terms.every((w) => hay.includes(w));
  });
}

/** "Start here" reading paths: three chapters per role, by slug prefix. */
export const START_HERE: { key: string; label: Bi; slugs: string[] }[] = [
  { key: 'front_desk', label: { es: 'Recepción', en: 'Front desk' }, slugs: ['04-recepcion-y-check-in', '10-ventas-y-planes', '08-incidencias-y-emergencias'] },
  { key: 'teacher', label: { es: 'Maestros', en: 'Teachers' }, slugs: ['06-maestros', '02-nuestras-clases', '07-sala-calor-y-mantenimiento'] },
  { key: 'admin', label: { es: 'Admin', en: 'Admin' }, slugs: ['24-roles-y-permisos', '21-politicas', '25-datos-y-tablas'] },
  { key: 'finance', label: { es: 'Finanzas', en: 'Finance' }, slugs: ['14-pagos-y-caja', '15-facturacion-y-dian', '16-nomina-y-payouts'] },
];

/** Route for an internal manual link (`docs/ops-manual/<lang>/<slug>.md` → `/manual/<slug>`). */
export function manualRoute(path: string): string | undefined {
  const m = path.match(/^docs\/ops-manual\/(?:es|en)\/([^/]+)\.md$/);
  if (m) return `/manual/${LEGACY_SLUGS[m[1]] ?? m[1]}`;
  if (path === 'docs/ops-manual/README.md') return '/manual';
  if (path.startsWith('docs/')) return `/docs/${path.slice(5).replace(/\.md$/, '')}`;
  return undefined;
}
