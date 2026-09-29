import { useRef, useState, type ReactNode } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { Badge } from '../../atom/Badge/Badge';
import { Button } from '../../atom/Button/Button';
import { Icon } from '../../atom/Icon/Icon';
import type { Bi } from '../../../specs/types';
import './SourceEmbed.css';

export type SourceKind = 'deck' | 'web-copy' | 'brand-manual';

/** One source document as the embed card needs it (docs/source/index.json + resolved URLs). */
export interface SourceDocView {
  id: string;
  title: Bi;
  kind: SourceKind;
  pages: number;
  /** YYYY-MM-DD the owner handed it over. */
  date: string;
  summary: Bi;
  /** Served URL of the PDF (public/source/<id>.pdf). */
  fileUrl: string;
  /** First-page image shown until the viewer is opened. */
  coverUrl?: string;
}

export interface SourceEmbedProps {
  doc: SourceDocView;
  /** Links under the card (e.g. the chapters that embed it). */
  children?: ReactNode;
  /** Open the inline viewer immediately instead of showing the cover first. */
  open?: boolean;
  /** Heading level of the title (2 on K-05, 3 inside a chapter). */
  level?: 2 | 3 | 4;
}

/**
 * A source document (the owner's PDF: value model deck, website copy, brand manual) as an embed card:
 * kind, title, pages and date, a two-line summary, and an inline PDF viewer that loads only when asked
 * (the first page stands in until then), with fullscreen, download and open-in-a-tab controls.
 */
export function SourceEmbed({ doc, children, open = false, level = 3 }: SourceEmbedProps) {
  const { t, bi } = useI18n();
  const [shown, setShown] = useState(open);
  const frame = useRef<HTMLDivElement>(null);
  const H = `h${level}` as 'h2' | 'h3' | 'h4';
  const title = bi(doc.title);
  const fullscreen = () => {
    setShown(true);
    const el = frame.current;
    if (el?.requestFullscreen) el.requestFullscreen().catch(() => window.open(doc.fileUrl, '_blank', 'noopener'));
    else window.open(doc.fileUrl, '_blank', 'noopener');
  };
  return (
    <section className="srcdoc" aria-label={title}>
      <header className="srcdoc-head">
        <span className="srcdoc-icon" aria-hidden><Icon name="file-text" size={22} /></span>
        <div className="srcdoc-headtext">
          <div className="srcdoc-eyebrow"><Badge tone="primary">{t(`manual.source.kind.${doc.kind}`)}</Badge><span>{t('manual.source.meta', { pages: doc.pages, date: doc.date })}</span></div>
          <H className="srcdoc-title">{title}</H>
        </div>
      </header>
      <p className="srcdoc-summary">{bi(doc.summary)}</p>
      <div className="srcdoc-viewer" ref={frame}>
        {shown ? (
          <iframe className="srcdoc-frame" src={`${doc.fileUrl}#view=FitH`} title={t('manual.source.viewerTitle', { title })} loading="lazy" />
        ) : (
          <button type="button" className="srcdoc-cover" onClick={() => setShown(true)} aria-label={t('manual.source.view', { title })}>
            {doc.coverUrl ? <img src={doc.coverUrl} alt="" loading="lazy" /> : <Icon name="file-text" size={48} />}
            <span className="srcdoc-cover-cta"><Icon name="book" size={18} />{t('manual.source.viewHere')}</span>
          </button>
        )}
      </div>
      <div className="srcdoc-actions">
        <Button variant="secondary" size="md" icon={<Icon name="monitor" size={18} />} onClick={fullscreen}>{t('manual.source.fullscreen')}</Button>
        <a className="btn btn-secondary btn-md" href={doc.fileUrl} download={`${doc.id}.pdf`}><span className="btn-label">{t('manual.source.download')}</span></a>
        <a className="btn btn-ghost btn-md" href={doc.fileUrl} target="_blank" rel="noreferrer"><span className="btn-label">{t('manual.source.newTab')}</span></a>
      </div>
      {children && <div className="srcdoc-links">{children}</div>}
    </section>
  );
}
