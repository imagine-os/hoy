import { Fragment, type ReactNode } from 'react';
import { useMinWidth } from '../../layout/useMinWidth';

export interface SplitSectionsProps {
  /** Visible section names in layout-editor order. */
  names: string[];
  render: (name: string) => ReactNode;
  /** Sections that go to the right-hand column from 900 px (everything else stacks on the left). */
  side: (name: string) => boolean;
  /** Sections that span both columns above the split (a greeting, a page head). */
  full?: (name: string) => boolean;
  /** Grid modifier class, e.g. `cust-checkout`. */
  className?: string;
  /** Wrapper class below 900 px (`stack`); omit to render the flat list without a wrapper. */
  narrowClassName?: string;
}

/**
 * Two-column layout for sectioned customer pages from 900 px (AppShell wide): the layout editor's order is kept
 * inside each column; below 900 px the sections render flat, in the editor's order, exactly as on a phone.
 */
export function SplitSections({ names, render, side, full = () => false, className = '', narrowClassName }: SplitSectionsProps) {
  const wide = useMinWidth('shell');
  const item = (n: string) => <Fragment key={n}>{render(n)}</Fragment>;
  if (!wide) {
    const flat = names.map(item);
    return narrowClassName ? <div className={narrowClassName}>{flat}</div> : <>{flat}</>;
  }
  const main = names.filter((n) => !full(n) && !side(n)), aside = names.filter((n) => !full(n) && side(n));
  return (
    <>
      {names.filter(full).map(item)}
      <div className={`cust-split ${className}`}>
        <div className="stack cust-split-main">{main.map(item)}</div>
        {aside.length > 0 && <aside className="stack cust-split-side">{aside.map(item)}</aside>}
      </div>
    </>
  );
}
