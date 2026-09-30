import type { ReactNode } from 'react';
import './FigurePair.css';

/**
 * Two phone captures side by side (0050): a markdown paragraph that holds only titled phone images renders its
 * Figures in a two-column grid from 768 px, stacked below. Each figure keeps its own 360 px cap and caption.
 */
export function FigurePair({ children }: { children: ReactNode }) {
  return <div className="figure-pair">{children}</div>;
}
