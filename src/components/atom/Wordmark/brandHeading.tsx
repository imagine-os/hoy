import { Fragment, type ReactNode } from 'react';
import { tenant } from '../../../tenant/tenant';
import { Wordmark, type WordmarkTone } from './Wordmark';

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * 0033 — display headings only. Splits a heading string on the standalone brand word (the tenant name as written in
 * the copy, "HOY": case-sensitive, not inside another word) and renders the inline wordmark there, keeping the
 * punctuation that follows it on the same line. The copy stays a plain `{ es, en }` string; a heading without the
 * word comes back unchanged. The Spanish adverb "hoy"/"Hoy" ("today") is not the brand and stays text.
 * Never use it for paragraphs, buttons, nav links, eyebrows, meta titles or the document <title>.
 */
export function brandHeading(text: string, opts: { tone?: WordmarkTone; word?: string } = {}): ReactNode {
  const word = opts.word ?? tenant.name;
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${escape(word)}(?![\\p{L}\\p{N}])([.,;:!?…»”’)]*)`, 'gu');
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > last) out.push(text.slice(last, i));
    out.push(<span key={i} className="wordmark-nowrap"><Wordmark inline tone={opts.tone} className={m[1] ? 'wordmark-inline-punct' : ''} />{m[1]}</span>);
    last = i + m[0].length;
  }
  if (!out.length) return text;
  if (last < text.length) out.push(text.slice(last));
  return <Fragment>{out}</Fragment>;
}
