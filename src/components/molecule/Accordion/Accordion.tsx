import { useId, useState, type ReactNode } from 'react';
import './Accordion.css';

export interface AccordionItem { id: string; question: ReactNode; answer: ReactNode }

export interface AccordionProps {
  items: AccordionItem[];
  /** Only one item open at a time within the group (FAQ rule). */
  single?: boolean;
  defaultOpen?: string[];
}

/** Collapsed-by-default question list. With `single`, opening one closes the others. */
export function Accordion({ items, single = true, defaultOpen = [] }: AccordionProps) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(defaultOpen));
  const base = useId();
  const toggle = (id: string) => setOpen((prev) => {
    const next = new Set(single ? [] : prev);
    if (!prev.has(id)) next.add(id); else next.delete(id);
    return next;
  });
  return (
    <div className="accordion">
      {items.map((it) => {
        const isOpen = open.has(it.id);
        const panelId = `${base}-${it.id}`;
        return (
          <div key={it.id} className={`accordion-item ${isOpen ? 'is-open' : ''}`}>
            <button type="button" className="accordion-q" aria-expanded={isOpen} aria-controls={panelId} onClick={() => toggle(it.id)}>
              <span className="grow">{it.question}</span>
              <span className="accordion-chev" aria-hidden>{isOpen ? '−' : '+'}</span>
            </button>
            {isOpen && <div id={panelId} className="accordion-a">{it.answer}</div>}
          </div>
        );
      })}
    </div>
  );
}
