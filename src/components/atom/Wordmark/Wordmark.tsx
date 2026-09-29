import type { CSSProperties } from 'react';
import { tenant } from '../../../tenant/tenant';
import { useTheme } from '../../../design/ThemeProvider';
import './Wordmark.css';

/** Colour of the vector mark: `auto` = brand blue on light, cream on dark; `current` = the surrounding text colour. */
export type WordmarkTone = 'auto' | 'blue' | 'cream' | 'yellow' | 'current';

export interface WordmarkProps {
  /** Height in px: image default 28; `vector` defaults to the CSS (120 px wide minimum); ignored by `inline` (em). */
  height?: number;
  /** Raster colourway (the <img> form). */
  variant?: 'blue' | 'cream' | 'yellow' | 'auto';
  /** Render the vector script mark as a block (site header / footer). */
  vector?: boolean;
  /** Render the vector mark inside a heading in place of the word HOY (see `brandHeading`). */
  inline?: boolean;
  /** Colour of the vector forms. */
  tone?: WordmarkTone;
  className?: string;
}

/**
 * The hoy wordmark. Default: the raster colourway for the current theme (<img>, used by emails, receipts, the apps).
 * `vector` / `inline`: the traced script (public/brand/hoy-wordmark.svg) through `<use>`, coloured by CSS, announced
 * to screen readers as the tenant name.
 */
export function Wordmark({ height, variant, vector, inline, tone = 'auto', className = '' }: WordmarkProps) {
  const { theme } = useTheme();
  if (vector || inline) {
    const v = tenant.brand.vector;
    const style = { '--wm-ratio': String(v.ratio), '--wm-baseline': String(v.baseline), ...(!inline && height ? { height } : {}) } as CSSProperties;
    return (
      <span className={`${inline ? 'wordmark-inline' : 'wordmark-vector'} wordmark-tone-${tone} ${className}`.trim()} role="img" aria-label={tenant.name} style={style}>
        <svg aria-hidden="true" focusable="false"><use href={v.src} /></svg>
      </span>
    );
  }
  const c = !variant || variant === 'auto' ? (theme === 'dark' ? 'cream' : 'blue') : variant;
  return <img className={`wordmark ${className}`} src={tenant.brand.wordmark[c]} alt={tenant.name} style={{ height: height ?? 28, width: 'auto' }} />;
}
