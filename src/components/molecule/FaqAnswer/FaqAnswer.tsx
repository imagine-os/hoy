import type { ReactNode } from 'react';
import { PriceTable, itemsForFamilies } from '../PriceTable/PriceTable';
import './FaqAnswer.css';

export interface FaqAnswerProps {
  /** The answer in the reader's language: paragraphs split by a blank line. */
  text: string;
  /** Appended after the last paragraph (the app adds "Ver planes →" to price answers). */
  after?: ReactNode;
  /** The public website resolves generated directives against confirmed published quotes. */
  renderPricing?: (families: string) => ReactNode;
}

const DIRECTIVE = /^\{\{\s*pricing:([^}]+?)\s*\}\}$/;

/**
 * 0051 — one FAQ answer. Plain paragraphs, and a line that is only `{{pricing:<families>}}` becomes a live
 * PriceTable unless the caller injects a published-price projection. Authored paragraphs remain unchanged.
 * The public website (W-10) supplies the confirmed projection.
 */
export function FaqAnswer({ text, after, renderPricing }: FaqAnswerProps) {
  const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const lastText = blocks.map((b, i) => (DIRECTIVE.test(b) ? -1 : i)).filter((i) => i >= 0).pop();
  return (
    <div className="faqanswer">
      {blocks.map((b, i) => {
        const m = DIRECTIVE.exec(b);
        if (m) {
          if (renderPricing) return <div key={i}>{renderPricing(m[1])}</div>;
          const items = itemsForFamilies(m[1]);
          return items.length ? <PriceTable key={i} items={items} grouped={m[1].includes(',')} /> : null;
        }
        return <p key={i}>{b}{i === lastText && after ? <> {after}</> : null}</p>;
      })}
    </div>
  );
}
