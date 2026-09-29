// The owner's source documents (0031): docs/source/index.json, served from public/source/.
// `{{source:<id>}}` embeds one in a chapter; K-05 (/docs/source) lists them all.
import index from '../../../docs/source/index.json';
import type { SourceDocView, SourceKind } from '../../components/organism/SourceEmbed/SourceEmbed';
import type { Bi } from '../../specs/types';

export interface SourceDoc {
  id: string; title: Bi; file: string; cover?: string; pages: number; date: string;
  kind: SourceKind; summary: Bi;
  /** Manual chapter numbers that embed it. */
  chapters: string[];
}

export const SOURCES: SourceDoc[] = index as SourceDoc[];
export const sourceById = (id: string): SourceDoc | undefined => SOURCES.find((s) => s.id === id);

/** A path from index.json resolved against the app's base URL (GitHub Pages serves under /hoy/). */
const served = (rel: string) => `${import.meta.env.BASE_URL}${rel}`;

export function sourceView(doc: SourceDoc): SourceDocView {
  return { id: doc.id, title: doc.title, kind: doc.kind, pages: doc.pages, date: doc.date, summary: doc.summary, fileUrl: served(doc.file), coverUrl: doc.cover ? served(doc.cover) : undefined };
}
