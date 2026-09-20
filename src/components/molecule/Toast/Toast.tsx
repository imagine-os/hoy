import { useEffect, useRef, useState } from 'react';
import { onToast, type ToastMessage } from '../../../app/toast';
import { useT } from '../../../i18n/I18nProvider';
import './Toast.css';

/**
 * The single stack of one-line notices. Mounted once in App.tsx; everything else calls
 * `toast()` from src/app/toast.ts. The stack itself is the polite live region and it is always
 * in the DOM: a `role="status"` element inserted together with its text is announced unreliably,
 * an existing one always is. Nothing here steals focus.
 */
export function Toasts({ max = 4 }: { max?: number }) {
  const t = useT();
  const [items, setItems] = useState<ToastMessage[]>([]);
  const timers = useRef(new Map<string, number>());

  useEffect(() => onToast((m) => setItems((cur) => [...cur, m].slice(-max))), [max]);

  // One timer per notice, started when it arrives: keying the effect on the list alone would
  // restart every timer on every new notice, so a steady stream would never dismiss the old ones.
  useEffect(() => {
    const live = timers.current;
    for (const m of items) {
      if (live.has(m.id)) continue;
      live.set(m.id, window.setTimeout(() => {
        live.delete(m.id);
        setItems((cur) => cur.filter((x) => x.id !== m.id));
      }, m.ttl));
    }
    for (const [id, handle] of live) {
      if (!items.some((m) => m.id === id)) { window.clearTimeout(handle); live.delete(id); }
    }
  }, [items]);

  useEffect(() => {
    const live = timers.current;
    return () => { for (const handle of live.values()) window.clearTimeout(handle); live.clear(); };
  }, []);

  return (
    <div className="toasts" role="status" aria-live="polite">
      {items.map((m) => (
        <div key={m.id} className={`toast toast-${m.tone}`}>
          <span className="toast-text grow">{m.text}</span>
          <button type="button" className="toast-close" onClick={() => setItems((cur) => cur.filter((x) => x.id !== m.id))} aria-label={t('core.common.close')}>×</button>
        </div>
      ))}
    </div>
  );
}
