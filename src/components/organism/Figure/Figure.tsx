import { useState, type SyntheticEvent } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../../../i18n/I18nProvider';
import './Figure.css';

export interface FigureProps {
  /** Resolved image URL. */
  url: string;
  /** Caption shown under the frame. */
  caption?: string;
  /**
   * The markdown title of the image, written as `CODE` or `CODE · /route`
   * (e.g. `S-02 · /staff/desk`). The code becomes a chip; the route makes the figure clickable.
   */
  title?: string;
  /** Width hint for the frame: a mobile capture is shown narrow, a desktop capture full width. */
  device?: 'mobile' | 'desktop';
  /** Day the capture was taken (YYYY-MM-DD); shown under the frame. */
  captured?: string;
  /** The page changed after the capture: shows the "may be out of date" badge. */
  stale?: boolean;
}

/**
 * A phone capture by its file name: `es-390.jpg`, `en-390-dark.jpg`, `es-390-class.jpg`, and the hashed name Vite
 * gives it in a build (`es-390-B3kd9aQz.jpg`) — the 0050 fix: the old `-390.jpg$` test missed every built URL.
 */
export const isPhoneCapture = (path: string): boolean => /[-_]390(?=[-_.])/.test(path.split(/[?#]/)[0].split('/').pop() ?? '');

/** Splits `S-02 · /staff/desk` into its chip and its route. */
function parseFigureTitle(title: string | undefined): { code?: string; to?: string } {
  if (!title) return {};
  const [code, ...rest] = title.split('·').map((s) => s.trim());
  const to = rest.find((r) => r.startsWith('/'));
  return { code: code || undefined, to };
}

/**
 * A real screenshot inside a document: framed, captioned, chipped with its page code and clickable
 * through to the live screen. Replaces the dashed `[screenshot: …]` placeholder once a capture exists.
 */
export function Figure({ url, caption, title, device, captured, stale = false }: FigureProps) {
  const t = useT();
  const { code, to } = parseFigureTitle(title);
  // No hint and a name that says nothing: a portrait image (width / height < 0.7) is a phone capture once it loads.
  const [portrait, setPortrait] = useState(false);
  const kind = device ?? (isPhoneCapture(url) || portrait ? 'mobile' : 'desktop');
  const onLoad = (e: SyntheticEvent<HTMLImageElement>) => { const i = e.currentTarget; if (!device && i.naturalHeight && i.naturalWidth / i.naturalHeight < 0.7) setPortrait(true); };
  const img = <img className="figure-img" src={url} alt={caption ?? code ?? ''} loading="lazy" onLoad={onLoad} />;
  return (
    <figure className={`figure figure-${kind}`}>
      <div className="figure-frame">
        {to ? <Link className="figure-link" to={to} aria-label={`${caption ?? ''} ${code ?? ''}`.trim()}>{img}</Link> : img}
        {code && <span className="figure-code"><code>{code}</code></span>}
      </div>
      {(caption || to || captured) && (
        <figcaption className="figure-cap">
          {caption}
          {to && <> · <Link to={to}>{`/#${to}`}</Link></>}
          {(captured || stale) && (
            <span className="figure-date">
              {captured && <span>{t('core.figure.captured', { date: captured })}</span>}
              {stale && <span className="figure-stale" title={t('core.figure.staleHint')}>{t('core.figure.stale')}</span>}
            </span>
          )}
        </figcaption>
      )}
    </figure>
  );
}
