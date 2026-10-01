import { Link } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { classes, type ClassSlug } from '../../../tenant/brand';
import './ClassArch.css';

export interface ClassArchProps {
  slug: ClassSlug;
  /** Position in the class order (1-based); shown as "01". */
  index?: number;
  /** md = the home row of seven; lg = the classes page and the class page. */
  size?: 'md' | 'lg';
  /** Route the arch links to; without it the arch is a figure. */
  to?: string;
  /** The studio's own photograph for the class, once uploaded (M-02d). It fills the arch under a tone wash. */
  photoUrl?: string | null;
  /** Show the class's first-person line under the name (lg shows it by default). */
  tagline?: boolean;
}

/**
 * 0051 — one of the seven classes as an arch in its tone, with the title and the keywords the owner chose
 * ("liberación · apertura · fluidez · movimiento consciente"). It replaces the concept photographs: the arch
 * shape is the brand's, the colour is the class's (D-01 class tones), and a real photo can fill it later.
 */
export function ClassArch({ slug, index, size = 'md', to, photoUrl, tagline }: ClassArchProps) {
  const { bi } = useI18n();
  const c = classes[slug];
  const showTagline = tagline ?? size === 'lg';
  const keywords = c.keywords.map((k) => bi(k));
  const body = (
    <>
      <span className={`classarch-arch${photoUrl ? ' has-photo' : ''}`} style={photoUrl ? { backgroundImage: `url(${photoUrl})` } : undefined}>
        {index != null && <span className="classarch-num" aria-hidden>{String(index).padStart(2, '0')}</span>}
        <span className="classarch-ring" aria-hidden />
        <span className="classarch-copy">
          <span className="classarch-name">{bi(c.name)}</span>
          {showTagline && <span className="classarch-tagline">{bi(c.tagline)}</span>}
        </span>
      </span>
      <span className="classarch-keys">
        {keywords.map((k, i) => <span key={k}>{i > 0 && <span className="classarch-sep" aria-hidden>·</span>}{k}</span>)}
      </span>
    </>
  );
  const className = `classarch classarch-${size}`;
  return to
    ? <Link to={to} className={className} data-tone={c.tone} aria-label={`${bi(c.name)} — ${keywords.join(', ')}`}>{body}</Link>
    : <figure className={className} data-tone={c.tone}>{body}</figure>;
}
