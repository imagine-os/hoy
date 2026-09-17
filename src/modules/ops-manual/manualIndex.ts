// The operations manual: docs/ops-manual/<lang>/<NN-slug>.md, Spanish first, English mirror.
// Everything here is derived at build time from the markdown; adding a chapter needs no code change.
import type { Lang } from '../../i18n/types';

const files = import.meta.glob<string>('../../../docs/ops-manual/{es,en}/*.md', { query: '?raw', import: 'default', eager: true });

export interface Chapter {
  lang: Lang;
  /** File name without extension, shared across languages: '03-recepcion'. */
  slug: string;
  /** Chapter number from the file name ('03'). */
  number: string;
  title: string;
  role: string;
  version: string;
  updated: string;
  /** Repo path, e.g. 'docs/ops-manual/es/03-recepcion.md'. */
  path: string;
  /** Markdown without the front matter. */
  body: string;
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

const FRONT = /^---\n([\s\S]*?)\n---\n?/;
const DECISION = /^>\s*(?:DECISIÓN PENDIENTE|DECISION NEEDED|DECISION PENDING)\s*:\s*(.+)$/;
const SCREENSHOT = /^\[screenshot:\s*([^\]]+)\]\s*$/;

function parse(path: string, raw: string): Chapter {
  const [, lang, file] = path.match(/docs\/ops-manual\/(es|en)\/([^/]+)\.md$/)!;
  const fm = raw.match(FRONT);
  const meta: Record<string, string> = {};
  if (fm) for (const line of fm[1].split('\n')) { const m = line.match(/^(\w+):\s*(.*)$/); if (m) meta[m[1]] = m[2].trim(); }
  const body = fm ? raw.slice(fm[0].length) : raw;
  const h1 = body.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return { lang: lang as Lang, slug: file, number: file.match(/^(\d+)/)?.[1] ?? '', title: meta.title ?? h1 ?? file, role: meta.role ?? '', version: meta.version ?? '', updated: meta.updated ?? '', path, body };
}

export const chapters: Chapter[] = Object.entries(files)
  .map(([k, raw]) => parse(k.replace(/^(\.\.\/)+/, ''), raw))
  .sort((a, b) => a.slug.localeCompare(b.slug));

export function chaptersFor(lang: Lang): Chapter[] { return chapters.filter((c) => c.lang === lang); }

/** The chapter in `lang`, falling back to Spanish (the source language) when the mirror is missing. */
export function chapterFor(lang: Lang, slug: string): { chapter: Chapter; fallback: boolean } | undefined {
  const exact = chapters.find((c) => c.lang === lang && c.slug === slug);
  if (exact) return { chapter: exact, fallback: false };
  const es = chapters.find((c) => c.lang === 'es' && c.slug === slug);
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

export function placeholdersFor(lang: Lang): Placeholder[] {
  return chaptersFor(lang).flatMap((chapter) => chapter.body.split('\n').flatMap((line) => {
    const m = line.match(SCREENSHOT); if (!m) return [];
    return [{ chapter, code: m[1].match(/^([A-Z]+-\d{2}[a-z]?)/)?.[1] ?? '?', caption: m[1].trim() }];
  }));
}

/** Route for an internal manual link (`docs/ops-manual/<lang>/<slug>.md` → `/manual/<slug>`). */
export function manualRoute(path: string): string | undefined {
  const m = path.match(/^docs\/ops-manual\/(?:es|en)\/([^/]+)\.md$/);
  if (m) return `/manual/${m[1]}`;
  if (path.startsWith('docs/')) return `/docs/${path.slice(5).replace(/\.md$/, '')}`;
  return undefined;
}
