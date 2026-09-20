import { Children, cloneElement, isValidElement, useId, type KeyboardEvent, type MouseEvent, type ReactElement, type ReactNode } from 'react';
import { useSession } from '../../../auth/SessionProvider';
import { useT } from '../../../i18n/I18nProvider';
import { toast } from '../../../app/toast';
import './Placeholder.css';

export interface PlaceholderProps {
  /** What is not wired yet, in the current language — it goes into the tooltip and the toast. */
  what: string;
  /** Fill the row instead of shrinking to the control. */
  block?: boolean;
  children?: ReactNode;
  className?: string;
}

/**
 * The rule from CLAUDE.md made into a component: any control that does not work yet says so.
 * It wraps the real control, describes it to assistive tech, blocks the click (and Enter / Space)
 * in the capture phase so the underlying handler never runs, raises a toast instead, and draws a
 * dashed outline whenever dev mode is on.
 */
export function Placeholder({ what, block = false, children, className = '' }: PlaceholderProps) {
  const { devMode } = useSession();
  const t = useT();
  const id = useId();

  const stop = (e: MouseEvent | KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toast(t('core.placeholder.toast', { what }), 'warn');
  };

  const child = Children.count(children) === 1 ? Children.only(children) : null;
  const described = child && isValidElement(child)
    ? cloneElement(child as ReactElement<{ 'aria-describedby'?: string }>, { 'aria-describedby': id })
    : children;

  return (
    <span
      className={`placeholder ${devMode ? 'is-dev' : ''} ${block ? 'is-block' : ''} ${className}`}
      title={t('core.placeholder.title')}
      onClickCapture={stop}
      onKeyDownCapture={(e) => { if (e.key === 'Enter' || e.key === ' ') stop(e); }}
    >
      {described}
      <span id={id} className="sr-only">{t('core.placeholder.hint', { what })}</span>
    </span>
  );
}
