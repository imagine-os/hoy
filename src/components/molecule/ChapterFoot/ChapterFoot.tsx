import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import './ChapterFoot.css';

export interface ChapterFootNext {
  /** Route of the next chapter. */
  to: string;
  /** "Siguiente" */
  label: string;
  /** "05 · Clases y horarios" */
  title: string;
  icon?: ReactNode;
}

export interface ChapterFootProps {
  /** "¿Terminaste este capítulo?" */
  title: string;
  /** The read toggle (ReadToggle). */
  children?: ReactNode;
  /** The next chapter in the reader's list, if there is one. */
  next?: ChapterFootNext;
}

/**
 * The slim card at the end of a chapter body (0050): "Done with this chapter?", the read toggle, and a link to the
 * next chapter of the reader's list — so nobody scrolls back to the top to mark a chapter read.
 */
export function ChapterFoot({ title, children, next }: ChapterFootProps) {
  return (
    <section className="chapter-foot" aria-label={title}>
      <p className="chapter-foot-title">{title}</p>
      <div className="chapter-foot-actions">{children}</div>
      {next && (
        <Link className="chapter-foot-next" to={next.to}>
          <span className="eyebrow">{next.label} →</span>
          <span className="chapter-foot-next-title">{next.icon}{next.title}</span>
        </Link>
      )}
    </section>
  );
}
