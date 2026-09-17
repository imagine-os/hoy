import { Link } from 'react-router-dom';
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
}

/** Splits `S-02 · /staff/desk` into its chip and its route. */
export function parseFigureTitle(title: string | undefined): { code?: string; to?: string } {
  if (!title) return {};
  const [code, ...rest] = title.split('·').map((s) => s.trim());
  const to = rest.find((r) => r.startsWith('/'));
  return { code: code || undefined, to };
}

/**
 * A real screenshot inside a document: framed, captioned, chipped with its page code and clickable
 * through to the live screen. Replaces the dashed `[screenshot: …]` placeholder once a capture exists.
 */
export function Figure({ url, caption, title, device }: FigureProps) {
  const { code, to } = parseFigureTitle(title);
  const kind = device ?? (/-390(-dark)?\.(jpg|jpeg|png|webp)$/.test(url) ? 'mobile' : 'desktop');
  const img = <img className="figure-img" src={url} alt={caption ?? code ?? ''} loading="lazy" />;
  return (
    <figure className={`figure figure-${kind}`}>
      <div className="figure-frame">
        {to ? <Link className="figure-link" to={to} aria-label={`${caption ?? ''} ${code ?? ''}`.trim()}>{img}</Link> : img}
        {code && <span className="figure-code"><code>{code}</code></span>}
      </div>
      {(caption || to) && (
        <figcaption className="figure-cap">
          {caption}
          {to && <> · <Link to={to}>{`/#${to}`}</Link></>}
        </figcaption>
      )}
    </figure>
  );
}
