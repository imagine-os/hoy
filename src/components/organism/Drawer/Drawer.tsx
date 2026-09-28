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

/**
 * Slide-over panel (portal). Escape and overlay close it; focus moves inside on open.
 * `side="bottom"` is a bottom sheet below 900 px and, by default, a centred dialog from 900 px (D-0006: no phone
 * patterns on desktop); `desktop="sheet"` keeps the sheet everywhere.
 */
export function Drawer({ open, onClose, title, side = 'right', width = 420, children, footer, desktop = 'dialog' }: DrawerProps) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => { document.removeEventListener('keydown', onKey); prev?.focus?.(); };
  }, [open, onClose]);
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
