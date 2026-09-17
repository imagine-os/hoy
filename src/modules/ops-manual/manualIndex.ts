// The operations manual: docs/ops-manual/<lang>/<NN-slug>.md, Spanish first, English mirror.
// Everything here is derived at build time from the markdown; adding a chapter needs no code change.
import type { Lang } from '../../i18n/types';
import type { Bi } from '../../specs/types';
import { headingSlug } from '../../components/organism/MarkdownViewer/MarkdownViewer';

const files = import.meta.glob<string>('../../../docs/ops-manual/{es,en}/*.md', { query: '?raw', import: 'default', eager: true });

/** Parts of the manual. The key is what a chapter writes as `part:` in its front matter. */
export type PartKey = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'VII';

export const PARTS: { key: PartKey; label: Bi; lead: Bi }[] = [
  { key: 'I', label: { es: 'HOY', en: 'HOY' }, lead: { es: 'Quiénes somos, cómo pensamos, qué vendemos.', en: 'Who we are, how we think, what we sell.' } },
  { key: 'II', label: { es: 'Operación diaria', en: 'Daily operations' }, lead: { es: 'La puerta, la sala, las clases y lo que se sale del guion.', en: 'The door, the room, the classes and whatever goes off-script.' } },
  { key: 'III', label: { es: 'Clientes y planes', en: 'Customers and plans' }, lead: { es: 'Vender, pausar, regalar, alquilar y conversar.', en: 'Selling, pausing, gifting, renting and talking.' } },
  { key: 'IV', label: { es: 'Dinero', en: 'Money' }, lead: { es: 'Caja, facturación y lo que se paga a los maestros.', en: 'Till, invoicing and what teachers get paid.' } },
  { key: 'V', label: { es: 'Contenido y marca', en: 'Content and brand' }, lead: { es: 'Lo que publicamos y cómo suena.', en: 'What we publish and how it sounds.' } },
  { key: 'VI', label: { es: 'Legal y políticas', en: 'Legal and policies' }, lead: { es: 'Las reglas vigentes y los documentos que las sostienen.', en: 'The live rules and the documents behind them.' } },
  { key: 'VII', label: { es: 'Sistema', en: 'System' }, lead: { es: 'Roles, datos, integraciones y el vocabulario.', en: 'Roles, data, integrations and the vocabulary.' } },
];

export const PART_KEYS = PARTS.map((p) => p.key);
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
  /** Markdown without the front matter. */
  body: string;
  /** Word count of the body (reading time and the chapter card read from it). */
  words: number;
  /** Real captures embedded in the chapter (markdown images under docs/screenshots). */
  figures: number;
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

const FRONT = /^---\n([\s\S]*?)\n---\n?/;
const DECISION = /^>\s*(?:DECISIÓN PENDIENTE|DECISION NEEDED|DECISION PENDING)\s*:\s*(.+)$/;
const SCREENSHOT = /^\[screenshot:\s*([^\]]+)\]\s*$/;
const FIGURE = /!\[[^\]]*\]\((?:\.\.\/)+screenshots\//g;

/** The anchor the TOC links to — the same slug MarkdownViewer puts on the rendered `##` heading. */
export const headingId = headingSlug;

function parse(path: string, raw: string): Chapter {
  const [, lang, file] = path.match(/docs\/ops-manual\/(es|en)\/([^/]+)\.md$/)!;
  const fm = raw.match(FRONT);
  const meta: Record<string, string> = {};
  if (fm) for (const line of fm[1].split('\n')) { const m = line.match(/^(\w+):\s*(.*)$/); if (m) meta[m[1]] = m[2].trim(); }
  const body = fm ? raw.slice(fm[0].length) : raw;
  const h1 = body.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return {
    lang: lang as Lang, slug: file, number: file.match(/^(\d+)/)?.[1] ?? '',
    title: meta.title ?? h1 ?? file, role: meta.role ?? '', part: meta.part ?? '', summary: meta.summary ?? '',
    version: meta.version ?? '', updated: meta.updated ?? '', path, body,
    words: (body.match(/[\p{L}\p{N}’'-]+/gu) ?? []).length,
    figures: (body.match(FIGURE) ?? []).length,
  };
}

export const chapters: Chapter[] = Object.entries(files)
  .map(([k, raw]) => parse(k.replace(/^(\.\.\/)+/, ''), raw))
  .sort((a, b) => a.slug.localeCompare(b.slug));

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

export function decisionsIn(chapter: Chapter): Decision[] {
  const out: Decision[] = [];
  let section = '';
  for (const line of chapter.body.split('\n')) {
    const h = line.match(/^##\s+(.+)$/); if (h) { section = h[1].trim(); continue; }
    const d = line.match(DECISION); if (d) out.push({ chapter, section, text: d[1].trim(), index: out.length + 1 });
  }
  return out;
}

export function decisionsFor(lang: Lang): Decision[] { return chaptersFor(lang).flatMap(decisionsIn); }

/** `[screenshot: CODE — caption]` lines: captures a chapter still asks for. */
export function placeholdersFor(lang: Lang): Placeholder[] {
  return chaptersFor(lang).flatMap((chapter) => chapter.body.split('\n').flatMap((line) => {
    const m = line.match(SCREENSHOT); if (!m) return [];
    return [{ chapter, code: m[1].match(/^([A-Z]+-\d{2}[a-z]?)/)?.[1] ?? '?', caption: m[1].trim() }];
  }));
}

export function placeholdersIn(chapter: Chapter): Placeholder[] {
  return chapter.body.split('\n').flatMap((line) => {
    const m = line.match(SCREENSHOT); if (!m) return [];
    return [{ chapter, code: m[1].match(/^([A-Z]+-\d{2}[a-z]?)/)?.[1] ?? '?', caption: m[1].trim() }];
  });
}

/** `##` headings of a chapter, skipping the ones inside fenced code blocks. */
export function headingsIn(chapter: Chapter): Heading[] {
  const out: Heading[] = [];
  let fenced = false;
  for (const line of chapter.body.split('\n')) {
    if (/^```/.test(line)) { fenced = !fenced; continue; }
    if (fenced) continue;
    const m = line.match(/^##\s+(.+)$/);
    if (m) { const text = m[1].trim(); out.push({ id: headingId(text), text }); }
  }
  return out;
}

/** Minutes to read a chapter at 200 words per minute, never less than one. */
export const readingTime = (chapter: Chapter): number => Math.max(1, Math.round(chapter.words / 200));

/** Chapters whose title, summary, role or body matches every word of the query. */
export function searchChapters(lang: Lang, query: string): Chapter[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const terms = words.map(norm);
  return chaptersFor(lang).filter((c) => {
    const hay = norm(`${c.number} ${c.title} ${c.summary} ${c.role} ${c.body}`);
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
