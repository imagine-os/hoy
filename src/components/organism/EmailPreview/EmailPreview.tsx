import { Wordmark } from '../../atom/Wordmark/Wordmark';
import { renderVars } from '../../molecule/PhoneBubble/PhoneBubble';
import './EmailPreview.css';

export interface EmailPreviewProps {
  subject: string;
  /** Plain text; blank lines split paragraphs; `{{first_name}}`-style variables. */
  body: string;
  cta?: { label: string; href: string };
  vars?: Record<string, string>;
  footer?: string;
  /** Preheader-style line under the subject (from / to). */
  envelope?: string;
}

/** The rendered transactional email as the customer would see it: wordmark, subject, body, CTA, footer. */
export function EmailPreview({ subject, body, cta, vars = {}, footer, envelope }: EmailPreviewProps) {
  const paragraphs = body.split(/\n\s*\n/).filter((p) => p.trim());
  return (
    <div className="emailpreview" role="img" aria-label={subject}>
      {envelope && <div className="emailpreview-envelope xs muted mono">{envelope}</div>}
      <div className="emailpreview-paper">
        <header className="emailpreview-head"><Wordmark height={22} variant="blue" /></header>
        <h2 className="emailpreview-subject">{renderVars(subject, vars)}</h2>
        {paragraphs.map((p, i) => <p key={i} className="emailpreview-p">{renderVars(p, vars)}</p>)}
        {cta && <a className="emailpreview-cta" href={cta.href} onClick={(e) => e.preventDefault()}>{renderVars(cta.label, vars)}</a>}
        {cta && <div className="emailpreview-link xs muted mono">{renderVars(cta.href, vars)}</div>}
        {footer && <footer className="emailpreview-foot xs muted">{renderVars(footer, vars)}</footer>}
      </div>
    </div>
  );
}
