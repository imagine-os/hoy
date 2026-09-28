import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '../../../i18n/I18nProvider';
import './Drawer.css';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  side?: 'right' | 'left' | 'bottom';
  width?: number;
  children?: ReactNode;
  footer?: ReactNode;
  /** How a bottom sheet renders from 900 px: a centred dialog (default) or still a full-width sheet. */
  desktop?: 'dialog' | 'sheet';
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Slide-over panel (portal). Escape and overlay close it; focus moves inside on open, is trapped while open
 * (Tab / Shift+Tab cycle inside the dialog) and returns to the element that opened it; the document does not
 * scroll behind the overlay. `side="bottom"` is a bottom sheet below 900 px and, by default, a centred dialog
 * from 900 px (D-0006: no phone patterns on desktop); `desktop="sheet"` keeps the sheet everywhere.
 */
export function Drawer({ open, onClose, title, side = 'right', width = 420, children, footer, desktop = 'dialog' }: DrawerProps) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  // The latest onClose lives in a ref so an inline callback does not re-run the effect (which would re-capture
  // the opener as the dialog itself and re-focus the container on every parent render).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onCloseRef.current(); return; }
      if (e.key !== 'Tab' || !ref.current) return;
      const items = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (items.length === 0) { e.preventDefault(); ref.current.focus(); return; }
      const first = items[0], last = items[items.length - 1], active = document.activeElement;
      const outside = !ref.current.contains(active);
      if (e.shiftKey && (active === first || outside)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (active === last || outside)) { e.preventDefault(); first.focus(); }
    };
    // Innermost dialog handles the key first (capture on the dialog itself, then stopPropagation).
    const node = ref.current;
    node?.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    node?.focus();
    return () => {
      node?.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      if (opener && opener.isConnected) opener.focus();
    };
  }, [open]);
  if (!open) return null;
  return createPortal(
    <div className="drawer-root">
      <div className="drawer-overlay" onClick={onClose} aria-hidden />
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" className={`drawer drawer-${side} ${side === 'bottom' && desktop === 'dialog' ? 'is-dialog' : ''}`} style={side !== 'bottom' ? { width: `min(${width}px, 100vw)` } : undefined}>
        <header className="drawer-head">
          <div className="grow">{typeof title === 'string' ? <h3>{title}</h3> : title}</div>
          <button type="button" className="drawer-close" onClick={onClose} aria-label={t('core.common.close')}>×</button>
        </header>
        <div className="drawer-body">{children}</div>
        {footer && <footer className="drawer-foot">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
