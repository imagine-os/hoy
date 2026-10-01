import type { ReactNode } from 'react';
import { PriceTable, itemsForFamilies } from '../PriceTable/PriceTable';
import './FaqAnswer.css';

export interface FaqAnswerProps {
  /** The answer in the reader's language: paragraphs split by a blank line. */
  text: string;
  /** Appended after the last paragraph (the app adds "Ver planes →" to price answers). */
  after?: ReactNode;
}

const DIRECTIVE = /^\{\{\s*pricing:([^}]+?)\s*\}\}$/;

/**
 * 0051 — one FAQ answer. Plain paragraphs, and a line that is only `{{pricing:<families>}}` becomes a live
 * PriceTable from src/tenant/pricing.ts — the same directive the operations manual uses — so an answer that lists
 * prices never repeats a number. Shared by the website FAQ (W-10) and the app (C-14 / C-15).
 */
export function FaqAnswer({ text, after }: FaqAnswerProps) {
  const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const lastText = blocks.map((b, i) => (DIRECTIVE.test(b) ? -1 : i)).filter((i) => i >= 0).pop();
  return (
    <div className="faqanswer">
      {blocks.map((b, i) => {
        const m = DIRECTIVE.exec(b);
        if (m) {
          const items = itemsForFamilies(m[1]);
          return items.length ? <PriceTable key={i} items={items} grouped={m[1].includes(',')} /> : null;
        }
        return <p key={i}>{b}{i === lastText && after ? <> {after}</> : null}</p>;
      })}
    </div>
  );
}
