import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import './GlobalSearch.css';

export interface SearchItem {
  id: string;
  /** Group heading (already translated). */
  group: string;
  label: string;
  /** Secondary line: a page code, a role, an email. */
  hint?: string;
  to: string;
}

export interface GlobalSearchProps {
  items: SearchItem[];
  /** How many results to show at most. */
  max?: number;
  /** Focus shortcut key; `/` by default. Pass null to disable. */
  shortcut?: string | null;
}

/** One-field search over anything the shell can navigate to: `/` focuses it, ↑↓ move, Enter navigates. */
export function GlobalSearch({ items, max = 8, shortcut = '/' }: GlobalSearchProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    if (!shortcut) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== shortcut || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || el?.isContentEditable) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shortcut]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return items.filter((i) => `${i.label} ${i.hint ?? ''}`.toLowerCase().includes(needle)).slice(0, max);
  }, [q, items, max]);

  useEffect(() => setCursor(0), [q]);

  const go = (item: SearchItem | undefined) => {
    if (!item) return;
    setQ(''); setOpen(false);
    inputRef.current?.blur();
    navigate(item.to);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(results[cursor]); }
    else if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
  };

  const showPanel = open && q.trim().length > 0;
  let lastGroup = '';

  return (
    <div className="gsearch" role="search">
      <label className="sr-only" htmlFor="gsearch-input">{t('core.search.label')}</label>
      <span className="gsearch-icon" aria-hidden>⌕</span>
      <input
        id="gsearch-input" ref={inputRef} className="gsearch-input" type="search" value={q} autoComplete="off"
        placeholder={t('core.search.placeholder')} title={t('core.search.hint')}
        aria-expanded={showPanel} aria-controls="gsearch-results"
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
      />
      {!q && <kbd className="gsearch-kbd" aria-hidden>/</kbd>}
      {showPanel && (
        <div className="gsearch-panel" id="gsearch-results" role="listbox">
          {results.length === 0 && <p className="gsearch-empty small muted">{t('core.search.none', { q: q.trim() })}</p>}
          {results.map((item, i) => {
            const head = item.group !== lastGroup ? item.group : null;
            lastGroup = item.group;
            return (
              <div key={item.id}>
                {head && <div className="eyebrow gsearch-group">{head}</div>}
                <button
                  type="button" role="option" aria-selected={i === cursor}
                  className={`gsearch-item ${i === cursor ? 'is-active' : ''}`}
                  onMouseEnter={() => setCursor(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => go(item)}
                >
                  <span className="gsearch-label">{item.label}</span>
                  {item.hint && <span className="gsearch-hint">{item.hint}</span>}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
