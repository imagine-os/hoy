import { useEffect, useState } from 'react';
import './Toc.css';

export interface TocItem { id: string; text: string }

export interface TocProps {
  items: TocItem[];
  /** Label for the nav landmark and the eyebrow. */
  label: string;
  /** Watches the headings and marks the one in view. */
  spy?: boolean;
}

/**
 * In-page table of contents built from a document's `##` headings. Sticky on desktop, hidden on
 * narrow screens and in print (the chapter itself is the outline there).
 */
export function Toc({ items, label, spy = true }: TocProps) {
  const [active, setActive] = useState<string>('');
  useEffect(() => {
    if (!spy || !items.length || typeof IntersectionObserver === 'undefined') return;
    const nodes = items.map((i) => document.getElementById(i.id)).filter((n): n is HTMLElement => !!n);
    if (!nodes.length) return;
    const seen = new Map<string, boolean>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) seen.set(e.target.id, e.isIntersecting);
      const first = items.find((i) => seen.get(i.id));
      if (first) setActive(first.id);
    }, { rootMargin: '-80px 0px -60% 0px' });
    for (const n of nodes) io.observe(n);
    return () => io.disconnect();
  }, [items, spy]);
  if (!items.length) return null;
  return (
    <nav className="toc" aria-label={label}>
      <div className="eyebrow">{label}</div>
      <ol className="toc-list">
        {items.map((i) => (
          <li key={i.id}>
            {/* The app is on a HashRouter, so a bare `#id` href would change the route:
                the click scrolls the heading into view instead. */}
            <a
              className={`toc-link ${active === i.id ? 'is-active' : ''}`}
              href={`#${i.id}`}
              aria-current={active === i.id ? 'true' : undefined}
              onClick={(e) => { const el = document.getElementById(i.id); if (el) { e.preventDefault(); el.scrollIntoView({ block: 'start', behavior: 'smooth' }); setActive(i.id); } }}
            >{i.text}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
