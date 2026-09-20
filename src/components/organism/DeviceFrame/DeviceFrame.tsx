import { useEffect, useRef, useState } from 'react';
import type { Bi } from '../../../specs/types';
import type { Role } from '../../../auth/roles';
import { frameUrl } from '../../../app/frameSession';
import './DeviceFrame.css';

export type DevicePreset = 'phone' | 'tablet' | 'desktop' | 'tv';

/** The four viewports the quality bar names, as real pixel sizes. */
export const DEVICE_PRESETS: Record<DevicePreset, { w: number; h: number; label: Bi; labelKey: string }> = {
  phone: { w: 390, h: 844, label: { es: 'Teléfono', en: 'Phone' }, labelKey: 'core.device.phone' },
  tablet: { w: 768, h: 1024, label: { es: 'Tableta', en: 'Tablet' }, labelKey: 'core.device.tablet' },
  desktop: { w: 1280, h: 800, label: { es: 'Escritorio', en: 'Desktop' }, labelKey: 'core.device.desktop' },
  tv: { w: 3840, h: 2160, label: { es: 'TV 4K', en: '4K TV' }, labelKey: 'core.device.tv' },
};

export interface DeviceFrameProps {
  /** App route to load, e.g. `/app/schedule`. */
  route: string;
  preset?: DevicePreset;
  /** Role the framed page runs as (its demo user). */
  as?: Role;
  lang?: string;
  theme?: string;
  /** Dev tooling inside the frame. Off by default: a preview shows the page, not the inspector. */
  dev?: boolean;
  /** Accessible name — always say which page this is. */
  title: string;
  /** Let the browser defer the load until it is near the viewport. */
  lazy?: boolean;
  /** Cap on the scale factor; > 1 lets a phone preview grow on a 4K wall (the hub passes --ui). */
  maxScale?: number;
  /** Draw the device chrome (border + shadow). */
  chrome?: boolean;
  onLoad?: () => void;
  className?: string;
}

/**
 * The real page, running in a same-origin iframe at a device viewport and scaled to fit its column.
 *
 * The iframe is sized to the preset in CSS pixels and `transform: scale()`d by
 * `min(maxScale, width / presetWidth)` from a ResizeObserver, so media queries, container queries
 * and the shells behave exactly as they do on that device. The hash carries the session the frame
 * should run under (`?as=…&lang=…&theme=…&dev=0&live=0`), which `frameSession.ts` applies.
 */
export function DeviceFrame({
  route, preset = 'desktop', as, lang, theme, dev = false, title,
  lazy = true, maxScale = 1, chrome = false, onLoad, className = '',
}: DeviceFrameProps) {
  const { w, h } = DEVICE_PRESETS[preset];
  const stage = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const src = frameUrl(route, { as, lang, theme, dev });

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const measure = () => setScale(Math.min(maxScale, el.clientWidth / w));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [w, maxScale]);

  useEffect(() => { setLoaded(false); }, [src]);

  return (
    <div
      ref={stage}
      className={`devframe ${loaded ? 'is-loaded' : ''} ${chrome ? `devframe-chrome ${preset === 'phone' ? 'is-phone' : ''}` : ''} ${className}`}
      // The stage never grows past the device itself, so a phone in a wide column sits at 1:1
      // instead of leaving the rest of the row empty; maxScale > 1 lets it grow on a 4K wall.
      style={{ aspectRatio: `${w} / ${h}`, maxWidth: w * maxScale }}
    >
      <iframe
        className="devframe-frame"
        src={src}
        title={title}
        loading={lazy ? 'lazy' : undefined}
        style={{ width: w, height: h, transform: `scale(${scale})` }}
        onLoad={() => { setLoaded(true); onLoad?.(); }}
      />
    </div>
  );
}
