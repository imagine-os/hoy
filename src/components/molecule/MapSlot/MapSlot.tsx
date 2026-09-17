import { useI18n } from '../../../i18n/I18nProvider';
import { useTable } from '../../../data/DataContext';
import type { MediaAssetRow } from '../../../data/schema';
import type { Bi } from '../../../specs/types';
import { useContact, useSettings } from '../../../modules/admin/settings';
import type { MediaRatio } from '../MediaSlot/MediaSlot';
import './MapSlot.css';

export type MapProvider = 'none' | 'osm' | 'google';

const RATIO_CSS: Record<MediaRatio, string> = {
  '16:9': '16 / 9', '4:3': '4 / 3', '4:5': '4 / 5', '1:1': '1 / 1', '21:9': '21 / 9',
};

const DEFAULTS = {
  open: { es: 'Abrir en Google Maps', en: 'Open in Google Maps' } satisfies Bi,
  heading: { es: 'Dónde estamos', en: 'Where we are' } satisfies Bi,
  note: {
    es: 'Mapa incrustado pendiente de la decisión de proveedor (OSM sin llave vs. Google Maps con llave).',
    en: 'Embedded map pending a map-provider decision (key-less OSM vs. Google Maps with a key).',
  } satisfies Bi,
};

/** Bounding box around the studio, wide enough to show the surrounding blocks. */
function bbox(lat: number, lng: number, pad = 0.006) {
  return [lng - pad, lat - pad * 0.7, lng + pad, lat + pad * 0.7].map((n) => n.toFixed(5)).join(',');
}

export interface MapSlotProps {
  /** `'none'` keeps the page offline-safe; `'osm'` and `'google'` embed a live map. Omitted → the M-08f setting (`none` by default). */
  provider?: MapProvider;
  ratio?: MediaRatio;
  heading?: Bi | string;
  /** Overrides `tenant.location.label`. */
  address?: Bi | string;
  openLabel?: Bi | string;
  /**
   * Key into `media_assets` (M-02d). Until a map provider is chosen the owner can ship a drawn
   * neighbourhood map through the media library: once that row is `ready` its image fills the
   * frame, and the address line and the deep link stay.
   */
  slotKey?: string;
  className?: string;
}

/**
 * The studio's location, from M-08a (`useContact()`, tenant.ts as the default). `provider="none"` renders a branded
 * placeholder with the address line and a Google Maps deep link — no network request, so
 * screenshots stay offline-safe. `'osm'` embeds an OpenStreetMap iframe (no API key),
 * `'google'` embeds Google's key-less embed.
 */
export function MapSlot({ provider: providerProp, ratio = '16:9', heading, address, openLabel, slotKey, className = '' }: MapSlotProps) {
  const { bi } = useI18n();
  // 0018: no prop → the M-08f decision; the location is M-08a's (tenant.ts as the default).
  const { settings } = useSettings();
  const contact = useContact();
  const provider = providerProp ?? settings.content.mapProvider;
  const { rows } = useTable<MediaAssetRow>('media_assets', slotKey ? { where: { slot_key: slotKey } } : { limit: 0 });
  const drawn = slotKey ? rows.find((r) => r.status === 'ready' && r.url) : undefined;
  const { lat, lng } = contact.location;
  const head = heading === undefined ? bi(DEFAULTS.heading) : typeof heading === 'string' ? heading : bi(heading);
  const addr = address === undefined ? bi(contact.location.label) : typeof address === 'string' ? address : bi(address);
  const open = openLabel === undefined ? bi(DEFAULTS.open) : typeof openLabel === 'string' ? openLabel : bi(openLabel);
  const mapsHref = contact.location.link ?? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  const osmSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox(lat, lng)}&layer=mapnik&marker=${lat},${lng}`;
  const gmapSrc = `https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
  const embed = provider === 'osm' ? osmSrc : provider === 'google' ? gmapSrc : null;

  return (
    <div className={`mapslot ${embed || drawn ? 'has-embed' : 'is-placeholder'} ${className}`}>
      <div className="mapslot-frame" style={{ aspectRatio: RATIO_CSS[ratio] }}>
        {embed ? (
          <iframe className="mapslot-embed" src={embed} title={head} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
        ) : drawn ? (
          <img className="mapslot-embed" src={drawn.url!} alt={bi(drawn.alt) || head} loading="lazy" />
        ) : (
          <div className="mapslot-empty">
            <span className="mapslot-pin" aria-hidden>◉</span>
            <span className="eyebrow">{head}</span>
            <span className="mapslot-addr">{addr}</span>
            {import.meta.env.DEV && <span className="mapslot-note">{bi(DEFAULTS.note)}</span>}
          </div>
        )}
      </div>
      <p className="mapslot-links small">
        <a href={mapsHref} target="_blank" rel="noreferrer">{open} ↗</a>
        <span className="muted"> · {lat.toFixed(4)}, {lng.toFixed(4)}</span>
      </p>
    </div>
  );
}
