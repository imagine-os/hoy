import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Role } from '../../../auth/roles';
import { useI18n } from '../../../i18n/I18nProvider';
import { useTheme } from '../../../design/ThemeProvider';
import { useThumbUrl, type ThumbShape } from '../../../app/thumbnails';
import { liveFramesAllowed } from '../../../app/frameSession';
import { Icon } from '../../atom/Icon/Icon';
import { DeviceFrame } from '../DeviceFrame/DeviceFrame';
import './PagePreview.css';

/* ------------------------------------------------------------------ live budget */

interface Controls { request: (key: string, order: number) => void; release: (key: string) => void }
const ControlsCtx = createContext<Controls | null>(null);
const GrantedCtx = createContext<ReadonlySet<string>>(new Set<string>());

/**
 * How many previews may run as real pages at once. Every `PagePreview` that is on screen asks for a
 * slot; the rest keep their capture. Slots are granted in document order on first paint (the
 * lowest order wins among everyone asking at that moment) and then kept first-come-first-served:
 * a granted slot is held until its card releases it, so a card scrolling in later never preempts
 * one that is already live. Without this a hub of twenty cards would boot twenty copies of the app.
 */
export function LivePreviewBudget({ max = 6, children }: { max?: number; children?: ReactNode }) {
  const wanted = useRef(new Map<string, number>());
  const [granted, setGranted] = useState<string[]>([]);

  const settle = useCallback(() => {
    setGranted((cur) => {
      const keep = cur.filter((k) => wanted.current.has(k));
      const rest = [...wanted.current.entries()]
        .filter(([k]) => !keep.includes(k))
        .sort((a, b) => a[1] - b[1])
        .map(([k]) => k);
      const next = [...keep, ...rest].slice(0, max);
      return next.length === cur.length && next.every((k, i) => k === cur[i]) ? cur : next;
    });
  }, [max]);

  const controls = useMemo<Controls>(() => ({
    request: (key, order) => { wanted.current.set(key, order); settle(); },
    release: (key) => { wanted.current.delete(key); settle(); },
  }), [settle]);
  const grantedSet = useMemo(() => new Set(granted), [granted]);

  return (
    <ControlsCtx.Provider value={controls}>
      <GrantedCtx.Provider value={grantedSet}>{children}</GrantedCtx.Provider>
    </ControlsCtx.Provider>
  );
}

/* ------------------------------------------------------------------ the preview */

export interface PagePreviewProps {
  /** Page code — names the thumbnail folder and the live slot. */
  code: string;
  /** Route the live layer loads. */
  route: string;
  /** Page name, for the iframe title and the image's accessible context. */
  name: string;
  shape?: ThumbShape;
  /** Role the live frame runs as. */
  as?: Role;
  /** May this preview upgrade to the running page? The hub passes false when it is framed itself. */
  live?: boolean;
  /** Document order, so the budget hands slots out top to bottom. */
  order?: number;
  /** Scale cap for the live frame (the hub passes its --ui step). */
  maxScale?: number;
  className?: string;
}

/**
 * What a surface looks like, in three layers: a hue-tinted idle tile (always there), the real
 * capture from `docs/screenshots/<code>/thumb-*` when the pass has produced one, and — only when
 * the card is on screen and the budget has a slot — the live page in a `DeviceFrame`, faded in over
 * the capture.
 *
 * The component itself never boots a frame when it is framed, under `live=0`, or under automation:
 * `live` is ANDed with `liveFramesAllowed()` here, so a caller that forgets the gate still gets the
 * static capture and a screenshot pass always sees the same deterministic hub.
 */
export function PagePreview({
  code, route, name, shape = 'desktop', as, live = false, order = 0, maxScale = 1, className = '',
}: PagePreviewProps) {
  const { lang, t } = useI18n();
  const { theme } = useTheme();
  const box = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [broken, setBroken] = useState(false);
  const [liveLoaded, setLiveLoaded] = useState(false);

  // The gate lives here, not only in the caller: framed, live=0 and automation all fall back to
  // the capture. Decided once per mount — none of the three can change without a reload.
  const [allowed] = useState(liveFramesAllowed);
  const mayLive = live && allowed;

  const controls = useContext(ControlsCtx);
  const grantedSet = useContext(GrantedCtx);
  const slot = `${code}:${route}`;
  const found = useThumbUrl(code, shape, lang, theme);
  const thumb = broken ? undefined : found;

  useEffect(() => { setBroken(false); }, [code, shape, lang, theme]);

  useEffect(() => {
    const el = box.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setInView(true); return; }
    const io = new IntersectionObserver((entries) => { for (const e of entries) setInView(e.isIntersecting); }, { rootMargin: '160px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!mayLive || !inView || !controls) return;
    controls.request(slot, order);
    return () => controls.release(slot);
  }, [mayLive, inView, controls, slot, order]);

  const liveOn = mayLive && grantedSet.has(slot);
  const ratio = shape === 'phone' ? '390 / 844' : '16 / 10';

  // Losing the slot unmounts the frame; the next one it is granted starts from "not loaded" again,
  // otherwise the "live" tag would show over a blank frame that has not come back yet.
  useEffect(() => { if (!liveOn) setLiveLoaded(false); }, [liveOn]);

  return (
    <div ref={box} className={`pagepreview ${className}`} style={{ aspectRatio: ratio }}>
      <div className="pagepreview-idle" aria-hidden>
        <span className="pagepreview-glyph"><Icon name="window" size={24} /></span>
      </div>
      {/* Eager on purpose: the captures are 15–40 kB and a lazy image below the fold never loads in a
          full-page capture, so the hub would document itself as a wall of empty tiles. Only the live
          iframes stay lazy — they are budgeted and gated on the viewport anyway. */}
      {thumb && <img className="pagepreview-thumb" src={thumb} alt="" loading="eager" decoding="async" onError={() => setBroken(true)} />}
      {liveOn && (
        <div className="pagepreview-live">
          <DeviceFrame
            route={route} preset={shape === 'phone' ? 'phone' : 'desktop'} as={as}
            lang={lang} theme={theme} title={t('core.preview.of', { name })}
            maxScale={maxScale} onLoad={() => setLiveLoaded(true)}
          />
        </div>
      )}
      {liveOn && liveLoaded && <span className="pagepreview-tag">{t('core.preview.live')}</span>}
    </div>
  );
}
