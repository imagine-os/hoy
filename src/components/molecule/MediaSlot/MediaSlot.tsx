import type { ReactNode } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { useTable } from '../../../data/DataContext';
import type { MediaAssetRow } from '../../../data/schema';
import type { Bi } from '../../../specs/types';
import type { Movement } from '../../../design/tokens';
import './MediaSlot.css';

export type MediaRatio = '16:9' | '4:3' | '4:5' | '1:1' | '21:9';
export type MediaKind = 'photo' | 'video' | 'illustration';

const RATIO_CSS: Record<MediaRatio, string> = {
  '16:9': '16 / 9',
  '4:3': '4 / 3',
  '4:5': '4 / 5',
  '1:1': '1 / 1',
  '21:9': '21 / 9',
};

const GLYPH: Record<MediaKind, string> = { photo: '◎', video: '▶', illustration: '✎' };

const KIND_LABEL: Record<MediaKind, Bi> = {
  photo: { es: 'Foto', en: 'Photo' },
  video: { es: 'Video', en: 'Video' },
  illustration: { es: 'Ilustración', en: 'Illustration' },
};

const PENDING: Bi = { es: 'arte pendiente', en: 'art pending' };

export interface MediaSlotProps {
  /** Aspect ratio of the slot; the reserved space never collapses. Falls back to the library row. */
  ratio?: MediaRatio;
  /**
   * Key into `media_assets` (M-02d, the media library). While that row is `pending` the slot stays
   * an empty branded frame and borrows the row's brief, label and movement; the moment the owner
   * pastes a URL and flips it to `ready` the real photo or video renders here, with no deploy.
   */
  slotKey?: string;
  /** What belongs here once the owner supplies it. */
  kind?: MediaKind;
  /** What the slot is, shown in the empty state and used as the image's alt text. */
  label: Bi | string;
  /** One-line art direction. Always the `title` attribute; printed in the slot in dev mode. */
  brief?: string;
  /** Tints the empty state with a movement colour (D-01 `movements`). */
  movement?: Movement;
  /** When a real asset lands, pass it here and the slot renders the media instead. */
  src?: string;
  /** Poster frame for a video `src`. */
  poster?: string;
  /** Caption under the slot. */
  caption?: Bi | string;
  /** Rendered on top of the slot, filled or empty (a chip, a play button, a headline). */
  overlay?: ReactNode;
  className?: string;
}

/**
 * The one media slot for the whole site: every future photo, video or illustration is booked with
 * this component, so the owner can see exactly which artwork is missing and drop a `src` in later.
 * Empty it renders an intentional branded frame (movement tint, suede grain, ratio, "arte pendiente"
 * chip) — never a broken box.
 */
export function MediaSlot({
  ratio, kind = 'photo', label, brief, movement, slotKey, src, poster, caption, overlay, className = '',
}: MediaSlotProps) {
  const { bi } = useI18n();
  const { rows } = useTable<MediaAssetRow>('media_assets', slotKey ? { where: { slot_key: slotKey } } : { limit: 0 });
  const asset = slotKey ? rows[0] : undefined;
  const ready = asset && asset.status === 'ready' && asset.url ? asset : undefined;

  const url = src ?? ready?.url ?? undefined;
  const effKind = src ? kind : ready?.kind ?? kind;
  const text = typeof label === 'string' ? label : bi(label);
  const alt = (ready && bi(ready.alt)) || text;
  const mv = movement ?? asset?.movement ?? undefined;
  const hint = brief ?? (asset ? bi(asset.brief) : undefined);
  const cap = caption === undefined ? '' : typeof caption === 'string' ? caption : bi(caption);
  const style = { aspectRatio: ratio ? RATIO_CSS[ratio] : asset?.ratio ?? RATIO_CSS['16:9'] };
  const arLabel = ratio ?? (asset?.ratio ? asset.ratio.replace(/\s/g, '') : '16:9');
  const cls = `mediaslot ${mv ? `mediaslot-${mv}` : ''} ${url ? 'has-src' : 'is-empty'} ${className}`;

  return (
    <figure className="mediaslot-fig">
      <div className={cls} style={style} title={hint} role={url ? undefined : 'img'} aria-label={url ? undefined : text}>
        {url && effKind === 'video' && <video className="mediaslot-media" src={url} poster={poster} controls playsInline preload="metadata" aria-label={alt} />}
        {url && effKind !== 'video' && <img className="mediaslot-media" src={url} alt={alt} loading="lazy" />}
        {!url && (
          <div className="mediaslot-empty">
            <span className="mediaslot-glyph" aria-hidden>{GLYPH[effKind]}</span>
            <span className="mediaslot-label">{text}</span>
            <span className="mediaslot-meta">{bi(KIND_LABEL[effKind])} · {arLabel}</span>
            {hint && import.meta.env.DEV && <span className="mediaslot-brief">{hint}</span>}
          </div>
        )}
        {!url && <span className="mediaslot-chip">{bi(PENDING)}</span>}
        {overlay && <div className="mediaslot-overlay">{overlay}</div>}
      </div>
      {cap && <figcaption className="mediaslot-cap small muted">{cap}</figcaption>}
    </figure>
  );
}
