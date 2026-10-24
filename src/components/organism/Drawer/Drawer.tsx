import { createContext, useContext, useEffect, useRef, useId, type ReactNode } from 'react';
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

interface DrawerLayer {
  node: HTMLDivElement | null;
  parent: DrawerLayer | null;
  opener: HTMLElement | null;
  close: () => void;
}
const DrawerParent = createContext<DrawerLayer | null>(null);
const handledKeys = new WeakSet<KeyboardEvent>();
const registries = new WeakMap<Document, { layers: DrawerLayer[]; overflow: string; onKey: (e: KeyboardEvent) => void }>();
const descendsFrom = (layer: DrawerLayer, ancestor: DrawerLayer): boolean => {
  for (let parent = layer.parent; parent; parent = parent.parent) if (parent === ancestor) return true;
  return false;
};
function topLayer(layers: DrawerLayer[], connectedOnly = true): DrawerLayer | undefined {
  const connected = layers.filter(layer => layer.node && (!connectedOnly || layer.node.isConnected));
  // Child effects may register before their parent. Logical ancestry survives portals and effect order.
  return connected.filter(layer => !connected.some(other => descendsFrom(other, layer))).slice(-1)[0];
}
function orderTopPortal(layers: DrawerLayer[]): void {
  const dialog = topLayer(layers)?.node, root = dialog?.parentElement;
  if (!dialog || !root) return;
  const owner = dialog.ownerDocument;
  const roots = Array.from(owner.body.children).filter(el => el.classList.contains('drawer-root'));
  const last = roots[roots.length - 1];
  if (!last || last === root) return;
  // Equal-z-index portals must paint in the same order as keyboard ownership, including child-first mount.
  // Reorder only among Drawer roots, leaving unrelated later portals in their existing position.
  const active = owner.activeElement as HTMLElement | null;
  last.after(root);
  if (active && root.contains(active)) active.focus();
}
function registerLayer(layer: DrawerLayer, node: HTMLDivElement): () => void {
  const owner = node.ownerDocument;
  let registry = registries.get(owner);
  if (!registry) {
    registry = { layers: [], overflow: owner.body.style.overflow, onKey: () => {} };
    const current = registry;
    current.onKey = e => {
      if (e.defaultPrevented || handledKeys.has(e)) return;
      const top = topLayer(current.layers), dialog = top?.node;
      if (!top || !dialog) return;
      if (e.key === 'Escape') {
        handledKeys.add(e); e.preventDefault(); e.stopPropagation(); top.close(); return;
      }
      if (e.key !== 'Tab') return;
      const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => !el.matches(':disabled') && (el.offsetParent !== null || el === owner.activeElement));
      const active = owner.activeElement, outside = !dialog.contains(active) || active === dialog;
      const destination = !items.length ? dialog
        : e.shiftKey && (active === items[0] || outside) ? items[items.length - 1]
        : !e.shiftKey && (active === items[items.length - 1] || outside) ? items[0] : null;
      if (destination) { handledKeys.add(e); e.preventDefault(); destination.focus(); }
    };
    registries.set(owner, registry);
    // Bubble preserves descendants' existing ability to consume their own keyboard events.
    owner.addEventListener('keydown', registry.onKey);
    owner.body.style.overflow = 'hidden';
  }
  layer.node = node;
  const descendant = registry.layers.find(other => descendsFrom(other, layer));
  layer.opener = descendant?.opener ?? owner.activeElement as HTMLElement | null;
  registry.layers.push(layer);
  orderTopPortal(registry.layers);
  if (topLayer(registry.layers) === layer) node.focus();
  const current = registry;
  return () => {
    // Passive cleanup follows DOM removal, so the closing layer may already be disconnected.
    const wasTop = topLayer(current.layers, false) === layer;
    // Parent-first unmount must leave a nested drawer with the external return target, not a removed trigger.
    for (const other of current.layers) if (descendsFrom(other, layer) && other.opener && node.contains(other.opener)) other.opener = layer.opener;
    current.layers = current.layers.filter(other => other !== layer);
    layer.node = null;
    orderTopPortal(current.layers);
    if (!current.layers.length) {
      owner.removeEventListener('keydown', current.onKey);
      owner.body.style.overflow = current.overflow;
      registries.delete(owner);
    }
    if (wasTop) {
      const next = topLayer(current.layers)?.node;
      if (layer.opener?.isConnected && (!next || next.contains(layer.opener))) layer.opener.focus();
      else next?.focus();
    }
  };
}

/**
 * Slide-over panel (portal). Escape and overlay close it; focus moves inside on open, is trapped while open
 * (Tab / Shift+Tab cycle inside the dialog) and returns to the element that opened it; the document does not
 * scroll behind the overlay. `side="bottom"` is a bottom sheet below 900 px and, by default, a centred dialog
 * from 900 px (D-0006: no phone patterns on desktop); `desktop="sheet"` keeps the sheet everywhere.
 */
export function Drawer({ open, onClose, title, side = 'right', width = 420, children, footer, desktop = 'dialog' }: DrawerProps) {
  const t = useT();
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  // The latest onClose lives in a ref so an inline callback does not re-run the effect (which would re-capture
  // the opener as the dialog itself and re-focus the container on every parent render).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const parent = useContext(DrawerParent);
  const layer = useRef<DrawerLayer>({ node: null, parent, opener: null, close: () => onCloseRef.current() });
  layer.current.parent = parent;
  useEffect(() => {
    const node = ref.current;
    if (!open || !node) return;
    return registerLayer(layer.current, node);
  }, [open]);
  if (!open) return null;
  return <DrawerParent.Provider value={layer.current}>{createPortal(
    <div className="drawer-root">
      <div className="drawer-overlay" onClick={onClose} aria-hidden />
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined} className={`drawer drawer-${side} ${side === 'bottom' && desktop === 'dialog' ? 'is-dialog' : ''}`} style={side !== 'bottom' ? { width: `min(${width}px, 100vw)` } : undefined}>
        <header className="drawer-head">
          <div className="grow" id={titleId}>{typeof title === 'string' ? <h3>{title}</h3> : title}</div>
          <button type="button" className="drawer-close" onClick={onClose} aria-label={t('core.common.close')}>×</button>
        </header>
        <div className="drawer-body">{children}</div>
        {footer && <footer className="drawer-foot">{footer}</footer>}
      </div>
    </div>,
    document.body,
  )}</DrawerParent.Provider>;
}
