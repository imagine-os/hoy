import type { ReactNode } from 'react';

/**
 * The hand-drawn stroke set. One 24×24 grid, `currentColor`, no dependency and no icon font:
 * every glyph is a few paths so the hub, the canvas and the simulator stop using literal
 * characters (◎ ✦ ▦) that render differently per platform.
 */
export type IconName =
  | 'globe' | 'sun' | 'moon' | 'sparkle' | 'book' | 'file-text' | 'layers' | 'code' | 'grid'
  | 'phone' | 'inbox' | 'receipt' | 'gauge' | 'users' | 'wallet' | 'calendar' | 'layout'
  | 'table' | 'palette' | 'list-checks' | 'camera' | 'arrow-right' | 'monitor' | 'smartphone'
  | 'tv' | 'tablet' | 'check' | 'alert' | 'window';

const PATHS: Record<IconName, ReactNode> = {
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c2.5 2.6 3.8 5.7 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3Z" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8 6 18M18 6l1.8-1.8" /></>,
  moon: <path d="M20.5 14.3A8.6 8.6 0 0 1 9.7 3.5a8.6 8.6 0 1 0 10.8 10.8Z" />,
  sparkle: <><path d="m11 3 1.7 4.6L17.3 9.3 12.7 11 11 15.6 9.3 11 4.7 9.3 9.3 7.6Z" /><path d="m18 14.5.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9Z" /></>,
  book: <><path d="M5 4.6A1.6 1.6 0 0 1 6.6 3H19v15H6.6A1.6 1.6 0 0 0 5 19.6Z" /><path d="M5 19.6A1.6 1.6 0 0 1 6.6 18H19v3H6.6A1.6 1.6 0 0 1 5 19.6Z" /></>,
  'file-text': <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h4" /></>,
  layers: <><path d="m12 3 9 4.8-9 4.8-9-4.8Z" /><path d="m3 12.4 9 4.8 9-4.8" /><path d="m3 16.8 9 4.8 9-4.8" /></>,
  code: <><path d="m9 8-5 4 5 4" /><path d="m15 8 5 4-5 4" /><path d="m13.5 4.5-3 15" /></>,
  grid: <><rect x="3" y="3" width="7.5" height="7.5" rx="1.6" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6" /></>,
  phone: <path d="M6.2 3h3l2 4.8-2.4 1.5a12.5 12.5 0 0 0 5.9 5.9l1.5-2.4L21 14.8v3A2.2 2.2 0 0 1 18.8 20 15.8 15.8 0 0 1 4 5.2 2.2 2.2 0 0 1 6.2 3Z" />,
  inbox: <><path d="M5.6 4.5h12.8l2.6 8.2v4.8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4.8Z" /><path d="M3 12.7h4.8l1.4 2.8h5.6l1.4-2.8H21" /></>,
  receipt: <><path d="M6 2.5h12v19l-3-1.8-3 1.8-3-1.8-3 1.8Z" /><path d="M9 7.5h6M9 11h6M9 14.5h4" /></>,
  gauge: <><path d="M3.5 18a8.5 8.5 0 1 1 17 0" /><path d="m12 14.5 4-4.5" /><circle cx="12" cy="16" r="1.6" /></>,
  users: <><circle cx="9.2" cy="8" r="3.6" /><path d="M3 20a6.2 6.2 0 0 1 12.4 0" /><path d="M16.2 4.9a3.6 3.6 0 0 1 0 7" /><path d="M17.6 14.3A6.2 6.2 0 0 1 21 20" /></>,
  wallet: <><path d="M3 8V6.5a2 2 0 0 1 2-2h11.5" /><rect x="3" y="8" width="18" height="11.5" rx="2" /><circle cx="16.8" cy="13.7" r="1.2" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  layout: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 9v11" /></>,
  table: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M3 15h18M10 10v10" /></>,
  palette: <><path d="M12 3a9 9 0 0 0 0 18c1.2 0 1.8-1 1.3-2-.6-1.2.3-2.4 1.6-2.4H17a4 4 0 0 0 4-4c0-5.3-4-9.6-9-9.6Z" /><circle cx="8.2" cy="10.2" r="1.2" /><circle cx="12" cy="7.6" r="1.2" /><circle cx="15.8" cy="10.2" r="1.2" /></>,
  'list-checks': <><path d="m3 6 1.6 1.6L7.8 4.4" /><path d="m3 13 1.6 1.6L7.8 11.4" /><path d="m3 20 1.6 1.6L7.8 18.4" /><path d="M11 6h10M11 13h10M11 20h10" /></>,
  camera: <><path d="M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a1 1 0 0 1 1-1Z" /><circle cx="12" cy="13.6" r="3.4" /></>,
  'arrow-right': <><path d="M4 12h15" /><path d="m13 6 6 6-6 6" /></>,
  monitor: <><rect x="2.5" y="4" width="19" height="12.5" rx="2" /><path d="M9 20.5h6M12 16.5v4" /></>,
  smartphone: <><rect x="7" y="2.5" width="10" height="19" rx="2.6" /><path d="M10.6 18.4h2.8" /></>,
  tv: <><rect x="2.5" y="6.5" width="19" height="13" rx="2" /><path d="m8 2.5 4 4 4-4" /></>,
  tablet: <><rect x="5" y="2.5" width="14" height="19" rx="2.6" /><path d="M11 18.4h2" /></>,
  check: <path d="m4.5 12.5 5 5 10-11" />,
  alert: <><path d="M12 3.5 22 20.5H2Z" /><path d="M12 10v4.4" /><path d="M12 17.6h.01" /></>,
  window: <><rect x="2.5" y="4" width="19" height="16" rx="2.4" /><path d="M2.5 8.6h19" /><circle cx="6" cy="6.3" r=".9" /><circle cx="9" cy="6.3" r=".9" /></>,
};

export const ICON_NAMES = Object.keys(PATHS) as IconName[];

export interface IconProps {
  name: IconName;
  /** Square size in px. 44 px targets come from the button around it, not from the glyph. */
  size?: number;
  strokeWidth?: number;
  className?: string;
  /** Set it only when the icon carries meaning on its own; otherwise it is aria-hidden. */
  title?: string;
}

export function Icon({ name, size = 20, strokeWidth = 1.6, className = '', title }: IconProps) {
  return (
    <svg
      className={`icon ${className}`} width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true} focusable="false"
    >
      {title && <title>{title}</title>}
      {PATHS[name]}
    </svg>
  );
}
