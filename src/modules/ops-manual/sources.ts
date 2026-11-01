// The owner's source documents (0031): docs/source/index.json, served from public/source/.
// `{{source:<id>}}` embeds one in a chapter; K-05 (/docs/source) lists them all.
import index from '../../../docs/source/index.json';
import type { SourceDocView, SourceKind } from '../../components/organism/SourceEmbed/SourceEmbed';
import type { Bi } from '../../specs/types';
import { PRODUCTION_BUILD } from '../../config/launch';
import { privateDocs, privateFileUrl } from '../docs/privateDocs';
import { useEffect, useState } from 'react';

export interface SourceDoc {
  id: string; title: Bi; file: string; cover?: string; pages: number; date: string;
  kind: SourceKind; summary: Bi;
  /** Manual chapter numbers that embed it. */
  chapters: string[];
}

// Production (lane Y6): index.json is not bundled (an empty list there); the list, covers included, comes from the
// gated private pack, loaded by PrivateDocsReady before this chunk evaluates. The PDFs are fetched through the gate.
export const SOURCES: SourceDoc[] = PRODUCTION_BUILD ? (privateDocs()?.sources ?? []) as SourceDoc[] : index as SourceDoc[];
export const sourceById = (id: string): SourceDoc | undefined => SOURCES.find((s) => s.id === id);

/** A path from index.json resolved against the app's base URL (GitHub Pages serves under /hoy/). */
const served = (rel: string) => `${import.meta.env.BASE_URL}${rel}`;

export function sourceView(doc: SourceDoc): SourceDocView {
  return { id: doc.id, title: doc.title, kind: doc.kind, pages: doc.pages, date: doc.date, summary: doc.summary, fileUrl: served(doc.file), coverUrl: doc.cover ? served(doc.cover) : undefined };
}

/**
 * The view an embed needs. Review: the public files. Production (lane Y6): the cover is already a data URL from the pack
 * and the PDF is fetched through the gate as a blob: URL; `null` while it loads, `false` when it can't be had (a new
 * `attempt` asks again).
 */
export function useSourceView(doc: SourceDoc, attempt = 0): SourceDocView | null | false {
  const [fileUrl, setFileUrl] = useState<string | null | false>(PRODUCTION_BUILD ? null : served(doc.file));
  useEffect(() => {
    if (!PRODUCTION_BUILD) return;
    let alive = true;
    setFileUrl(null);
    privateFileUrl(doc.file).then((url) => { if (alive) setFileUrl(url ?? false); });
    return () => { alive = false; };
  }, [doc.file, attempt]);
  if (!PRODUCTION_BUILD) return sourceView(doc);
  if (fileUrl === null || fileUrl === false) return fileUrl;
  return { id: doc.id, title: doc.title, kind: doc.kind, pages: doc.pages, date: doc.date, summary: doc.summary, fileUrl, coverUrl: doc.cover };
}
